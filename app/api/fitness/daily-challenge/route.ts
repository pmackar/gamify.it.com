import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';
import { EXERCISES } from '@/lib/fitness/data';

interface Challenge {
  id: string;
  type: 'volume' | 'sets' | 'exercise' | 'pr_attempt' | 'duration';
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  expiresAt: string;
  completed: boolean;
}

/**
 * GET /api/fitness/daily-challenge
 *
 * Get today's personalized challenges based on user history
 */
export const GET = withAuth(async (_request, user) => {
  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  const data = fitnessData?.data as any || {};
  const workouts = data.workouts || [];
  const records = data.records || {};
  const profile = data.profile || {};

  // Calculate user's baseline stats from last 2 weeks
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

  const recentWorkouts = workouts.filter((w: any) => {
    if (!w.startTime) return false;
    return new Date(w.startTime) >= twoWeeksAgo;
  });

  const stats = calculateUserStats(recentWorkouts);

  // Get today's date as seed for consistent challenges
  const today = new Date();
  const dateKey = today.toISOString().split('T')[0];

  // Check if user already has challenges for today (stored in fitness data)
  const storedChallenges = data.dailyChallenges?.[dateKey];

  let challenges: Challenge[];

  if (storedChallenges) {
    // Return existing challenges with updated progress
    challenges = updateChallengeProgress(storedChallenges, getTodaysWorkout(workouts));
  } else {
    // Generate new challenges based on user's history
    challenges = generateChallenges(stats, records, dateKey);

    // Save to fitness data
    await prisma.gamify_fitness_data.update({
      where: { user_id: user.id },
      data: {
        data: {
          ...data,
          dailyChallenges: {
            ...data.dailyChallenges,
            [dateKey]: challenges,
          },
        },
        updated_at: new Date(),
      },
    });
  }

  // Calculate time remaining
  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);
  const hoursRemaining = Math.ceil((endOfDay.getTime() - Date.now()) / (1000 * 60 * 60));

  return NextResponse.json({
    challenges,
    date: dateKey,
    hoursRemaining,
    allCompleted: challenges.every(c => c.completed),
    bonusXP: challenges.every(c => c.completed) ? 50 : 0, // Bonus for completing all
  });
});

/**
 * POST /api/fitness/daily-challenge
 *
 * Mark a challenge as complete
 */
export const POST = withAuth(async (request, user) => {
  const { challengeId } = await request.json();

  if (!challengeId) {
    return Errors.invalidInput('Challenge ID required');
  }

  const today = new Date().toISOString().split('T')[0];

  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!fitnessData) {
    return Errors.notFound('Fitness data');
  }

  const data = fitnessData.data as any;
  const challenges = data.dailyChallenges?.[today] as Challenge[];

  if (!challenges) {
    return Errors.notFound('Challenges');
  }

  const challenge = challenges.find(c => c.id === challengeId);

  if (!challenge) {
    return Errors.notFound('Challenge');
  }

  if (challenge.completed) {
    return NextResponse.json({ success: true, alreadyCompleted: true });
  }

  // Mark as complete
  challenge.completed = true;

  await prisma.gamify_fitness_data.update({
    where: { user_id: user.id },
    data: {
      data: {
        ...data,
        dailyChallenges: {
          ...data.dailyChallenges,
          [today]: challenges,
        },
      },
      updated_at: new Date(),
    },
  });

  // Award XP
  await prisma.profiles.update({
    where: { id: user.id },
    data: {
      total_xp: { increment: challenge.xpReward },
    },
  });

  return NextResponse.json({
    success: true,
    xpAwarded: challenge.xpReward,
    message: `+${challenge.xpReward} XP! Challenge complete!`,
  });
});

