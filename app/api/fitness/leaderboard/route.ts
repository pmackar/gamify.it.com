import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface Workout {
  id: string;
  exercises: Array<{
    id: string;
    name: string;
    sets: Array<{
      weight: number;
      reps: number;
      xp: number;
      isWarmup?: boolean;
    }>;
  }>;
  startTime: string;
  endTime?: string;
  totalXP: number;
  duration?: number;
}

interface FitnessData {
  profile?: {
    name: string;
    level: number;
    xp: number;
    totalWorkouts: number;
    totalVolume: number;
  };
  workouts?: Workout[];
  records?: Record<string, number>;
}

// GET /api/fitness/leaderboard - Get friends fitness leaderboard
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "workouts"; // workouts, xp, volume, prs
  const period = searchParams.get("period") || "week"; // week, month, all

  // Get user's friends
  const friendships = await prisma.friendships.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requester_id: user.id }, { addressee_id: user.id }],
    },
    select: {
      requester_id: true,
      addressee_id: true,
    },
  });

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Include current user
  const allUserIds = [user.id, ...friendIds];

  // Get fitness data for all users
  const fitnessData = await prisma.gamify_fitness_data.findMany({
    where: {
      user_id: { in: allUserIds },
    },
  });

  // Get user profiles
  const profiles = await prisma.profiles.findMany({
    where: { id: { in: allUserIds } },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      main_level: true,
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const fitnessMap = new Map(fitnessData.map((f) => [f.user_id, f.data as FitnessData]));

  // Calculate period cutoff
  let periodCutoff: Date | null = null;
  if (period === "week") {
    periodCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  } else if (period === "month") {
    periodCutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  }

  // Build leaderboard entries
  const entries = allUserIds.map((userId) => {
    const profile = profileMap.get(userId);
    const fitness = fitnessMap.get(userId);

    let value = 0;
    let workoutsCount = 0;
    let totalXP = 0;
    let totalVolume = 0;
    let prsCount = 0;

    if (fitness?.workouts) {
      // Filter workouts by period
      const relevantWorkouts = periodCutoff
        ? fitness.workouts.filter((w) => {
            const date = new Date(w.endTime || w.startTime);
            return date >= periodCutoff;
          })
        : fitness.workouts;

      workoutsCount = relevantWorkouts.length;
      totalXP = relevantWorkouts.reduce((sum, w) => sum + w.totalXP, 0);

      // Calculate volume
      for (const workout of relevantWorkouts) {
        for (const exercise of workout.exercises) {
          for (const set of exercise.sets) {
            if (!set.isWarmup) {
              totalVolume += set.weight * set.reps;
            }
          }
        }
      }
    }

    // PRs count from records
    if (fitness?.records) {
      prsCount = Object.keys(fitness.records).length;
    }

    // Select value based on type
    switch (type) {
      case "xp":
        value = totalXP;
        break;
      case "volume":
        value = totalVolume;
        break;
      case "prs":
        value = prsCount;
        break;
      default:
        value = workoutsCount;
    }

    return {
      id: userId,
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
      level: profile?.main_level || 1,
      value,
      workouts: workoutsCount,
      xp: totalXP,
      volume: totalVolume,
      prs: prsCount,
      isCurrentUser: userId === user.id,
    };
  });

  // Sort by value descending
  entries.sort((a, b) => b.value - a.value);

  // Add ranks
  const leaderboard = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  // Find current user's rank
  const currentUserRank = leaderboard.find((e) => e.isCurrentUser)?.rank || 0;

  return NextResponse.json({
    leaderboard,
    currentUserRank,
    type,
    period,
    totalFriends: friendIds.length,
  });
}
