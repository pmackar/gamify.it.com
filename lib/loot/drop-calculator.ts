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

// ============================================
// WORKOUT-LEVEL LOOT SYSTEM (Phase 2)
// ============================================

export interface WorkoutLootContext {
  totalXP: number;
  exerciseCount: number;
  prsHit: number;
  streakDays: number;
  setCount: number;
}

export interface WorkoutLootResult {
  drop: LootDrop;
  rarity: ItemRarity;
  bonusApplied: string[];
}

/**
 * Workout-level drop table - guaranteed drop every workout
 * Base rates (without bonuses):
 * - 60% Common
 * - 25% Rare
 * - 12% Epic
 * - 3% Legendary
 */
const WORKOUT_DROP_TABLE: RarityTier[] = [
  {
    rarity: 'COMMON',
    chance: 0.60,
    drops: STANDARD_DROP_TABLE[0].drops,
  },
  {
    rarity: 'RARE',
    chance: 0.25,
    drops: STANDARD_DROP_TABLE[1].drops,
  },
  {
    rarity: 'EPIC',
    chance: 0.12,
    drops: STANDARD_DROP_TABLE[2].drops,
  },
  {
    rarity: 'LEGENDARY',
    chance: 0.03,
    drops: STANDARD_DROP_TABLE[3].drops,
  },
];

/**
 * Calculate rarity bonus based on workout quality
 * Returns a multiplier that shifts drops toward higher rarities
 */
function calculateRarityBonus(context: WorkoutLootContext): { bonus: number; reasons: string[] } {
  let bonus = 0;
  const reasons: string[] = [];

  // PR hit: +10% rarity shift per PR (max +30%)
  if (context.prsHit > 0) {
    const prBonus = Math.min(context.prsHit * 0.10, 0.30);
    bonus += prBonus;
    reasons.push(`${context.prsHit} PR${context.prsHit > 1 ? 's' : ''}`);
  }

  // 3+ exercises: +5%
  if (context.exerciseCount >= 3) {
    bonus += 0.05;
    reasons.push(`${context.exerciseCount} exercises`);
  }

  // 5+ exercises: additional +5%
  if (context.exerciseCount >= 5) {
    bonus += 0.05;
    reasons.push('5+ exercises');
  }

  // 7+ day streak: +5%
  if (context.streakDays >= 7) {
    bonus += 0.05;
    reasons.push(`${context.streakDays}-day streak`);
  }

  // 14+ day streak: additional +5%
  if (context.streakDays >= 14) {
    bonus += 0.05;
    reasons.push('2-week streak');
  }

  // High XP workout (2000+): +10%
  if (context.totalXP >= 2000) {
    bonus += 0.10;
    reasons.push('High XP workout');
  }

  // Very high XP workout (4000+): additional +10%
  if (context.totalXP >= 4000) {
    bonus += 0.10;
    reasons.push('Epic XP workout');
  }

  // High volume (20+ sets): +5%
  if (context.setCount >= 20) {
    bonus += 0.05;
    reasons.push(`${context.setCount} sets`);
  }

  return { bonus, reasons };
}

/**
 * Roll for loot at workout completion
 *
 * Guaranteed drop with rarity scaling based on workout quality:
 * - PRs, exercise count, streak, XP earned all boost rarity chances
 * - Better workouts = better chance at rare+ items
 */
export function rollWorkoutLoot(context: WorkoutLootContext): WorkoutLootResult {
  const { bonus, reasons } = calculateRarityBonus(context);

  // Apply bonus to shift probabilities toward higher rarities
  // Bonus reduces common chance and increases higher rarity chances
  const adjustedTable = WORKOUT_DROP_TABLE.map((tier, index) => {
    let adjustedChance = tier.chance;

    if (tier.rarity === 'COMMON') {
      // Reduce common by bonus amount (min 20%)
      adjustedChance = Math.max(0.20, tier.chance - bonus);
    } else if (tier.rarity === 'RARE') {
      // Rare gets 40% of the bonus
      adjustedChance = Math.min(0.50, tier.chance + bonus * 0.4);
    } else if (tier.rarity === 'EPIC') {
      // Epic gets 40% of the bonus
      adjustedChance = Math.min(0.35, tier.chance + bonus * 0.4);
    } else if (tier.rarity === 'LEGENDARY') {
      // Legendary gets 20% of the bonus (cap at 15%)
      adjustedChance = Math.min(0.15, tier.chance + bonus * 0.2);
    }

    return { ...tier, chance: adjustedChance };
  });

  // Normalize to ensure probabilities sum to 1
  const totalChance = adjustedTable.reduce((sum, t) => sum + t.chance, 0);
  const normalizedTable = adjustedTable.map(t => ({
    ...t,
    chance: t.chance / totalChance,
  }));

  // Roll for rarity (guaranteed drop)
  const roll = Math.random();
  let cumulative = 0;

  for (const tier of normalizedTable) {
    cumulative += tier.chance;
    if (roll < cumulative) {
      const item = rollForItemFromDrops(tier.drops);
      if (item) {
        return {
          drop: createDropFromItem(item),
          rarity: tier.rarity,
          bonusApplied: reasons,
        };
      }
    }
  }

  // Fallback: guaranteed common drop
  const fallbackItem = rollForItemFromDrops(WORKOUT_DROP_TABLE[0].drops);
  return {
    drop: createDropFromItem(fallbackItem || getItem('xp_crystal_small')!),
    rarity: 'COMMON',
    bonusApplied: [],
  };
}

/**
 * Roll for a specific item within drops
 */
function rollForItemFromDrops(drops: DropTableEntry[]): LootItem | null {
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
function createDropFromItem(item: LootItem): LootDrop {
  const drop: LootDrop = {
    item,
    quantity: 1,
  };

  if (item.effects?.xp_bonus) {
    drop.instantXP = item.effects.xp_bonus as number;
  }

  return drop;
}