// Helper functions
function calculateUserStats(workouts: any[]) {
  if (workouts.length === 0) {
    return {
      avgWorkoutsPerWeek: 0,
      avgSetsPerWorkout: 10,
      avgVolumePerWorkout: 5000,
      avgDuration: 30,
      mostUsedExercises: [] as string[],
      experience: 'beginner' as const,
    };
  }

  let totalSets = 0;
  let totalVolume = 0;
  let totalDuration = 0;
  const exerciseCounts: Record<string, number> = {};

  for (const workout of workouts) {
    totalDuration += workout.duration || 0;
    for (const exercise of workout.exercises || []) {
      exerciseCounts[exercise.id] = (exerciseCounts[exercise.id] || 0) + 1;
      for (const set of exercise.sets || []) {
        if (!set.isWarmup) {
          totalSets++;
          totalVolume += (set.weight || 0) * (set.reps || 0);
        }
      }
    }
  }

  const mostUsedExercises = Object.entries(exerciseCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id);

  const avgWorkoutsPerWeek = workouts.length / 2; // 2 weeks of data
  const experience = avgWorkoutsPerWeek >= 4 ? 'advanced' :
                     avgWorkoutsPerWeek >= 2 ? 'intermediate' : 'beginner';

  return {
    avgWorkoutsPerWeek,
    avgSetsPerWorkout: workouts.length > 0 ? Math.round(totalSets / workouts.length) : 10,
    avgVolumePerWorkout: workouts.length > 0 ? Math.round(totalVolume / workouts.length) : 5000,
    avgDuration: workouts.length > 0 ? Math.round(totalDuration / workouts.length / 60) : 30,
    mostUsedExercises,
    experience,
  };
}

function generateChallenges(
  stats: ReturnType<typeof calculateUserStats>,
  records: Record<string, number>,
  dateKey: string
): Challenge[] {
  const challenges: Challenge[] = [];
  const seed = hashCode(dateKey);

  // Easy challenge: Based on sets
  const easySetTarget = Math.max(6, Math.round(stats.avgSetsPerWorkout * 0.7));
  challenges.push({
    id: `${dateKey}-sets`,
    type: 'sets',
    title: 'Set Starter',
    description: `Complete ${easySetTarget} sets today`,
    target: easySetTarget,
    current: 0,
    xpReward: 25,
    difficulty: 'easy',
    expiresAt: getEndOfDay(),
    completed: false,
  });

  // Medium challenge: Volume target
  const mediumVolumeTarget = Math.round(stats.avgVolumePerWorkout * 1.1);
  challenges.push({
    id: `${dateKey}-volume`,
    type: 'volume',
    title: 'Volume King',
    description: `Lift ${(mediumVolumeTarget / 1000).toFixed(1)}k lbs total volume`,
    target: mediumVolumeTarget,
    current: 0,
    xpReward: 50,
    difficulty: 'medium',
    expiresAt: getEndOfDay(),
    completed: false,
  });

  // Hard challenge: Based on user's patterns
  if (stats.mostUsedExercises.length > 0) {
    // PR attempt on a favorite exercise
    const exerciseId = stats.mostUsedExercises[seed % stats.mostUsedExercises.length];
    const exercise = EXERCISES.find(e => e.id === exerciseId);
    const currentPR = records[exerciseId] || 0;

    if (exercise && currentPR > 0) {
      challenges.push({
        id: `${dateKey}-pr`,
        type: 'pr_attempt',
        title: 'PR Hunter',
        description: `Beat your ${exercise.name} PR (${currentPR} lbs)`,
        target: currentPR + 5,
        current: 0,
        xpReward: 100,
        difficulty: 'hard',
        expiresAt: getEndOfDay(),
        completed: false,
      });
    } else {
      // Fallback: duration challenge
      const durationTarget = Math.round(stats.avgDuration * 1.2);
      challenges.push({
        id: `${dateKey}-duration`,
        type: 'duration',
        title: 'Endurance Test',
        description: `Work out for ${durationTarget}+ minutes`,
        target: durationTarget,
        current: 0,
        xpReward: 75,
        difficulty: 'hard',
        expiresAt: getEndOfDay(),
        completed: false,
      });
    }
  }

  return challenges;
}

function updateChallengeProgress(challenges: Challenge[], todayWorkout: any): Challenge[] {
  if (!todayWorkout) return challenges;

  let totalSets = 0;
  let totalVolume = 0;
  const duration = Math.round((todayWorkout.duration || 0) / 60);

  for (const exercise of todayWorkout.exercises || []) {
    for (const set of exercise.sets || []) {
      if (!set.isWarmup) {
        totalSets++;
        totalVolume += (set.weight || 0) * (set.reps || 0);
      }
    }
  }

  return challenges.map(c => {
    let current = c.current;

    switch (c.type) {
      case 'sets':
        current = totalSets;
        break;
      case 'volume':
        current = totalVolume;
        break;
      case 'duration':
        current = duration;
        break;
    }

    const completed = c.completed || current >= c.target;

    return { ...c, current, completed };
  });
}

function getTodaysWorkout(workouts: any[]): any | null {
  const today = new Date().toISOString().split('T')[0];

  return workouts.find((w: any) => {
    if (!w.startTime) return false;
    return w.startTime.split('T')[0] === today;
  });
}

function getEndOfDay(): string {
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return end.toISOString();
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
