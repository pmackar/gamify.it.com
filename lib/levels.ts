/**
 * Level Calculation Utilities
 *
 * Two separate progression curves:
 * - App Levels (skills): 1.5x scaling from 100 - levels faster, represents mastery in a domain
 * - Main Level (hero): 2x scaling from 250 - levels slower, represents overall journey
 */

// ============================================================================
// APP LEVEL (Skills/Attributes) - 1.5x scaling from 100
// ============================================================================

/**
 * XP required to complete a specific app level
 * Level 1: 100, Level 2: 150, Level 3: 225, etc.
 */
export function getAppLevelXPRequired(level: number): number {
  let xpNeeded = 100;
  for (let i = 1; i < level; i++) {
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return xpNeeded;
}

/**
 * Total cumulative XP needed to reach a specific app level
 */
export function getAppLevelCumulativeXP(level: number): number {
  let total = 0;
  let xpNeeded = 100;
  for (let i = 1; i < level; i++) {
    total += xpNeeded;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return total;
}

/**
 * Calculate app level from cumulative XP
 */
export function getAppLevelFromXP(totalXP: number): {
  level: number;
  xpInLevel: number;
  xpToNext: number;
  cumulativeXP: number;
} {
  let level = 1;
  let xpNeeded = 100;
  let cumulativeXP = 0;

  while (cumulativeXP + xpNeeded <= totalXP) {
    cumulativeXP += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }

  return {
    level,
    xpInLevel: totalXP - cumulativeXP,
    xpToNext: xpNeeded,
    cumulativeXP,
  };
}

// ============================================================================
// MAIN LEVEL (Hero/Character) - 2x scaling from 250
// ============================================================================

/**
 * XP required to complete a specific main level
 * Level 1: 250, Level 2: 500, Level 3: 1000, etc.
 */
export function getMainLevelXPRequired(level: number): number {
  let xpNeeded = 250;
  for (let i = 1; i < level; i++) {
    xpNeeded = Math.floor(xpNeeded * 2);
  }
  return xpNeeded;
}

/**
 * Total cumulative XP needed to reach a specific main level
 */
export function getMainLevelCumulativeXP(level: number): number {
  let total = 0;
  let xpNeeded = 250;
  for (let i = 1; i < level; i++) {
    total += xpNeeded;
    xpNeeded = Math.floor(xpNeeded * 2);
  }
  return total;
}

/**
 * Calculate main level from cumulative XP
 */
export function getMainLevelFromXP(totalXP: number): {
  level: number;
  xpInLevel: number;
  xpToNext: number;
  cumulativeXP: number;
} {
  let level = 1;
  let xpNeeded = 250;
  let cumulativeXP = 0;

  while (cumulativeXP + xpNeeded <= totalXP) {
    cumulativeXP += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 2);
  }

  return {
    level,
    xpInLevel: totalXP - cumulativeXP,
    xpToNext: xpNeeded,
    cumulativeXP,
  };
}

// ============================================================================
// Reference Tables
// ============================================================================

/**
 * App Level Thresholds (1.5x from 100)
 *
 * | Level | XP for Level | Cumulative XP |
 * |-------|--------------|---------------|
 * | 1     | 100          | 0             |
 * | 2     | 150          | 100           |
 * | 3     | 225          | 250           |
 * | 4     | 337          | 475           |
 * | 5     | 506          | 812           |
 * | 6     | 759          | 1,318         |
 * | 7     | 1,138        | 2,077         |
 * | 8     | 1,707        | 3,215         |
 * | 9     | 2,560        | 4,922         |
 * | 10    | 3,840        | 7,482         |
 */

/**
 * Main Level Thresholds (2x from 250)
 *
 * | Level | XP for Level | Cumulative XP |
 * |-------|--------------|---------------|
 * | 1     | 250          | 0             |
 * | 2     | 500          | 250           |
 * | 3     | 1,000        | 750           |
 * | 4     | 2,000        | 1,750         |
 * | 5     | 4,000        | 3,750         |
 * | 6     | 8,000        | 7,750         |
 * | 7     | 16,000       | 15,750        |
 * | 8     | 32,000       | 31,750        |
 * | 9     | 64,000       | 63,750        |
 * | 10    | 128,000      | 127,750       |
 */
