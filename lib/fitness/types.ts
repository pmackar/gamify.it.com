/**
 * Reptura - Type Definitions
 */

export interface Set {
  weight: number;
  reps: number;
  rpe?: number;
  timestamp: string;
  xp: number;
  isWarmup?: boolean;  // Warmup sets excluded from XP/volume
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: Set[];
  isCustom?: boolean;
  supersetGroup?: number;  // Exercises with same group number are in a superset
}

export type WorkoutSource = 'manual' | 'csv' | 'apple_health' | 'strava' | 'garmin';

export interface Workout {
  id: string;
  exercises: WorkoutExercise[];
  startTime: string;
  endTime?: string;
  totalXP: number;
  duration?: number;
  source?: WorkoutSource;  // Where the workout originated (manual = logged in-app)
  programDayInfo?: {       // If this workout was from a program, track which day
    weekNumber: number;
    dayNumber: number;
  };
  autoCompleted?: boolean; // True if workout was auto-completed due to inactivity
}

export interface WeightEntry {
  weight: number;
  date: string;
}

export interface Profile {
  name: string;
  level: number;
  xp: number;
  totalWorkouts: number;
  totalSets: number;
  totalVolume: number;
  height?: number; // in inches
  bodyWeight?: number; // current weight in lbs
  weightHistory?: WeightEntry[];
}

export interface Campaign {
  id: string;
  name: string;
  targetDate?: string;
  goals: CampaignGoal[];
  createdAt: string;
  completedAt?: string;
}

export interface CampaignGoal {
  exerciseId: string;
  exerciseName: string;
  targetWeight: number;
  currentPR: number;
}

// Legacy template format (for backwards compatibility)
export interface LegacyWorkoutTemplate {
  id: string;
  name: string;
  exercises: string[];
}

// Enhanced template exercise with detailed configuration
export interface TemplateExercise {
  exerciseId: string;
  exerciseName: string;
  order: number;
  targetSets: number;
  targetReps?: string; // "8-12" or "8" or undefined for AMRAP
  targetRpe?: number;
  restSeconds?: number;
  notes?: string;
  supersetGroup?: number; // Exercises with same group are in a superset
}

