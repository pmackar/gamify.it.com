/**
 * Iron Quest - Data Layer
 * Exercise library, XP tables, and game data
 */

import type { WorkoutTemplate as EnhancedWorkoutTemplate, TemplateExercise, Program, ProgramWeek, ProgramDay, ProgressionRule } from './types';

// Exercise Tier System - Higher tiers = more XP
export const EXERCISE_TIERS = {
  // Tier 1 - Major Compounds (3x XP multiplier)
  tier1: ['bench', 'squat', 'deadlift', 'ohp'],
  // Tier 2 - Secondary Compounds (2x XP multiplier)
  tier2: ['rows', 'pullups', 'chinups', 'dip', 'legpress', 'rdl', 'hip_thrust'],
  // Tier 3 - All other exercises (1x XP multiplier) - default
};

// Tier display colors for UI
export const TIER_COLORS = {
  1: { bg: 'rgba(255, 215, 0, 0.2)', border: '#FFD700', text: '#FFD700', label: 'T1' },
  2: { bg: 'rgba(95, 191, 138, 0.2)', border: '#5fbf8a', text: '#5fbf8a', label: 'T2' },
  3: { bg: 'rgba(107, 114, 128, 0.2)', border: '#6b7280', text: '#9ca3af', label: 'T3' },
} as const;

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

export interface GeneralAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
}

// General achievements (non-exercise based)
export const GENERAL_ACHIEVEMENTS: GeneralAchievement[] = [
  { id: 'importer', name: 'Data Importer', description: 'Import workout history from another app', icon: '📥', xp: 500 },
];

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
  secondaryMuscles?: string[];
  formTips?: string[];
  commonMistakes?: string[];
}

// Exercise substitutes - maps exercise ID to array of substitute exercise IDs
// Substitutes are exercises that target similar muscles with different equipment/angles
export const EXERCISE_SUBSTITUTES: Record<string, string[]> = {
  // CHEST
  bench: ['db_bench', 'machine_chest_press', 'pushups'],
  incline_bench: ['incline_db', 'low_cable_flies', 'incline_machine_press'],
  decline_bench: ['decline_db', 'dips_chest', 'high_cable_flies'],
  db_bench: ['bench', 'machine_chest_press', 'pushups'],
  incline_db: ['incline_bench', 'low_cable_flies', 'incline_flies'],
  db_flies: ['cable_flies', 'pec_deck', 'incline_flies'],
  cable_flies: ['db_flies', 'pec_deck', 'high_cable_flies'],
  pec_deck: ['cable_flies', 'db_flies', 'machine_chest_press'],
  pushups: ['db_bench', 'bench', 'machine_chest_press'],
  dips_chest: ['decline_bench', 'high_cable_flies', 'decline_db'],

  // BACK
  rows: ['db_row', 'cable_row', 't_bar_row'],
  pullups: ['lat_pulldown', 'chinups', 'assisted_pullup'],
  chinups: ['pullups', 'lat_pulldown', 'underhand_pulldown'],
  lat_pulldown: ['pullups', 'chinups', 'straight_arm_pulldown'],
  db_row: ['rows', 'cable_row', 'machine_row'],
  cable_row: ['rows', 'db_row', 'machine_row'],
  t_bar_row: ['rows', 'db_row', 'machine_row'],
  machine_row: ['cable_row', 'db_row', 'rows'],
  face_pull: ['rear_delt_fly', 'reverse_pec_deck', 'band_pull_apart'],

  // SHOULDERS
  ohp: ['db_shoulder_press', 'machine_shoulder_press', 'arnold_press'],
  db_shoulder_press: ['ohp', 'machine_shoulder_press', 'arnold_press'],
  arnold_press: ['db_shoulder_press', 'ohp', 'machine_shoulder_press'],
  lateral_raise: ['cable_lateral_raise', 'machine_lateral_raise', 'db_lateral_raise'],
  cable_lateral_raise: ['lateral_raise', 'machine_lateral_raise', 'db_lateral_raise'],
  front_raise: ['cable_front_raise', 'plate_front_raise', 'db_front_raise'],
  rear_delt_fly: ['face_pull', 'reverse_pec_deck', 'cable_rear_delt'],
  reverse_pec_deck: ['rear_delt_fly', 'face_pull', 'cable_rear_delt'],
  shrugs: ['db_shrugs', 'machine_shrug', 'barbell_shrugs'],

  // BICEPS
  barbell_curl: ['ez_curl', 'db_curl', 'cable_curl'],
  ez_curl: ['barbell_curl', 'db_curl', 'preacher_curl'],
  db_curl: ['barbell_curl', 'ez_curl', 'cable_curl'],
  hammer_curl: ['cross_body_curl', 'rope_hammer_curl', 'db_curl'],
  preacher_curl: ['ez_curl', 'machine_curl', 'concentration_curl'],
  cable_curl: ['barbell_curl', 'db_curl', 'machine_curl'],
  concentration_curl: ['preacher_curl', 'db_curl', 'cable_curl'],
  incline_curl: ['db_curl', 'spider_curl', 'cable_curl'],

  // TRICEPS
  tricep_pushdown: ['rope_pushdown', 'overhead_extension', 'dip'],
  rope_pushdown: ['tricep_pushdown', 'overhead_extension', 'kickbacks'],
  overhead_extension: ['skull_crusher', 'tricep_pushdown', 'cable_overhead'],
  skull_crusher: ['overhead_extension', 'close_grip_bench', 'tricep_pushdown'],
  close_grip_bench: ['skull_crusher', 'dip', 'tricep_pushdown'],
  dip: ['close_grip_bench', 'tricep_pushdown', 'bench_dip'],
  kickbacks: ['rope_pushdown', 'tricep_pushdown', 'overhead_extension'],

  // QUADS
  squat: ['leg_press', 'hack_squat', 'goblet_squat'],
  leg_press: ['squat', 'hack_squat', 'lunges'],
  hack_squat: ['squat', 'leg_press', 'front_squat'],
  front_squat: ['squat', 'goblet_squat', 'hack_squat'],
  goblet_squat: ['squat', 'front_squat', 'leg_press'],
  leg_extension: ['sissy_squat', 'leg_press', 'lunges'],
  lunges: ['bulgarian_split_squat', 'leg_press', 'step_ups'],
  bulgarian_split_squat: ['lunges', 'leg_press', 'step_ups'],

  // HAMSTRINGS
  rdl: ['deadlift', 'good_morning', 'stiff_leg_deadlift'],
  deadlift: ['rdl', 'trap_bar_deadlift', 'stiff_leg_deadlift'],
  leg_curl: ['seated_leg_curl', 'nordic_curl', 'rdl'],
  seated_leg_curl: ['leg_curl', 'nordic_curl', 'rdl'],
  good_morning: ['rdl', 'back_extension', 'stiff_leg_deadlift'],
  nordic_curl: ['leg_curl', 'seated_leg_curl', 'rdl'],

  // GLUTES
  hip_thrust: ['glute_bridge', 'cable_pull_through', 'glute_kickback'],
  glute_bridge: ['hip_thrust', 'cable_pull_through', 'rdl'],
  cable_pull_through: ['hip_thrust', 'glute_bridge', 'rdl'],
  glute_kickback: ['cable_kickback', 'hip_thrust', 'glute_bridge'],

  // CALVES
  calf_raise: ['seated_calf_raise', 'leg_press_calf', 'smith_calf_raise'],
  seated_calf_raise: ['calf_raise', 'leg_press_calf', 'donkey_calf_raise'],

  // CORE
  plank: ['dead_bug', 'ab_wheel', 'hollow_hold'],
  crunches: ['cable_crunch', 'decline_situp', 'machine_crunch'],
  cable_crunch: ['crunches', 'decline_situp', 'ab_wheel'],
  leg_raise: ['hanging_leg_raise', 'captain_chair', 'lying_leg_raise'],
  russian_twist: ['cable_woodchop', 'pallof_press', 'oblique_crunch'],
  ab_wheel: ['plank', 'dead_bug', 'cable_crunch'],
};

