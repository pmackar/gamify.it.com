import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';

/**
 * GET /api/fitness/weekly-wins
 *
 * Get weekly wins summary for the user
 */
export const GET = withAuth(async (request, user) => {
  try {
    // Get user's fitness data
    const fitnessData = await prisma.gamify_fitness_data.findUnique({
      where: { user_id: user.id },
    });

    if (!fitnessData) {
      return NextResponse.json({
        hasWins: false,
        message: 'Start working out to see your weekly wins!',
      });
    }

    const data = fitnessData.data as any;
    const workouts = data?.workouts || [];
    const profile = data?.profile || {};

    // Calculate date range for this week (Monday to Sunday)
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;

    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() + mondayOffset);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 7);

    // Also calculate last week's data for comparison
    const lastWeekStart = new Date(weekStart);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekEnd = new Date(weekStart);

    // Filter workouts for this week
    const thisWeekWorkouts = workouts.filter((w: any) => {
      if (!w.startTime) return false;
      const date = new Date(w.startTime);
      return date >= weekStart && date < weekEnd;
    });

    // Filter workouts for last week
    const lastWeekWorkouts = workouts.filter((w: any) => {
      if (!w.startTime) return false;
      const date = new Date(w.startTime);
      return date >= lastWeekStart && date < lastWeekEnd;
    });

    // Calculate this week's stats
    const thisWeekStats = calculateWeekStats(thisWeekWorkouts);
    const lastWeekStats = calculateWeekStats(lastWeekWorkouts);

    // Find PRs hit this week (check recordsMeta for dates)
    const recordsMeta = data?.recordsMeta || {};
    const prsThisWeek: { exerciseId: string; weight: number; date: string }[] = [];

    for (const [exerciseId, meta] of Object.entries(recordsMeta)) {
      const m = meta as any;
      if (m.date) {
        const prDate = new Date(m.date);
        if (prDate >= weekStart && prDate < weekEnd) {
          prsThisWeek.push({
            exerciseId,
            weight: data.records[exerciseId] || 0,
            date: m.date,
          });
        }
      }
    }

    // Calculate improvements
    const workoutChange = lastWeekStats.workoutCount > 0
      ? Math.round(((thisWeekStats.workoutCount - lastWeekStats.workoutCount) / lastWeekStats.workoutCount) * 100)
      : thisWeekStats.workoutCount > 0 ? 100 : 0;

    const volumeChange = lastWeekStats.totalVolume > 0
      ? Math.round(((thisWeekStats.totalVolume - lastWeekStats.totalVolume) / lastWeekStats.totalVolume) * 100)
      : thisWeekStats.totalVolume > 0 ? 100 : 0;

    // Determine if there are wins to celebrate
    const hasWins = thisWeekStats.workoutCount > 0 || prsThisWeek.length > 0;

    // Generate motivational message
    let message = '';
    if (thisWeekStats.workoutCount >= 5) {
      message = "Beast mode activated! You're crushing it! 🔥";
    } else if (thisWeekStats.workoutCount >= 3) {
      message = "Great consistency this week! Keep it up! 💪";
    } else if (thisWeekStats.workoutCount >= 1) {
      message = "Every workout counts! You showed up! ✓";
    } else if (lastWeekStats.workoutCount > 0) {
      message = "You've got this! Let's get back on track! 🎯";
    }

    if (prsThisWeek.length > 0) {
      message = `${prsThisWeek.length} PR${prsThisWeek.length > 1 ? 's' : ''} this week! You're getting stronger! 🏆`;
    }

    return NextResponse.json({
      hasWins,
      weekStart: weekStart.toISOString(),
      weekEnd: weekEnd.toISOString(),
      thisWeek: {
        workouts: thisWeekStats.workoutCount,
        sets: thisWeekStats.totalSets,
        volume: thisWeekStats.totalVolume,
        xp: thisWeekStats.totalXP,
        duration: thisWeekStats.totalDuration,
        prs: prsThisWeek.length,
        exercises: thisWeekStats.uniqueExercises,
      },
      lastWeek: {
        workouts: lastWeekStats.workoutCount,
        sets: lastWeekStats.totalSets,
        volume: lastWeekStats.totalVolume,
        xp: lastWeekStats.totalXP,
      },
      improvements: {
        workoutChange,
        volumeChange,
      },
      prs: prsThisWeek,
      message,
      // When to show next (for Sunday evening prompt)
      nextPromptDate: getNextSundayEvening().toISOString(),
    });
  } catch (error) {
    console.error('Weekly wins error:', error);
    return Errors.internal('Failed to calculate weekly wins');
  }
});

function calculateWeekStats(workouts: any[]) {
  let totalSets = 0;
  let totalVolume = 0;
  let totalXP = 0;
  let totalDuration = 0;
  const exerciseIds = new Set<string>();

  for (const workout of workouts) {
    totalXP += workout.totalXP || 0;
    totalDuration += workout.duration || 0;

    for (const exercise of workout.exercises || []) {
      exerciseIds.add(exercise.id);
      for (const set of exercise.sets || []) {
        if (!set.isWarmup) {
          totalSets++;
          totalVolume += (set.weight || 0) * (set.reps || 0);
        }
      }
    }
  }

  return {
    workoutCount: workouts.length,
    totalSets,
    totalVolume,
    totalXP,
    totalDuration,
    uniqueExercises: exerciseIds.size,
  };
}

function getNextSundayEvening(): Date {
  const now = new Date();
  const daysUntilSunday = (7 - now.getDay()) % 7 || 7;
  const nextSunday = new Date(now);
  nextSunday.setDate(now.getDate() + daysUntilSunday);
  nextSunday.setHours(18, 0, 0, 0); // 6pm Sunday
  return nextSunday;
}
