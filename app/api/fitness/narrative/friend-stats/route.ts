/**
 * Narrative Engine - Friend Stats API
 *
 * GET: Fetch friend's fitness stats for comparison
 */

import { NextResponse } from "next/server";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";
import {
  buildImprovementSnapshot,
  calculateImprovementScore,
  getWeekStartDate,
  getPreviousWeekStartDate,
  getWorkoutsInWeek,
} from "@/lib/fitness/narrative/improvement-calculator";
import type { Workout } from "@/lib/fitness/types";

interface FitnessData {
  workouts?: Workout[];
  records?: Record<string, number>;
  profile?: {
    name?: string;
    level?: number;
    totalWorkouts?: number;
    totalVolume?: number;
  };
}

// GET /api/fitness/narrative/friend-stats?friendId=xxx
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const friendId = searchParams.get("friendId");

  if (!friendId) {
    return Errors.invalidInput("Friend ID required");
  }

  // Verify friendship exists
  const friendship = await prisma.friendships.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requester_id: user.id, addressee_id: friendId },
        { requester_id: friendId, addressee_id: user.id },
      ],
    },
  });

  if (!friendship) {
    return Errors.forbidden("Not friends with this user");
  }

  // Get friend's profile
  const friendProfile = await prisma.profiles.findUnique({
    where: { id: friendId },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      main_level: true,
    },
  });

  if (!friendProfile) {
    return Errors.notFound("Friend not found");
  }

  // Get friend's fitness data
  const friendFitness = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: friendId },
  });

  if (!friendFitness?.data) {
    return NextResponse.json({
      friend: {
        id: friendProfile.id,
        username: friendProfile.username,
        displayName: friendProfile.display_name,
        avatarUrl: friendProfile.avatar_url,
        level: friendProfile.main_level || 1,
      },
      hasData: false,
      stats: null,
    });
  }

  const fitnessData = friendFitness.data as FitnessData;
  const workouts = fitnessData.workouts || [];
  const records = fitnessData.records || {};

  // Calculate time periods
  const currentWeekStart = getWeekStartDate();
  const previousWeekStart = getPreviousWeekStartDate();

  // Get workouts for each period
  const currentWeekWorkouts = getWorkoutsInWeek(workouts, currentWeekStart);
  const previousWeekWorkouts = getWorkoutsInWeek(workouts, previousWeekStart);

  // Build improvement snapshot
  const snapshot = buildImprovementSnapshot(
    currentWeekWorkouts,
    previousWeekWorkouts,
    records,
    {},
    4
  );

  // Calculate improvement score
  const score = calculateImprovementScore(snapshot);

  // Calculate some summary stats
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentWorkouts = workouts.filter(
    (w) => new Date(w.startTime) >= thirtyDaysAgo
  );

  // Count PRs in records (approximation)
  const prCount = Object.keys(records).length;

  // Get top exercises by PR weight
  const topExercises = Object.entries(records)
    .sort(([, a], [, b]) => (b as number) - (a as number))
    .slice(0, 5)
    .map(([name, weight]) => ({ name, weight }));

  return NextResponse.json({
    friend: {
      id: friendProfile.id,
      username: friendProfile.username,
      displayName: friendProfile.display_name,
      avatarUrl: friendProfile.avatar_url,
      level: friendProfile.main_level || 1,
    },
    hasData: true,
    stats: {
      // Current week stats
      currentWeek: {
        workouts: currentWeekWorkouts.length,
        volume: snapshot.volumeThisWeek,
        prs: snapshot.prsThisWeek,
      },
      // Previous week stats
      previousWeek: {
        workouts: previousWeekWorkouts.length,
        volume: snapshot.volumeLastWeek,
      },
      // Improvement score
      improvementScore: {
        volumeChange: score.volumeChange,
        consistencyScore: score.consistencyScore,
        prScore: score.prScore,
        compositeScore: score.compositeScore,
      },
      // Summary stats
      summary: {
        totalWorkouts: fitnessData.profile?.totalWorkouts || workouts.length,
        totalVolume: fitnessData.profile?.totalVolume || 0,
        totalPRs: prCount,
        workoutsLast30Days: recentWorkouts.length,
        topExercises,
      },
    },
    lastUpdated: friendFitness.updated_at?.toISOString(),
  });
});
