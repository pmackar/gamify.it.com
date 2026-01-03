import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import prisma from '@/lib/db';

/**
 * GET /api/loot/inventory
 *
 * Get user's inventory
 */
export async function GET() {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const inventory = await prisma.user_inventory.findMany({
      where: { user_id: user.id },
      include: {
        item: true,
      },
      orderBy: [
        { item: { rarity: 'desc' } },
        { acquired_at: 'desc' },
      ],
    });

    // Group items by type
    const grouped = {
      consumables: inventory.filter((i) => i.item.type === 'CONSUMABLE'),
      cosmetics: inventory.filter((i) => i.item.type === 'COSMETIC'),
      pets: inventory.filter((i) => i.item.type === 'PET'),
      currency: inventory.filter((i) => i.item.type === 'CURRENCY'),
    };

    // Calculate totals
    const totals = {
      items: inventory.length,
      uniqueItems: new Set(inventory.map((i) => i.item.code)).size,
      byRarity: {
        COMMON: inventory.filter((i) => i.item.rarity === 'COMMON').length,
        RARE: inventory.filter((i) => i.item.rarity === 'RARE').length,
        EPIC: inventory.filter((i) => i.item.rarity === 'EPIC').length,
        LEGENDARY: inventory.filter((i) => i.item.rarity === 'LEGENDARY').length,
      },
    };

    return NextResponse.json({
      inventory: inventory.map((inv) => ({
        id: inv.id,
        quantity: inv.quantity,
        acquiredAt: inv.acquired_at,
        expiresAt: inv.expires_at,
        source: inv.source,
        item: {
          id: inv.item.id,
          code: inv.item.code,
          name: inv.item.name,
          description: inv.item.description,
          type: inv.item.type,
          rarity: inv.item.rarity,
          icon: inv.item.icon,
          effects: inv.item.effects,
          stackable: inv.item.stackable,
          maxStack: inv.item.max_stack,
        },
      })),
      grouped: {
        consumables: grouped.consumables.length,
        cosmetics: grouped.cosmetics.length,
        pets: grouped.pets.length,
        currency: grouped.currency.length,
      },
      totals,
    });
  } catch (error) {
    console.error('Inventory fetch error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
