import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';
import { openLootBox, ItemRarity } from '@/lib/loot';

// Helper to get start of week (Sunday)
function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const dayOfWeek = d.getDay();
  d.setDate(d.getDate() - dayOfWeek);
  d.setHours(0, 0, 0, 0);
  return d;
}

// Helper to count workouts from fitness data JSON
function countWorkoutsInWeek(fitnessData: any, weekStart: Date): number {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  const workouts = fitnessData?.workouts || [];
  return workouts.filter((w: any) => {
    if (!w.startTime) return false;
    const workoutDate = new Date(w.startTime);
    return workoutDate >= weekStart && workoutDate < weekEnd;
  }).length;
}

/**
 * GET /api/loot/weekly-box
 *
 * Check weekly workout progress and eligibility for weekly loot box
 */
export const GET = withAuth(async (request, user) => {
  const now = new Date();
  const startOfWeek = getWeekStart(now);
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);
  endOfWeek.setHours(23, 59, 59, 999);

  // Get user's fitness data
  const [appProfile, fitnessData] = await Promise.all([
    prisma.app_profiles.findUnique({
      where: {
        user_id_app_id: { user_id: user.id, app_id: 'fitness' },
      },
      select: { stats: true },
    }),
    prisma.gamify_fitness_data.findUnique({
      where: { user_id: user.id },
      select: { data: true },
    }),
  ]);

  const stats = (appProfile?.stats || {}) as Record<string, any>;

  // Check for weekly box claim status
  const lastWeeklyBoxClaim = stats.lastWeeklyBoxClaim
    ? new Date(stats.lastWeeklyBoxClaim)
    : null;

  // Already claimed this week?
  const alreadyClaimed = lastWeeklyBoxClaim && lastWeeklyBoxClaim >= startOfWeek;

  // Count workouts from fitness data JSON
  const weeklyWorkoutCount = countWorkoutsInWeek(fitnessData?.data, startOfWeek);

  // Determine eligibility
  let eligibleRarity: ItemRarity | null = null;
  if (weeklyWorkoutCount >= 7) {
    eligibleRarity = 'LEGENDARY';
  } else if (weeklyWorkoutCount >= 5) {
    eligibleRarity = 'EPIC';
  } else if (weeklyWorkoutCount >= 3) {
    eligibleRarity = 'RARE';
  }

  return NextResponse.json({
    weekStart: startOfWeek.toISOString(),
    weekEnd: endOfWeek.toISOString(),
    workoutsThisWeek: weeklyWorkoutCount,
    eligibleRarity,
    alreadyClaimed,
    thresholds: {
      rare: 3,
      epic: 5,
      legendary: 7,
    },
    nextThreshold: weeklyWorkoutCount < 3
      ? { count: 3, rarity: 'RARE' }
      : weeklyWorkoutCount < 5
        ? { count: 5, rarity: 'EPIC' }
        : weeklyWorkoutCount < 7
          ? { count: 7, rarity: 'LEGENDARY' }
          : null,
  });
});

/**
 * POST /api/loot/weekly-box
 *
 * Claim weekly loot box if eligible
 */
export const POST = withAuth(async (request, user) => {
  const now = new Date();
  const startOfWeek = getWeekStart(now);

  // Get user's fitness data and stats
  const [appProfile, fitnessData] = await Promise.all([
    prisma.app_profiles.findUnique({
      where: {
        user_id_app_id: { user_id: user.id, app_id: 'fitness' },
      },
    }),
    prisma.gamify_fitness_data.findUnique({
      where: { user_id: user.id },
      select: { data: true },
    }),
  ]);

  if (!appProfile) {
    return Errors.notFound('Fitness profile not found');
  }

  const stats = (appProfile.stats || {}) as Record<string, any>;

  // Check if already claimed this week
  const lastWeeklyBoxClaim = stats.lastWeeklyBoxClaim
    ? new Date(stats.lastWeeklyBoxClaim)
    : null;

  if (lastWeeklyBoxClaim && lastWeeklyBoxClaim >= startOfWeek) {
    return Errors.forbidden('Weekly loot box already claimed this week');
  }

  // Count workouts from fitness data JSON
  const weeklyWorkoutCount = countWorkoutsInWeek(fitnessData?.data, startOfWeek);

  // Determine minimum rarity based on workout count
  let minRarity: ItemRarity;
  if (weeklyWorkoutCount >= 7) {
    minRarity = 'LEGENDARY';
  } else if (weeklyWorkoutCount >= 5) {
    minRarity = 'EPIC';
  } else if (weeklyWorkoutCount >= 3) {
    minRarity = 'RARE';
  } else {
    return Errors.forbidden('Need at least 3 workouts this week to claim weekly loot box');
  }

  // Roll for loot with guaranteed minimum rarity
  const drop = openLootBox(minRarity);

  if (!drop) {
    return Errors.internal('Failed to generate loot');
  }

  // Find or create item in database
  let dbItem = await prisma.inventory_items.findUnique({
    where: { code: drop.item.code },
  });

  if (!dbItem) {
    dbItem = await prisma.inventory_items.create({
      data: {
        code: drop.item.code,
        name: drop.item.name,
        description: drop.item.description,
        type: drop.item.type,
        rarity: drop.item.rarity,
        icon: drop.item.icon,
        effects: drop.item.effects || {},
        stackable: drop.item.stackable,
        max_stack: drop.item.maxStack,
      },
    });
  }

  // Handle instant XP
  let instantXPAwarded = 0;
  if (drop.instantXP) {
    instantXPAwarded = drop.instantXP;
    await prisma.profiles.update({
      where: { id: user.id },
      data: {
        total_xp: { increment: drop.instantXP },
        updated_at: new Date(),
      },
    });
  } else {
    // Add to inventory
    const existing = await prisma.user_inventory.findFirst({
      where: { user_id: user.id, item_id: dbItem.id },
    });

    if (existing && drop.item.stackable) {
      await prisma.user_inventory.update({
        where: { id: existing.id },
        data: { quantity: { increment: 1 }, acquired_at: new Date() },
      });
    } else {
      await prisma.user_inventory.create({
        data: {
          user_id: user.id,
          item_id: dbItem.id,
          quantity: 1,
          source: 'weekly_loot_box',
        },
      });
    }
  }

  // Update claim timestamp
  await prisma.app_profiles.update({
    where: { id: appProfile.id },
    data: {
      stats: {
        ...stats,
        lastWeeklyBoxClaim: now.toISOString(),
        totalWeeklyBoxesClaimed: ((stats.totalWeeklyBoxesClaimed as number) || 0) + 1,
      },
      updated_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    loot: {
      item: {
        code: drop.item.code,
        name: drop.item.name,
        icon: drop.item.icon,
        description: drop.item.description,
        type: drop.item.type,
      },
      rarity: drop.item.rarity,
      quantity: 1,
      instantXP: instantXPAwarded || undefined,
    },
    workoutsThisWeek: weeklyWorkoutCount,
    guaranteedRarity: minRarity,
  });
});
