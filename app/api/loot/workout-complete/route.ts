import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';
import { rollWorkoutLoot, WorkoutLootContext, getItem } from '@/lib/loot';

/**
 * POST /api/loot/workout-complete
 *
 * Roll for workout-level loot with quality-based rarity scaling.
 * Guaranteed drop every workout - better workouts = better loot chances.
 */
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { totalXP, exerciseCount, prsHit, setCount } = body;

  // Validate required fields
  if (typeof totalXP !== 'number' || totalXP < 0) {
    return Errors.invalidInput('Invalid totalXP');
  }

  // Get user's current streak for bonus calculation
  const profile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { current_streak: true },
  });

  const streakDays = profile?.current_streak || 0;

  // Build workout context for loot calculation
  const context: WorkoutLootContext = {
    totalXP: totalXP || 0,
    exerciseCount: exerciseCount || 0,
    prsHit: prsHit || 0,
    streakDays,
    setCount: setCount || 0,
  };

  // Roll for workout loot (guaranteed drop)
  const lootResult = rollWorkoutLoot(context);
  const { drop, rarity, bonusApplied } = lootResult;

  // Find or create the item in database
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

  // Handle instant XP items (XP crystals)
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
    // Add non-instant items to inventory
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
          source: 'fitness_workout',
        },
      });
    }
  }

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
      rarity,
      quantity: 1,
      instantXP: instantXPAwarded || undefined,
    },
    bonuses: bonusApplied,
    workoutContext: {
      totalXP: context.totalXP,
      exerciseCount: context.exerciseCount,
      prsHit: context.prsHit,
      streakDays: context.streakDays,
      setCount: context.setCount,
    },
  });
});
