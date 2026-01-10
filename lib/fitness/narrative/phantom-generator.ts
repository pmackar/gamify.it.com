/**
 * Narrative Engine - Phantom Generator
 *
 * Generates AI rival stats with rubber-band difficulty adjustment
 * Phantoms track user performance with configurable variance
 */

import type {
  PhantomStats,
  PhantomPersonality,
  ImprovementSnapshot,
} from '@/lib/fitness/types';

export interface PhantomConfig {
  personality: PhantomPersonality;
  rubberBandStrength: number; // 0-1, how strongly phantom tracks user
  volatility: number; // 0-1, how much random variance
  name: string;
  archetype: string;
}

// Personality modifiers affect how phantom performance relates to user
const PERSONALITY_MODIFIERS: Record<
  PhantomPersonality,
  {
    volumeMultiplier: number;
    consistencyMultiplier: number;
    prChance: number;
    description: string;
  }
> = {
  mirror: {
    volumeMultiplier: 1.0, // Matches user
    consistencyMultiplier: 1.0,
    prChance: 0.5,
    description: 'Matches your performance closely',
  },
  rival: {
    volumeMultiplier: 1.1, // Slightly ahead
    consistencyMultiplier: 1.05,
    prChance: 0.6,
    description: 'Always slightly ahead of you',
  },
  mentor: {
    volumeMultiplier: 1.25, // Better performance
    consistencyMultiplier: 1.15,
    prChance: 0.75,
    description: 'A stronger version pushing you harder',
  },
  nemesis: {
    volumeMultiplier: 1.0, // Volatile - sometimes way ahead, sometimes behind
    consistencyMultiplier: 1.0,
    prChance: 0.65,
    description: 'Unpredictable and intense',
  },
};

// Default phantom names pool
const PHANTOM_NAMES = [
  'Shadow Self',
  'Past Glory',
  'Future You',
  'The Echo',
  'Iron Ghost',
  'Phantom Lifter',
  'Mirror Image',
  'Dark Twin',
  'The Standard',
  'Steel Shadow',
];

// Archetypes for flavor
const ARCHETYPES = [
  'Powerlifter',
  'Bodybuilder',
  'CrossFitter',
  'Strongman',
  'Athlete',
  'Warrior',
  'Machine',
  'Beast',
];

/**
 * Generate random phantom name
 */
function randomPhantomName(): string {
  return PHANTOM_NAMES[Math.floor(Math.random() * PHANTOM_NAMES.length)];
}

/**
 * Generate random archetype
 */
function randomArchetype(): string {
  return ARCHETYPES[Math.floor(Math.random() * ARCHETYPES.length)];
}

/**
 * Create default phantom config for a personality
 */
export function createDefaultPhantomConfig(
  personality: PhantomPersonality = 'rival'
): PhantomConfig {
  const rubberBandStrength =
    personality === 'nemesis' ? 0.3 : personality === 'mentor' ? 0.5 : 0.7;
  const volatility =
    personality === 'nemesis' ? 0.4 : personality === 'mirror' ? 0.1 : 0.2;

  return {
    personality,
    rubberBandStrength,
    volatility,
    name: randomPhantomName(),
    archetype: randomArchetype(),
  };
}

/**
 * Get suggested difficulty based on user level
 */
export function getSuggestedPhantomDifficulty(userLevel: number): {
  personality: PhantomPersonality;
  rubberBandStrength: number;
  volatility: number;
} {
  if (userLevel < 5) {
    // Beginners get a mirror phantom (easy)
    return { personality: 'mirror', rubberBandStrength: 0.8, volatility: 0.1 };
  } else if (userLevel < 15) {
    // Intermediate users get a rival
    return { personality: 'rival', rubberBandStrength: 0.7, volatility: 0.2 };
  } else if (userLevel < 30) {
    // Advanced users get a mentor
    return { personality: 'mentor', rubberBandStrength: 0.5, volatility: 0.25 };
  } else {
    // Experts get a nemesis
    return { personality: 'nemesis', rubberBandStrength: 0.3, volatility: 0.4 };
  }
}

/**
 * Apply rubber-band adjustment to a value
 * If user is doing well, phantom catches up; if user struggles, phantom slows down
 */
function rubberBand(
  userValue: number,
  phantomPreviousValue: number,
  targetMultiplier: number,
  rubberBandStrength: number,
  volatility: number
): number {
  // Target is user value * personality modifier
  const target = userValue * targetMultiplier;

  // Rubber-band: pull phantom toward target
  const rubberBandedValue =
    phantomPreviousValue +
    (target - phantomPreviousValue) * rubberBandStrength;

  // Add volatility
  const randomFactor = 1 + (Math.random() - 0.5) * 2 * volatility;

  return Math.max(0, rubberBandedValue * randomFactor);
}

/**
 * Generate phantom stats based on user snapshot
 */
export function generatePhantomStats(
  userSnapshot: ImprovementSnapshot,
  config: PhantomConfig,
  previousPhantomStats?: PhantomStats
): PhantomStats {
  const modifiers = PERSONALITY_MODIFIERS[config.personality];

  // Use previous stats if available, otherwise bootstrap from user
  const previousVolume = previousPhantomStats?.weeklyVolume || userSnapshot.volumeLastWeek;
  const previousWorkouts = previousPhantomStats?.weeklyWorkouts || userSnapshot.workoutsLastWeek;

  // Calculate new phantom stats with rubber-banding
  const weeklyVolume = rubberBand(
    userSnapshot.volumeThisWeek,
    previousVolume,
    modifiers.volumeMultiplier,
    config.rubberBandStrength,
    config.volatility
  );

  const weeklyWorkouts = Math.round(
    rubberBand(
      userSnapshot.workoutsThisWeek,
      previousWorkouts,
      modifiers.consistencyMultiplier,
      config.rubberBandStrength,
      config.volatility * 0.5 // Less variance on workout count
    )
  );

  // Consistency based on workouts (assume 4/week target)
  const weeklyConsistency = Math.min(100, (weeklyWorkouts / 4) * 100);

  // PRs based on chance modified by volatility
  const prChance = modifiers.prChance + (Math.random() - 0.5) * config.volatility;
  const weeklyPRs = Math.random() < prChance ? Math.ceil(Math.random() * 3) : 0;

  return {
    weeklyVolume: Math.round(weeklyVolume),
    weeklyWorkouts,
    weeklyConsistency,
    weeklyPRs,
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Convert phantom stats to improvement snapshot for scoring
 */
export function phantomStatsToSnapshot(
  stats: PhantomStats,
  previousStats?: PhantomStats
): ImprovementSnapshot {
  return {
    volumeThisWeek: stats.weeklyVolume,
    volumeLastWeek: previousStats?.weeklyVolume || 0,
    workoutsThisWeek: stats.weeklyWorkouts,
    workoutsLastWeek: previousStats?.weeklyWorkouts || 0,
    prsThisWeek: stats.weeklyPRs,
    consistencyScore: stats.weeklyConsistency,
    topExerciseGains: [], // Phantoms don't have exercise-level data
  };
}
