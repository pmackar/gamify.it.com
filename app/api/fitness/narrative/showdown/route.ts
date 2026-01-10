/**
 * Narrative Engine - Showdown API
 *
 * GET: Get weekly showdown data for all rivals
 * POST: Calculate and record weekly showdown results
 */

import { NextResponse } from "next/server";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";
import {
  buildImprovementSnapshot,
  calculateImprovementScore,
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
import type { Workout, PhantomStats } from "@/lib/fitness/types";

interface FitnessData {
  workouts?: Workout[];
  records?: Record<string, number>;
  profile?: {
    level?: number;
  };
}

interface ShowdownResult {
  rivalId: string;
  rivalType: "ai_phantom" | "friend";
  rivalName: string;
  winner: "user" | "rival" | "tie";
  margin: number;
  dominantFactor: string;
  userScore: number;
  rivalScore: number;
  userMetrics: {
    workouts: number;
    volume: number;
    prs: number;
  };
  rivalMetrics: {
    workouts: number;
    volume: number;
    prs: number;
  };
}

// GET /api/fitness/narrative/showdown - Get weekly showdown preview
export const GET = withAuth(async (_request, user) => {
  // Get user's active rivals
  const rivals = await prisma.fitness_rivals.findMany({
    where: { user_id: user.id },
  });

  if (rivals.length === 0) {
    return NextResponse.json({
      hasRivals: false,
      rivals: [],
      userStats: null,
    });
  }

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!fitnessData?.data) {
    return NextResponse.json({
      hasRivals: true,
      hasData: false,
      rivals: rivals.map((r) => ({
        id: r.id,
        type: r.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
        phantomConfig: r.phantom_config,
      })),
      userStats: null,
    });
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

  // Build user snapshot
  const userSnapshot = buildImprovementSnapshot(
    currentWeekWorkouts,
    previousWeekWorkouts,
    records,
    {},
    4
  );

  const userScore = calculateImprovementScore(userSnapshot);

  // Build rival previews
  const rivalPreviews = await Promise.all(
    rivals.map(async (rival) => {
      let rivalName = "Unknown";
      let rivalStats = {
        workouts: 0,
        volume: 0,
        prs: 0,
      };

      if (rival.rival_type === "AI_PHANTOM") {
        const config = rival.phantom_config as Record<string, unknown>;
        rivalName = (config?.name as string) || "Shadow Self";
        // AI stats would be generated at showdown time
      } else if (rival.friend_id) {
        const friendProfile = await prisma.profiles.findUnique({
          where: { id: rival.friend_id },
          select: { display_name: true, username: true },
        });
        rivalName =
          friendProfile?.display_name || friendProfile?.username || "Friend";

        // Get friend's current week stats
        const friendFitness = await prisma.gamify_fitness_data.findUnique({
          where: { user_id: rival.friend_id },
        });

        if (friendFitness?.data) {
          const friendData = friendFitness.data as FitnessData;
          const friendWorkouts = friendData.workouts || [];
          const friendCurrentWeek = getWorkoutsInWeek(
            friendWorkouts,
            currentWeekStart
          );
          const friendSnapshot = buildImprovementSnapshot(
            friendCurrentWeek,
            [],
            friendData.records || {},
            {},
            4
          );
          rivalStats = {
            workouts: friendSnapshot.workoutsThisWeek,
            volume: friendSnapshot.volumeThisWeek,
            prs: friendSnapshot.prsThisWeek,
          };
        }
      }

      return {
        id: rival.id,
        type: rival.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
        name: rivalName,
        respectLevel: rival.respect_level,
        rivalryHeat: rival.rivalry_heat,
        headToHead: {
          userWins: rival.user_wins,
          rivalWins: rival.rival_wins,
          ties: rival.ties,
        },
        currentWeekStats: rivalStats,
      };
    })
  );

  return NextResponse.json({
    hasRivals: true,
    hasData: true,
    weekStart: currentWeekStart.toISOString(),
    userStats: {
      workouts: userSnapshot.workoutsThisWeek,
      volume: userSnapshot.volumeThisWeek,
      prs: userSnapshot.prsThisWeek,
      improvementScore: userScore.compositeScore,
    },
    rivals: rivalPreviews,
  });
});

// POST /api/fitness/narrative/showdown - Execute weekly showdown
export const POST = withAuth(async (_request, user) => {
  // Get user's active rivals
  const rivals = await prisma.fitness_rivals.findMany({
    where: { user_id: user.id },
  });

  if (rivals.length === 0) {
    return Errors.invalidInput("No rivals to showdown against");
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

  // Build user snapshot
  const userSnapshot = buildImprovementSnapshot(
    currentWeekWorkouts,
    previousWeekWorkouts,
    records,
    {},
    4
  );

  const userScore = calculateImprovementScore(userSnapshot);

  // Process each rival
  const results: ShowdownResult[] = [];
  let totalWins = 0;
  let totalLosses = 0;
  let totalTies = 0;

  for (const rival of rivals) {
    let rivalScore;
    let rivalMetrics;
    let rivalName = "Unknown";

    if (rival.rival_type === "AI_PHANTOM") {
      const phantomConfig = rival.phantom_config as unknown as PhantomConfig;
      rivalName = (phantomConfig?.name as string) || "Shadow Self";

      // Get previous phantom stats
      const lastEncounter = await prisma.fitness_encounters.findFirst({
        where: { user_id: user.id, rival_id: rival.id },
        orderBy: { encounter_date: "desc" },
      });

      let previousPhantomStats: PhantomStats | undefined;
      if (lastEncounter) {
        const metrics = lastEncounter.rival_metrics as {
          totalVolume?: number;
          workoutCount?: number;
          prCount?: number;
        };
        previousPhantomStats = {
          weeklyVolume: metrics.totalVolume || 0,
          weeklyWorkouts: metrics.workoutCount || 0,
          weeklyConsistency: 0,
          weeklyPRs: metrics.prCount || 0,
          lastUpdated: lastEncounter.encounter_date.toISOString(),
        };
      }

      const phantomStats = generatePhantomStats(
        userSnapshot,
        phantomConfig,
        previousPhantomStats
      );

      const rivalSnapshot = phantomStatsToSnapshot(
        phantomStats,
        previousPhantomStats
      );
      rivalScore = calculateImprovementScore(rivalSnapshot);

      rivalMetrics = {
        workouts: rivalSnapshot.workoutsThisWeek,
        volume: rivalSnapshot.volumeThisWeek,
        prs: rivalSnapshot.prsThisWeek,
      };
    } else {
      // Friend rival
      const friendProfile = await prisma.profiles.findUnique({
        where: { id: rival.friend_id! },
        select: { display_name: true, username: true },
      });
      rivalName =
        friendProfile?.display_name || friendProfile?.username || "Friend";

      const friendFitness = await prisma.gamify_fitness_data.findUnique({
        where: { user_id: rival.friend_id! },
      });

      if (!friendFitness?.data) {
        // Friend has no data - skip this rival
        continue;
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
        workouts: friendSnapshot.workoutsThisWeek,
        volume: friendSnapshot.volumeThisWeek,
        prs: friendSnapshot.prsThisWeek,
      };
    }

    // Determine winner
    const result = determineWinner(userScore, rivalScore);

    // Update counters
    if (result.winner === "user") totalWins++;
    else if (result.winner === "rival") totalLosses++;
    else totalTies++;

    // Calculate state changes
    const respectDelta = result.winner === "tie" ? 0 : result.winner === "user" ? 1 : -1;
    const heatDelta = result.winner === "tie" ? 10 : result.winner === "rival" ? 15 : 5;

    // Calculate new win streak
    let newWinStreak = rival.win_streak;
    if (result.winner === "user") {
      newWinStreak = rival.win_streak >= 0 ? rival.win_streak + 1 : 1;
    } else if (result.winner === "rival") {
      newWinStreak = rival.win_streak <= 0 ? rival.win_streak - 1 : -1;
    }

    const newLongestWinStreak =
      newWinStreak > rival.longest_win_streak
        ? newWinStreak
        : rival.longest_win_streak;
    const newLongestLoseStreak =
      Math.abs(newWinStreak) > rival.longest_lose_streak && newWinStreak < 0
        ? Math.abs(newWinStreak)
        : rival.longest_lose_streak;

    const newRespectLevel = Math.min(
      5,
      Math.max(1, rival.respect_level + respectDelta)
    );
    const newHeat = Math.min(100, Math.max(0, rival.rivalry_heat + heatDelta));

    // Create encounter record
    await prisma.fitness_encounters.create({
      data: {
        user_id: user.id,
        rival_id: rival.id,
        user_metrics: {
          volumeChange: 0,
          consistencyChange: 0,
          prCount: userSnapshot.prsThisWeek,
          workoutCount: userSnapshot.workoutsThisWeek,
          totalVolume: userSnapshot.volumeThisWeek,
          topExerciseGains: userSnapshot.topExerciseGains,
        },
        rival_metrics: {
          volumeChange: 0,
          consistencyChange: 0,
          prCount: rivalMetrics.prs,
          workoutCount: rivalMetrics.workouts,
          totalVolume: rivalMetrics.volume,
          topExerciseGains: [],
        },
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

    results.push({
      rivalId: rival.id,
      rivalType: rival.rival_type === "AI_PHANTOM" ? "ai_phantom" : "friend",
      rivalName,
      winner: result.winner,
      margin: result.margin,
      dominantFactor: result.dominantFactor,
      userScore: userScore.compositeScore,
      rivalScore: rivalScore.compositeScore,
      userMetrics: {
        workouts: userSnapshot.workoutsThisWeek,
        volume: userSnapshot.volumeThisWeek,
        prs: userSnapshot.prsThisWeek,
      },
      rivalMetrics,
    });
  }

  return NextResponse.json({
    showdownDate: new Date().toISOString(),
    weekStart: currentWeekStart.toISOString(),
    summary: {
      totalRivals: results.length,
      wins: totalWins,
      losses: totalLosses,
      ties: totalTies,
      overallResult:
        totalWins > totalLosses
          ? "victory"
          : totalWins < totalLosses
            ? "defeat"
            : "draw",
    },
    results,
  });
});
