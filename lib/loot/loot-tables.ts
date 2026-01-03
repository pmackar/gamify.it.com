/**
 * Loot Tables and Item Definitions
 *
 * Drop rates from stickiness strategy:
 * - 70% chance: Nothing extra
 * - 20% chance: Common drop (5-25 bonus XP)
 * - 7% chance: Rare drop (cosmetic item OR 50-100 XP)
 * - 2.5% chance: Epic drop (rare cosmetic OR 200 XP)
 * - 0.5% chance: Legendary drop (exclusive item OR 500 XP)
 */

export type ItemRarity = 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY';
export type ItemType = 'CONSUMABLE' | 'COSMETIC' | 'PET' | 'CURRENCY';

export interface LootItem {
  code: string;
  name: string;
  description: string;
  type: ItemType;
  rarity: ItemRarity;
  icon: string;
  effects?: Record<string, number | string | boolean>;
  stackable: boolean;
  maxStack?: number;
}

// ============================================
// ITEM DEFINITIONS
// ============================================

export const ITEMS: Record<string, LootItem> = {
  // === CONSUMABLES ===
  xp_crystal_small: {
    code: 'xp_crystal_small',
    name: 'Small XP Crystal',
    description: 'A glowing crystal containing 10 bonus XP',
    type: 'CURRENCY',
    rarity: 'COMMON',
    icon: '💎',
    effects: { xp_bonus: 10 },
    stackable: true,
  },
  xp_crystal_medium: {
    code: 'xp_crystal_medium',
    name: 'Medium XP Crystal',
    description: 'A bright crystal containing 25 bonus XP',
    type: 'CURRENCY',
    rarity: 'COMMON',
    icon: '💠',
    effects: { xp_bonus: 25 },
    stackable: true,
  },
  xp_crystal_large: {
    code: 'xp_crystal_large',
    name: 'Large XP Crystal',
    description: 'A radiant crystal containing 75 bonus XP',
    type: 'CURRENCY',
    rarity: 'RARE',
    icon: '🔮',
    effects: { xp_bonus: 75 },
    stackable: true,
  },
  xp_crystal_epic: {
    code: 'xp_crystal_epic',
    name: 'Epic XP Crystal',
    description: 'A pulsing crystal containing 200 bonus XP',
    type: 'CURRENCY',
    rarity: 'EPIC',
    icon: '⚗️',
    effects: { xp_bonus: 200 },
    stackable: true,
  },
  xp_crystal_legendary: {
    code: 'xp_crystal_legendary',
    name: 'Legendary XP Crystal',
    description: 'An ancient crystal containing 500 bonus XP',
    type: 'CURRENCY',
    rarity: 'LEGENDARY',
    icon: '🌟',
    effects: { xp_bonus: 500 },
    stackable: true,
  },
  streak_shield: {
    code: 'streak_shield',
    name: 'Streak Shield',
    description: 'Protects your streak if you miss a day',
    type: 'CONSUMABLE',
    rarity: 'RARE',
    icon: '🛡️',
    effects: { streak_protection: 1 },
    stackable: true,
    maxStack: 3,
  },
  xp_boost_1h: {
    code: 'xp_boost_1h',
    name: '1-Hour XP Boost',
    description: '2x XP for the next hour',
    type: 'CONSUMABLE',
    rarity: 'RARE',
    icon: '⚡',
    effects: { xp_multiplier: 2, duration_minutes: 60 },
    stackable: true,
    maxStack: 5,
  },
  xp_boost_24h: {
    code: 'xp_boost_24h',
    name: '24-Hour XP Boost',
    description: '2x XP for 24 hours',
    type: 'CONSUMABLE',
    rarity: 'EPIC',
    icon: '🔥',
    effects: { xp_multiplier: 2, duration_minutes: 1440 },
    stackable: true,
    maxStack: 3,
  },
  loot_box_rare: {
    code: 'loot_box_rare',
    name: 'Rare Loot Box',
    description: 'Contains a guaranteed rare item or better',
    type: 'CONSUMABLE',
    rarity: 'RARE',
    icon: '📦',
    effects: { min_rarity: 'RARE' },
    stackable: true,
  },
  loot_box_epic: {
    code: 'loot_box_epic',
    name: 'Epic Loot Box',
    description: 'Contains a guaranteed epic item or better',
    type: 'CONSUMABLE',
    rarity: 'EPIC',
    icon: '🎁',
    effects: { min_rarity: 'EPIC' },
    stackable: true,
  },

  // === COSMETICS - Profile Frames ===
  frame_bronze: {
    code: 'frame_bronze',
    name: 'Bronze Frame',
    description: 'A simple bronze profile frame',
    type: 'COSMETIC',
    rarity: 'COMMON',
    icon: '🥉',
    effects: { frame_style: 'bronze' },
    stackable: false,
  },
  frame_silver: {
    code: 'frame_silver',
    name: 'Silver Frame',
    description: 'A polished silver profile frame',
    type: 'COSMETIC',
    rarity: 'RARE',
    icon: '🥈',
    effects: { frame_style: 'silver' },
    stackable: false,
  },
  frame_gold: {
    code: 'frame_gold',
    name: 'Gold Frame',
    description: 'A gleaming gold profile frame',
    type: 'COSMETIC',
    rarity: 'EPIC',
    icon: '🥇',
    effects: { frame_style: 'gold' },
    stackable: false,
  },
  frame_diamond: {
    code: 'frame_diamond',
    name: 'Diamond Frame',
    description: 'A legendary diamond-encrusted profile frame',
    type: 'COSMETIC',
    rarity: 'LEGENDARY',
    icon: '💎',
    effects: { frame_style: 'diamond' },
    stackable: false,
  },
  frame_fire: {
    code: 'frame_fire',
    name: 'Flame Frame',
    description: 'A profile frame with animated flames',
    type: 'COSMETIC',
    rarity: 'EPIC',
    icon: '🔥',
    effects: { frame_style: 'fire', animated: true },
    stackable: false,
  },

  // === COSMETICS - Titles ===
  title_adventurer: {
    code: 'title_adventurer',
    name: 'Adventurer Title',
    description: 'Display "Adventurer" before your name',
    type: 'COSMETIC',
    rarity: 'COMMON',
    icon: '🏷️',
    effects: { title: 'Adventurer' },
    stackable: false,
  },
  title_champion: {
    code: 'title_champion',
    name: 'Champion Title',
    description: 'Display "Champion" before your name',
    type: 'COSMETIC',
    rarity: 'RARE',
    icon: '🏆',
    effects: { title: 'Champion' },
    stackable: false,
  },
  title_legend: {
    code: 'title_legend',
    name: 'Legend Title',
    description: 'Display "Legend" before your name',
    type: 'COSMETIC',
    rarity: 'LEGENDARY',
    icon: '👑',
    effects: { title: 'Legend' },
    stackable: false,
  },

  // === PETS ===
  pet_egg_common: {
    code: 'pet_egg_common',
    name: 'Common Pet Egg',
    description: 'Hatches into a common companion',
    type: 'PET',
    rarity: 'COMMON',
    icon: '🥚',
    effects: { hatch_pool: 'common' },
    stackable: true,
  },
  pet_egg_rare: {
    code: 'pet_egg_rare',
    name: 'Rare Pet Egg',
    description: 'Hatches into a rare companion',
    type: 'PET',
    rarity: 'RARE',
    icon: '🥚',
    effects: { hatch_pool: 'rare' },
    stackable: true,
  },
  pet_egg_golden: {
    code: 'pet_egg_golden',
    name: 'Golden Pet Egg',
    description: 'Hatches into a legendary companion',
    type: 'PET',
    rarity: 'LEGENDARY',
    icon: '🌟',
    effects: { hatch_pool: 'legendary' },
    stackable: true,
  },
};

