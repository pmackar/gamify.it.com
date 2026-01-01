/**
 * Iron Quest - Data Layer
 * Exercise library, XP tables, and game data
 */

// Exercise Tier System - Higher tiers = more XP
export const EXERCISE_TIERS = {
  // Tier 1 - Major Compounds (3x XP multiplier)
  tier1: ['bench', 'squat', 'deadlift', 'ohp'],
  // Tier 2 - Secondary Compounds (2x XP multiplier)
  tier2: ['rows', 'pullups', 'chinups', 'dip', 'legpress', 'rdl', 'hip_thrust'],
  // Tier 3 - All other exercises (1x XP multiplier) - default
};

// Bodyweight exercises (volume includes user's body weight)
export const BODYWEIGHT_EXERCISES = [
  'pushups', 'dips_chest', 'dip', 'bench_dip', 'pullups', 'chinups',
  'tricep_dips', 'diamond_pushup', 'lunges', 'plank', 'leg_raise',
  'crunches', 'russian_twist', 'dead_bug', 'decline_situp',
  'glute_bridge', 'nordic_curl', 'hyperextension'
];

// XP Level thresholds
export const XP_LEVELS = [
  0,      // Level 1
  100,    // Level 2
  250,    // Level 3
  500,    // Level 4
  850,    // Level 5
  1300,   // Level 6
  1900,   // Level 7
  2600,   // Level 8
  3500,   // Level 9
  4600,   // Level 10
  6000,   // Level 11
  7700,   // Level 12
  9700,   // Level 13
  12000,  // Level 14
  15000,  // Level 15
  18500,  // Level 16
  22500,  // Level 17
  27000,  // Level 18
  32000,  // Level 19
  38000,  // Level 20
  45000,  // Level 21
  53000,  // Level 22
  62000,  // Level 23
  72000,  // Level 24
  85000,  // Level 25
];

export interface Milestone {
  weight: number;
  name: string;
  icon: string;
  xp: number;
}

// Milestone achievements for key lifts
export const MILESTONES: Record<string, Milestone[]> = {
  bench: [
    { weight: 135, name: 'One Plate Club', icon: '🏋️', xp: 500 },
    { weight: 185, name: 'Getting Strong', icon: '💪', xp: 750 },
    { weight: 225, name: 'Two Plate Warrior', icon: '🔥', xp: 1000 },
    { weight: 315, name: 'Elite Presser', icon: '👑', xp: 2000 }
  ],
  squat: [
    { weight: 135, name: 'Squat Initiate', icon: '🦵', xp: 500 },
    { weight: 225, name: 'Two Plate Squatter', icon: '🏆', xp: 750 },
    { weight: 315, name: 'Three Plate Beast', icon: '🦍', xp: 1000 },
    { weight: 405, name: 'Four Plate Legend', icon: '⚡', xp: 2000 }
  ],
  deadlift: [
    { weight: 135, name: 'Deadlift Beginner', icon: '💀', xp: 500 },
    { weight: 225, name: 'Deadlift Warrior', icon: '⚔️', xp: 750 },
    { weight: 315, name: 'Three Plate Puller', icon: '🔱', xp: 1000 },
    { weight: 405, name: 'Four Plate Titan', icon: '🌟', xp: 1500 },
    { weight: 495, name: 'Five Plate God', icon: '👑', xp: 2500 }
  ],
  ohp: [
    { weight: 95, name: 'Press Novice', icon: '🎯', xp: 400 },
    { weight: 135, name: 'One Plate OHP', icon: '🚀', xp: 800 },
    { weight: 185, name: 'Shoulder Boulder', icon: '🗿', xp: 1500 }
  ]
};

export interface Exercise {
  id: string;
  name: string;
  muscle: string;
  equipment: string;
}

