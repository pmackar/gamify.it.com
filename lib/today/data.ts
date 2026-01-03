/**
 * Day Quest - Data Layer
 * XP calculations, achievements, ranks
 */

// XP Constants
export const XP_CONFIG = {
  BASE_XP: 10,
  // Time multiplier: scales with estimated hours (0.25 = 15min increments)
  // 0.25h = 1x, 0.5h = 1.25x, 1h = 1.5x, 2h = 2x, 4h = 3x
  TIME_MULTIPLIER: (hours: number) => Math.max(1, 1 + Math.log2(Math.max(0.25, hours) * 4) * 0.5),
  DIFFICULTY_MULTIPLIER: { easy: 1, medium: 1.5, hard: 2, epic: 3 } as Record<string, number>,
  ON_TIME_BONUS: 1.5,
  STREAK_BONUS_PER_DAY: 0.1,
  MAX_STREAK_MULTIPLIER: 2,
};

// Calculate XP required for a level
export function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.5, level - 1));
}

// Calculate XP preview for a task
export function calculateXPPreview(
  task: { estimated_time?: number; difficulty?: string; due_date?: string | null },
  currentStreak: number
): number {
  let xp = XP_CONFIG.BASE_XP;
  // Time multiplier based on estimated hours (default 0.25h = 15min)
  xp *= XP_CONFIG.TIME_MULTIPLIER(task.estimated_time || 0.25);
  xp *= XP_CONFIG.DIFFICULTY_MULTIPLIER[task.difficulty || 'medium'] || XP_CONFIG.DIFFICULTY_MULTIPLIER.medium;

  // Assume on-time if has due date in future
  if (task.due_date && new Date(task.due_date) >= new Date()) {
    xp *= XP_CONFIG.ON_TIME_BONUS;
  }

  const streakMultiplier = Math.min(
    1 + currentStreak * XP_CONFIG.STREAK_BONUS_PER_DAY,
    XP_CONFIG.MAX_STREAK_MULTIPLIER
  );
  xp *= streakMultiplier;

  return Math.floor(xp);
}

// Time display helpers
export function formatTime(hours: number): string {
  if (hours < 1) {
    return `${Math.round(hours * 60)}m`;
  } else if (hours === Math.floor(hours)) {
    return `${hours}h`;
  } else {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m > 0 ? `${h}h ${m}m` : `${h}h`;
  }
}

export function getTimeColor(hours: number): string {
  if (hours <= 0.25) return '#22c55e'; // Quick (green)
  if (hours <= 0.5) return '#3b82f6';  // Short (blue)
  if (hours <= 1) return '#f59e0b';    // Medium (amber)
  if (hours <= 2) return '#ef4444';    // Long (red)
  return '#8b5cf6';                     // Extended (purple)
}

// Legacy TIERS for backwards compatibility (maps to time)
export const TIERS = {
  tier1: { name: '2h+', color: '#8b5cf6', multiplier: '2x+ XP' },
  tier2: { name: '30m-2h', color: '#3b82f6', multiplier: '1.5x XP' },
  tier3: { name: '15m', color: '#6b7280', multiplier: '1x XP' },
};

// Difficulty display info
export const DIFFICULTIES = {
  easy: { name: 'Easy', color: '#22c55e', multiplier: '1x' },
  medium: { name: 'Medium', color: '#f59e0b', multiplier: '1.5x' },
  hard: { name: 'Hard', color: '#ef4444', multiplier: '2x' },
  epic: { name: 'Epic', color: '#8b5cf6', multiplier: '3x' },
};

// Priority display info
export const PRIORITIES = {
  High: { color: '#ef4444', icon: '🔴' },
  Medium: { color: '#f59e0b', icon: '🟡' },
  Low: { color: '#22c55e', icon: '🟢' },
};

