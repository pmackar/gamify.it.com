/**
 * Loot Drop Calculator
 *
 * Handles rolling for loot drops based on drop tables
 */

import {
  STANDARD_DROP_TABLE,
  BOOSTED_DROP_TABLE,
  RarityTier,
  DropTableEntry,
  LootItem,
  ItemRarity,
  getItem,
} from './loot-tables';

export interface LootDrop {
  item: LootItem;
  quantity: number;
  instantXP?: number; // XP crystals grant instant XP
}

export interface LootRollResult {
  dropped: boolean;
  drop?: LootDrop;
  rarity?: ItemRarity;
}

/**
 * Roll for a loot drop
 *
 * @param boosted Whether to use boosted drop rates
 * @param luckMultiplier Multiplier for drop chances (1.0 = normal)
 * @returns The loot roll result
 */
export function rollForLoot(
  boosted: boolean = false,
  luckMultiplier: number = 1.0
): LootRollResult {
  const dropTable = boosted ? BOOSTED_DROP_TABLE : STANDARD_DROP_TABLE;

  // Roll for rarity tier (check from legendary down to common)
  // This ensures higher tiers are checked first
  const sortedTiers = [...dropTable].sort((a, b) => {
    const rarityOrder: Record<ItemRarity, number> = {
      LEGENDARY: 4,
      EPIC: 3,
      RARE: 2,
      COMMON: 1,
    };
    return rarityOrder[b.rarity] - rarityOrder[a.rarity];
  });

  const roll = Math.random();
  let cumulativeChance = 0;

  for (const tier of sortedTiers) {
    const adjustedChance = Math.min(tier.chance * luckMultiplier, 0.5); // Cap at 50%
    cumulativeChance += adjustedChance;

    if (roll < cumulativeChance) {
      // We hit this tier! Now roll for specific item
      const item = rollForItem(tier.drops);
      if (item) {
        const drop = createDrop(item);
        return {
          dropped: true,
          drop,
          rarity: tier.rarity,
        };
      }
    }
  }

  // No drop
  return { dropped: false };
}

/**
 * Roll for a specific item within a rarity tier
 */
function rollForItem(drops: DropTableEntry[]): LootItem | null {
  const totalWeight = drops.reduce((sum, d) => sum + d.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of drops) {
    roll -= entry.weight;
    if (roll <= 0) {
      return getItem(entry.itemCode) || null;
    }
  }

  return null;
}

/**
 * Create a loot drop from an item
 */
function createDrop(item: LootItem): LootDrop {
  const drop: LootDrop = {
    item,
    quantity: 1,
  };

  // XP crystals grant instant XP
  if (item.effects?.xp_bonus) {
    drop.instantXP = item.effects.xp_bonus as number;
  }

  return drop;
}

/**
 * Roll for loot from a loot box
 *
 * @param minRarity Minimum rarity guaranteed
 * @returns The loot drop
 */
export function openLootBox(minRarity: ItemRarity): LootDrop | null {
  const rarityOrder: Record<ItemRarity, number> = {
    COMMON: 1,
    RARE: 2,
    EPIC: 3,
    LEGENDARY: 4,
  };

  // Filter tiers to only include ones at or above min rarity
  const eligibleTiers = STANDARD_DROP_TABLE.filter(
    (tier) => rarityOrder[tier.rarity] >= rarityOrder[minRarity]
  );

  if (eligibleTiers.length === 0) return null;

  // Redistribute chances among eligible tiers
  const totalChance = eligibleTiers.reduce((sum, t) => sum + t.chance, 0);
  const roll = Math.random() * totalChance;
  let cumulative = 0;

  for (const tier of eligibleTiers) {
    cumulative += tier.chance;
    if (roll < cumulative) {
      const item = rollForItem(tier.drops);
      if (item) {
        return createDrop(item);
      }
    }
  }

  // Fallback: pick random item from lowest eligible tier
  const fallbackTier = eligibleTiers[0];
  const item = rollForItem(fallbackTier.drops);
  return item ? createDrop(item) : null;
}

/**
 * Calculate drop chance display text
 */
export function getDropChanceText(rarity: ItemRarity): string {
  const tier = STANDARD_DROP_TABLE.find((t) => t.rarity === rarity);
  if (!tier) return '???';

  const percentage = tier.chance * 100;
  if (percentage < 1) {
    return `${percentage.toFixed(1)}%`;
  }
  return `${Math.round(percentage)}%`;
}

/**
 * Simulate multiple drops for testing/preview
 */
export function simulateDrops(
  count: number,
  boosted: boolean = false
): Map<ItemRarity | 'NONE', number> {
  const results = new Map<ItemRarity | 'NONE', number>([
    ['NONE', 0],
    ['COMMON', 0],
    ['RARE', 0],
    ['EPIC', 0],
    ['LEGENDARY', 0],
  ]);

  for (let i = 0; i < count; i++) {
    const roll = rollForLoot(boosted);
    if (roll.dropped && roll.rarity) {
      results.set(roll.rarity, (results.get(roll.rarity) || 0) + 1);
    } else {
      results.set('NONE', (results.get('NONE') || 0) + 1);
    }
  }

  return results;
}