// All exercises organized by muscle group
export const EXERCISES: Exercise[] = [
  // CHEST
  { id: 'bench', name: 'Bench Press', muscle: 'chest', equipment: 'barbell' },
  { id: 'incline_bench', name: 'Incline Bench Press', muscle: 'chest', equipment: 'barbell' },
  { id: 'decline_bench', name: 'Decline Bench Press', muscle: 'chest', equipment: 'barbell' },
  { id: 'db_bench', name: 'Dumbbell Bench Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'incline_db', name: 'Incline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'decline_db', name: 'Decline Dumbbell Press', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'db_flies', name: 'Dumbbell Flies', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'incline_flies', name: 'Incline Dumbbell Flies', muscle: 'chest', equipment: 'dumbbell' },
  { id: 'cable_flies', name: 'Cable Flies', muscle: 'chest', equipment: 'cable' },
  { id: 'low_cable_flies', name: 'Low Cable Flies', muscle: 'chest', equipment: 'cable' },
  { id: 'high_cable_flies', name: 'High Cable Flies', muscle: 'chest', equipment: 'cable' },
  { id: 'chest_press_machine', name: 'Chest Press Machine', muscle: 'chest', equipment: 'machine' },
  { id: 'pec_deck', name: 'Pec Deck', muscle: 'chest', equipment: 'machine' },
  { id: 'pushups', name: 'Push-Ups', muscle: 'chest', equipment: 'bodyweight' },
  { id: 'dips_chest', name: 'Chest Dips', muscle: 'chest', equipment: 'bodyweight' },

  // BACK
  { id: 'deadlift', name: 'Deadlift', muscle: 'back', equipment: 'barbell' },
  { id: 'rows', name: 'Barbell Rows', muscle: 'back', equipment: 'barbell' },
  { id: 'pendlay_row', name: 'Pendlay Row', muscle: 'back', equipment: 'barbell' },
  { id: 'tbar_row', name: 'T-Bar Row', muscle: 'back', equipment: 'barbell' },
  { id: 'db_row', name: 'Dumbbell Row', muscle: 'back', equipment: 'dumbbell' },
  { id: 'pullups', name: 'Pull-Ups', muscle: 'back', equipment: 'bodyweight' },
  { id: 'chinups', name: 'Chin-Ups', muscle: 'back', equipment: 'bodyweight' },
  { id: 'lat_pulldown', name: 'Lat Pulldown', muscle: 'back', equipment: 'cable' },
  { id: 'close_grip_pulldown', name: 'Close Grip Pulldown', muscle: 'back', equipment: 'cable' },
  { id: 'seated_cable_row', name: 'Seated Cable Row', muscle: 'back', equipment: 'cable' },
  { id: 'cable_pullover', name: 'Cable Pullover', muscle: 'back', equipment: 'cable' },
  { id: 'facepull', name: 'Face Pulls', muscle: 'back', equipment: 'cable' },
  { id: 'machine_row', name: 'Machine Row', muscle: 'back', equipment: 'machine' },
  { id: 'chest_supported_row', name: 'Chest Supported Row', muscle: 'back', equipment: 'machine' },
  { id: 'hyperextension', name: 'Hyperextensions', muscle: 'back', equipment: 'bodyweight' },
  { id: 'rack_pull', name: 'Rack Pull', muscle: 'back', equipment: 'barbell' },

  // SHOULDERS
  { id: 'ohp', name: 'Overhead Press', muscle: 'shoulders', equipment: 'barbell' },
  { id: 'push_press', name: 'Push Press', muscle: 'shoulders', equipment: 'barbell' },
  { id: 'db_shoulder_press', name: 'Dumbbell Shoulder Press', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'arnold_press', name: 'Arnold Press', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'laterals', name: 'Lateral Raises', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'cable_lateral', name: 'Cable Lateral Raise', muscle: 'shoulders', equipment: 'cable' },
  { id: 'front_raise', name: 'Front Raises', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'rear_delt_fly', name: 'Rear Delt Fly', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'reverse_pec_deck', name: 'Reverse Pec Deck', muscle: 'shoulders', equipment: 'machine' },
  { id: 'upright_row', name: 'Upright Row', muscle: 'shoulders', equipment: 'barbell' },
  { id: 'shrugs_bb', name: 'Barbell Shrugs', muscle: 'shoulders', equipment: 'barbell' },
  { id: 'shrugs_db', name: 'Dumbbell Shrugs', muscle: 'shoulders', equipment: 'dumbbell' },
  { id: 'shoulder_press_machine', name: 'Shoulder Press Machine', muscle: 'shoulders', equipment: 'machine' },
  { id: 'landmine_press', name: 'Landmine Press', muscle: 'shoulders', equipment: 'barbell' },

  // BICEPS
  { id: 'curls', name: 'Barbell Curls', muscle: 'biceps', equipment: 'barbell' },
  { id: 'ez_bar_curl', name: 'EZ Bar Curl', muscle: 'biceps', equipment: 'barbell' },
  { id: 'db_curl', name: 'Dumbbell Curls', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'hammercurl', name: 'Hammer Curls', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'incline_curl', name: 'Incline Dumbbell Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'concentration_curl', name: 'Concentration Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'preacher_curl', name: 'Preacher Curl', muscle: 'biceps', equipment: 'barbell' },
  { id: 'cable_curl', name: 'Cable Curl', muscle: 'biceps', equipment: 'cable' },
  { id: 'spider_curl', name: 'Spider Curl', muscle: 'biceps', equipment: 'dumbbell' },
  { id: 'machine_curl', name: 'Machine Curl', muscle: 'biceps', equipment: 'machine' },

  // TRICEPS
  { id: 'tricep', name: 'Tricep Pushdowns', muscle: 'triceps', equipment: 'cable' },
  { id: 'rope_pushdown', name: 'Rope Pushdowns', muscle: 'triceps', equipment: 'cable' },
  { id: 'overhead_tricep', name: 'Overhead Tricep Extension', muscle: 'triceps', equipment: 'cable' },
  { id: 'skull_crushers', name: 'Skull Crushers', muscle: 'triceps', equipment: 'barbell' },
  { id: 'close_grip_bench', name: 'Close Grip Bench Press', muscle: 'triceps', equipment: 'barbell' },
  { id: 'tricep_dips', name: 'Tricep Dips', muscle: 'triceps', equipment: 'bodyweight' },
  { id: 'dip', name: 'Dips', muscle: 'triceps', equipment: 'bodyweight' },
  { id: 'db_tricep_ext', name: 'Dumbbell Tricep Extension', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'kickbacks', name: 'Tricep Kickbacks', muscle: 'triceps', equipment: 'dumbbell' },
  { id: 'diamond_pushup', name: 'Diamond Push-Ups', muscle: 'triceps', equipment: 'bodyweight' },
  { id: 'tricep_machine', name: 'Tricep Machine', muscle: 'triceps', equipment: 'machine' },

  // QUADS
  { id: 'squat', name: 'Barbell Squat', muscle: 'quads', equipment: 'barbell' },
  { id: 'front_squat', name: 'Front Squat', muscle: 'quads', equipment: 'barbell' },
  { id: 'goblet_squat', name: 'Goblet Squat', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'legpress', name: 'Leg Press', muscle: 'quads', equipment: 'machine' },
  { id: 'hack_squat', name: 'Hack Squat', muscle: 'quads', equipment: 'machine' },
  { id: 'legext', name: 'Leg Extensions', muscle: 'quads', equipment: 'machine' },
  { id: 'lunges', name: 'Lunges', muscle: 'quads', equipment: 'bodyweight' },
  { id: 'walking_lunge', name: 'Walking Lunges', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'split_squat', name: 'Bulgarian Split Squat', muscle: 'quads', equipment: 'dumbbell' },
  { id: 'step_ups', name: 'Step Ups', muscle: 'quads', equipment: 'dumbbell' },

  // HAMSTRINGS
  { id: 'rdl', name: 'Romanian Deadlift', muscle: 'hamstrings', equipment: 'barbell' },
  { id: 'stiff_leg_dl', name: 'Stiff Leg Deadlift', muscle: 'hamstrings', equipment: 'barbell' },
  { id: 'db_rdl', name: 'Dumbbell RDL', muscle: 'hamstrings', equipment: 'dumbbell' },
  { id: 'legcurl', name: 'Lying Leg Curl', muscle: 'hamstrings', equipment: 'machine' },
  { id: 'seated_leg_curl', name: 'Seated Leg Curl', muscle: 'hamstrings', equipment: 'machine' },
  { id: 'nordic_curl', name: 'Nordic Curl', muscle: 'hamstrings', equipment: 'bodyweight' },
  { id: 'good_morning', name: 'Good Mornings', muscle: 'hamstrings', equipment: 'barbell' },
  { id: 'glute_ham_raise', name: 'Glute Ham Raise', muscle: 'hamstrings', equipment: 'machine' },

  // GLUTES
  { id: 'hip_thrust', name: 'Hip Thrust', muscle: 'glutes', equipment: 'barbell' },
  { id: 'glute_bridge', name: 'Glute Bridge', muscle: 'glutes', equipment: 'bodyweight' },
  { id: 'cable_kickback', name: 'Cable Kickback', muscle: 'glutes', equipment: 'cable' },
  { id: 'sumo_deadlift', name: 'Sumo Deadlift', muscle: 'glutes', equipment: 'barbell' },
  { id: 'cable_pull_through', name: 'Cable Pull Through', muscle: 'glutes', equipment: 'cable' },
  { id: 'hip_abduction', name: 'Hip Abduction Machine', muscle: 'glutes', equipment: 'machine' },
  { id: 'kickback_machine', name: 'Glute Kickback Machine', muscle: 'glutes', equipment: 'machine' },

  // CALVES
  { id: 'calfraise', name: 'Standing Calf Raise', muscle: 'calves', equipment: 'machine' },
  { id: 'seated_calf', name: 'Seated Calf Raise', muscle: 'calves', equipment: 'machine' },
  { id: 'donkey_calf', name: 'Donkey Calf Raise', muscle: 'calves', equipment: 'machine' },
  { id: 'smith_calf', name: 'Smith Machine Calf Raise', muscle: 'calves', equipment: 'machine' },

  // CORE
  { id: 'plank', name: 'Plank', muscle: 'core', equipment: 'bodyweight' },
  { id: 'crunches', name: 'Crunches', muscle: 'core', equipment: 'bodyweight' },
  { id: 'leg_raise', name: 'Hanging Leg Raise', muscle: 'core', equipment: 'bodyweight' },
  { id: 'cable_crunch', name: 'Cable Crunch', muscle: 'core', equipment: 'cable' },
  { id: 'ab_rollout', name: 'Ab Rollout', muscle: 'core', equipment: 'other' },
  { id: 'russian_twist', name: 'Russian Twist', muscle: 'core', equipment: 'bodyweight' },
  { id: 'woodchop', name: 'Cable Woodchop', muscle: 'core', equipment: 'cable' },
  { id: 'dead_bug', name: 'Dead Bug', muscle: 'core', equipment: 'bodyweight' },
  { id: 'pallof_press', name: 'Pallof Press', muscle: 'core', equipment: 'cable' },
  { id: 'decline_situp', name: 'Decline Sit-Up', muscle: 'core', equipment: 'bodyweight' }
];

