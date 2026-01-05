import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';

interface ReflectionData {
  mood?: 'great' | 'good' | 'tired' | 'tough';
  energy?: 1 | 2 | 3 | 4 | 5;
  note?: string;
  timestamp: string;
}

/**
 * POST /api/fitness/reflection
 *
 * Save a post-workout reflection
 */
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { workoutId, reflection } = body as { workoutId: string; reflection: ReflectionData };

  if (!workoutId || !reflection) {
    return Errors.invalidInput('Missing workoutId or reflection data');
  }

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!fitnessData) {
    return Errors.notFound('Fitness data');
  }

  const data = fitnessData.data as any;
  const workouts = data?.workouts || [];

  // Find the workout and add reflection
  const workoutIndex = workouts.findIndex((w: any) => w.id === workoutId);

  if (workoutIndex === -1) {
    return Errors.notFound('Workout');
  }

  // Add reflection to workout
  workouts[workoutIndex].reflection = reflection;

  // Update fitness data
  await prisma.gamify_fitness_data.update({
    where: { user_id: user.id },
    data: {
      data: { ...data, workouts },
      updated_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    reflection,
  });
});

/**
 * GET /api/fitness/reflection
 *
 * Get reflection history and mood trends
 */
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const days = parseInt(searchParams.get('days') || '30');

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!fitnessData) {
    return NextResponse.json({ reflections: [], trends: null });
  }

  const data = fitnessData.data as any;
  const workouts = data?.workouts || [];

  // Get workouts with reflections from the last N days
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);

  const reflections = workouts
    .filter((w: any) => {
      if (!w.reflection || !w.startTime) return false;
      return new Date(w.startTime) >= cutoffDate;
    })
    .map((w: any) => ({
      workoutId: w.id,
      date: w.startTime,
      duration: w.duration,
      exerciseCount: w.exercises?.length || 0,
      reflection: w.reflection,
    }))
    .sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Calculate mood trends
  const moodCounts: Record<string, number> = { great: 0, good: 0, tired: 0, tough: 0 };
  let totalEnergy = 0;
  let energyCount = 0;

  reflections.forEach((r: any) => {
    if (r.reflection.mood) {
      moodCounts[r.reflection.mood]++;
    }
    if (r.reflection.energy) {
      totalEnergy += r.reflection.energy;
      energyCount++;
    }
  });

  const trends = reflections.length > 0 ? {
    totalReflections: reflections.length,
    moodDistribution: moodCounts,
    averageEnergy: energyCount > 0 ? (totalEnergy / energyCount).toFixed(1) : null,
    mostCommonMood: Object.entries(moodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null,
  } : null;

  return NextResponse.json({
    reflections: reflections.slice(0, 20), // Last 20 reflections
    trends,
  });
});
