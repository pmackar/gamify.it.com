/**
 * Loot System
 *
 * Main exports for the loot drop system
 */

export * from './loot-tables';
export {
  // Legacy per-XP loot
  rollForLoot,
  openLootBox,
  getDropChanceText,
  simulateDrops,
  // Workout-level loot (Phase 2)
  rollWorkoutLoot,
  // Types
  type LootDrop,
  type LootRollResult,
  type WorkoutLootContext,
  type WorkoutLootResult,
} from './drop-calculator';