export interface Command {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
}

// Default commands for the command palette
export const DEFAULT_COMMANDS: Command[] = [
  { id: 'workout', title: 'Start Workout', subtitle: 'Begin a new workout session', icon: '💪' },
  { id: 'history', title: 'History', subtitle: 'View past workouts', icon: '📋' },
  { id: 'profile', title: 'Profile', subtitle: 'View your stats and PRs', icon: '👤' },
  { id: 'campaigns', title: 'Campaigns', subtitle: 'Goals and challenges', icon: '🎯' },
  { id: 'achievements', title: 'Achievements', subtitle: 'View unlocked milestones', icon: '🏆' },
  { id: 'import', title: 'Import CSV', subtitle: 'Import workout history from CSV', icon: '📥' },
];

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: string[];
}

// Default workout templates
export const DEFAULT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: 'push',
    name: 'Push Day',
    exercises: ['bench', 'ohp', 'incline_db', 'laterals', 'tricep', 'cable_flies']
  },
  {
    id: 'pull',
    name: 'Pull Day',
    exercises: ['deadlift', 'rows', 'pullups', 'facepull', 'curls', 'hammercurl']
  },
  {
    id: 'legs',
    name: 'Leg Day',
    exercises: ['squat', 'rdl', 'legpress', 'legcurl', 'legext', 'calfraise']
  }
];

// Helper functions
export function getExerciseTier(exerciseId: string): number {
  if (EXERCISE_TIERS.tier1.includes(exerciseId)) return 1;
  if (EXERCISE_TIERS.tier2.includes(exerciseId)) return 2;
  return 3;
}

export function getTierMultiplier(exerciseId: string): number {
  const tier = getExerciseTier(exerciseId);
  return tier === 1 ? 3 : tier === 2 ? 2 : 1;
}

export function calculateSetXP(exerciseId: string, weight: number, reps: number): number {
  const volume = weight * reps;
  const baseXP = Math.floor(volume / 10);
  const multiplier = getTierMultiplier(exerciseId);
  return baseXP * multiplier;
}

export function getLevelFromXP(xp: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    if (xp >= XP_LEVELS[i]) return i + 1;
  }
  return 1;
}

export function getXPForNextLevel(level: number): number {
  if (level >= XP_LEVELS.length) return XP_LEVELS[XP_LEVELS.length - 1] * 2;
  return XP_LEVELS[level];
}

export function getExerciseById(id: string): Exercise | undefined {
  return EXERCISES.find(e => e.id === id);
}
