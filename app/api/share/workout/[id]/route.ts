import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface WorkoutData {
  workouts?: Array<{
    id: string;
    date: string;
    duration?: number;
    exercises?: Array<{
      name: string;
      sets?: Array<{
        weight?: number;
        reps?: number;
        rpe?: number;
      }>;
    }>;
  }>;
}

// GET /api/share/workout/[id] - Get shareable workout data
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: workoutId } = await context.params;

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!fitnessData) {
    return NextResponse.json({ error: "No fitness data" }, { status: 404 });
  }

  const data = fitnessData.data as WorkoutData;
  const workouts = data.workouts || [];
  const workout = workouts.find((w) => w.id === workoutId);

  if (!workout) {
    return NextResponse.json({ error: "Workout not found" }, { status: 404 });
  }

  // Get user profile
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      username: true,
      display_name: true,
      avatar_url: true,
      main_level: true,
    },
  });

  // Calculate workout stats
  let totalVolume = 0;
  let totalSets = 0;
  const exerciseNames: string[] = [];
  const prs: Array<{ exercise: string; weight: number; reps: number }> = [];

  for (const exercise of workout.exercises || []) {
    exerciseNames.push(exercise.name);
    for (const set of exercise.sets || []) {
      totalSets++;
      totalVolume += (set.weight || 0) * (set.reps || 0);
    }
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gamify.it.com";
  const shareUrl = `${baseUrl}/share/workout/${workoutId}`;

  return NextResponse.json({
    share: {
      type: "workout",
      id: workoutId,
      date: workout.date,
      duration: workout.duration,
      exerciseCount: workout.exercises?.length || 0,
      exercises: exerciseNames.slice(0, 5),
      totalSets,
      totalVolume,
      prs,
      user: {
        displayName: profile?.display_name || profile?.username,
        avatarUrl: profile?.avatar_url,
        level: profile?.main_level,
      },
      shareUrl,
      socialText: `Just crushed a ${workout.exercises?.length || 0} exercise workout on gamify.it.com! 💪 ${
        totalVolume > 0 ? `Total volume: ${totalVolume.toLocaleString()} lbs` : ""
      }`,
      ogImage: `${baseUrl}/api/og/workout/${workoutId}`,
    },
  });
}