// Helper function to get substitutes for an exercise
export function getExerciseSubstitutes(exerciseId: string): string[] {
  // First check direct mapping
  if (EXERCISE_SUBSTITUTES[exerciseId]) {
    return EXERCISE_SUBSTITUTES[exerciseId];
  }

  // If no direct mapping, find exercises with same muscle group
  const exercise = EXERCISES.find(e => e.id === exerciseId);
  if (exercise) {
    return EXERCISES
      .filter(e => e.id !== exerciseId && e.muscle === exercise.muscle)
      .slice(0, 3)
      .map(e => e.id);
  }

  return [];
}

// All exercises organized by muscle group
export const EXERCISES: Exercise[] = [
  // CHEST
  {
    id: 'bench',
    name: 'Bench Press',
    muscle: 'chest',
    equipment: 'barbell',
    secondaryMuscles: ['triceps', 'shoulders'],
    formTips: [
      'Retract shoulder blades and keep them pinched throughout',
      'Feet flat on floor, maintain slight arch in lower back',
      'Touch bar to lower chest, not neck',
      'Drive feet into ground as you press',
      'Lock elbows at top but don\'t hyperextend'
    ],
    commonMistakes: [
      'Flaring elbows too wide (keep 45-75° angle)',
      'Bouncing bar off chest',
      'Lifting hips off bench',
      'Uneven grip width',
      'Not using leg drive'
    ]
  },
  {
    id: 'incline_bench',
    name: 'Incline Bench Press',
    muscle: 'chest',
    equipment: 'barbell',
    secondaryMuscles: ['shoulders', 'triceps'],
    formTips: [
      'Set bench to 30-45 degree angle',
      'Touch bar to upper chest/clavicle area',
      'Keep shoulder blades retracted',
      'Control the descent, explosive press'
    ],
    commonMistakes: [
      'Angle too steep (becomes shoulder press)',
      'Lifting butt off bench',
      'Bar path too far forward'
    ]
  },
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
  {
    id: 'deadlift',
    name: 'Deadlift',
    muscle: 'back',
    equipment: 'barbell',
    secondaryMuscles: ['hamstrings', 'glutes', 'core', 'traps'],
    formTips: [
      'Bar over mid-foot, shins almost touching bar',
      'Hip hinge - push hips back, not squat down',
      'Neutral spine - no rounding upper or lower back',
      'Engage lats - "protect your armpits"',
      'Drive through heels, squeeze glutes at top',
      'Bar stays close to body throughout lift'
    ],
    commonMistakes: [
      'Rounding lower back',
      'Bar drifting away from body',
      'Hips shooting up first',
      'Hyperextending at lockout',
      'Looking up (cranks neck)'
    ]
  },
  {
    id: 'rows',
    name: 'Barbell Rows',
    muscle: 'back',
    equipment: 'barbell',
    secondaryMuscles: ['biceps', 'rear delts', 'core'],
    formTips: [
      'Hinge at hips, torso 45-75° angle',
      'Pull bar to lower chest/upper abs',
      'Squeeze shoulder blades together at top',
      'Control the negative, don\'t just drop weight',
      'Keep core tight to protect lower back'
    ],
    commonMistakes: [
      'Using too much body English/momentum',
      'Standing too upright',
      'Pulling to belly button instead of chest',
      'Rounding lower back'
    ]
  },
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
  {
    id: 'ohp',
    name: 'Overhead Press',
    muscle: 'shoulders',
    equipment: 'barbell',
    secondaryMuscles: ['triceps', 'core', 'upper chest'],
    formTips: [
      'Start with bar at collarbone level',
      'Grip slightly wider than shoulders',
      'Brace core and squeeze glutes',
      'Press straight up, moving head back then forward',
      'Lock out fully overhead, bar over mid-foot',
      'Shrug shoulders up at top for full range'
    ],
    commonMistakes: [
      'Excessive back arch',
      'Pressing bar forward instead of straight up',
      'Not locking out elbows',
      'Loose core/wobbly stance',
      'Grip too wide or too narrow'
    ]
  },
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
  {
    id: 'squat',
    name: 'Barbell Squat',
    muscle: 'quads',
    equipment: 'barbell',
    secondaryMuscles: ['glutes', 'hamstrings', 'core', 'lower back'],
    formTips: [
      'Bar placement: high bar (on traps) or low bar (on rear delts)',
      'Feet shoulder-width or slightly wider, toes pointed out 15-30°',
      'Brace core, take a big breath before descent',
      'Break at hips and knees together',
      'Knees track over toes, push knees out',
      'Depth: hip crease below top of knee',
      'Drive up through mid-foot, keep chest up'
    ],
    commonMistakes: [
      'Knees caving inward',
      'Excessive forward lean/chest dropping',
      'Not hitting depth',
      'Coming up on toes',
      '"Butt wink" (pelvis tucks under at bottom)',
      'Not bracing core properly'
    ]
  },
  {
    id: 'front_squat',
    name: 'Front Squat',
    muscle: 'quads',
    equipment: 'barbell',
    secondaryMuscles: ['core', 'glutes', 'upper back'],
    formTips: [
      'Clean grip or cross-arm grip',
      'Elbows high, bar rests on front delts',
      'More upright torso than back squat',
      'Drive knees forward over toes'
    ],
    commonMistakes: [
      'Elbows dropping (bar rolls forward)',
      'Wrist pain from grip (work on mobility)',
      'Not staying upright'
    ]
  },
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
  { id: 'workout', title: 'Start Blank Workout', subtitle: 'Begin an empty workout session', icon: '💪' },
  { id: 'choose-workout', title: 'Choose Workout', subtitle: 'Pick from your workout library', icon: '📋' },
  { id: 'templates', title: 'Workout Templates', subtitle: 'Plan and manage workout templates', icon: '📝' },
  { id: 'programs', title: 'Training Programs', subtitle: 'Multi-week training programs with progression', icon: '📅' },
  { id: 'history', title: 'History', subtitle: 'View past workouts', icon: '📋' },
  { id: 'analytics', title: 'Analytics', subtitle: 'Volume, strength progress, muscle distribution', icon: '📊' },
  { id: 'exercises', title: 'Exercise Library', subtitle: 'Browse all exercises with form tips', icon: '📚' },
  { id: 'profile', title: 'Profile', subtitle: 'View your stats and PRs', icon: '👤' },
  { id: 'coach', title: 'AI Coach', subtitle: 'Insights, plateaus, form tips', icon: '🤖' },
  { id: 'social', title: 'Social', subtitle: 'Friends, challenges, leaderboard', icon: '👥' },
  { id: 'campaigns', title: 'Campaigns', subtitle: 'Goals and challenges', icon: '🎯' },
  { id: 'achievements', title: 'Achievements', subtitle: 'View unlocked milestones', icon: '🏆' },
  { id: 'import', title: 'Import CSV', subtitle: 'Import workout history from CSV', icon: '📥' },
  { id: 'reset', title: 'Reset All Data', subtitle: 'Erase all workouts, achievements, and stats', icon: '🗑️' },
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

// Strong App exercise name mappings
// Maps Strong CSV exercise names to our internal exercise IDs
export const STRONG_EXERCISE_MAPPINGS: Record<string, string> = {
  // Chest
  'Bench Press (Barbell)': 'bench',
  'Bench Press': 'bench',
  'Barbell Bench Press': 'bench',
  'Incline Bench Press': 'incline_bench',
  'Incline Bench Press (Barbell)': 'incline_bench',
  'Decline Bench Press': 'decline_bench',
  'Decline Bench Press (Barbell)': 'decline_bench',
  'Dumbbell Bench Press': 'db_bench',
  'Bench Press (Dumbbell)': 'db_bench',
  'Incline Dumbbell Press': 'incline_db',
  'Incline Bench Press (Dumbbell)': 'incline_db',
  'Decline Dumbbell Press': 'decline_db',
  'Dumbbell Fly': 'db_flies',
  'Dumbbell Flies': 'db_flies',
  'Incline Dumbbell Fly': 'incline_flies',
  'Cable Fly': 'cable_flies',
  'Cable Flies': 'cable_flies',
  'Cable Crossover': 'cable_flies',
  'Chest Press Machine': 'chest_press_machine',
  'Machine Chest Press': 'chest_press_machine',
  'Pec Deck': 'pec_deck',
  'Pec Deck Machine': 'pec_deck',
  'Push Up': 'pushups',
  'Push-Up': 'pushups',
  'Push Ups': 'pushups',
  'Chest Dip': 'dips_chest',

  // Back
  'Deadlift': 'deadlift',
  'Deadlift (Barbell)': 'deadlift',
  'Barbell Deadlift': 'deadlift',
  'Conventional Deadlift': 'deadlift',
  'Barbell Row': 'rows',
  'Bent Over Row': 'rows',
  'Bent Over Row (Barbell)': 'rows',
  'Barbell Rows': 'rows',
  'Pendlay Row': 'pendlay_row',
  'T-Bar Row': 'tbar_row',
  'T Bar Row': 'tbar_row',
  'Dumbbell Row': 'db_row',
  'One Arm Dumbbell Row': 'db_row',
  'Bent Over Row (Dumbbell)': 'db_row',
  'Single Arm Dumbbell Row': 'db_row',
  'Pull Up': 'pullups',
  'Pull-Up': 'pullups',
  'Pull Ups': 'pullups',
  'Chin Up': 'chinups',
  'Chin-Up': 'chinups',
  'Chin Ups': 'chinups',
  'Lat Pulldown': 'lat_pulldown',
  'Lat Pulldown (Cable)': 'lat_pulldown',
  'Wide Grip Lat Pulldown': 'lat_pulldown',
  'Close Grip Lat Pulldown': 'close_grip_pulldown',
  'Seated Cable Row': 'seated_cable_row',
  'Seated Row': 'seated_cable_row',
  'Cable Row': 'seated_cable_row',
  'Cable Pullover': 'cable_pullover',
  'Face Pull': 'facepull',
  'Face Pulls': 'facepull',
  'Machine Row': 'machine_row',
  'Seated Row (Machine)': 'machine_row',
  'Chest Supported Row': 'chest_supported_row',
  'Hyperextension': 'hyperextension',
  'Back Extension': 'hyperextension',
  'Rack Pull': 'rack_pull',

  // Shoulders
  'Overhead Press': 'ohp',
  'Overhead Press (Barbell)': 'ohp',
  'Military Press': 'ohp',
  'Barbell Shoulder Press': 'ohp',
  'Standing Barbell Press': 'ohp',
  'Push Press': 'push_press',
  'Dumbbell Shoulder Press': 'db_shoulder_press',
  'Seated Dumbbell Press': 'db_shoulder_press',
  'Shoulder Press (Dumbbell)': 'db_shoulder_press',
  'Arnold Press': 'arnold_press',
  'Lateral Raise': 'laterals',
  'Lateral Raises': 'laterals',
  'Dumbbell Lateral Raise': 'laterals',
  'Side Lateral Raise': 'laterals',
  'Cable Lateral Raise': 'cable_lateral',
  'Front Raise': 'front_raise',
  'Front Raises': 'front_raise',
  'Dumbbell Front Raise': 'front_raise',
  'Rear Delt Fly': 'rear_delt_fly',
  'Rear Delt Flies': 'rear_delt_fly',
  'Reverse Fly': 'rear_delt_fly',
  'Rear Delt Machine Fly': 'reverse_pec_deck',
  'Reverse Pec Deck': 'reverse_pec_deck',
  'Upright Row': 'upright_row',
  'Upright Row (Barbell)': 'upright_row',
  'Barbell Shrug': 'shrugs_bb',
  'Shrugs': 'shrugs_bb',
  'Shrugs (Barbell)': 'shrugs_bb',
  'Dumbbell Shrug': 'shrugs_db',
  'Shrugs (Dumbbell)': 'shrugs_db',
  'Shoulder Press Machine': 'shoulder_press_machine',
  'Machine Shoulder Press': 'shoulder_press_machine',
  'Landmine Press': 'landmine_press',
  'Klokov Press': 'ohp',
  'Clean Shrug (from Rack)': 'shrugs_bb',

  // Biceps
  'Barbell Curl': 'curls',
  'Bicep Curl': 'curls',
  'Bicep Curl (Barbell)': 'curls',
  'EZ Bar Curl': 'ez_bar_curl',
  'EZ-Bar Curl': 'ez_bar_curl',
  'Dumbbell Curl': 'db_curl',
  'Bicep Curl (Dumbbell)': 'db_curl',
  'Alternating Dumbbell Curl': 'db_curl',
  'Hammer Curl': 'hammercurl',
  'Hammer Curls': 'hammercurl',
  'Incline Dumbbell Curl': 'incline_curl',
  'Concentration Curl': 'concentration_curl',
  'Preacher Curl': 'preacher_curl',
  'EZ-Bar Preacher Curl': 'preacher_curl',
  'Cable Curl': 'cable_curl',
  'Cable Bicep Curl': 'cable_curl',
  'Spider Curl': 'spider_curl',
  'Machine Curl': 'machine_curl',

  // Triceps
  'Tricep Pushdown': 'tricep',
  'Triceps Pushdown': 'tricep',
  'Tricep Cable Push down (straight Handle)': 'tricep',
  'Cable Pushdown': 'tricep',
  'Tricep Pushdown (Cable)': 'tricep',
  'Rope Pushdown': 'rope_pushdown',
  'Tri Rope Pushdown': 'rope_pushdown',
  'Tricep Rope Pushdown': 'rope_pushdown',
  'Overhead Tricep Extension': 'overhead_tricep',
  'Tricep Extension': 'overhead_tricep',
  'Cable Overhead Tricep Extension': 'overhead_tricep',
  'Skull Crusher': 'skull_crushers',
  'Skull Crushers': 'skull_crushers',
  'Lying Tricep Extension': 'skull_crushers',
  'EZ-Bar Skull Crusher': 'skull_crushers',
  'Close Grip Bench Press': 'close_grip_bench',
  'Close Grip Bench Press (Barbell)': 'close_grip_bench',
  'Dip': 'dip',
  'Dips': 'dip',
  'Tricep Dip': 'tricep_dips',
  'Tricep Dips': 'tricep_dips',
  'Dumbbell Tricep Extension': 'db_tricep_ext',
  'Tricep Kickback': 'kickbacks',
  'Tricep Kickbacks': 'kickbacks',
  'Diamond Push Up': 'diamond_pushup',

  // Legs - Quads
  'Squat': 'squat',
  'Squat (Barbell)': 'squat',
  'Barbell Squat': 'squat',
  'Back Squat': 'squat',
  'Front Squat': 'front_squat',
  'Front Squat (Barbell)': 'front_squat',
  'Goblet Squat': 'goblet_squat',
  'Leg Press': 'legpress',
  'Leg Press (Machine)': 'legpress',
  'Hack Squat': 'hack_squat',
  'Hack Squat (Machine)': 'hack_squat',
  'Leg Extension': 'legext',
  'Leg Extensions': 'legext',
  'Leg Extension (Machine)': 'legext',
  'Lunge': 'lunges',
  'Lunges': 'lunges',
  'Walking Lunge': 'walking_lunge',
  'Walking Lunges': 'walking_lunge',
  'Bulgarian Split Squat': 'split_squat',
  'Split Squat': 'split_squat',
  'Step Up': 'step_ups',
  'Step Ups': 'step_ups',

  // Legs - Hamstrings
  'Romanian Deadlift': 'rdl',
  'Romanian Deadlift (Barbell)': 'rdl',
  'RDL': 'rdl',
  'Stiff Leg Deadlift': 'stiff_leg_dl',
  'Stiff Legged Deadlift': 'stiff_leg_dl',
  'Dumbbell Romanian Deadlift': 'db_rdl',
  'Lying Leg Curl': 'legcurl',
  'Leg Curl': 'legcurl',
  'Leg Curl (Machine)': 'legcurl',
  'Seated Leg Curl': 'seated_leg_curl',
  'Nordic Curl': 'nordic_curl',
  'Good Morning': 'good_morning',
  'Good Mornings': 'good_morning',
  'Glute Ham Raise': 'glute_ham_raise',

  // Glutes
  'Hip Thrust': 'hip_thrust',
  'Barbell Hip Thrust': 'hip_thrust',
  'Hip Thrust (Barbell)': 'hip_thrust',
  'Glute Bridge': 'glute_bridge',
  'Cable Kickback': 'cable_kickback',
  'Sumo Deadlift': 'sumo_deadlift',
  'Sumo Deadlift (Barbell)': 'sumo_deadlift',
  'Cable Pull Through': 'cable_pull_through',
  'Hip Abduction': 'hip_abduction',
  'Hip Abduction Machine': 'hip_abduction',

  // Calves
  'Standing Calf Raise': 'calfraise',
  'Calf Raise': 'calfraise',
  'Standing Calf Raise (Machine)': 'calfraise',
  'Seated Calf Raise': 'seated_calf',
  'Seated Calf Raise (Machine)': 'seated_calf',
  'Donkey Calf Raise': 'donkey_calf',
  'Smith Machine Calf Raise': 'smith_calf',

  // Core
  'Plank': 'plank',
  'Crunch': 'crunches',
  'Crunches': 'crunches',
  'Hanging Leg Raise': 'leg_raise',
  'Leg Raise': 'leg_raise',
  'Cable Crunch': 'cable_crunch',
  'Ab Wheel Rollout': 'ab_rollout',
  'Ab Rollout': 'ab_rollout',
  'Russian Twist': 'russian_twist',
  'Cable Woodchop': 'woodchop',
  'Wood Chop': 'woodchop',
  'Dead Bug': 'dead_bug',
  'Pallof Press': 'pallof_press',
  'Decline Sit Up': 'decline_situp',
  'Decline Sit-Up': 'decline_situp',
};

// Fuzzy match exercise name to our exercise IDs
export function matchExerciseFromCSV(csvName: string): string | null {
  // First, try exact match from mappings
  if (STRONG_EXERCISE_MAPPINGS[csvName]) {
    return STRONG_EXERCISE_MAPPINGS[csvName];
  }

  // Try case-insensitive match
  const lowerName = csvName.toLowerCase();
  for (const [key, value] of Object.entries(STRONG_EXERCISE_MAPPINGS)) {
    if (key.toLowerCase() === lowerName) {
      return value;
    }
  }

  // Try fuzzy matching - check if exercise name contains key parts
  const normalized = lowerName
    .replace(/\(.*?\)/g, '') // Remove parentheses content
    .replace(/[^a-z\s]/g, '') // Remove non-letters
    .trim();

  // Check against our exercise list
  for (const exercise of EXERCISES) {
    const exNormalized = exercise.name.toLowerCase().replace(/[^a-z\s]/g, '');
    if (normalized.includes(exNormalized) || exNormalized.includes(normalized)) {
      return exercise.id;
    }
    // Check ID as well
    if (normalized.replace(/\s+/g, '_').includes(exercise.id) ||
        exercise.id.includes(normalized.replace(/\s+/g, '_'))) {
      return exercise.id;
    }
  }

  return null;
}

// Helper functions
export function getExerciseTier(exerciseId: string, customExercises?: { id: string; tier?: number }[]): number {
  // Check custom exercises first for user-defined tiers
  if (customExercises) {
    const custom = customExercises.find(e => e.id === exerciseId);
    if (custom?.tier) return custom.tier;
  }
  // Fall back to built-in tier definitions
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

// ============================================
// PRE-BUILT PROGRAM LIBRARY
// ============================================

export interface PrebuiltProgram {
  id: string;
  name: string;
  description: string;
  author: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  goal: 'strength' | 'hypertrophy' | 'endurance' | 'general';
  daysPerWeek: number;
  durationWeeks: number;
  icon: string;
  tags: string[];
  templates: EnhancedWorkoutTemplate[];
  program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>;
}

// Helper to create template exercises
const te = (exerciseId: string, order: number, sets: number, reps: string, rpe?: number, notes?: string): TemplateExercise => ({
  exerciseId,
  exerciseName: EXERCISES.find(e => e.id === exerciseId)?.name || exerciseId,
  order,
  targetSets: sets,
  targetReps: reps,
  targetRpe: rpe,
  notes,
});

export const PREBUILT_PROGRAMS: PrebuiltProgram[] = [
  // ===== STRONGLIFTS 5x5 =====
  {
    id: 'stronglifts-5x5',
    name: 'StrongLifts 5x5',
    description: 'The classic beginner strength program. 3 days per week, alternating A/B workouts. Focus on linear progression with compound lifts.',
    author: 'Mehdi Hadim',
    difficulty: 'beginner',
    goal: 'strength',
    daysPerWeek: 3,
    durationWeeks: 12,
    icon: '🏋️',
    tags: ['strength', 'beginner', 'compound', 'barbell', '5x5'],
    templates: [
      {
        id: 'sl-workout-a',
        name: 'Workout A',
        description: 'Squat, Bench, Rows',
        exercises: [
          te('squat', 1, 5, '5', 8, 'Focus on depth - hips below knees'),
          te('bench', 2, 5, '5', 8, 'Touch chest, pause, press'),
          te('rows', 3, 5, '5', 8, 'Strict form, no momentum'),
        ],
        estimatedDuration: 45,
        targetMuscleGroups: ['quads', 'chest', 'back'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'sl-workout-b',
        name: 'Workout B',
        description: 'Squat, OHP, Deadlift',
        exercises: [
          te('squat', 1, 5, '5', 8, 'Every workout starts with squats'),
          te('ohp', 2, 5, '5', 8, 'Full lockout overhead'),
          te('deadlift', 3, 1, '5', 9, 'One heavy set - quality over quantity'),
        ],
        estimatedDuration: 45,
        targetMuscleGroups: ['quads', 'shoulders', 'back'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
    ],
    program: {
      name: 'StrongLifts 5x5',
      description: 'Classic beginner strength program. Add 5lbs every workout for upper body, 10lbs for lower body.',
      weeks: Array.from({ length: 12 }, (_, weekIdx): ProgramWeek => ({
        weekNumber: weekIdx + 1,
        name: weekIdx === 3 ? 'Deload' : undefined,
        isDeload: weekIdx === 3,
        days: [
          { dayNumber: 1, name: 'Workout A', isRest: false, templateId: 'sl-workout-a' },
          { dayNumber: 2, name: 'Rest', isRest: true },
          { dayNumber: 3, name: 'Workout B', isRest: false, templateId: 'sl-workout-b' },
          { dayNumber: 4, name: 'Rest', isRest: true },
          { dayNumber: 5, name: 'Workout A', isRest: false, templateId: 'sl-workout-a' },
          { dayNumber: 6, name: 'Rest', isRest: true },
          { dayNumber: 7, name: 'Rest', isRest: true },
        ],
      })),
      progressionRules: [
        {
          id: 'sl-linear-upper',
          name: 'Upper Body Linear',
          config: {
            type: 'linear',
            weightIncrement: 5,
            deloadThreshold: 3,
            deloadPercent: 0.1,
          },
        },
        {
          id: 'sl-linear-lower',
          name: 'Lower Body Linear',
          exerciseId: 'squat',
          config: {
            type: 'linear',
            weightIncrement: 10,
            deloadThreshold: 3,
            deloadPercent: 0.1,
          },
        },
        {
          id: 'sl-linear-deadlift',
          name: 'Deadlift Linear',
          exerciseId: 'deadlift',
          config: {
            type: 'linear',
            weightIncrement: 10,
            deloadThreshold: 3,
            deloadPercent: 0.1,
          },
        },
      ],
      durationWeeks: 12,
      goal: 'strength',
      difficulty: 'beginner',
    },
  },

  // ===== PUSH PULL LEGS (PPL) =====
  {
    id: 'ppl-hypertrophy',
    name: 'Push Pull Legs',
    description: '6-day split hitting each muscle group twice per week. Great for intermediate lifters focused on building muscle.',
    author: 'Metallicadpa (Reddit)',
    difficulty: 'intermediate',
    goal: 'hypertrophy',
    daysPerWeek: 6,
    durationWeeks: 8,
    icon: '💪',
    tags: ['hypertrophy', 'intermediate', '6-day', 'split', 'PPL'],
    templates: [
      {
        id: 'ppl-push',
        name: 'Push Day',
        description: 'Chest, Shoulders, Triceps',
        exercises: [
          te('bench', 1, 4, '5', 8, 'Main compound - strength focus'),
          te('ohp', 2, 3, '8-12', 7),
          te('incline_db', 3, 3, '8-12', 7),
          te('laterals', 4, 4, '12-15', 7, 'Controlled tempo'),
          te('tricep', 5, 3, '10-12', 7),
          te('overhead_tricep', 6, 3, '10-12', 7),
        ],
        estimatedDuration: 60,
        targetMuscleGroups: ['chest', 'shoulders', 'triceps'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'ppl-pull',
        name: 'Pull Day',
        description: 'Back, Biceps, Rear Delts',
        exercises: [
          te('deadlift', 1, 3, '5', 9, 'Heavy compound - strength focus'),
          te('rows', 2, 4, '8-12', 7),
          te('lat_pulldown', 3, 3, '8-12', 7),
          te('facepull', 4, 4, '15-20', 6, 'Rear delt health'),
          te('curls', 5, 3, '8-12', 7),
          te('hammercurl', 6, 3, '10-12', 7),
        ],
        estimatedDuration: 60,
        targetMuscleGroups: ['back', 'biceps', 'shoulders'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'ppl-legs',
        name: 'Legs Day',
        description: 'Quads, Hamstrings, Glutes, Calves',
        exercises: [
          te('squat', 1, 4, '5', 8, 'Main compound - strength focus'),
          te('rdl', 2, 3, '8-12', 7),
          te('legpress', 3, 3, '10-12', 8),
          te('legcurl', 4, 3, '10-12', 7),
          te('legext', 5, 3, '12-15', 7),
          te('calfraise', 6, 4, '12-15', 7),
        ],
        estimatedDuration: 60,
        targetMuscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
    ],
    program: {
      name: 'Push Pull Legs',
      description: 'Classic 6-day hypertrophy split. Each muscle group trained twice per week.',
      weeks: Array.from({ length: 8 }, (_, weekIdx): ProgramWeek => ({
        weekNumber: weekIdx + 1,
        name: weekIdx === 3 || weekIdx === 7 ? 'Deload' : undefined,
        isDeload: weekIdx === 3 || weekIdx === 7,
        days: [
          { dayNumber: 1, name: 'Push', isRest: false, templateId: 'ppl-push' },
          { dayNumber: 2, name: 'Pull', isRest: false, templateId: 'ppl-pull' },
          { dayNumber: 3, name: 'Legs', isRest: false, templateId: 'ppl-legs' },
          { dayNumber: 4, name: 'Push', isRest: false, templateId: 'ppl-push' },
          { dayNumber: 5, name: 'Pull', isRest: false, templateId: 'ppl-pull' },
          { dayNumber: 6, name: 'Legs', isRest: false, templateId: 'ppl-legs' },
          { dayNumber: 7, name: 'Rest', isRest: true },
        ],
      })),
      progressionRules: [
        {
          id: 'ppl-double-progression',
          name: 'Double Progression',
          config: {
            type: 'double_progression',
            repRange: [8, 12],
            weightIncrement: 5,
          },
        },
      ],
      durationWeeks: 8,
      goal: 'hypertrophy',
      difficulty: 'intermediate',
    },
  },

  // ===== PHUL (Power Hypertrophy Upper Lower) =====
  {
    id: 'phul',
    name: 'PHUL',
    description: 'Power Hypertrophy Upper Lower - 4 days per week combining strength and hypertrophy training.',
    author: 'Brandon Campbell',
    difficulty: 'intermediate',
    goal: 'general',
    daysPerWeek: 4,
    durationWeeks: 10,
    icon: '⚡',
    tags: ['strength', 'hypertrophy', 'intermediate', '4-day', 'upper-lower'],
    templates: [
      {
        id: 'phul-upper-power',
        name: 'Upper Power',
        description: 'Heavy upper body - strength focus',
        exercises: [
          te('bench', 1, 4, '3-5', 9, 'Heavy - strength focus'),
          te('rows', 2, 4, '3-5', 9),
          te('ohp', 3, 3, '5-8', 8),
          te('lat_pulldown', 4, 3, '6-10', 7),
          te('curls', 5, 3, '6-10', 7),
          te('skull_crushers', 6, 3, '6-10', 7),
        ],
        estimatedDuration: 60,
        targetMuscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'phul-lower-power',
        name: 'Lower Power',
        description: 'Heavy lower body - strength focus',
        exercises: [
          te('squat', 1, 4, '3-5', 9, 'Heavy - strength focus'),
          te('deadlift', 2, 3, '3-5', 9),
          te('legpress', 3, 4, '5-8', 8),
          te('legcurl', 4, 3, '6-10', 7),
          te('calfraise', 5, 4, '6-10', 7),
        ],
        estimatedDuration: 55,
        targetMuscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'phul-upper-hyper',
        name: 'Upper Hypertrophy',
        description: 'Volume upper body - hypertrophy focus',
        exercises: [
          te('incline_db', 1, 4, '8-12', 7),
          te('cable_flies', 2, 3, '12-15', 7),
          te('seated_cable_row', 3, 4, '8-12', 7),
          te('db_row', 4, 3, '8-12', 7),
          te('laterals', 5, 4, '12-15', 7),
          te('db_curl', 6, 4, '10-12', 7),
          te('tricep', 7, 4, '10-12', 7),
        ],
        estimatedDuration: 65,
        targetMuscleGroups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'phul-lower-hyper',
        name: 'Lower Hypertrophy',
        description: 'Volume lower body - hypertrophy focus',
        exercises: [
          te('front_squat', 1, 4, '8-12', 7),
          te('rdl', 2, 4, '8-12', 7),
          te('legpress', 3, 3, '12-15', 7),
          te('legcurl', 4, 4, '10-12', 7),
          te('legext', 5, 4, '12-15', 7),
          te('calfraise', 6, 4, '10-15', 7),
        ],
        estimatedDuration: 60,
        targetMuscleGroups: ['quads', 'hamstrings', 'glutes', 'calves'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
    ],
    program: {
      name: 'PHUL',
      description: 'Power Hypertrophy Upper Lower - 4 days combining strength and muscle building.',
      weeks: Array.from({ length: 10 }, (_, weekIdx): ProgramWeek => ({
        weekNumber: weekIdx + 1,
        name: weekIdx === 4 || weekIdx === 9 ? 'Deload' : undefined,
        isDeload: weekIdx === 4 || weekIdx === 9,
        days: [
          { dayNumber: 1, name: 'Upper Power', isRest: false, templateId: 'phul-upper-power' },
          { dayNumber: 2, name: 'Lower Power', isRest: false, templateId: 'phul-lower-power' },
          { dayNumber: 3, name: 'Rest', isRest: true },
          { dayNumber: 4, name: 'Upper Hypertrophy', isRest: false, templateId: 'phul-upper-hyper' },
          { dayNumber: 5, name: 'Lower Hypertrophy', isRest: false, templateId: 'phul-lower-hyper' },
          { dayNumber: 6, name: 'Rest', isRest: true },
          { dayNumber: 7, name: 'Rest', isRest: true },
        ],
      })),
      progressionRules: [
        {
          id: 'phul-linear-power',
          name: 'Power Days Linear',
          config: {
            type: 'linear',
            weightIncrement: 5,
            deloadThreshold: 2,
            deloadPercent: 0.1,
          },
        },
        {
          id: 'phul-double-hyper',
          name: 'Hypertrophy Days Double',
          config: {
            type: 'double_progression',
            repRange: [8, 12],
            weightIncrement: 5,
          },
        },
      ],
      durationWeeks: 10,
      goal: 'general',
      difficulty: 'intermediate',
    },
  },

  // ===== nSuns 5/3/1 LP =====
  {
    id: 'nsuns-4day',
    name: 'nSuns 5/3/1 LP (4-Day)',
    description: 'High volume linear progression based on 5/3/1. Great for intermediate lifters pushing for strength PRs.',
    author: 'nSuns (Reddit)',
    difficulty: 'advanced',
    goal: 'strength',
    daysPerWeek: 4,
    durationWeeks: 12,
    icon: '🔥',
    tags: ['strength', 'advanced', '5/3/1', 'high-volume', 'powerlifting'],
    templates: [
      {
        id: 'nsuns-bench-ohp',
        name: 'Bench + OHP',
        description: 'Primary: Bench (T1), Secondary: OHP (T2)',
        exercises: [
          te('bench', 1, 9, 'varies', 8, 'T1: 8 working sets + 1 AMRAP'),
          te('ohp', 2, 8, 'varies', 7, 'T2: 8 sets following T2 scheme'),
          te('rows', 3, 5, '8-12', 7, 'Accessory'),
          te('facepull', 4, 4, '15-20', 6, 'Accessory'),
          te('tricep', 5, 3, '10-15', 7, 'Accessory'),
        ],
        estimatedDuration: 75,
        targetMuscleGroups: ['chest', 'shoulders', 'triceps', 'back'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'nsuns-squat-sumo',
        name: 'Squat + Sumo',
        description: 'Primary: Squat (T1), Secondary: Sumo Deadlift (T2)',
        exercises: [
          te('squat', 1, 9, 'varies', 8, 'T1: 8 working sets + 1 AMRAP'),
          te('sumo_deadlift', 2, 8, 'varies', 7, 'T2: 8 sets following T2 scheme'),
          te('legpress', 3, 4, '10-12', 7, 'Accessory'),
          te('legcurl', 4, 4, '10-12', 7, 'Accessory'),
          te('calfraise', 5, 4, '12-15', 7, 'Accessory'),
        ],
        estimatedDuration: 70,
        targetMuscleGroups: ['quads', 'glutes', 'hamstrings', 'calves'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'nsuns-ohp-incline',
        name: 'OHP + Incline',
        description: 'Primary: OHP (T1), Secondary: Incline Bench (T2)',
        exercises: [
          te('ohp', 1, 9, 'varies', 8, 'T1: 8 working sets + 1 AMRAP'),
          te('incline_bench', 2, 8, 'varies', 7, 'T2: 8 sets following T2 scheme'),
          te('lat_pulldown', 3, 5, '8-12', 7, 'Accessory'),
          te('laterals', 4, 4, '12-15', 7, 'Accessory'),
          te('curls', 5, 3, '10-12', 7, 'Accessory'),
        ],
        estimatedDuration: 70,
        targetMuscleGroups: ['shoulders', 'chest', 'back', 'biceps'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'nsuns-deadlift-front',
        name: 'Deadlift + Front Squat',
        description: 'Primary: Deadlift (T1), Secondary: Front Squat (T2)',
        exercises: [
          te('deadlift', 1, 9, 'varies', 9, 'T1: 8 working sets + 1 AMRAP'),
          te('front_squat', 2, 8, 'varies', 7, 'T2: 8 sets following T2 scheme'),
          te('rdl', 3, 4, '8-12', 7, 'Accessory'),
          te('legext', 4, 4, '12-15', 7, 'Accessory'),
          te('ab_rollout', 5, 3, '10-15', 7, 'Accessory'),
        ],
        estimatedDuration: 75,
        targetMuscleGroups: ['back', 'quads', 'hamstrings', 'core'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
    ],
    program: {
      name: 'nSuns 5/3/1 LP (4-Day)',
      description: 'High volume 5/3/1 variant with aggressive linear progression. Increase TM based on AMRAP performance.',
      weeks: Array.from({ length: 12 }, (_, weekIdx): ProgramWeek => ({
        weekNumber: weekIdx + 1,
        name: weekIdx === 5 || weekIdx === 11 ? 'Deload' : undefined,
        isDeload: weekIdx === 5 || weekIdx === 11,
        days: [
          { dayNumber: 1, name: 'Bench + OHP', isRest: false, templateId: 'nsuns-bench-ohp' },
          { dayNumber: 2, name: 'Squat + Sumo', isRest: false, templateId: 'nsuns-squat-sumo' },
          { dayNumber: 3, name: 'Rest', isRest: true },
          { dayNumber: 4, name: 'OHP + Incline', isRest: false, templateId: 'nsuns-ohp-incline' },
          { dayNumber: 5, name: 'Deadlift + Front Squat', isRest: false, templateId: 'nsuns-deadlift-front' },
          { dayNumber: 6, name: 'Rest', isRest: true },
          { dayNumber: 7, name: 'Rest', isRest: true },
        ],
      })),
      progressionRules: [
        {
          id: 'nsuns-amrap-progression',
          name: 'AMRAP-Based Progression',
          config: {
            type: 'rpe_based',
            targetRpe: 8,
            rpeRange: [7, 9],
            adjustmentPerPoint: 5,
          },
        },
      ],
      durationWeeks: 12,
      goal: 'strength',
      difficulty: 'advanced',
    },
  },

  // ===== GZCLP (GZCL Method for Beginners) =====
  {
    id: 'gzclp',
    name: 'GZCLP',
    description: 'Tiered approach to training: heavy T1 compounds, moderate T2 variants, and light T3 accessories. Great for intermediates.',
    author: 'Cody LeFever (GZCL)',
    difficulty: 'intermediate',
    goal: 'strength',
    daysPerWeek: 4,
    durationWeeks: 12,
    icon: '🎯',
    tags: ['strength', 'intermediate', 'tiered', 'linear-progression'],
    templates: [
      {
        id: 'gzclp-a1',
        name: 'Day A1 - Squat Focus',
        description: 'T1: Squat, T2: Bench, T3: Lat Pulldown',
        exercises: [
          te('squat', 1, 5, '3', 9, 'T1: 5x3 - heavy'),
          te('bench', 2, 3, '10', 7, 'T2: 3x10'),
          te('lat_pulldown', 3, 3, '15', 6, 'T3: 3x15+'),
        ],
        estimatedDuration: 50,
        targetMuscleGroups: ['quads', 'chest', 'back'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'gzclp-b1',
        name: 'Day B1 - OHP Focus',
        description: 'T1: OHP, T2: Deadlift, T3: Rows',
        exercises: [
          te('ohp', 1, 5, '3', 9, 'T1: 5x3 - heavy'),
          te('deadlift', 2, 3, '10', 7, 'T2: 3x10'),
          te('db_row', 3, 3, '15', 6, 'T3: 3x15+'),
        ],
        estimatedDuration: 50,
        targetMuscleGroups: ['shoulders', 'back', 'hamstrings'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'gzclp-a2',
        name: 'Day A2 - Bench Focus',
        description: 'T1: Bench, T2: Squat, T3: Lat Pulldown',
        exercises: [
          te('bench', 1, 5, '3', 9, 'T1: 5x3 - heavy'),
          te('squat', 2, 3, '10', 7, 'T2: 3x10'),
          te('lat_pulldown', 3, 3, '15', 6, 'T3: 3x15+'),
        ],
        estimatedDuration: 50,
        targetMuscleGroups: ['chest', 'quads', 'back'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
      {
        id: 'gzclp-b2',
        name: 'Day B2 - Deadlift Focus',
        description: 'T1: Deadlift, T2: OHP, T3: Rows',
        exercises: [
          te('deadlift', 1, 5, '3', 9, 'T1: 5x3 - heavy'),
          te('ohp', 2, 3, '10', 7, 'T2: 3x10'),
          te('db_row', 3, 3, '15', 6, 'T3: 3x15+'),
        ],
        estimatedDuration: 50,
        targetMuscleGroups: ['back', 'shoulders', 'hamstrings'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isDefault: true,
      },
    ],
    program: {
      name: 'GZCLP',
      description: 'GZCL Linear Progression. Tiered approach: T1 for strength, T2 for volume, T3 for hypertrophy.',
      weeks: Array.from({ length: 12 }, (_, weekIdx): ProgramWeek => ({
        weekNumber: weekIdx + 1,
        name: weekIdx === 5 || weekIdx === 11 ? 'Deload' : undefined,
        isDeload: weekIdx === 5 || weekIdx === 11,
        days: [
          { dayNumber: 1, name: 'A1 - Squat Focus', isRest: false, templateId: 'gzclp-a1' },
          { dayNumber: 2, name: 'Rest', isRest: true },
          { dayNumber: 3, name: 'B1 - OHP Focus', isRest: false, templateId: 'gzclp-b1' },
          { dayNumber: 4, name: 'Rest', isRest: true },
          { dayNumber: 5, name: 'A2 - Bench Focus', isRest: false, templateId: 'gzclp-a2' },
          { dayNumber: 6, name: 'Rest', isRest: true },
          { dayNumber: 7, name: 'B2 - Deadlift Focus', isRest: false, templateId: 'gzclp-b2' },
        ],
      })),
      progressionRules: [
        {
          id: 'gzclp-linear',
          name: 'T1/T2 Linear Progression',
          config: {
            type: 'linear',
            weightIncrement: 5,
            deloadThreshold: 2,
            deloadPercent: 0.15,
          },
        },
      ],
      durationWeeks: 12,
      goal: 'strength',
      difficulty: 'intermediate',
    },
  },
];
