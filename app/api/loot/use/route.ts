import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import prisma from '@/lib/db';

/**
 * POST /api/loot/use
 *
 * Use an item from inventory
 */
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { inventoryId, itemCode } = body;

  if (!inventoryId && !itemCode) {
    return Errors.invalidInput('Must provide inventoryId or itemCode');
  }

    // Find the inventory entry
    let inventoryEntry;
    if (inventoryId) {
      inventoryEntry = await prisma.user_inventory.findFirst({
        where: {
          id: inventoryId,
          user_id: user.id,
        },
        include: { item: true },
      });
    } else {
      // Find by item code (use oldest first)
      inventoryEntry = await prisma.user_inventory.findFirst({
        where: {
          user_id: user.id,
          item: { code: itemCode },
          quantity: { gt: 0 },
        },
        include: { item: true },
        orderBy: { acquired_at: 'asc' },
      });
    }

  if (!inventoryEntry) {
    return Errors.notFound('Item not found in inventory');
  }

  if (inventoryEntry.quantity <= 0) {
    return Errors.invalidInput('No items remaining');
  }

    const item = inventoryEntry.item;
    const effects = item.effects as Record<string, unknown> || {};

    // Apply item effects based on type
    let result: Record<string, unknown> = {};

    switch (item.type) {
      case 'CONSUMABLE':
        result = await applyConsumableEffect(user.id, item.code, effects);
        break;

      case 'COSMETIC':
        result = await equipCosmetic(user.id, item.code, effects);
        break;

      case 'CURRENCY':
        // XP crystals should have been auto-applied on drop
        // But handle if somehow in inventory
        if (effects.xp_bonus) {
          await prisma.profiles.update({
            where: { id: user.id },
            data: {
              total_xp: { increment: effects.xp_bonus as number },
              updated_at: new Date(),
            },
          });
          result = { xpAwarded: effects.xp_bonus };
        }
        break;

      case 'PET':
        // Pet eggs need a separate hatch system
        result = { message: 'Pet hatching coming soon!' };
        // For now, just acknowledge
        break;

      default:
        return Errors.invalidInput('Cannot use this item type');
    }

    // Decrement quantity or remove from inventory
    if (inventoryEntry.quantity === 1) {
      await prisma.user_inventory.delete({
        where: { id: inventoryEntry.id },
      });
    } else {
      await prisma.user_inventory.update({
        where: { id: inventoryEntry.id },
        data: { quantity: { decrement: 1 } },
      });
    }

  return NextResponse.json({
    success: true,
    item: {
      code: item.code,
      name: item.name,
      icon: item.icon,
    },
    effect: result,
    remainingQuantity: Math.max(0, inventoryEntry.quantity - 1),
  });
});

/**
 * Apply consumable item effects
 */
async function applyConsumableEffect(
  userId: string,
  itemCode: string,
  effects: Record<string, unknown>
): Promise<Record<string, unknown>> {
  switch (itemCode) {
    case 'streak_shield':
      // Add to streak shields count
      await prisma.profiles.update({
        where: { id: userId },
        data: {
          streak_shields: { increment: 1 },
          updated_at: new Date(),
        },
      });
      return { message: 'Streak Shield activated! You now have extra protection.' };

    case 'xp_boost_1h':
    case 'xp_boost_24h':
      // Store active boost in user profile
      const durationMinutes = effects.duration_minutes as number || 60;
      const multiplier = effects.xp_multiplier as number || 2.0;
      const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

      // Store boost in profile
      await prisma.profiles.update({
        where: { id: userId },
        data: {
          xp_boost_multiplier: multiplier,
          xp_boost_expires_at: expiresAt,
          updated_at: new Date(),
        },
      });
      return {
        message: `${multiplier}x XP Boost activated for ${Math.round(durationMinutes / 60)} hour${durationMinutes >= 120 ? 's' : ''}!`,
        expiresAt: expiresAt.toISOString(),
        multiplier,
        activated: true,
      };

    case 'loot_box_rare':
    case 'loot_box_epic':
      // Opening loot boxes triggers another roll
      return {
        message: 'Loot box ready to open!',
        action: 'open_loot_box',
        minRarity: effects.min_rarity,
      };

    default:
      return { message: 'Item used successfully' };
  }
}

/**
 * Equip a cosmetic item
 */
async function equipCosmetic(
  userId: string,
  itemCode: string,
  effects: Record<string, unknown>
): Promise<Record<string, unknown>> {
  // Update user's equipped cosmetics
  // This would require adding equipped_cosmetics to the profile

  if (effects.frame_style) {
    // Equip profile frame
    return {
      message: `Equipped ${itemCode.replace(/_/g, ' ')}!`,
      equipped: 'frame',
      style: effects.frame_style,
    };
  }

  if (effects.title) {
    // Equip title
    return {
      message: `Title "${effects.title}" equipped!`,
      equipped: 'title',
      title: effects.title,
    };
  }

  return { message: 'Cosmetic equipped!' };
}
