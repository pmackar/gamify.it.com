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
  };
  workouts?: Workout[];
  records?: Record<string, number>;
}

interface Activity {
  id: string;
  type: "workout" | "pr";
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  };
  workout?: {
    id: string;
    exercises: number;
    sets: number;
    duration: number;
    xp: number;
    topExercise: string | null;
  };
  pr?: {
    exerciseName: string;
    weight: number;
  };
  timestamp: Date;
}

// GET /api/fitness/friends-activity - Get friends' recent fitness activity
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);

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

  if (friendIds.length === 0) {
    return NextResponse.json({ activities: [] });
  }

  // Get fitness data for all friends
  const fitnessData = await prisma.gamify_fitness_data.findMany({
    where: {
      user_id: { in: friendIds },
    },
  });

  // Get user profiles
  const profiles = await prisma.profiles.findMany({
    where: { id: { in: friendIds } },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      main_level: true,
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Build activities from workout data
  const activities: Activity[] = [];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  for (const data of fitnessData) {
    const profile = profileMap.get(data.user_id);
    if (!profile) continue;

    const fitnessState = data.data as FitnessData;
    if (!fitnessState?.workouts) continue;

    // Get recent workouts
    for (const workout of fitnessState.workouts) {
      const workoutDate = new Date(workout.endTime || workout.startTime);
      if (workoutDate < sevenDaysAgo) continue;

      // Calculate workout stats
      let totalSets = 0;
      let topExercise: string | null = null;
      let maxSets = 0;

      for (const exercise of workout.exercises) {
        const workingSets = exercise.sets.filter((s) => !s.isWarmup);
        totalSets += workingSets.length;
        if (workingSets.length > maxSets) {
          maxSets = workingSets.length;
          topExercise = exercise.name;
        }
      }

      activities.push({
        id: `workout-${data.user_id}-${workout.id}`,
        type: "workout",
        user: {
          id: data.user_id,
          username: profile.username,
          displayName: profile.display_name,
          avatarUrl: profile.avatar_url,
          level: profile.main_level || 1,
        },
        workout: {
          id: workout.id,
          exercises: workout.exercises.length,
          sets: totalSets,
          duration: workout.duration || 0,
          xp: workout.totalXP,
          topExercise,
        },
        timestamp: workoutDate,
      });
    }
  }

  // Sort by timestamp and take top items
  activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  const topActivities = activities.slice(0, limit);

  return NextResponse.json({
    activities: topActivities.map((a) => ({
      ...a,
      timestamp: a.timestamp.toISOString(),
    })),
  });
}
