import { NextResponse } from 'next/server';
import { withAuth } from '@/lib/api';
import prisma from '@/lib/db';
import { GENERAL_ACHIEVEMENTS, MILESTONES } from '@/lib/fitness/data';

interface AchievementProgress {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  progress: number; // 0-100
  current: number;
  target: number;
  isUnlocked: boolean;
  category: 'general' | 'milestone' | 'streak';
}

/**
 * GET /api/fitness/achievement-progress
 *
 * Get progress towards all achievements, sorted by closest to unlocking
 */
export const GET = withAuth(async (_request, user) => {
  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  // Get profile for streak info
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      current_streak: true,
      longest_streak: true,
    },
  });

  const data = fitnessData?.data as any || {};
  const workouts = data.workouts || [];
  const records = data.records || {};
  const unlockedAchievements = data.achievements || [];
  const fitnessProfile = data.profile || {};

  const achievementProgress: AchievementProgress[] = [];

  // Process general achievements
  for (const achievement of GENERAL_ACHIEVEMENTS) {
    const isUnlocked = unlockedAchievements.includes(achievement.id);
    let current = 0;
    let target = 1;

    // Calculate progress based on achievement type
    switch (achievement.id) {
      case 'first_workout':
        target = 1;
        current = workouts.length > 0 ? 1 : 0;
        break;
      case 'week_warrior':
        target = 7;
        current = countWorkoutsInPeriod(workouts, 7);
        break;
      case 'month_master':
        target = 30;
        current = countWorkoutsInPeriod(workouts, 30);
        break;
      case 'century_club':
        target = 100;
        current = fitnessProfile.totalWorkouts || 0;
        break;
      case 'pr_hunter':
        target = 10;
        current = Object.keys(records).length;
        break;
      case 'variety_king':
        target = 20;
        current = countUniqueExercises(workouts);
        break;
      case 'early_bird':
        target = 5;
        current = countMorningWorkouts(workouts);
        break;
      case 'night_owl':
        target = 5;
        current = countEveningWorkouts(workouts);
        break;
      case 'streak_starter':
        target = 3;
        current = profile?.current_streak || 0;
        break;
      case 'streak_warrior':
        target = 7;
        current = profile?.current_streak || 0;
        break;
      case 'streak_legend':
        target = 30;
        current = profile?.longest_streak || 0;
        break;
      case 'volume_king':
        target = 100000;
        current = fitnessProfile.totalVolume || 0;
        break;
      case 'set_master':
        target = 1000;
        current = fitnessProfile.totalSets || 0;
        break;
      default:
        // Generic: assume unlocked/not based on list
        current = isUnlocked ? 1 : 0;
        target = 1;
    }

    const progress = Math.min(100, Math.round((current / target) * 100));

    achievementProgress.push({
      id: achievement.id,
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      xp: achievement.xp,
      progress,
      current,
      target,
      isUnlocked,
      category: 'general',
    });
  }

  // Process milestone achievements
  for (const [exerciseId, milestones] of Object.entries(MILESTONES)) {
    const currentPR = records[exerciseId] || 0;

    for (const milestone of milestones as Array<{ weight: number; name: string; icon: string; xp: number }>) {
      const id = `${exerciseId}_${milestone.weight}`;
      const isUnlocked = currentPR >= milestone.weight;
      const progress = Math.min(100, Math.round((currentPR / milestone.weight) * 100));

      achievementProgress.push({
        id,
        name: milestone.name,
        description: `Lift ${milestone.weight} lbs on ${exerciseId}`,
        icon: milestone.icon,
        xp: milestone.xp,
        progress,
        current: currentPR,
        target: milestone.weight,
        isUnlocked,
        category: 'milestone',
      });
    }
  }

  // Sort by: closest to unlocking (highest progress that's not 100%)
  const inProgress = achievementProgress
    .filter(a => !a.isUnlocked && a.progress > 0)
    .sort((a, b) => b.progress - a.progress);

  const notStarted = achievementProgress
    .filter(a => !a.isUnlocked && a.progress === 0);

  const unlocked = achievementProgress
    .filter(a => a.isUnlocked);

  // Get top 3 closest to unlocking
  const almostThere = inProgress.slice(0, 3);

  // Calculate summary stats
  const totalAchievements = achievementProgress.length;
  const unlockedCount = unlocked.length;
  const completionPercentage = Math.round((unlockedCount / totalAchievements) * 100);

  return NextResponse.json({
    summary: {
      total: totalAchievements,
      unlocked: unlockedCount,
      inProgress: inProgress.length,
      completionPercentage,
    },
    almostThere, // Top 3 closest to unlocking
    inProgress: inProgress.slice(0, 10), // Top 10 in progress
    unlocked: unlocked.slice(0, 20), // Recent unlocked
    notStarted: notStarted.slice(0, 10), // Some not started
  });
});

// Helper functions
function countWorkoutsInPeriod(workouts: any[], days: number): number {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);

  return workouts.filter((w: any) => {
    if (!w.startTime) return false;
    return new Date(w.startTime) >= cutoff;
  }).length;
}

function countUniqueExercises(workouts: any[]): number {
  const exerciseIds = new Set<string>();
  for (const workout of workouts) {
    for (const exercise of workout.exercises || []) {
      exerciseIds.add(exercise.id);
    }
  }
  return exerciseIds.size;
}

function countMorningWorkouts(workouts: any[]): number {
  return workouts.filter((w: any) => {
    if (!w.startTime) return false;
    const hour = new Date(w.startTime).getHours();
    return hour >= 5 && hour < 9;
  }).length;
}

function countEveningWorkouts(workouts: any[]): number {
  return workouts.filter((w: any) => {
    if (!w.startTime) return false;
    const hour = new Date(w.startTime).getHours();
    return hour >= 20 && hour < 24;
  }).length;
}