// ============================================
// DROP TABLES
// ============================================

export interface DropTableEntry {
  itemCode: string;
  weight: number; // Relative weight within the rarity tier
}

export interface RarityTier {
  rarity: ItemRarity;
  chance: number; // 0-1 probability of this tier
  drops: DropTableEntry[];
}

// Standard drop table for completing tasks/workouts/locations
export const STANDARD_DROP_TABLE: RarityTier[] = [
  {
    rarity: 'COMMON',
    chance: 0.20, // 20% chance
    drops: [
      { itemCode: 'xp_crystal_small', weight: 50 },
      { itemCode: 'xp_crystal_medium', weight: 30 },
      { itemCode: 'frame_bronze', weight: 10 },
      { itemCode: 'title_adventurer', weight: 5 },
      { itemCode: 'pet_egg_common', weight: 5 },
    ],
  },
  {
    rarity: 'RARE',
    chance: 0.07, // 7% chance
    drops: [
      { itemCode: 'xp_crystal_large', weight: 40 },
      { itemCode: 'streak_shield', weight: 25 },
      { itemCode: 'xp_boost_1h', weight: 15 },
      { itemCode: 'frame_silver', weight: 10 },
      { itemCode: 'title_champion', weight: 5 },
      { itemCode: 'pet_egg_rare', weight: 5 },
    ],
  },
  {
    rarity: 'EPIC',
    chance: 0.025, // 2.5% chance
    drops: [
      { itemCode: 'xp_crystal_epic', weight: 35 },
      { itemCode: 'xp_boost_24h', weight: 20 },
      { itemCode: 'loot_box_rare', weight: 20 },
      { itemCode: 'frame_gold', weight: 10 },
      { itemCode: 'frame_fire', weight: 10 },
      { itemCode: 'loot_box_epic', weight: 5 },
    ],
  },
  {
    rarity: 'LEGENDARY',
    chance: 0.005, // 0.5% chance
    drops: [
      { itemCode: 'xp_crystal_legendary', weight: 40 },
      { itemCode: 'frame_diamond', weight: 25 },
      { itemCode: 'title_legend', weight: 20 },
      { itemCode: 'pet_egg_golden', weight: 15 },
    ],
  },
];

