/**
 * Iron Quest - Type Definitions
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

export interface Workout {
  id: string;
  exercises: WorkoutExercise[];
  startTime: string;
  endTime?: string;
  totalXP: number;
  duration?: number;
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

export interface FitnessState {
  profile: Profile;
  workouts: Workout[];
  records: Record<string, number>;
  achievements: string[];
  customExercises: { id: string; name: string; muscle: string }[];
  templates: WorkoutTemplate[];
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

export type ViewType = 'home' | 'workout' | 'profile' | 'history' | 'achievements' | 'campaigns' | 'workout-detail' | 'social' | 'coach' | 'templates' | 'template-editor';

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
