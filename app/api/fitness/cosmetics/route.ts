import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';
import {
  PROFILE_TITLES,
  PROFILE_FRAMES,
  PROFILE_THEMES,
  getUnlockedTitles,
  RARITY_COLORS,
} from '@/lib/fitness/titles';

/**
 * GET /api/fitness/cosmetics
 *
 * Get user's unlocked and equipped cosmetics
 */
export const GET = withAuth(async (_request, user) => {
  // Get user's fitness data for stats
  const [fitnessData, profile] = await Promise.all([
    prisma.gamify_fitness_data.findUnique({
      where: { user_id: user.id },
    }),
    prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        current_streak: true,
        longest_streak: true,
        main_level: true,
        display_name: true,
        avatar_url: true,
      },
    }),
  ]);

  const data = fitnessData?.data as any || {};
  const fitnessProfile = data.profile || {};
  const records = data.records || {};

  // Calculate stats for title unlocks
  const stats = {
    workoutCount: fitnessProfile.totalWorkouts || 0,
    streak: profile?.current_streak || 0,
    longestStreak: profile?.longest_streak || 0,
    prCount: Object.keys(records).length,
    totalVolume: fitnessProfile.totalVolume || 0,
  };

  // Get unlocked titles
  const unlockedTitleIds = getUnlockedTitles(stats);
  const unlockedTitles = PROFILE_TITLES.filter(t => unlockedTitleIds.includes(t.id));
  const lockedTitles = PROFILE_TITLES.filter(t => !unlockedTitleIds.includes(t.id));

  // Get unlocked frames based on level
  const level = profile?.main_level || 1;
  const unlockedFrames = PROFILE_FRAMES.filter(f => f.level <= level);
  const lockedFrames = PROFILE_FRAMES.filter(f => f.level > level);

  // Get unlocked themes
  const unlockedThemes = PROFILE_THEMES.filter(t => {
    if (!t.unlockedBy) return true;
    return unlockedTitleIds.includes(t.unlockedBy);
  });
  const lockedThemes = PROFILE_THEMES.filter(t => {
    if (!t.unlockedBy) return false;
    return !unlockedTitleIds.includes(t.unlockedBy);
  });

  // Get equipped cosmetics from fitness data
  const equipped = data.equippedCosmetics || {
    title: null,
    frame: 'default',
    theme: 'default',
  };

  return NextResponse.json({
    stats,
    equipped,
    titles: {
      unlocked: unlockedTitles.map(t => ({
        ...t,
        colors: RARITY_COLORS[t.rarity],
      })),
      locked: lockedTitles.map(t => ({
        ...t,
        colors: RARITY_COLORS[t.rarity],
        progress: calculateProgress(t, stats),
      })),
    },
    frames: {
      unlocked: unlockedFrames,
      locked: lockedFrames.map(f => ({
        ...f,
        currentLevel: level,
      })),
    },
    themes: {
      unlocked: unlockedThemes,
      locked: lockedThemes.map(t => {
        const requiredTitle = PROFILE_TITLES.find(title => title.id === t.unlockedBy);
        return {
          ...t,
          requiredTitle: requiredTitle?.name,
        };
      }),
    },
  });
});

/**
 * POST /api/fitness/cosmetics
 *
 * Equip a cosmetic item
 */
export const POST = withAuth(async (request, user) => {
  const { type, itemId } = await request.json();

  if (!type || !['title', 'frame', 'theme'].includes(type)) {
    return Errors.invalidInput('Invalid cosmetic type');
  }

  // Get fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  if (!fitnessData) {
    return Errors.notFound('Fitness data');
  }

  const data = fitnessData.data as any;

  // Verify the item is unlocked
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: {
      current_streak: true,
      longest_streak: true,
      main_level: true,
    },
  });

  const fitnessProfile = data.profile || {};
  const records = data.records || {};

  const stats = {
    workoutCount: fitnessProfile.totalWorkouts || 0,
    streak: profile?.current_streak || 0,
    longestStreak: profile?.longest_streak || 0,
    prCount: Object.keys(records).length,
    totalVolume: fitnessProfile.totalVolume || 0,
  };

  let isUnlocked = false;

  if (type === 'title') {
    if (itemId === null) {
      isUnlocked = true; // Can always unequip
    } else {
      const unlockedTitleIds = getUnlockedTitles(stats);
      isUnlocked = unlockedTitleIds.includes(itemId);
    }
  } else if (type === 'frame') {
    const level = profile?.main_level || 1;
    const frame = PROFILE_FRAMES.find(f => f.id === itemId);
    isUnlocked = frame ? frame.level <= level : false;
  } else if (type === 'theme') {
    const theme = PROFILE_THEMES.find(t => t.id === itemId);
    if (!theme) {
      isUnlocked = false;
    } else if (!theme.unlockedBy) {
      isUnlocked = true;
    } else {
      const unlockedTitleIds = getUnlockedTitles(stats);
      isUnlocked = unlockedTitleIds.includes(theme.unlockedBy);
    }
  }

  if (!isUnlocked) {
    return Errors.invalidInput('Item not unlocked');
  }

  // Update equipped cosmetics
  const equippedCosmetics = {
    ...data.equippedCosmetics,
    [type]: itemId,
  };

  await prisma.gamify_fitness_data.update({
    where: { user_id: user.id },
    data: {
      data: {
        ...data,
        equippedCosmetics,
      },
      updated_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    equipped: equippedCosmetics,
    message: `${type.charAt(0).toUpperCase() + type.slice(1)} equipped!`,
  });
});

// Helper to calculate progress towards a title
function calculateProgress(
  title: typeof PROFILE_TITLES[0],
  stats: { workoutCount: number; streak: number; longestStreak: number; prCount: number; totalVolume: number }
): number {
  let current = 0;

  switch (title.requirement.type) {
    case 'workout_count':
      current = stats.workoutCount;
      break;
    case 'streak':
      current = stats.longestStreak;
      break;
    case 'pr_count':
      current = stats.prCount;
      break;
    case 'volume':
      current = stats.totalVolume;
      break;
  }

  return Math.min(100, Math.round((current / title.requirement.value) * 100));
}