// Character ranks based on level
export const CHARACTER_RANKS = [
  { minLevel: 1, rank: 'Novice', icon: '🎮' },
  { minLevel: 5, rank: 'Apprentice', icon: '⚔️' },
  { minLevel: 10, rank: 'Journeyman', icon: '🛡️' },
  { minLevel: 15, rank: 'Adept', icon: '🗡️' },
  { minLevel: 20, rank: 'Expert', icon: '🏹' },
  { minLevel: 30, rank: 'Master', icon: '👑' },
  { minLevel: 40, rank: 'Grandmaster', icon: '⚡' },
  { minLevel: 50, rank: 'Legend', icon: '🌟' },
  { minLevel: 75, rank: 'Mythic', icon: '🔱' },
  { minLevel: 100, rank: 'Immortal', icon: '💎' },
];

export function getRankForLevel(level: number) {
  let result = CHARACTER_RANKS[0];
  for (const rank of CHARACTER_RANKS) {
    if (level >= rank.minLevel) result = rank;
    else break;
  }
  return result;
}

// Achievement definitions
export interface Achievement {
  id: string;
  name: string;
  description: string;
  xp: number;
  check: (state: AchievementCheckState) => boolean;
}

interface AchievementCheckState {
  profile: {
    total_tasks_completed: number;
    longest_streak: number;
    level: number;
  };
  tasks: Array<{ is_completed: boolean; difficulty?: string; tier?: string }>;
}

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-task', name: 'First Steps', description: 'Complete your first task', xp: 50, check: (s) => s.profile.total_tasks_completed >= 1 },
  { id: 'task-10', name: 'Getting Started', description: 'Complete 10 tasks', xp: 100, check: (s) => s.profile.total_tasks_completed >= 10 },
  { id: 'task-50', name: 'Productive', description: 'Complete 50 tasks', xp: 250, check: (s) => s.profile.total_tasks_completed >= 50 },
  { id: 'task-100', name: 'Century', description: 'Complete 100 tasks', xp: 500, check: (s) => s.profile.total_tasks_completed >= 100 },
  { id: 'task-500', name: 'Task Master', description: 'Complete 500 tasks', xp: 1000, check: (s) => s.profile.total_tasks_completed >= 500 },
  { id: 'streak-3', name: 'On a Roll', description: 'Reach a 3-day streak', xp: 75, check: (s) => s.profile.longest_streak >= 3 },
  { id: 'streak-7', name: 'Week Warrior', description: 'Reach a 7-day streak', xp: 150, check: (s) => s.profile.longest_streak >= 7 },
  { id: 'streak-14', name: 'Two Week Champion', description: 'Reach a 14-day streak', xp: 300, check: (s) => s.profile.longest_streak >= 14 },
  { id: 'streak-30', name: 'Monthly Master', description: 'Reach a 30-day streak', xp: 750, check: (s) => s.profile.longest_streak >= 30 },
  { id: 'level-5', name: 'Apprentice', description: 'Reach level 5', xp: 100, check: (s) => s.profile.level >= 5 },
  { id: 'level-10', name: 'Journeyman', description: 'Reach level 10', xp: 200, check: (s) => s.profile.level >= 10 },
  { id: 'level-25', name: 'Expert', description: 'Reach level 25', xp: 500, check: (s) => s.profile.level >= 25 },
  { id: 'level-50', name: 'Legend', description: 'Reach level 50', xp: 1000, check: (s) => s.profile.level >= 50 },
  { id: 'epic-task', name: 'Epic Victory', description: 'Complete an Epic difficulty task', xp: 100, check: (s) => s.tasks.some(t => t.is_completed && t.difficulty === 'epic') },
  { id: 'major-task', name: 'Major Achievement', description: 'Complete a Major tier task', xp: 100, check: (s) => s.tasks.some(t => t.is_completed && t.tier === 'tier1') },
];

// Format due date relative to now
export function formatDueDate(dateString: string | null | undefined): { text: string; class: string } | null {
  if (!dateString) return null;

  const date = new Date(dateString);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) {
    return { text: `${Math.abs(days)}d overdue`, class: 'overdue' };
  } else if (days === 0) {
    return { text: 'Today', class: 'soon' };
  } else if (days === 1) {
    return { text: 'Tomorrow', class: 'soon' };
  } else if (days <= 7) {
    return { text: `${days} days`, class: 'soon' };
  } else {
    return { text: date.toLocaleDateString(), class: '' };
  }
}
