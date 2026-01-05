/**
 * Profile Titles - Unlockable titles based on achievements
 */

export interface ProfileTitle {
  id: string;
  name: string;
  description: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  requirement: {
    type: 'workout_count' | 'streak' | 'pr_count' | 'volume' | 'achievement' | 'special';
    value: number;
    achievementId?: string;
  };
  color?: string;
}

export const PROFILE_TITLES: ProfileTitle[] = [
  // Common titles (easy to unlock)
  {
    id: 'newcomer',
    name: 'Newcomer',
    description: 'Complete your first workout',
    rarity: 'common',
    requirement: { type: 'workout_count', value: 1 },
  },
  {
    id: 'regular',
    name: 'Gym Regular',
    description: 'Complete 10 workouts',
    rarity: 'common',
    requirement: { type: 'workout_count', value: 10 },
  },
  {
    id: 'consistent',
    name: 'Consistent',
    description: 'Maintain a 7-day streak',
    rarity: 'common',
    requirement: { type: 'streak', value: 7 },
  },

  // Rare titles
  {
    id: 'iron_warrior',
    name: 'Iron Warrior',
    description: 'Complete 50 workouts',
    rarity: 'rare',
    requirement: { type: 'workout_count', value: 50 },
    color: '#5fbf8a',
  },
  {
    id: 'pr_hunter',
    name: 'PR Hunter',
    description: 'Set 10 personal records',
    rarity: 'rare',
    requirement: { type: 'pr_count', value: 10 },
    color: '#5CC9F5',
  },
  {
    id: 'streak_keeper',
    name: 'Streak Keeper',
    description: 'Maintain a 14-day streak',
    rarity: 'rare',
    requirement: { type: 'streak', value: 14 },
    color: '#FF6B6B',
  },
  {
    id: 'volume_king',
    name: 'Volume King',
    description: 'Lift 100,000 lbs total',
    rarity: 'rare',
    requirement: { type: 'volume', value: 100000 },
    color: '#a855f7',
  },

  // Epic titles
  {
    id: 'century_lifter',
    name: 'Century Lifter',
    description: 'Complete 100 workouts',
    rarity: 'epic',
    requirement: { type: 'workout_count', value: 100 },
    color: '#FFD700',
  },
  {
    id: 'pr_machine',
    name: 'PR Machine',
    description: 'Set 25 personal records',
    rarity: 'epic',
    requirement: { type: 'pr_count', value: 25 },
    color: '#FFD700',
  },
  {
    id: 'streak_legend',
    name: 'Streak Legend',
    description: 'Maintain a 30-day streak',
    rarity: 'epic',
    requirement: { type: 'streak', value: 30 },
    color: '#FFD700',
  },
  {
    id: 'million_club',
    name: 'Million Club',
    description: 'Lift 1,000,000 lbs total',
    rarity: 'epic',
    requirement: { type: 'volume', value: 1000000 },
    color: '#FFD700',
  },

  // Legendary titles
  {
    id: 'iron_legend',
    name: 'Iron Legend',
    description: 'Complete 500 workouts',
    rarity: 'legendary',
    requirement: { type: 'workout_count', value: 500 },
    color: '#FFD700',
  },
  {
    id: 'unstoppable',
    name: 'Unstoppable',
    description: 'Maintain a 100-day streak',
    rarity: 'legendary',
    requirement: { type: 'streak', value: 100 },
    color: '#FFD700',
  },
  {
    id: 'world_class',
    name: 'World Class',
    description: 'Set 100 personal records',
    rarity: 'legendary',
    requirement: { type: 'pr_count', value: 100 },
    color: '#FFD700',
  },
];

export const RARITY_COLORS = {
  common: { bg: 'rgba(156, 163, 175, 0.2)', border: '#9ca3af', text: '#9ca3af' },
  rare: { bg: 'rgba(59, 130, 246, 0.2)', border: '#3b82f6', text: '#3b82f6' },
  epic: { bg: 'rgba(168, 85, 247, 0.2)', border: '#a855f7', text: '#a855f7' },
  legendary: { bg: 'rgba(255, 215, 0, 0.2)', border: '#FFD700', text: '#FFD700' },
};

/**
 * Check which titles a user has unlocked
 */
export function getUnlockedTitles(stats: {
  workoutCount: number;
  streak: number;
  longestStreak: number;
  prCount: number;
  totalVolume: number;
}): string[] {
  const unlocked: string[] = [];

  for (const title of PROFILE_TITLES) {
    let meetsRequirement = false;

    switch (title.requirement.type) {
      case 'workout_count':
        meetsRequirement = stats.workoutCount >= title.requirement.value;
        break;
      case 'streak':
        meetsRequirement = stats.longestStreak >= title.requirement.value;
        break;
      case 'pr_count':
        meetsRequirement = stats.prCount >= title.requirement.value;
        break;
      case 'volume':
        meetsRequirement = stats.totalVolume >= title.requirement.value;
        break;
    }

    if (meetsRequirement) {
      unlocked.push(title.id);
    }
  }

  return unlocked;
}

/**
 * Profile frames unlocked at certain levels
 */
export const PROFILE_FRAMES = [
  { id: 'default', name: 'Default', level: 1, color: '#6b7280' },
  { id: 'bronze', name: 'Bronze', level: 5, color: '#cd7f32' },
  { id: 'silver', name: 'Silver', level: 10, color: '#c0c0c0' },
  { id: 'gold', name: 'Gold', level: 25, color: '#FFD700' },
  { id: 'platinum', name: 'Platinum', level: 50, color: '#e5e4e2' },
  { id: 'diamond', name: 'Diamond', level: 75, color: '#b9f2ff' },
  { id: 'champion', name: 'Champion', level: 100, color: '#ff6b6b' },
];

/**
 * Profile themes/colors
 */
export const PROFILE_THEMES = [
  { id: 'default', name: 'Classic', color: '#FFD700' },
  { id: 'fire', name: 'Fire', color: '#ff6b6b', unlockedBy: 'streak_keeper' },
  { id: 'ocean', name: 'Ocean', color: '#5CC9F5', unlockedBy: 'pr_hunter' },
  { id: 'forest', name: 'Forest', color: '#5fbf8a', unlockedBy: 'iron_warrior' },
  { id: 'purple', name: 'Mystic', color: '#a855f7', unlockedBy: 'volume_king' },
  { id: 'gold', name: 'Gold', color: '#FFD700', unlockedBy: 'century_lifter' },
  { id: 'legendary', name: 'Legendary', color: 'linear-gradient(45deg, #FFD700, #ff6b6b, #a855f7)', unlockedBy: 'iron_legend' },
];
