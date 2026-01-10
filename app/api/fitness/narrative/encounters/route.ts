/**
 * Narrative Engine - Encounters API
 *
 * POST: Calculate and record an encounter with a rival
 * GET: Get recent encounters for user
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, validateBody, Errors } from "@/lib/api";
import prisma from "@/lib/db";
import {
  calculateImprovementScore,
  buildImprovementSnapshot,
  determineWinner,
  getWeekStartDate,
  getPreviousWeekStartDate,
  getWorkoutsInWeek,
} from "@/lib/fitness/narrative/improvement-calculator";
import {
  generatePhantomStats,
  phantomStatsToSnapshot,
  type PhantomConfig,
} from "@/lib/fitness/narrative/phantom-generator";
import {
  calculateVictory,
  type VictoryResult,
} from "@/lib/fitness/narrative/victory-calculator";
import type { Workout, PhantomStats, PhantomPersonality } from "@/lib/fitness/types";

// Schema for triggering an encounter
const triggerEncounterSchema = z.object({
  rivalId: z.string().uuid(),
});

interface FitnessData {
  workouts?: Workout[];
  records?: Record<string, number>;
  profile?: {
    level?: number;
  };
}

// GET /api/fitness/narrative/encounters - Get recent encounters
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const rivalId = searchParams.get("rivalId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

  const where: { user_id: string; rival_id?: string } = { user_id: user.id };
  if (rivalId) {
    where.rival_id = rivalId;
  }

  const encounters = await prisma.fitness_encounters.findMany({
    where,
    orderBy: { encounter_date: "desc" },
    take: limit,
    include: {
      rival: {
        select: {
          rival_type: true,
        },
      },
    },
  });

  return NextResponse.json({
    encounters: encounters.map((e) => ({
      id: e.id,
      rivalId: e.rival_id,
      rivalType: e.rival.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
      winner: e.winner.toLowerCase(),
      winningMargin: e.winning_margin,
      dominantFactor: e.dominant_factor,
      userMetrics: e.user_metrics,
      rivalMetrics: e.rival_metrics,
      respectDelta: e.respect_delta,
      heatDelta: e.heat_delta,
      encounterDate: e.encounter_date.toISOString(),
    })),
  });
});

// POST /api/fitness/narrative/encounters - Calculate and record encounter
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, triggerEncounterSchema);
  if (body instanceof NextResponse) return body;

  // Get the rival
  const rival = await prisma.fitness_rivals.findFirst({
    where: {
      id: body.rivalId,
      user_id: user.id,
    },
  });

  if (!rival) {
    return Errors.notFound("Rival not found");
  }

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!fitnessData?.data) {
    return Errors.invalidInput("No fitness data available");
  }

  const userFitness = fitnessData.data as FitnessData;
  const workouts = userFitness.workouts || [];
  const records = userFitness.records || {};

  // Calculate time periods
  const currentWeekStart = getWeekStartDate();
  const previousWeekStart = getPreviousWeekStartDate();

  // Get workouts for each period
  const currentWeekWorkouts = getWorkoutsInWeek(workouts, currentWeekStart);
  const previousWeekWorkouts = getWorkoutsInWeek(workouts, previousWeekStart);

  if (currentWeekWorkouts.length === 0) {
    return Errors.invalidInput("No workouts this week to compare");
  }

  // Build user improvement snapshot
  const userSnapshot = buildImprovementSnapshot(
    currentWeekWorkouts,
    previousWeekWorkouts,
    records,
    {}, // No previous records tracking yet
    4 // Default target workouts
  );

  // Calculate user score
  const userScore = calculateImprovementScore(userSnapshot);

  // Calculate rival score based on type
  let rivalScore;
  let rivalMetrics;

  if (rival.rival_type === "AI_PHANTOM") {
    // Generate phantom stats
    const phantomConfig = rival.phantom_config as unknown as PhantomConfig;
    const previousPhantomStats = await getPhantomPreviousStats(
      user.id,
      rival.id
    );

    const phantomStats = generatePhantomStats(
      userSnapshot,
      phantomConfig,
      previousPhantomStats
    );

    // Store phantom stats for next comparison
    await storePhantomStats(user.id, rival.id, phantomStats);

    // Convert to snapshot for scoring
    const rivalSnapshot = phantomStatsToSnapshot(
      phantomStats,
      previousPhantomStats
    );
    rivalScore = calculateImprovementScore(rivalSnapshot);

    rivalMetrics = {
      volumeChange:
        rivalSnapshot.volumeLastWeek > 0
          ? ((rivalSnapshot.volumeThisWeek - rivalSnapshot.volumeLastWeek) /
              rivalSnapshot.volumeLastWeek) *
            100
          : rivalSnapshot.volumeThisWeek > 0
            ? 100
            : 0,
      consistencyChange: 0,
      prCount: rivalSnapshot.prsThisWeek,
      workoutCount: rivalSnapshot.workoutsThisWeek,
      totalVolume: rivalSnapshot.volumeThisWeek,
      topExerciseGains: [],
    };
  } else {
    // Friend rival - fetch their data
    const friendFitness = await prisma.gamify_fitness_data.findUnique({
      where: { user_id: rival.friend_id! },
    });

    if (!friendFitness?.data) {
      return Errors.invalidInput("Friend has no fitness data");
    }

    const friendData = friendFitness.data as FitnessData;
    const friendWorkouts = friendData.workouts || [];
    const friendRecords = friendData.records || {};

    const friendCurrentWeek = getWorkoutsInWeek(
      friendWorkouts,
      currentWeekStart
    );
    const friendPreviousWeek = getWorkoutsInWeek(
      friendWorkouts,
      previousWeekStart
    );

    const friendSnapshot = buildImprovementSnapshot(
      friendCurrentWeek,
      friendPreviousWeek,
      friendRecords,
      {},
      4
    );

    rivalScore = calculateImprovementScore(friendSnapshot);

    rivalMetrics = {
      volumeChange:
        friendSnapshot.volumeLastWeek > 0
          ? ((friendSnapshot.volumeThisWeek - friendSnapshot.volumeLastWeek) /
              friendSnapshot.volumeLastWeek) *
            100
          : friendSnapshot.volumeThisWeek > 0
            ? 100
            : 0,
      consistencyChange: 0,
      prCount: friendSnapshot.prsThisWeek,
      workoutCount: friendSnapshot.workoutsThisWeek,
      totalVolume: friendSnapshot.volumeThisWeek,
      topExerciseGains: friendSnapshot.topExerciseGains,
    };
  }

  // Determine winner using personality-specific victory conditions
  let victoryResult: VictoryResult;

  if (rival.rival_type === "AI_PHANTOM") {
    // Get phantom personality for victory calculation
    const phantomConfig = rival.phantom_config as unknown as PhantomConfig;
    const personality = (phantomConfig?.personality || "rival") as PhantomPersonality;

    // Build rival snapshot for victory calculation
    const rivalSnapshotForVictory = {
      volumeThisWeek: rivalMetrics.totalVolume,
      volumeLastWeek: 0, // Will be calculated from previous stats
      workoutsThisWeek: rivalMetrics.workoutCount,
      workoutsLastWeek: 0,
      prsThisWeek: rivalMetrics.prCount,
      consistencyScore: (rivalMetrics.workoutCount / 4) * 100,
      topExerciseGains: [],
    };

    victoryResult = calculateVictory(
      personality,
      userSnapshot,
      rivalSnapshotForVictory
    );
  } else {
    // Friend rivals - use stored victory condition or default to "rival"
    const friendConfig = rival.phantom_config as unknown as { personality?: PhantomPersonality } | null;
    const friendPersonality = (friendConfig?.personality || "rival") as PhantomPersonality;

    const rivalSnapshotForVictory = {
      volumeThisWeek: rivalMetrics.totalVolume,
      volumeLastWeek: 0,
      workoutsThisWeek: rivalMetrics.workoutCount,
      workoutsLastWeek: 0,
      prsThisWeek: rivalMetrics.prCount,
      consistencyScore: (rivalMetrics.workoutCount / 4) * 100,
      topExerciseGains: rivalMetrics.topExerciseGains || [],
    };

    victoryResult = calculateVictory(
      friendPersonality,
      userSnapshot,
      rivalSnapshotForVictory
    );
  }

  // Map victory result to old format for compatibility
  const result = {
    winner: victoryResult.winner,
    margin: victoryResult.winningMargin,
    dominantFactor: victoryResult.dominantFactor,
  };

  // Calculate state changes
  const respectDelta = calculateRespectDelta(result.winner, result.margin);
  const heatDelta = calculateHeatDelta(result.winner, rival.win_streak);

  // Calculate new win streak
  let newWinStreak = rival.win_streak;
  if (result.winner === "user") {
    newWinStreak = rival.win_streak >= 0 ? rival.win_streak + 1 : 1;
  } else if (result.winner === "rival") {
    newWinStreak = rival.win_streak <= 0 ? rival.win_streak - 1 : -1;
  }

  // Calculate new longest streaks
  const newLongestWinStreak =
    newWinStreak > rival.longest_win_streak
      ? newWinStreak
      : rival.longest_win_streak;
  const newLongestLoseStreak =
    Math.abs(newWinStreak) > rival.longest_lose_streak && newWinStreak < 0
      ? Math.abs(newWinStreak)
      : rival.longest_lose_streak;

  // Calculate new respect level (1-5)
  const newRespectLevel = Math.min(
    5,
    Math.max(1, rival.respect_level + respectDelta)
  );

  // Calculate new heat (0-100)
  const newHeat = Math.min(100, Math.max(0, rival.rivalry_heat + heatDelta));

  // Build user metrics
  const userMetrics = {
    volumeChange:
      userSnapshot.volumeLastWeek > 0
        ? ((userSnapshot.volumeThisWeek - userSnapshot.volumeLastWeek) /
            userSnapshot.volumeLastWeek) *
          100
        : userSnapshot.volumeThisWeek > 0
          ? 100
          : 0,
    consistencyChange: 0,
    prCount: userSnapshot.prsThisWeek,
    workoutCount: userSnapshot.workoutsThisWeek,
    totalVolume: userSnapshot.volumeThisWeek,
    topExerciseGains: userSnapshot.topExerciseGains,
  };

  // Create encounter record
  const encounter = await prisma.fitness_encounters.create({
    data: {
      user_id: user.id,
      rival_id: rival.id,
      user_metrics: userMetrics,
      rival_metrics: rivalMetrics,
      user_score: {
        volumeChange: userScore.volumeChange,
        consistencyScore: userScore.consistencyScore,
        prScore: userScore.prScore,
        compositeScore: userScore.compositeScore,
      },
      rival_score: {
        volumeChange: rivalScore.volumeChange,
        consistencyScore: rivalScore.consistencyScore,
        prScore: rivalScore.prScore,
        compositeScore: rivalScore.compositeScore,
      },
      winner: result.winner,
      winning_margin: result.margin,
      dominant_factor: result.dominantFactor,
      respect_delta: respectDelta,
      heat_delta: heatDelta,
      encounter_date: new Date(),
    },
  });

  // Update rival stats
  await prisma.fitness_rivals.update({
    where: { id: rival.id },
    data: {
      respect_level: newRespectLevel,
      rivalry_heat: newHeat,
      encounter_count: rival.encounter_count + 1,
      win_streak: newWinStreak,
      longest_win_streak: newLongestWinStreak,
      longest_lose_streak: newLongestLoseStreak,
      user_wins:
        result.winner === "user" ? rival.user_wins + 1 : rival.user_wins,
      rival_wins:
        result.winner === "rival" ? rival.rival_wins + 1 : rival.rival_wins,
      ties: result.winner === "tie" ? rival.ties + 1 : rival.ties,
      last_encounter: new Date(),
    },
  });

  return NextResponse.json({
    id: encounter.id,
    rivalId: rival.id,
    rivalType: rival.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
    winner: result.winner,
    winningMargin: result.margin,
    dominantFactor: result.dominantFactor,
    narrative: victoryResult.narrative,
    breakdown: victoryResult.breakdown,
    userMetrics,
    userScore: {
      volumeChange: userScore.volumeChange,
      consistencyScore: userScore.consistencyScore,
      prScore: userScore.prScore,
      compositeScore: userScore.compositeScore,
    },
    rivalMetrics,
    rivalScore: {
      volumeChange: rivalScore.volumeChange,
      consistencyScore: rivalScore.consistencyScore,
      prScore: rivalScore.prScore,
      compositeScore: rivalScore.compositeScore,
    },
    respectDelta,
    heatDelta,
    newRespectLevel,
    newRivalryHeat: newHeat,
    winStreak: newWinStreak,
    encounterDate: encounter.encounter_date.toISOString(),
  });
});

// Helper: Calculate respect delta based on outcome
function calculateRespectDelta(
  winner: "user" | "rival" | "tie",
  margin: number
): number {
  if (winner === "tie") return 0;

  // Base delta based on win/loss
  let delta = winner === "user" ? 1 : -1;

  // Bonus/penalty for large margins
  if (margin > 20) {
    delta *= 2;
  }

  return delta;
}

// Helper: Calculate heat delta based on outcome and streaks
function calculateHeatDelta(
  winner: "user" | "rival" | "tie",
  currentStreak: number
): number {
  // Close matches increase heat
  if (winner === "tie") return 10;

  // Losing increases heat (frustration), winning maintains it
  let delta = winner === "rival" ? 15 : 5;

  // Streaks increase heat
  if (Math.abs(currentStreak) >= 3) {
    delta += 10;
  }

  return delta;
}

// Helper: Get previous phantom stats from most recent encounter
async function getPhantomPreviousStats(
  userId: string,
  rivalId: string
): Promise<PhantomStats | undefined> {
  const lastEncounter = await prisma.fitness_encounters.findFirst({
    where: {
      user_id: userId,
      rival_id: rivalId,
    },
    orderBy: { encounter_date: "desc" },
  });

  if (!lastEncounter) return undefined;

  const metrics = lastEncounter.rival_metrics as {
    totalVolume?: number;
    workoutCount?: number;
    prCount?: number;
  };

  return {
    weeklyVolume: metrics.totalVolume || 0,
    weeklyWorkouts: metrics.workoutCount || 0,
    weeklyConsistency: 0,
    weeklyPRs: metrics.prCount || 0,
    lastUpdated: lastEncounter.encounter_date.toISOString(),
  };
}

// Helper: Store phantom stats (for now, just cache in encounter metrics)
async function storePhantomStats(
  _userId: string,
  _rivalId: string,
  _stats: PhantomStats
): Promise<void> {
  // Stats are stored as part of encounter metrics
  // Could be extended to use a separate cache table if needed
}