// Enhanced workout template
export interface WorkoutTemplate {
  id: string;
  name: string;
  description?: string;
  exercises: TemplateExercise[];
  estimatedDuration?: number; // minutes
  targetMuscleGroups?: string[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
  // Legacy support: if exercises is string[], it's old format
  isLegacy?: boolean;
}

// Helper to check if template is legacy format
export function isLegacyTemplate(template: WorkoutTemplate | LegacyWorkoutTemplate): template is LegacyWorkoutTemplate {
  return template.exercises.length > 0 && typeof template.exercises[0] === 'string';
}

// ============================================
// PROGRAM BUILDER TYPES
// ============================================

// Progression rule types
export type ProgressionType = 'linear' | 'double_progression' | 'rpe_based' | 'percentage' | 'wave' | 'none';

export interface LinearProgression {
  type: 'linear';
  weightIncrement: number;      // lbs to add per successful session
  deloadThreshold: number;      // consecutive failures before deload
  deloadPercent: number;        // e.g., 0.1 = 10% reduction
}

export interface DoubleProgression {
  type: 'double_progression';
  repRange: [number, number];   // e.g., [8, 12] - default/global
  weightIncrement: number;      // lbs to add when top of range hit
  // Per-exercise configuration
  perExercise?: boolean;
  exerciseRanges?: Record<string, {
    repRange: [number, number];
    weightIncrement?: number;   // Override global
  }>;
  // Advanced per-set configuration
  advancedMode?: boolean;
  setRanges?: Record<string, {  // exerciseId -> set configs
    sets: { repRange: [number, number] }[];
  }>;
}

export interface RpeProgression {
  type: 'rpe_based';
  targetRpe: number;            // target RPE (e.g., 8)
  rpeRange: [number, number];   // acceptable range (e.g., [7, 9])
  adjustmentPerPoint: number;   // lbs per RPE point difference
}

export interface PercentageProgression {
  type: 'percentage';
  weeklyIncrease: number;       // e.g., 0.025 = 2.5% per week
  basedOn: '1rm' | 'working_weight';
}

export interface WaveProgression {
  type: 'wave';
  waves: { week: number; intensityPercent: number; sets: number; reps: number }[];
}

export interface NoProgression {
  type: 'none';
}

export type ProgressionConfig =
  | LinearProgression
  | DoubleProgression
  | RpeProgression
  | PercentageProgression
  | WaveProgression
  | NoProgression;

export interface ProgressionRule {
  id: string;
  name: string;
  exerciseId?: string;          // null = applies to all exercises
  config: ProgressionConfig;
}

// Program structure
export interface ProgramDay {
  dayNumber: number;            // 1-7 (Monday-Sunday)
  name: string;                 // "Push Day", "Rest", etc.
  isRest: boolean;
  templateId?: string;          // Links to WorkoutTemplate
  overrides?: ExerciseOverride[];  // Week-specific modifications
}

export interface ExerciseOverride {
  exerciseId: string;
  targetSets?: number;
  targetReps?: string;
  targetRpe?: number;
  intensityModifier?: number;   // e.g., 0.9 for 90% of normal weight
}

export interface ProgramWeek {
  weekNumber: number;
  name?: string;                // "Accumulation", "Deload", etc.
  days: ProgramDay[];
  isDeload?: boolean;
}

export interface DeloadConfig {
  frequency: number;            // Every N cycles
  intensityReduction: number;   // e.g., 0.5 = 50% intensity
  volumeReduction: number;      // e.g., 0.5 = 50% fewer sets
}

export interface Program {
  id: string;
  name: string;
  description?: string;
  // Cycle configuration
  cycleType: 'weekly' | 'microcycle';
  cycleLengthDays: number;      // 7 for weekly, 3-10 for microcycle
  weeks: ProgramWeek[];         // Cycles (kept as 'weeks' for backwards compat)
  progressionRules: ProgressionRule[];
  durationWeeks: number;        // Total duration in weeks (or cycles for microcycle)
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'general';
  goalPriorities?: string[];    // ['strength', 'hypertrophy', ...] in priority order
  excludedGoals?: string[];     // Goals excluded from priority list
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  // Periodization
  periodization?: 'linear' | 'undulating' | 'block' | 'none';
  // Deload configuration
  deloadConfig?: DeloadConfig;
  // Per-exercise weight configuration (max, starting, or auto from history)
  exerciseWeightConfigs?: ExerciseWeightConfig[];
  createdAt: string;
  updatedAt: string;
}

// Active program tracking
export interface ActiveProgram {
  programId: string;
  startedAt: string;
  currentWeek: number;          // 1-indexed
  currentDay: number;           // 1-7
  completedWorkouts: string[];  // workout IDs from this program
  exerciseProgress: Record<string, ExerciseProgressEntry>;
}

export interface ExerciseProgressEntry {
  lastWeight: number;
  lastReps: number;
  lastRpe?: number;
  consecutiveSuccesses: number;
  consecutiveFailures: number;
  suggestedWeight?: number;
}

// Weight configuration per exercise in a program
export type WeightBasis = 'max' | 'starting' | 'auto';

export interface ExerciseWeightConfig {
  exerciseId: string;
  weightBasis: WeightBasis;
  maxWeight?: number;           // 1RM if weightBasis is 'max'
  startingWeight?: number;      // Starting weight if weightBasis is 'starting'
  workingPercentage?: number;   // e.g., 0.75 for 75% of max (used with 'max' basis)
}

// ============================================

export interface PRMeta {
  date: string;           // When the PR was set
  imported: boolean;      // Whether it came from CSV import
  reps?: number;          // Number of reps for this PR (1 for true 1RM)
  firstWeight?: number;   // First recorded weight for this exercise
  firstDate?: string;     // Date of first recorded weight
}

export interface FitnessState {
  profile: Profile;
  workouts: Workout[];
  records: Record<string, number>;
  recordsMeta: Record<string, PRMeta>;  // Metadata about each PR
  achievements: string[];
  customExercises: { id: string; name: string; muscle: string; tier?: number }[];
  templates: WorkoutTemplate[];
  programs: Program[];
  activeProgram: ActiveProgram | null;
  campaigns: Campaign[];
  exerciseNotes: Record<string, string>;  // exerciseId -> note text
  restTimerPreset: number;  // User's preferred rest time in seconds (default 90)
  hasCompletedOnboarding: boolean;  // Track if user has seen the tutorial
}

export interface SyncState {
  lastSyncedAt: string | null;
  pendingSync: boolean;
  syncStatus: 'idle' | 'syncing' | 'error';
  syncError: string | null;
}

export interface ActiveWorkout {
  workout: Workout;
  exerciseIndex: number;
  seconds: number;
}

export type ViewType = 'home' | 'workout' | 'profile' | 'history' | 'achievements' | 'campaigns' | 'workout-detail' | 'social' | 'coach' | 'templates' | 'template-editor' | 'programs' | 'program-wizard' | 'program-detail' | 'analytics' | 'exercise-detail' | 'exercises';

export interface CommandSuggestion {
  type: string;
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  meta?: string;
  weight?: number;
  reps?: number;
  rpe?: number;
}

// ============================================
// Narrative Engine Types
// ============================================

export type RivalType = 'ai_phantom' | 'friend';
export type PhantomPersonality = 'mirror' | 'rival' | 'mentor' | 'nemesis';
export type EncounterFrequency = 'every_workout' | 'daily' | 'weekly' | 'custom';

export interface PhantomStats {
  weeklyVolume: number;
  weeklyWorkouts: number;
  weeklyConsistency: number;
  weeklyPRs: number;
  lastUpdated: string;
}

export interface RivalFriendInfo {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
}

export interface RivalRelationship {
  id: string;
  rivalType: RivalType;
  friendId?: string;
  friend?: RivalFriendInfo; // Friend user info for friend rivalries
  victoryCondition?: 'rolling_average' | 'volume_growth' | 'consistency' | 'prs' | 'best_of_3'; // For friend rivalries
  phantomConfig?: {
    // AI phantom fields
    personality?: PhantomPersonality;
    rubberBandStrength?: number;
    volatility?: number;
    name?: string;
    archetype?: string;
    characterId?: string;
    avatar?: string;
    color?: string;
    tagline?: string;
    // Friend rival fields
    victoryCondition?: 'rolling_average' | 'volume_growth' | 'consistency' | 'prs' | 'best_of_3';
  };
  respectLevel: number; // 1-5
  rivalryHeat: number; // 0-100
  encounterCount: number;
  winStreak: number;
  longestWinStreak: number;
  longestLoseStreak: number;
  lastEncounterDate: string | null;
  createdAt: string;
  headToHead: {
    userWins: number;
    rivalWins: number;
    ties: number;
  };
}

export interface EncounterMetrics {
  volumeChange: number;
  consistencyChange: number;
  prCount: number;
  workoutCount: number;
  totalVolume: number;
  topExerciseGains: Array<{ exercise: string; gain: number }>;
}

export interface EncounterRecord {
  id: string;
  rivalId: string;
  rivalType: RivalType;
  winner: 'user' | 'rival' | 'tie';
  winningMargin: number;
  dominantFactor: string;
  userMetrics: EncounterMetrics;
  rivalMetrics: EncounterMetrics;
  respectDelta: number;
  heatDelta: number;
  encounterDate: string;
}

export interface ImprovementSnapshot {
  volumeThisWeek: number;
  volumeLastWeek: number;
  workoutsThisWeek: number;
  workoutsLastWeek: number;
  prsThisWeek: number;
  consistencyScore: number;
  topExerciseGains: Array<{ exercise: string; gain: number }>;
}

export interface ImprovementScore {
  volumeChange: number;
  consistencyScore: number;
  prScore: number;
  compositeScore: number;
}

export interface NarrativeSettings {
  enabled: boolean;
  encounterFrequency: EncounterFrequency;
  customFrequencyDays?: number;
  aiRivalsEnabled: boolean;
  friendRivalsEnabled: boolean;
  maxActiveRivals: number;
  showdownDay: number; // 0-6 (Sunday = 0)
  activeTheme: string | null;
  notificationPreferences: {
    encounterPopups: boolean;
    weeklyShowdowns: boolean;
    tauntNotifications: boolean;
  };
}

export interface NarrativeEngineState {
  rivals: RivalRelationship[];
  recentEncounters: EncounterRecord[];
  settings: NarrativeSettings;
  phantomCache: Record<string, PhantomStats>;
  lastEncounterTime: string | null;
}

export const DEFAULT_NARRATIVE_SETTINGS: NarrativeSettings = {
  enabled: true,
  encounterFrequency: 'every_workout',
  aiRivalsEnabled: true,
  friendRivalsEnabled: true,
  maxActiveRivals: 3,
  showdownDay: 0, // Sunday
  activeTheme: null,
  notificationPreferences: {
    encounterPopups: true,
    weeklyShowdowns: true,
    tauntNotifications: false,
  },
};
