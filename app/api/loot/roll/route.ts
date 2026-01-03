import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import prisma from '@/lib/db';
import { rollForLoot, LootDrop } from '@/lib/loot';

/**
 * POST /api/loot/roll
 *
 * Roll for a loot drop after completing an action
 * Called internally by XP API or directly from clients
 */
export async function POST(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { source, boosted = false } = body;

    // Valid sources: 'task', 'workout', 'location', 'quest', 'daily_reward'
    const validSources = ['task', 'workout', 'location', 'quest', 'daily_reward', 'achievement'];
    if (!validSources.includes(source)) {
      return NextResponse.json({ error: 'Invalid source' }, { status: 400 });
    }

    // Roll for loot
    const result = rollForLoot(boosted);

    if (!result.dropped || !result.drop) {
      return NextResponse.json({
        dropped: false,
        message: 'No loot this time. Keep playing!',
      });
    }

    const drop = result.drop;

    // Find or create the item in the database
    let dbItem = await prisma.inventory_items.findUnique({
      where: { code: drop.item.code },
    });

    if (!dbItem) {
      // Create the item if it doesn't exist
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
    let xpAwarded = 0;
    if (drop.instantXP) {
      xpAwarded = drop.instantXP;
      // Award XP directly to profile
      await prisma.profiles.update({
        where: { id: user.id },
        data: {
          total_xp: { increment: xpAwarded },
          updated_at: new Date(),
        },
      });
    } else {
      // Add to user's inventory
      await addToInventory(user.id, dbItem.id, drop.quantity, source);
    }

    return NextResponse.json({
      dropped: true,
      drop: {
        item: {
          code: drop.item.code,
          name: drop.item.name,
          description: drop.item.description,
          icon: drop.item.icon,
          rarity: drop.item.rarity,
          type: drop.item.type,
        },
        quantity: drop.quantity,
        instantXP: xpAwarded || undefined,
      },
      rarity: result.rarity,
      message: getLootMessage(result.rarity!, drop),
    });
  } catch (error) {
    console.error('Loot roll error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Add item to user's inventory
 */
async function addToInventory(
  userId: string,
  itemId: string,
  quantity: number,
  source: string
): Promise<void> {
  // Check if user already has this item
  const existing = await prisma.user_inventory.findFirst({
    where: {
      user_id: userId,
      item_id: itemId,
    },
  });

  if (existing) {
    // Get item to check max stack
    const item = await prisma.inventory_items.findUnique({
      where: { id: itemId },
    });

    const maxStack = item?.max_stack;
    const newQuantity = existing.quantity + quantity;

    // If stackable and under max, just increment
    if (item?.stackable && (!maxStack || newQuantity <= maxStack)) {
      await prisma.user_inventory.update({
        where: { id: existing.id },
        data: {
          quantity: newQuantity,
          acquired_at: new Date(), // Update last acquired time
        },
      });
      return;
    }

    // If at max stack or not stackable, create new entry
    if (!item?.stackable || (maxStack && existing.quantity >= maxStack)) {
      await prisma.user_inventory.create({
        data: {
          user_id: userId,
          item_id: itemId,
          quantity,
          source,
        },
      });
      return;
    }

    // Partial stack: fill current, create new for remainder
    const fillAmount = maxStack! - existing.quantity;
    await prisma.user_inventory.update({
      where: { id: existing.id },
      data: { quantity: maxStack },
    });

    if (quantity - fillAmount > 0) {
      await prisma.user_inventory.create({
        data: {
          user_id: userId,
          item_id: itemId,
          quantity: quantity - fillAmount,
          source,
        },
      });
    }
  } else {
    // Create new inventory entry
    await prisma.user_inventory.create({
      data: {
        user_id: userId,
        item_id: itemId,
        quantity,
        source,
      },
    });
  }
}

/**
 * Get a fun message based on drop rarity
 */
function getLootMessage(rarity: string, drop: LootDrop): string {
  if (drop.instantXP) {
    switch (rarity) {
      case 'LEGENDARY':
        return `🌟 LEGENDARY! You found ${drop.item.name} worth ${drop.instantXP} XP!`;
      case 'EPIC':
        return `⚡ EPIC DROP! ${drop.item.name} grants you ${drop.instantXP} XP!`;
      case 'RARE':
        return `✨ Nice! ${drop.item.name} - ${drop.instantXP} bonus XP!`;
      default:
        return `💎 Found ${drop.item.name} (+${drop.instantXP} XP)`;
    }
  }

  switch (rarity) {
    case 'LEGENDARY':
      return `🌟 LEGENDARY DROP! You found ${drop.item.name}!`;
    case 'EPIC':
      return `⚡ EPIC! You got ${drop.item.name}!`;
    case 'RARE':
      return `✨ Rare find! ${drop.item.name}`;
    default:
      return `Found ${drop.item.name}`;
  }
}