// Boosted drop table (used during events or with luck boosts)
export const BOOSTED_DROP_TABLE: RarityTier[] = [
  {
    rarity: 'COMMON',
    chance: 0.30, // 30% chance
    drops: STANDARD_DROP_TABLE[0].drops,
  },
  {
    rarity: 'RARE',
    chance: 0.12, // 12% chance
    drops: STANDARD_DROP_TABLE[1].drops,
  },
  {
    rarity: 'EPIC',
    chance: 0.05, // 5% chance
    drops: STANDARD_DROP_TABLE[2].drops,
  },
  {
    rarity: 'LEGENDARY',
    chance: 0.01, // 1% chance
    drops: STANDARD_DROP_TABLE[3].drops,
  },
];

// Get item by code
export function getItem(code: string): LootItem | undefined {
  return ITEMS[code];
}

// Get rarity color for UI
export function getRarityColor(rarity: ItemRarity): string {
  switch (rarity) {
    case 'COMMON':
      return '#888888';
    case 'RARE':
      return '#5CC9F5';
    case 'EPIC':
      return '#a855f7';
    case 'LEGENDARY':
      return '#FFD700';
  }
}

// Get rarity glow for UI
export function getRarityGlow(rarity: ItemRarity): string {
  switch (rarity) {
    case 'COMMON':
      return 'rgba(136, 136, 136, 0.3)';
    case 'RARE':
      return 'rgba(92, 201, 245, 0.4)';
    case 'EPIC':
      return 'rgba(168, 85, 247, 0.5)';
    case 'LEGENDARY':
      return 'rgba(255, 215, 0, 0.6)';
  }
}
