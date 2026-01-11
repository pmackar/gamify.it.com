'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  FitnessState,
  Workout,
  WorkoutExercise,
  Set as SetType,
  Profile,
  Campaign,
  WorkoutTemplate,
  TemplateExercise,
  LegacyWorkoutTemplate,
  Program,
  ProgramWeek,
  ProgramDay,
  ActiveProgram,
  ProgressionRule,
  ProgressionConfig,
  ExerciseProgressEntry,
  ViewType,
  SyncState,
  NarrativeEngineState,
  RivalRelationship,
  EncounterRecord,
  NarrativeSettings,
  ImprovementSnapshot,
} from './types';
import { isLegacyTemplate, DEFAULT_NARRATIVE_SETTINGS } from './types';
import { dispatchXPUpdate } from '@/components/XPContext';
import { flushXPGain } from '@/components/XPToast';
import {
  DEFAULT_TEMPLATES,
  MILESTONES,
  GENERAL_ACHIEVEMENTS,
  calculateSetXP,
  getLevelFromXP,
  getExerciseById,
  EXERCISES,
  PREBUILT_PROGRAMS,
  type PrebuiltProgram
} from './data';

const STORAGE_KEY = 'gamify_fitness';
const ACTIVE_WORKOUT_KEY = 'gamify_fitness_active';

// Sync debounce timeout
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

// Queue sync helper
const queueSync = (get: () => FitnessStore) => {
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    get().syncToServer();
  }, 500);
};

// Haptic feedback helper (silent fail if not supported)
const haptic = (pattern: number | number[]) => {
  if (typeof navigator !== 'undefined' && navigator.vibrate) {
    try {
      navigator.vibrate(pattern);
    } catch {
      // Ignore - haptics not supported
    }
  }
};

interface FitnessStore extends FitnessState, SyncState {
  // Current workout state
  currentWorkout: Workout | null;
  currentExerciseIndex: number;
  workoutSeconds: number;
  workoutStartTime: number | null; // Timestamp when workout started
  workoutPRsHit: number;
  lastActivityTime: number | null;  // Timestamp of last set logged
  currentProgramDayInfo: { weekNumber: number; dayNumber: number } | null; // Track which program day this workout is for

  // Rest timer state
  restTimerSeconds: number;  // Countdown seconds (0 = not running)
  restTimerRunning: boolean;

  // Offline queue state
  isOnline: boolean;
  syncRetryCount: number;

  // UI state
  currentView: ViewType;
  selectedWorkoutId: string | null;
  editingTemplateId: string | null;
  editingProgramId: string | null;
  programWizardStep: number;
  programWizardData: Partial<Program> | null;
  toastMessage: string | null;

  // Actions
  loadState: () => void;
  saveState: () => void;

  // Profile actions
  addXP: (amount: number) => void;
  updateProfileName: (name: string) => void;
  updateBodyStats: (height?: number, bodyWeight?: number) => void;

  // Workout actions
  startWorkout: () => void;
  startWorkoutFromTemplate: (templateId: string) => void;
  startWorkoutWithExercise: (exerciseId: string) => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  addCustomExercise: (name: string) => void;
  addCustomExerciseWithMuscleAndTier: (name: string, muscle: string, tier?: number) => void;
  updateCustomExercise: (id: string, updates: { name?: string; muscle?: string; tier?: number }) => void;
  selectExercise: (index: number) => void;
  logSet: (weight: number, reps: number, rpe?: number, isWarmup?: boolean) => void;
  updateSet: (setIndex: number, weight: number, reps: number, rpe?: number, isWarmup?: boolean) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  removeExercise: (exerciseIndex: number) => void;
  restoreSet: (exerciseIndex: number, setIndex: number, setData: Set) => void;
  restoreExercise: (exerciseIndex: number, exerciseData: WorkoutExercise) => void;
  substituteExercise: (exerciseIndex: number, newExerciseId: string, newExerciseName: string) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  linkSuperset: (exerciseIndex: number) => void;  // Link exercise to previous exercise's superset
  unlinkSuperset: (exerciseIndex: number) => void;  // Remove exercise from superset
  finishWorkout: () => Promise<void>;
  autoCompleteWorkout: (endTimeISO: string) => Promise<void>;
  cancelWorkout: () => void;

  // Workout timer
  updateTimerFromStart: () => void;
  resetTimer: () => void;

  // Rest timer
  setRestTimerPreset: (seconds: number) => void;
  startRestTimer: () => void;
  tickRestTimer: () => void;
  stopRestTimer: () => void;

  // Exercise notes
  setExerciseNote: (exerciseId: string, note: string) => void;

  // Helpers
  getLastWorkoutForExercise: (exerciseId: string) => WorkoutExercise | null;
  getExerciseProgressData: (exerciseId: string) => { date: string; maxWeight: number; totalVolume: number; e1rm: number }[];
  getSummaryStats: (days: number) => {
    workouts: number;
    totalVolume: number;
    totalXP: number;
    totalSets: number;
    prsHit: number;
    avgDuration: number;
    topExercises: { name: string; sets: number }[];
  };
  exportWorkoutsCSV: (startDate?: Date, endDate?: Date) => string;

  // Navigation
  setView: (view: ViewType) => void;
  showWorkoutDetail: (workoutId: string) => void;

  // Records & Achievements
  checkPR: (exerciseId: string, weight: number, reps?: number) => boolean;
  checkMilestone: (exerciseId: string, weight: number) => { name: string; icon: string; xp: number } | null;
  getUpcomingMilestones: () => Array<{
    exerciseId: string;
    exerciseName: string;
    currentPR: number;
    targetWeight: number;
    milestoneName: string;
    milestoneIcon: string;
    xpReward: number;
    progress: number;
  }>;
  editPR: (exerciseId: string, weight: number) => void;
  deletePR: (exerciseId: string) => void;
  recalculatePRsFromHistory: () => void;

  // Templates
  saveTemplate: (name: string) => void;
  createTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, updates: Partial<WorkoutTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  editTemplate: (id: string | null) => void;
  getTemplateById: (id: string) => WorkoutTemplate | null;
  migrateTemplate: (template: WorkoutTemplate | LegacyWorkoutTemplate) => WorkoutTemplate;

  // Programs
  createProgram: (program: Omit<Program, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateProgram: (id: string, updates: Partial<Program>) => void;
  deleteProgram: (id: string) => void;
  duplicateProgram: (id: string) => void;
  importPrebuiltProgram: (prebuiltId: string) => string | null;
  getProgramById: (id: string) => Program | null;
  startProgram: (programId: string) => void;
  stopProgram: () => void;
  advanceProgramDay: () => void;
  getTodaysWorkout: () => { program: Program; week: ProgramWeek; day: ProgramDay; template: WorkoutTemplate | null } | null;
  getUpcomingWorkouts: (limit?: number) => { weekNumber: number; dayNumber: number; dayName: string; workoutName: string; isRest: boolean; isToday: boolean; template: WorkoutTemplate | null }[];
  startProgramWorkout: () => void;
  startProgramWorkoutForDay: (weekNumber: number, dayNumber: number) => void;
  skipProgramWorkout: (weekNumber: number, dayNumber: number) => void;
  calculateSuggestedWeight: (exerciseId: string) => number | null;
  calculateProgressionTarget: (exerciseId: string, templateReps?: string) => {
    weight: number | null;
    reps: string;
    rpe: number | null;
    progressionType: string | null;
  };
  updateExerciseProgress: (exerciseId: string, weight: number, reps: number, rpe?: number) => void;

  // Program Wizard
  startProgramWizard: () => void;
  editProgram: (programId: string) => void;
  setProgramWizardStep: (step: number) => void;
  updateProgramWizardData: (data: Partial<Program>) => void;
  finishProgramWizard: () => string | null;
  cancelProgramWizard: () => void;

  // Campaigns
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (campaignId: string) => void;
  updateCampaignProgress: () => void;

  // Analytics
  getVolumeByWeek: (weeks?: number) => { week: string; volume: number }[];
  getVolumeByMuscle: () => { muscle: string; volume: number; percentage: number }[];
  getStrengthProgress: (exerciseId: string) => { date: string; weight: number }[];
  getWeeklySummary: () => { workouts: number; sets: number; volume: number; xp: number };
  getMonthlySummary: () => { workouts: number; sets: number; volume: number; xp: number };

  // Toast
  showToast: (message: string) => void;

  // Onboarding
  completeOnboarding: () => void;
  clearToast: () => void;

  // Offline queue
  setOnlineStatus: (online: boolean) => void;
  retrySyncOnReconnect: () => void;

  // Data management
  importWorkouts: (workouts: Workout[]) => Promise<void>;
  eraseAllData: () => void;
  deleteWorkout: (workoutId: string) => void;
  editWorkout: (workoutId: string) => void;
  updateWorkoutTimes: (workoutId: string, startTime: string, endTime: string) => void;

  // Sync
  syncToServer: () => Promise<void>;
  fetchFromServer: () => Promise<void>;

  // Narrative Engine
  narrativeEngine: NarrativeEngineState | null;
  initNarrativeEngine: () => Promise<void>;
  addRival: (rival: RivalRelationship) => void;
  removeRival: (rivalId: string) => void;
  updateRivalStats: (rivalId: string, updates: Partial<RivalRelationship>) => void;
  recordEncounter: (encounter: EncounterRecord) => void;
  updateNarrativeSettings: (settings: Partial<NarrativeSettings>) => void;
  getUserImprovementSnapshot: () => ImprovementSnapshot;
  shouldTriggerEncounter: () => boolean;
}

const defaultProfile: Profile = {
  name: 'Athlete',
  level: 1,
  xp: 0,
  totalWorkouts: 0,
  totalSets: 0,
  totalVolume: 0
};

const defaultState: FitnessState = {
  profile: defaultProfile,
  workouts: [],
  records: {},
  recordsMeta: {},
  achievements: [],
  customExercises: [],
  templates: [...DEFAULT_TEMPLATES],
  programs: [],
  activeProgram: null,
  campaigns: [],
  exerciseNotes: {},
  restTimerPreset: 90,
  hasCompletedOnboarding: false
};

export const useFitnessStore = create<FitnessStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Current workout state
      currentWorkout: null,
      currentExerciseIndex: 0,
      workoutSeconds: 0,
      workoutStartTime: null,
      workoutPRsHit: 0,
      lastActivityTime: null,
      currentProgramDayInfo: null,

      // Rest timer state
      restTimerSeconds: 0,
      restTimerRunning: false,

      // Offline queue state
      isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      syncRetryCount: 0,

      // UI state
      currentView: 'home',
      selectedWorkoutId: null,
      editingTemplateId: null,
      editingProgramId: null,
      programWizardStep: 0,
      programWizardData: null,
      toastMessage: null,

      // Sync state
      lastSyncedAt: null,
      pendingSync: false,
      syncStatus: 'idle',
      syncError: null,

      // Narrative Engine state
      narrativeEngine: null,

      loadState: () => {
        // Load active workout from separate storage
        try {
          const activeWorkout = localStorage.getItem(ACTIVE_WORKOUT_KEY);
          if (activeWorkout) {
            const parsed = JSON.parse(activeWorkout);
            const startTime = parsed.startTime || Date.now();
            const lastActivity = parsed.lastActivityTime || startTime;
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            const inactivityMs = Date.now() - lastActivity;
            const INACTIVITY_THRESHOLD_MS = 120 * 60 * 1000; // 120 minutes

            // Check if workout has any logged sets
            const hasLoggedSets = parsed.workout?.exercises?.some(
              (ex: { sets?: unknown[] }) => ex.sets && ex.sets.length > 0
            );

            // Auto-complete if inactive for 120+ minutes AND has logged sets
            if (hasLoggedSets && inactivityMs >= INACTIVITY_THRESHOLD_MS) {
              // Use last activity time as end time
              const endTimeISO = new Date(lastActivity).toISOString();
              set({
                currentWorkout: parsed.workout,
                currentExerciseIndex: parsed.exerciseIndex || 0,
                workoutStartTime: startTime,
                lastActivityTime: lastActivity,
                workoutSeconds: Math.floor((lastActivity - startTime) / 1000),
                currentProgramDayInfo: parsed.programDayInfo || null,
              });
              // Auto-complete the workout
              get().autoCompleteWorkout(endTimeISO);
              get().showToast('Workout auto-saved due to inactivity');
              return;
            }

            set({
              currentWorkout: parsed.workout,
              currentExerciseIndex: parsed.exerciseIndex || 0,
              workoutStartTime: startTime,
              lastActivityTime: lastActivity,
              workoutSeconds: elapsedSeconds,
              currentProgramDayInfo: parsed.programDayInfo || null,
              currentView: 'workout'
            });
          }
        } catch (e) {
          console.error('Failed to load active workout:', e);
        }
      },

      saveState: () => {
        const state = get();
        if (state.currentWorkout) {
          localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify({
            workout: state.currentWorkout,
            exerciseIndex: state.currentExerciseIndex,
            startTime: state.workoutStartTime,
            lastActivityTime: state.lastActivityTime,
            programDayInfo: state.currentProgramDayInfo
          }));
        }
      },

      addXP: (amount: number) => {
        set((state) => {
          const newXP = state.profile.xp + amount;
          const newLevel = getLevelFromXP(newXP);
          const leveledUp = newLevel > state.profile.level;

          if (leveledUp) {
            setTimeout(() => {
              get().showToast(`Level Up! Now level ${newLevel}`);
              // Celebration haptic for level up
              haptic([100, 50, 100, 50, 100, 50, 300]);
            }, 100);
          }

          return {
            profile: {
              ...state.profile,
              xp: newXP,
              level: newLevel
            },
            pendingSync: true
          };
        });
        queueSync(get);
      },

      updateProfileName: (name: string) => {
        set((state) => ({
          profile: { ...state.profile, name },
          pendingSync: true
        }));
        queueSync(get);
      },

      updateBodyStats: (height?: number, bodyWeight?: number) => {
        set((state) => {
          const today = new Date().toISOString().split('T')[0];
          let weightHistory = [...(state.profile.weightHistory || [])];

          // If body weight changed, add to history
          if (bodyWeight !== undefined && bodyWeight !== state.profile.bodyWeight) {
            // Check if we already have an entry for today
            const todayIndex = weightHistory.findIndex(e => e.date === today);
            if (todayIndex >= 0) {
              // Update today's entry
              weightHistory[todayIndex] = { weight: bodyWeight, date: today };
            } else {
              // Add new entry
              weightHistory.push({ weight: bodyWeight, date: today });
            }
            // Keep only last 365 entries
            if (weightHistory.length > 365) {
              weightHistory = weightHistory.slice(-365);
            }
          }

          return {
            profile: {
              ...state.profile,
              ...(height !== undefined && { height }),
              ...(bodyWeight !== undefined && { bodyWeight }),
              weightHistory
            },
            pendingSync: true
          };
        });
        queueSync(get);
        get().showToast('Stats updated');
      },

      startWorkout: () => {
        const now = Date.now();
        const workout: Workout = {
          id: now.toString(),
          exercises: [],
          startTime: new Date().toISOString(),
          totalXP: 0,
          source: 'manual'
        };
        set({
          currentWorkout: workout,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: now,
          workoutPRsHit: 0,
          currentView: 'workout'
        });
        get().saveState();
      },

      startWorkoutFromTemplate: (templateId: string) => {
        const state = get();
        const rawTemplate = state.templates.find(t => t.id === templateId);
        if (!rawTemplate) return;

        // Migrate to new format if needed
        const template = get().migrateTemplate(rawTemplate);

        const exercises: WorkoutExercise[] = template.exercises.map(ex => {
          const exerciseData = getExerciseById(ex.exerciseId);
          // Calculate suggested weight based on progression rules or PR
          const suggestedWeight = get().calculateSuggestedWeight(ex.exerciseId)
            || state.records[ex.exerciseId]
            || null;
          return {
            id: ex.exerciseId,
            name: ex.exerciseName || exerciseData?.name || ex.exerciseId,
            sets: [],
            supersetGroup: ex.supersetGroup,
            // Store target info for UI hints (not used directly in workout)
            _targetSets: ex.targetSets,
            _targetReps: ex.targetReps,
            _targetRpe: ex.targetRpe,
            _targetWeight: suggestedWeight,
          } as WorkoutExercise;
        });

        const now = Date.now();
        const workout: Workout = {
          id: now.toString(),
          exercises,
          startTime: new Date().toISOString(),
          totalXP: 0,
          source: 'manual'
        };

        set({
          currentWorkout: workout,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: now,
          workoutPRsHit: 0,
          currentView: 'workout'
        });
        get().saveState();
        get().showToast(`Started ${template.name}`);
      },

      startWorkoutWithExercise: (exerciseId: string) => {
        const exercise = getExerciseById(exerciseId);
        if (!exercise) return;

        const now = Date.now();
        const workout: Workout = {
          id: now.toString(),
          exercises: [{
            id: exerciseId,
            name: exercise.name,
            sets: []
          }],
          startTime: new Date().toISOString(),
          totalXP: 0,
          source: 'manual'
        };

        set({
          currentWorkout: workout,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: now,
          workoutPRsHit: 0,
          currentView: 'workout'
        });
        get().saveState();
      },

      addExerciseToWorkout: (exerciseId: string) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = getExerciseById(exerciseId) ||
          state.customExercises.find(e => e.id === exerciseId);
        if (!exercise) return;

        const newExercise: WorkoutExercise = {
          id: exerciseId,
          name: exercise.name,
          sets: []
        };

        set((state) => ({
          currentWorkout: state.currentWorkout ? {
            ...state.currentWorkout,
            exercises: [...state.currentWorkout.exercises, newExercise]
          } : null,
          currentExerciseIndex: state.currentWorkout ? state.currentWorkout.exercises.length : 0
        }));

        get().saveState();
        get().showToast(`Added ${exercise.name}`);
      },

      addCustomExercise: (name: string) => {
        const state = get();
        const id = name.toLowerCase().replace(/\s+/g, '_');
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

        // Add to custom exercises if not exists
        if (!state.customExercises.find(e => e.id === id)) {
          set((state) => ({
            customExercises: [...state.customExercises, { id, name: formattedName, muscle: 'other' }],
            pendingSync: true
          }));
          queueSync(get);
        }

        // If in workout, add to workout
        if (state.currentWorkout) {
          const newExercise: WorkoutExercise = {
            id,
            name: formattedName,
            sets: [],
            isCustom: true
          };

          set((state) => ({
            currentWorkout: state.currentWorkout ? {
              ...state.currentWorkout,
              exercises: [...state.currentWorkout.exercises, newExercise]
            } : null,
            currentExerciseIndex: state.currentWorkout ? state.currentWorkout.exercises.length : 0
          }));

          get().saveState();
          get().showToast(`Added ${formattedName}`);
        }
      },

      addCustomExerciseWithMuscle: (name: string, muscle: string, tier?: number) => {
        const id = name.toLowerCase().replace(/\s+/g, '_');
        const formattedName = name.charAt(0).toUpperCase() + name.slice(1);

        // Add to custom exercises if not exists
        if (!get().customExercises.find(e => e.id === id)) {
          set((state) => ({
            customExercises: [...state.customExercises, { id, name: formattedName, muscle, tier: tier || 3 }],
            pendingSync: true
          }));
          queueSync(get);
          get().saveState();
          get().showToast(`Created ${formattedName}`);
        }
      },

      addCustomExerciseWithMuscleAndTier: (name: string, muscle: string, tier?: number) => {
        // Alias for addCustomExerciseWithMuscle
        get().addCustomExerciseWithMuscle(name, muscle, tier);
      },

      updateCustomExercise: (id: string, updates: { name?: string; muscle?: string; tier?: number }) => {
        set((state) => ({
          customExercises: state.customExercises.map(ex =>
            ex.id === id ? { ...ex, ...updates } : ex
          ),
          pendingSync: true
        }));
        queueSync(get);
        get().saveState();
        get().showToast('Exercise updated');
      },

      selectExercise: (index: number) => {
        // Flush any pending XP notifications before switching exercises
        flushXPGain('fitness');
        set({ currentExerciseIndex: index });
        get().saveState();
      },

      logSet: (weight: number, reps: number, rpe?: number, isWarmup?: boolean) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
        if (!exercise) return;

        // Warmup sets don't earn XP or count toward volume
        const xp = isWarmup ? 0 : calculateSetXP(exercise.id, weight, reps);

        const newSet: SetType = {
          weight,
          reps,
          rpe,
          timestamp: new Date().toISOString(),
          xp,
          isWarmup
        };

        // Update the workout
        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          exercises[state.currentExerciseIndex] = {
            ...exercises[state.currentExerciseIndex],
            sets: [...exercises[state.currentExerciseIndex].sets, newSet]
          };

          return {
            currentWorkout: {
              ...state.currentWorkout,
              exercises,
              totalXP: state.currentWorkout.totalXP + xp
            },
            profile: {
              ...state.profile,
              totalSets: state.profile.totalSets + 1,
              // Only add to volume for working sets
              totalVolume: state.profile.totalVolume + (isWarmup ? 0 : weight * reps)
            }
          };
        });

        // Haptic feedback for set logged
        haptic(50);

        // Add XP (only for working sets)
        if (!isWarmup && xp > 0) {
          get().addXP(xp);
        }

        // Check PR and milestone only for working sets
        if (!isWarmup) {
          // Capture current PR data BEFORE checkPR updates it
          const state = get();
          const previousPRWeight = state.records[exercise.id] || 0;
          const prMeta = state.recordsMeta[exercise.id];

          const isPR = get().checkPR(exercise.id, weight, reps);
          if (isPR) {
            set((state) => ({ workoutPRsHit: state.workoutPRsHit + 1 }));
            // Strong haptic for PR
            haptic([100, 50, 100, 50, 200]);

            // Calculate improvement
            const weightGain = previousPRWeight > 0 ? weight - previousPRWeight : 0;
            const percentageGain = previousPRWeight > 0
              ? Math.round((weightGain / previousPRWeight) * 100)
              : 0;

            // Dispatch enhanced PR celebration
            if (typeof window !== 'undefined') {
              window.dispatchEvent(new CustomEvent('pr-achieved', {
                detail: {
                  exerciseId: exercise.id,
                  exerciseName: exercise.name,
                  newWeight: weight,
                  newReps: reps,
                  previousBest: previousPRWeight > 0 ? {
                    weight: previousPRWeight,
                    reps: prMeta?.reps || 0,
                    date: prMeta?.date || '',
                  } : undefined,
                  firstRecord: prMeta?.firstWeight ? {
                    weight: prMeta.firstWeight,
                    reps: prMeta?.reps || 0,
                    date: prMeta.firstDate || '',
                  } : undefined,
                  improvement: {
                    weightGain,
                    percentageGain,
                  },
                }
              }));
            }
          }

          const milestone = get().checkMilestone(exercise.id, weight);
          if (milestone) {
            get().addXP(milestone.xp);
            set((state) => ({
              currentWorkout: state.currentWorkout ? {
                ...state.currentWorkout,
                totalXP: state.currentWorkout.totalXP + milestone.xp
              } : null
            }));
            setTimeout(() => {
              get().showToast(`${milestone.icon} ${milestone.name} unlocked!`);
              // Celebration haptic for milestone
              haptic([100, 100, 100, 100, 300]);
            }, isPR ? 2500 : 0);
          }
        }

        // Update last activity time for auto-complete tracking
        set({ lastActivityTime: Date.now() });
        get().saveState();
        get().updateCampaignProgress();
      },

      updateSet: (setIndex: number, weight: number, reps: number, rpe?: number, isWarmup?: boolean) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
        if (!exercise || setIndex >= exercise.sets.length) return;

        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          const sets = [...exercises[state.currentExerciseIndex].sets];
          sets[setIndex] = { ...sets[setIndex], weight, reps, rpe, isWarmup };
          exercises[state.currentExerciseIndex] = { ...exercises[state.currentExerciseIndex], sets };

          return {
            currentWorkout: { ...state.currentWorkout, exercises }
          };
        });

        get().saveState();
        get().showToast('Set updated');
      },

      removeSet: (exerciseIndex: number, setIndex: number) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = state.currentWorkout.exercises[exerciseIndex];
        if (!exercise || setIndex >= exercise.sets.length) return;

        const removedSet = exercise.sets[setIndex];

        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          const sets = [...exercises[exerciseIndex].sets];
          sets.splice(setIndex, 1);
          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

          return {
            currentWorkout: { ...state.currentWorkout, exercises }
          };
        });

        get().saveState();
        get().showToast(`Removed ${removedSet.weight}×${removedSet.reps}`);
      },

      removeExercise: (exerciseIndex: number) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = state.currentWorkout.exercises[exerciseIndex];
        if (!exercise) return;

        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          exercises.splice(exerciseIndex, 1);

          let newIndex = state.currentExerciseIndex;
          if (exercises.length === 0) {
            newIndex = 0;
          } else if (state.currentExerciseIndex >= exercises.length) {
            newIndex = exercises.length - 1;
          } else if (state.currentExerciseIndex > exerciseIndex) {
            newIndex = state.currentExerciseIndex - 1;
          }

          return {
            currentWorkout: { ...state.currentWorkout, exercises },
            currentExerciseIndex: newIndex
          };
        });

        get().saveState();
        get().showToast(`${exercise.name} removed`);
      },

      restoreSet: (exerciseIndex: number, setIndex: number, setData: Set) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = state.currentWorkout.exercises[exerciseIndex];
        if (!exercise) return;

        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          const sets = [...exercises[exerciseIndex].sets];
          sets.splice(setIndex, 0, setData);
          exercises[exerciseIndex] = { ...exercises[exerciseIndex], sets };

          return {
            currentWorkout: { ...state.currentWorkout, exercises },
          };
        });

        get().saveState();
        get().showToast(`Set restored`);
      },

      restoreExercise: (exerciseIndex: number, exerciseData: WorkoutExercise) => {
        const state = get();
        if (!state.currentWorkout) return;

        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          exercises.splice(exerciseIndex, 0, exerciseData);

          return {
            currentWorkout: { ...state.currentWorkout, exercises },
            currentExerciseIndex: exerciseIndex,
          };
        });

        get().saveState();
        get().showToast(`${exerciseData.name} restored`);
      },

      substituteExercise: (exerciseIndex: number, newExerciseId: string, newExerciseName: string) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = state.currentWorkout.exercises[exerciseIndex];
        if (!exercise) return;

        const oldName = exercise.name;

        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          // Replace exercise but keep same position, preserve any logged sets
          exercises[exerciseIndex] = {
            ...exercises[exerciseIndex],
            id: newExerciseId,
            name: newExerciseName,
            originalExerciseId: exercise.originalExerciseId || exercise.id, // Track original for program
          };

          return {
            currentWorkout: { ...state.currentWorkout, exercises }
          };
        });

        get().saveState();
        get().showToast(`Swapped ${oldName} → ${newExerciseName}`);
      },

      reorderExercises: (fromIndex: number, toIndex: number) => {
        const state = get();
        if (!state.currentWorkout) return;

        set((state) => {
          if (!state.currentWorkout) return state;

          const exercises = [...state.currentWorkout.exercises];
          const [removed] = exercises.splice(fromIndex, 1);
          exercises.splice(toIndex, 0, removed);

          let newIndex = state.currentExerciseIndex;
          if (state.currentExerciseIndex === fromIndex) {
            newIndex = toIndex;
          } else if (fromIndex < state.currentExerciseIndex && toIndex >= state.currentExerciseIndex) {
            newIndex = state.currentExerciseIndex - 1;
          } else if (fromIndex > state.currentExerciseIndex && toIndex <= state.currentExerciseIndex) {
            newIndex = state.currentExerciseIndex + 1;
          }

          return {
            currentWorkout: { ...state.currentWorkout, exercises },
            currentExerciseIndex: newIndex
          };
        });

        get().saveState();
        get().showToast('Exercise order updated');
      },

      linkSuperset: (exerciseIndex: number) => {
        const state = get();
        if (!state.currentWorkout || exerciseIndex <= 0) return;

        // Find the previous exercise's superset group, or create a new one
        const prevExercise = state.currentWorkout.exercises[exerciseIndex - 1];
        const supersetGroup = prevExercise.supersetGroup || Date.now();

        set((state) => {
          if (!state.currentWorkout) return state;
          const exercises = state.currentWorkout.exercises.map((ex, i) => {
            if (i === exerciseIndex - 1 && !ex.supersetGroup) {
              return { ...ex, supersetGroup };
            }
            if (i === exerciseIndex) {
              return { ...ex, supersetGroup };
            }
            return ex;
          });
          return { currentWorkout: { ...state.currentWorkout, exercises } };
        });

        get().saveState();
        get().showToast('Exercises linked as superset');
      },

      unlinkSuperset: (exerciseIndex: number) => {
        const state = get();
        if (!state.currentWorkout) return;

        set((state) => {
          if (!state.currentWorkout) return state;
          const exercises = state.currentWorkout.exercises.map((ex, i) => {
            if (i === exerciseIndex) {
              const { supersetGroup, ...rest } = ex;
              return rest as typeof ex;
            }
            return ex;
          });
          return { currentWorkout: { ...state.currentWorkout, exercises } };
        });

        get().saveState();
        get().showToast('Exercise unlinked from superset');
      },

      finishWorkout: async () => {
        // Flush any pending XP notifications before finishing
        flushXPGain('fitness');

        const state = get();
        if (!state.currentWorkout) return;

        const endTime = new Date().toISOString();
        // Calculate duration from start time for accuracy
        const duration = state.workoutStartTime
          ? Math.floor((Date.now() - state.workoutStartTime) / 1000)
          : state.workoutSeconds;

        // Check if this was a program workout
        const programDayInfo = state.currentProgramDayInfo;

        const completedWorkout: Workout = {
          ...state.currentWorkout,
          endTime,
          duration,
          // Store program day info on workout so we can track it if deleted
          programDayInfo: programDayInfo ? {
            weekNumber: programDayInfo.weekNumber,
            dayNumber: programDayInfo.dayNumber
          } : undefined
        };

        // Calculate total volume for this workout
        const workoutVolume = completedWorkout.exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((setTotal, s) => setTotal + (s.weight * s.reps), 0);
        }, 0);

        const newTotalWorkouts = state.profile.totalWorkouts + 1;
        const newTotalVolume = state.profile.totalVolume + workoutVolume;

        set((state) => {
          // If this was a program workout, track it as completed
          let activeProgram = state.activeProgram;
          if (programDayInfo && activeProgram) {
            const workoutKey = `${programDayInfo.weekNumber}-${programDayInfo.dayNumber}`;
            activeProgram = {
              ...activeProgram,
              completedWorkouts: [...activeProgram.completedWorkouts, workoutKey]
            };
          }

          return {
            workouts: [completedWorkout, ...state.workouts],
            profile: {
              ...state.profile,
              totalWorkouts: newTotalWorkouts,
              totalVolume: newTotalVolume
            },
            activeProgram,
            currentWorkout: null,
            currentExerciseIndex: 0,
            workoutSeconds: 0,
            workoutStartTime: null,
            workoutPRsHit: 0,
            lastActivityTime: null,
            currentProgramDayInfo: null,
            currentView: 'home',
            pendingSync: true
          };
        });

        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        queueSync(get);

        // Advance program day if this was a program workout
        if (programDayInfo) {
          get().advanceProgramDay();
        }

        // Call unified XP API (skip per-XP loot - we use workout-level loot)
        const prsHit = state.workoutPRsHit;
        const totalSets = completedWorkout.exercises.reduce((t, e) => t + e.sets.length, 0);
        try {
          const response = await fetch('/api/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appId: 'fitness',
              action: 'workout_complete',
              xpAmount: completedWorkout.totalXP,
              skipLoot: true, // Use workout-level loot instead
              metadata: {
                workoutCount: newTotalWorkouts,
                totalVolume: newTotalVolume,
                totalSets,
                prsHit,
              }
            })
          });

          if (response.ok) {
            const data = await response.json();

            // Show achievements if any
            if (data.achievements?.length > 0) {
              // Dispatch achievement event for the popup
              window.dispatchEvent(new CustomEvent('achievement-unlocked', {
                detail: data.achievements
              }));
            }

            // Show toast with streak info
            const streakBonus = data.streakMultiplier > 1
              ? ` (${Math.round((data.streakMultiplier - 1) * 100)}% streak bonus!)`
              : '';
            get().showToast(`Workout complete! +${data.xpAwarded} XP${streakBonus}`);

            // Dispatch workout-completed event for UI components to refresh
            window.dispatchEvent(new CustomEvent('workout-completed', {
              detail: { workoutId: completedWorkout.id, xp: data.xpAwarded }
            }));
          } else {
            get().showToast(`Workout complete! +${completedWorkout.totalXP} XP`);
            // Still dispatch event even if XP API failed
            window.dispatchEvent(new CustomEvent('workout-completed', {
              detail: { workoutId: completedWorkout.id, xp: completedWorkout.totalXP }
            }));
          }

          // Roll for workout-level loot (guaranteed drop)
          const lootResponse = await fetch('/api/loot/workout-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalXP: completedWorkout.totalXP,
              exerciseCount: completedWorkout.exercises.length,
              prsHit,
              setCount: totalSets,
            })
          });

          if (lootResponse.ok) {
            const lootData = await lootResponse.json();
            if (lootData.loot) {
              // Dispatch loot drop event for the popup
              window.dispatchEvent(new CustomEvent('loot-dropped', {
                detail: {
                  item: lootData.loot.item,
                  rarity: lootData.loot.rarity,
                  instantXP: lootData.loot.instantXP,
                  bonuses: lootData.bonuses,
                  isWorkoutLoot: true, // Flag for chest animation
                }
              }));
            }
          }

          // Dispatch reflection prompt after loot
          setTimeout(() => {
            window.dispatchEvent(new CustomEvent('show-reflection-prompt', {
              detail: {
                workoutId: completedWorkout.id,
                stats: {
                  duration: completedWorkout.duration || 0,
                  exerciseCount: completedWorkout.exercises.length,
                  setCount: totalSets,
                  prsHit,
                }
              }
            }));
          }, 500); // Small delay to let loot animation finish
        } catch {
          // Fallback if API fails
          get().showToast(`Workout complete! +${completedWorkout.totalXP} XP`);
        }

        // Update navbar XP display
        dispatchXPUpdate();
      },

      autoCompleteWorkout: async (endTimeISO: string) => {
        const state = get();
        if (!state.currentWorkout) return;

        const endTimeMs = new Date(endTimeISO).getTime();
        // Calculate duration from start time to provided end time
        const duration = state.workoutStartTime
          ? Math.floor((endTimeMs - state.workoutStartTime) / 1000)
          : state.workoutSeconds;

        // Check if this was a program workout
        const programDayInfo = state.currentProgramDayInfo;

        const completedWorkout: Workout = {
          ...state.currentWorkout,
          endTime: endTimeISO,
          duration,
          // Store program day info on workout so we can track it if deleted
          programDayInfo: programDayInfo ? {
            weekNumber: programDayInfo.weekNumber,
            dayNumber: programDayInfo.dayNumber
          } : undefined,
          autoCompleted: true
        };

        // Calculate total volume for this workout
        const workoutVolume = completedWorkout.exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((setTotal, s) => setTotal + (s.weight * s.reps), 0);
        }, 0);

        const newTotalWorkouts = state.profile.totalWorkouts + 1;
        const newTotalVolume = state.profile.totalVolume + workoutVolume;

        set((state) => {
          // If this was a program workout, track it as completed
          let activeProgram = state.activeProgram;
          if (programDayInfo && activeProgram) {
            const workoutKey = `${programDayInfo.weekNumber}-${programDayInfo.dayNumber}`;
            activeProgram = {
              ...activeProgram,
              completedWorkouts: [...activeProgram.completedWorkouts, workoutKey]
            };
          }

          return {
            workouts: [completedWorkout, ...state.workouts],
            profile: {
              ...state.profile,
              totalWorkouts: newTotalWorkouts,
              totalVolume: newTotalVolume
            },
            activeProgram,
            currentWorkout: null,
            currentExerciseIndex: 0,
            workoutSeconds: 0,
            workoutStartTime: null,
            workoutPRsHit: 0,
            lastActivityTime: null,
            currentProgramDayInfo: null,
            currentView: 'home',
            pendingSync: true
          };
        });

        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        queueSync(get);

        // Advance program day if this was a program workout
        if (programDayInfo) {
          get().advanceProgramDay();
        }

        // Call unified XP API (silent - don't show full completion toast for auto-complete)
        const totalSets = completedWorkout.exercises.reduce((t, e) => t + e.sets.length, 0);
        const prsHit = state.workoutPRsHit;
        try {
          await fetch('/api/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appId: 'fitness',
              action: 'workout_complete',
              xpAmount: completedWorkout.totalXP,
              skipLoot: true, // Use workout-level loot
              metadata: {
                workoutCount: newTotalWorkouts,
                totalVolume: newTotalVolume,
                totalSets,
                prsHit,
                autoCompleted: true,
              }
            })
          });

          // Roll for workout-level loot (silent for auto-complete)
          const lootResponse = await fetch('/api/loot/workout-complete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              totalXP: completedWorkout.totalXP,
              exerciseCount: completedWorkout.exercises.length,
              prsHit,
              setCount: totalSets,
            })
          });

          if (lootResponse.ok) {
            const lootData = await lootResponse.json();
            if (lootData.loot) {
              // Dispatch loot drop event (will show when user opens app)
              window.dispatchEvent(new CustomEvent('loot-dropped', {
                detail: {
                  item: lootData.loot.item,
                  rarity: lootData.loot.rarity,
                  instantXP: lootData.loot.instantXP,
                  bonuses: lootData.bonuses,
                  isWorkoutLoot: true,
                }
              }));
            }
          }
        } catch {
          // Silent fail for auto-complete
        }

        dispatchXPUpdate();
      },

      cancelWorkout: () => {
        set({
          currentWorkout: null,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: null,
          workoutPRsHit: 0,
          lastActivityTime: null,
          currentProgramDayInfo: null,
          currentView: 'home'
        });
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        get().showToast('Workout cancelled');
      },

      updateTimerFromStart: () => {
        const state = get();
        if (state.workoutStartTime) {
          const elapsed = Math.floor((Date.now() - state.workoutStartTime) / 1000);
          set({ workoutSeconds: elapsed });
        }
      },

      resetTimer: () => {
        set({ workoutSeconds: 0, workoutStartTime: null });
      },

      // Rest timer actions
      setRestTimerPreset: (seconds: number) => {
        set({ restTimerPreset: seconds, pendingSync: true });
        queueSync(get);
      },

      startRestTimer: () => {
        const preset = get().restTimerPreset;
        set({ restTimerSeconds: preset, restTimerRunning: true });
      },

      tickRestTimer: () => {
        const state = get();
        if (state.restTimerRunning && state.restTimerSeconds > 0) {
          set({ restTimerSeconds: state.restTimerSeconds - 1 });
        } else if (state.restTimerRunning && state.restTimerSeconds <= 0) {
          set({ restTimerRunning: false });
          // Haptic buzz when rest timer completes
          haptic([200, 100, 200]);
        }
      },

      stopRestTimer: () => {
        set({ restTimerSeconds: 0, restTimerRunning: false });
      },

      // Exercise notes
      setExerciseNote: (exerciseId: string, note: string) => {
        set((state) => ({
          exerciseNotes: { ...state.exerciseNotes, [exerciseId]: note },
          pendingSync: true
        }));
        queueSync(get);
      },

      // Helper to get last workout data for an exercise
      getLastWorkoutForExercise: (exerciseId: string) => {
        const state = get();
        // Search through workouts (newest first) to find one with this exercise
        for (const workout of state.workouts) {
          const exercise = workout.exercises.find(e => e.id === exerciseId);
          if (exercise && exercise.sets.length > 0) {
            return exercise;
          }
        }
        return null;
      },

      // Get summary stats for a time period
      getSummaryStats: (days: number) => {
        const state = get();
        const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

        // Filter workouts in time period
        const recentWorkouts = state.workouts.filter(w => {
          const date = new Date(w.endTime || w.startTime);
          return date >= cutoff;
        });

        // Calculate stats
        let totalVolume = 0;
        let totalXP = 0;
        let totalSets = 0;
        let totalDuration = 0;
        const exerciseCounts: Record<string, number> = {};

        recentWorkouts.forEach(workout => {
          totalXP += workout.totalXP;
          totalDuration += workout.duration || 0;

          workout.exercises.forEach(ex => {
            exerciseCounts[ex.name] = (exerciseCounts[ex.name] || 0) + ex.sets.length;
            ex.sets.forEach(set => {
              if (!set.isWarmup) {
                totalVolume += set.weight * set.reps;
                totalSets++;
              }
            });
          });
        });

        // Get top exercises
        const topExercises = Object.entries(exerciseCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 5)
          .map(([name, sets]) => ({ name, sets }));

        // Count PRs hit in this period (rough estimate based on records timestamps)
        // For now, just count unique records that were hit during this period
        const prsHit = recentWorkouts.reduce((sum, w) => {
          // This is a simplified count - actual PR tracking would require storing PR dates
          return sum;
        }, 0);

        return {
          workouts: recentWorkouts.length,
          totalVolume,
          totalXP,
          totalSets,
          prsHit,
          avgDuration: recentWorkouts.length > 0 ? Math.round(totalDuration / recentWorkouts.length) : 0,
          topExercises
        };
      },

      // Export workouts as CSV
      exportWorkoutsCSV: (startDate?: Date, endDate?: Date) => {
        const state = get();
        const rows: string[] = [];

        // Header row
        rows.push('Date,Time,Exercise,Set,Weight (lbs),Reps,RPE,Warmup,XP,Notes,Workout Duration (min)');

        // Filter workouts by date range
        let workouts = state.workouts;
        if (startDate) {
          workouts = workouts.filter(w => new Date(w.startTime) >= startDate);
        }
        if (endDate) {
          workouts = workouts.filter(w => new Date(w.startTime) <= endDate);
        }

        // Sort oldest to newest for export
        workouts = [...workouts].reverse();

        for (const workout of workouts) {
          const date = new Date(workout.startTime).toLocaleDateString();
          const time = new Date(workout.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const duration = workout.duration ? Math.round(workout.duration / 60) : '';

          for (const exercise of workout.exercises) {
            const note = state.exerciseNotes[exercise.id] || '';
            const escapedNote = note.includes(',') ? `"${note.replace(/"/g, '""')}"` : note;

            exercise.sets.forEach((set, setIdx) => {
              rows.push([
                date,
                time,
                exercise.name,
                setIdx + 1,
                set.weight,
                set.reps,
                set.rpe || '',
                set.isWarmup ? 'Yes' : 'No',
                set.xp,
                escapedNote,
                setIdx === 0 ? duration : ''  // Only show duration on first set
              ].join(','));
            });
          }
        }

        return rows.join('\n');
      },

      // Get progress data for charting an exercise over time
      getExerciseProgressData: (exerciseId: string) => {
        const state = get();
        const dataPoints: { date: string; maxWeight: number; totalVolume: number; e1rm: number }[] = [];

        // Go through all workouts (oldest to newest for charting)
        const sortedWorkouts = [...state.workouts].reverse();

        for (const workout of sortedWorkouts) {
          const exercise = workout.exercises.find(e => e.id === exerciseId);
          if (exercise && exercise.sets.length > 0) {
            // Filter out warmup sets
            const workingSets = exercise.sets.filter(s => !s.isWarmup);
            if (workingSets.length === 0) continue;

            // Calculate metrics
            const maxWeight = Math.max(...workingSets.map(s => s.weight));
            const totalVolume = workingSets.reduce((sum, s) => sum + (s.weight * s.reps), 0);

            // Calculate estimated 1RM using Epley formula: weight × (1 + reps/30)
            // Use the set with highest e1RM
            let bestE1rm = 0;
            for (const set of workingSets) {
              const e1rm = set.weight * (1 + set.reps / 30);
              if (e1rm > bestE1rm) bestE1rm = e1rm;
            }

            dataPoints.push({
              date: workout.endTime || workout.startTime,
              maxWeight,
              totalVolume,
              e1rm: Math.round(bestE1rm)
            });
          }
        }

        return dataPoints;
      },

      setView: (view: ViewType) => {
        set({ currentView: view, selectedWorkoutId: null });
      },

      showWorkoutDetail: (workoutId: string) => {
        set({ currentView: 'workout-detail', selectedWorkoutId: workoutId });
      },

      checkPR: (exerciseId: string, weight: number, reps?: number) => {
        const state = get();
        const currentPR = state.records[exerciseId] || 0;

        if (weight > currentPR) {
          const now = new Date().toISOString();
          const existingMeta = state.recordsMeta[exerciseId];
          set((state) => ({
            records: { ...state.records, [exerciseId]: weight },
            recordsMeta: {
              ...state.recordsMeta,
              [exerciseId]: {
                date: now,
                imported: false,
                reps: reps || 1,
                firstWeight: existingMeta?.firstWeight || weight,
                firstDate: existingMeta?.firstDate || now,
              }
            },
            pendingSync: true
          }));
          queueSync(get);
          return true;
        }
        return false;
      },

      editPR: (exerciseId: string, weight: number) => {
        const state = get();
        const existingMeta = state.recordsMeta[exerciseId];
        set((state) => ({
          records: { ...state.records, [exerciseId]: weight },
          recordsMeta: {
            ...state.recordsMeta,
            [exerciseId]: {
              ...existingMeta,
              date: existingMeta?.date || new Date().toISOString(),
              imported: existingMeta?.imported || false,
            }
          },
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('PR updated');
      },

      deletePR: (exerciseId: string) => {
        set((state) => {
          const { [exerciseId]: _, ...remainingRecords } = state.records;
          const { [exerciseId]: __, ...remainingMeta } = state.recordsMeta;
          return {
            records: remainingRecords,
            recordsMeta: remainingMeta,
            pendingSync: true
          };
        });
        queueSync(get);
        get().showToast('PR removed');
      },

      recalculatePRsFromHistory: () => {
        const state = get();
        const newRecords: Record<string, number> = {};
        const newMeta: Record<string, { date: string; imported: boolean; reps?: number; firstWeight?: number; firstDate?: string }> = {};

        // Sort workouts by date (oldest first), excluding CSV imports
        const sortedWorkouts = [...state.workouts]
          .filter(w => w.source !== 'csv')  // Exclude CSV imports from PR calculation
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

        for (const workout of sortedWorkouts) {
          for (const exercise of workout.exercises) {
            for (const s of exercise.sets) {
              if (s.isWarmup) continue;

              const exerciseId = exercise.id || (exercise as { exerciseId?: string }).exerciseId;
              if (!exerciseId) continue;

              // Track first weight
              if (!newMeta[exerciseId]?.firstWeight) {
                newMeta[exerciseId] = {
                  date: workout.startTime,
                  imported: false,
                  reps: s.reps,
                  firstWeight: s.weight,
                  firstDate: workout.startTime
                };
              }

              // Track PR - highest weight lifted
              if (s.weight > (newRecords[exerciseId] || 0)) {
                newRecords[exerciseId] = s.weight;
                newMeta[exerciseId] = {
                  ...newMeta[exerciseId],
                  date: workout.startTime,
                  imported: false,
                  reps: s.reps
                };
              }
            }
          }
        }

        set({ records: newRecords, recordsMeta: newMeta, pendingSync: true });
        queueSync(get);
        get().showToast('PRs recalculated from history (excluding imports)');
      },

      checkMilestone: (exerciseId: string, weight: number) => {
        const state = get();
        const milestones = MILESTONES[exerciseId];
        if (!milestones) return null;

        for (const milestone of milestones) {
          const key = `${exerciseId}_${milestone.weight}`;
          if (weight >= milestone.weight && !state.achievements.includes(key)) {
            set((state) => ({
              achievements: [...state.achievements, key],
              pendingSync: true
            }));
            queueSync(get);
            return milestone;
          }
        }
        return null;
      },

      // Get upcoming milestones for all lifts where user has PR but hasn't hit next milestone
      getUpcomingMilestones: () => {
        const state = get();
        const upcoming: Array<{
          exerciseId: string;
          exerciseName: string;
          currentPR: number;
          targetWeight: number;
          milestoneName: string;
          milestoneIcon: string;
          xpReward: number;
          progress: number; // percentage 0-100
        }> = [];

        // Check each exercise that has milestones
        for (const [exerciseId, milestones] of Object.entries(MILESTONES)) {
          const currentPR = state.records[exerciseId] || 0;
          if (currentPR === 0) continue; // Skip if user has no PR for this exercise

          // Find the next unachieved milestone
          for (const milestone of milestones) {
            // Skip milestones the user has already exceeded
            if (currentPR >= milestone.weight) continue;

            const key = `${exerciseId}_${milestone.weight}`;
            if (!state.achievements.includes(key)) {
              // This is the next milestone to achieve
              const exercise = getExerciseById(exerciseId);
              // Calculate progress - from previous milestone (or 0) to this milestone
              const prevMilestoneIdx = milestones.findIndex(m => m.weight === milestone.weight) - 1;
              const prevWeight = prevMilestoneIdx >= 0 ? milestones[prevMilestoneIdx].weight : 0;
              const progressRange = milestone.weight - prevWeight;
              const userProgress = currentPR - prevWeight;
              const progress = Math.min(Math.round((userProgress / progressRange) * 100), 99);

              if (progress > 0) { // Only show if user has made some progress
                upcoming.push({
                  exerciseId,
                  exerciseName: exercise?.name || exerciseId,
                  currentPR,
                  targetWeight: milestone.weight,
                  milestoneName: milestone.name,
                  milestoneIcon: milestone.icon,
                  xpReward: milestone.xp,
                  progress
                });
              }
              break; // Only show next milestone for each exercise
            }
          }
        }

        // Sort by progress descending (closest to completion first)
        return upcoming.sort((a, b) => b.progress - a.progress);
      },

      saveTemplate: (name: string) => {
        const state = get();
        if (!state.currentWorkout) return;

        const now = new Date().toISOString();
        const template: WorkoutTemplate = {
          id: Date.now().toString(),
          name,
          exercises: state.currentWorkout.exercises.map((e, idx) => ({
            exerciseId: e.id,
            exerciseName: e.name,
            order: idx,
            targetSets: e.sets.length || 3,
            targetReps: e.sets.length > 0 ? `${e.sets[0].reps}` : '8-12',
            supersetGroup: e.supersetGroup,
          })),
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          templates: [...state.templates, template],
          pendingSync: true
        }));
        queueSync(get);

        get().showToast(`Template "${name}" saved`);
      },

      createTemplate: (templateData) => {
        const now = new Date().toISOString();
        const id = Date.now().toString();
        const template: WorkoutTemplate = {
          ...templateData,
          id,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          templates: [...state.templates, template],
          pendingSync: true
        }));
        queueSync(get);

        get().showToast(`Template "${template.name}" created`);
        return id;
      },

      updateTemplate: (id: string, updates: Partial<WorkoutTemplate>) => {
        set((state) => ({
          templates: state.templates.map(t =>
            t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
          ),
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Template updated');
      },

      deleteTemplate: (id: string) => {
        const state = get();
        const template = state.templates.find(t => t.id === id);
        if (template?.isDefault) {
          get().showToast('Cannot delete default templates');
          return;
        }

        set((state) => ({
          templates: state.templates.filter(t => t.id !== id),
          editingTemplateId: state.editingTemplateId === id ? null : state.editingTemplateId,
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Template deleted');
      },

      duplicateTemplate: (id: string) => {
        const state = get();
        const template = state.templates.find(t => t.id === id);
        if (!template) return;

        const now = new Date().toISOString();
        // Handle both legacy and new format
        const migratedTemplate = get().migrateTemplate(template);

        const newTemplate: WorkoutTemplate = {
          ...migratedTemplate,
          id: Date.now().toString(),
          name: `${migratedTemplate.name} (Copy)`,
          isDefault: false,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          templates: [...state.templates, newTemplate],
          pendingSync: true
        }));
        queueSync(get);
        get().showToast(`Template duplicated`);
      },

      editTemplate: (id: string | null) => {
        set({
          editingTemplateId: id,
          currentView: id ? 'template-editor' : 'templates'
        });
      },

      getTemplateById: (id: string) => {
        const state = get();
        const template = state.templates.find(t => t.id === id);
        if (!template) return null;
        // Always return migrated format
        return get().migrateTemplate(template);
      },

      migrateTemplate: (template: WorkoutTemplate | LegacyWorkoutTemplate): WorkoutTemplate => {
        // Check if it's already in new format (exercises is array of objects)
        if (template.exercises.length === 0) {
          return {
            ...template,
            exercises: [],
            createdAt: (template as WorkoutTemplate).createdAt || new Date().toISOString(),
            updatedAt: (template as WorkoutTemplate).updatedAt || new Date().toISOString(),
          } as WorkoutTemplate;
        }

        // If first exercise is a string, it's legacy format
        if (typeof template.exercises[0] === 'string') {
          const legacyExercises = template.exercises as unknown as string[];
          return {
            id: template.id,
            name: template.name,
            exercises: legacyExercises.map((exId, idx) => {
              const exercise = getExerciseById(exId);
              return {
                exerciseId: exId,
                exerciseName: exercise?.name || exId,
                order: idx,
                targetSets: 3,
                targetReps: '8-12',
              };
            }),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isDefault: (template as WorkoutTemplate).isDefault,
          };
        }

        // Already in new format
        return template as WorkoutTemplate;
      },

      // ============================================
      // PROGRAM METHODS
      // ============================================

      createProgram: (programData) => {
        const now = new Date().toISOString();
        const id = Date.now().toString();
        const program: Program = {
          ...programData,
          id,
          createdAt: now,
          updatedAt: now,
        } as Program;

        set((state) => ({
          programs: [...state.programs, program],
          pendingSync: true
        }));
        queueSync(get);

        get().showToast(`Program "${program.name}" created`);
        return id;
      },

      updateProgram: (id: string, updates: Partial<Program>) => {
        set((state) => ({
          programs: state.programs.map(p =>
            p.id === id ? { ...p, ...updates, updatedAt: new Date().toISOString() } : p
          ),
          pendingSync: true
        }));
        queueSync(get);
      },

      deleteProgram: (id: string) => {
        const state = get();
        // Stop if this is the active program
        if (state.activeProgram?.programId === id) {
          get().stopProgram();
        }

        set((state) => ({
          programs: state.programs.filter(p => p.id !== id),
          editingProgramId: state.editingProgramId === id ? null : state.editingProgramId,
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Program deleted');
      },

      duplicateProgram: (id: string) => {
        const state = get();
        const program = state.programs.find(p => p.id === id);
        if (!program) return;

        const now = new Date().toISOString();
        const newProgram: Program = {
          ...program,
          id: Date.now().toString(),
          name: `${program.name} (Copy)`,
          createdAt: now,
          updatedAt: now,
        };

        set((state) => ({
          programs: [...state.programs, newProgram],
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Program duplicated');
      },

      importPrebuiltProgram: (prebuiltId: string) => {
        const prebuilt = PREBUILT_PROGRAMS.find(p => p.id === prebuiltId);
        if (!prebuilt) return null;

        const now = new Date().toISOString();
        const programId = Date.now().toString();

        // Import templates with unique IDs
        const templateIdMap: Record<string, string> = {};
        const newTemplates: WorkoutTemplate[] = prebuilt.templates.map(t => {
          const newId = `${programId}-${t.id}`;
          templateIdMap[t.id] = newId;
          return {
            ...t,
            id: newId,
            createdAt: now,
            updatedAt: now,
            isDefault: false,
          };
        });

        // Create program with remapped template IDs
        const newProgram: Program = {
          ...prebuilt.program,
          id: programId,
          createdAt: now,
          updatedAt: now,
          weeks: prebuilt.program.weeks.map(week => ({
            ...week,
            days: week.days.map(day => ({
              ...day,
              templateId: day.templateId ? templateIdMap[day.templateId] : undefined,
            })),
          })),
        };

        set((state) => ({
          templates: [...state.templates, ...newTemplates],
          programs: [...state.programs, newProgram],
          pendingSync: true
        }));
        queueSync(get);
        get().showToast(`${prebuilt.name} imported!`);
        return programId;
      },

      getProgramById: (id: string) => {
        return get().programs.find(p => p.id === id) || null;
      },

      startProgram: (programId: string) => {
        const program = get().programs.find(p => p.id === programId);
        if (!program) return;

        const activeProgram: ActiveProgram = {
          programId,
          startedAt: new Date().toISOString(),
          currentWeek: 1,
          currentDay: 1,
          completedWorkouts: [],
          exerciseProgress: {},
        };

        set({
          activeProgram,
          pendingSync: true,
          currentView: 'home'
        });
        queueSync(get);
        get().showToast(`Started "${program.name}"`);
      },

      stopProgram: () => {
        set({
          activeProgram: null,
          pendingSync: true
        });
        queueSync(get);
        get().showToast('Program stopped');
      },

      advanceProgramDay: () => {
        const state = get();
        if (!state.activeProgram) return;

        const program = state.programs.find(p => p.id === state.activeProgram!.programId);
        if (!program) return;

        let { currentWeek, currentDay } = state.activeProgram;
        const daysInWeek = program.weeks[currentWeek - 1]?.days.length || 7;

        currentDay++;
        if (currentDay > daysInWeek) {
          currentDay = 1;
          currentWeek++;
          if (currentWeek > program.durationWeeks) {
            // Program completed!
            get().showToast(`🎉 "${program.name}" completed!`);
            set({
              activeProgram: null,
              pendingSync: true
            });
            queueSync(get);
            return;
          }
        }

        set((state) => ({
          activeProgram: state.activeProgram ? {
            ...state.activeProgram,
            currentWeek,
            currentDay,
          } : null,
          pendingSync: true
        }));
        queueSync(get);
      },

      getTodaysWorkout: () => {
        const state = get();
        if (!state.activeProgram) return null;

        const program = state.programs.find(p => p.id === state.activeProgram!.programId);
        if (!program) return null;

        const week = program.weeks[state.activeProgram.currentWeek - 1];
        if (!week) return null;

        const day = week.days.find(d => d.dayNumber === state.activeProgram!.currentDay);
        if (!day || day.isRest) return null;

        const template = day.templateId ? get().getTemplateById(day.templateId) : null;

        return { program, week, day, template };
      },

      getUpcomingWorkouts: (limit = 21) => {
        const state = get();
        if (!state.activeProgram) return [];

        const program = state.programs.find(p => p.id === state.activeProgram!.programId);
        if (!program) return [];

        const currentWeek = state.activeProgram.currentWeek;
        const currentDay = state.activeProgram.currentDay;
        const completedWorkouts = state.activeProgram.completedWorkouts || [];
        const upcoming: { weekNumber: number; dayNumber: number; dayName: string; workoutName: string; isRest: boolean; isToday: boolean; isCompleted: boolean; template: WorkoutTemplate | null }[] = [];

        // Collect workouts from current and next weeks (include all days in current week)
        for (let weekOffset = 0; weekOffset < 3 && upcoming.length < limit; weekOffset++) {
          const weekIndex = currentWeek - 1 + weekOffset;
          if (weekIndex >= program.weeks.length) break;

          const week = program.weeks[weekIndex];
          const weekNum = week.weekNumber;

          for (const day of week.days) {
            if (upcoming.length >= limit) break;

            const template = day.templateId ? state.getTemplateById(day.templateId) : null;
            const isToday = weekOffset === 0 && day.dayNumber === currentDay;
            const workoutKey = `${weekNum}-${day.dayNumber}`;
            const isCompleted = completedWorkouts.includes(workoutKey);

            upcoming.push({
              weekNumber: weekNum,
              dayNumber: day.dayNumber,
              dayName: `Day ${day.dayNumber}`,
              workoutName: day.isRest ? 'Rest Day' : (template?.name || day.name),
              isRest: day.isRest,
              isToday,
              isCompleted,
              template,
            });
          }
        }

        return upcoming;
      },

      startProgramWorkout: () => {
        const todaysWorkout = get().getTodaysWorkout();
        if (!todaysWorkout || !todaysWorkout.template) {
          get().showToast('No workout scheduled for today');
          return;
        }

        // Start workout from the template
        get().startWorkoutFromTemplate(todaysWorkout.template.id);
      },

      startProgramWorkoutForDay: (weekNumber: number, dayNumber: number) => {
        const state = get();
        if (!state.activeProgram) {
          get().showToast('No active program');
          return;
        }

        const program = state.programs.find(p => p.id === state.activeProgram!.programId);
        if (!program) {
          get().showToast('Program not found');
          return;
        }

        const week = program.weeks.find(w => w.weekNumber === weekNumber);
        if (!week) {
          get().showToast('Week not found');
          return;
        }

        const day = week.days.find(d => d.dayNumber === dayNumber);
        if (!day || day.isRest) {
          get().showToast('No workout for this day');
          return;
        }

        const template = day.templateId ? state.getTemplateById(day.templateId) : null;
        if (!template) {
          get().showToast('Workout template not found');
          return;
        }

        // Track which program day this workout is for
        set({ currentProgramDayInfo: { weekNumber, dayNumber } });

        // Start workout from the template
        get().startWorkoutFromTemplate(template.id);
      },

      skipProgramWorkout: (weekNumber: number, dayNumber: number) => {
        const state = get();
        if (!state.activeProgram) return;

        const workoutKey = `${weekNumber}-${dayNumber}`;
        const completedWorkouts = state.activeProgram.completedWorkouts || [];

        // Don't skip if already completed
        if (completedWorkouts.includes(workoutKey)) return;

        set({
          activeProgram: {
            ...state.activeProgram,
            completedWorkouts: [...completedWorkouts, workoutKey]
          },
          pendingSync: true
        });

        get().showToast('Workout skipped');
        queueSync(get);
      },

      calculateSuggestedWeight: (exerciseId: string) => {
        const state = get();
        if (!state.activeProgram) return null;

        const program = state.programs.find(p => p.id === state.activeProgram!.programId);
        if (!program) return null;

        // Check for exercise weight config
        const weightConfig = program.exerciseWeightConfigs?.find(c => c.exerciseId === exerciseId);

        const progress = state.activeProgram.exerciseProgress[exerciseId];
        if (!progress) {
          // First time - use weight config or PR
          if (weightConfig) {
            switch (weightConfig.weightBasis) {
              case 'max':
                if (weightConfig.maxWeight) {
                  const percentage = weightConfig.workingPercentage || 0.75;
                  // Round to nearest 5 lbs
                  return Math.round((weightConfig.maxWeight * percentage) / 5) * 5;
                }
                break;
              case 'starting':
                if (weightConfig.startingWeight) {
                  return weightConfig.startingWeight;
                }
                break;
              case 'auto':
              default:
                // Fall through to PR-based
                break;
            }
          }
          // Default: use PR or null
          return state.records[exerciseId] || null;
        }

        // Find applicable progression rule
        const rule = program.progressionRules.find(r =>
          r.exerciseId === exerciseId || !r.exerciseId
        );

        if (!rule) return progress.lastWeight;

        const config = rule.config;

        switch (config.type) {
          case 'linear': {
            if (progress.consecutiveSuccesses > 0) {
              return progress.lastWeight + config.weightIncrement;
            }
            if (progress.consecutiveFailures >= config.deloadThreshold) {
              return Math.round(progress.lastWeight * (1 - config.deloadPercent));
            }
            return progress.lastWeight;
          }

          case 'double_progression': {
            const [, maxReps] = config.repRange;
            // If hit top of range last time, increase weight
            if (progress.lastReps >= maxReps) {
              return progress.lastWeight + config.weightIncrement;
            }
            return progress.lastWeight;
          }

          case 'rpe_based': {
            if (progress.lastRpe === undefined) return progress.lastWeight;
            const rpeDiff = config.targetRpe - progress.lastRpe;
            // If RPE was too low, increase weight; if too high, decrease
            return progress.lastWeight + (rpeDiff * config.adjustmentPerPoint);
          }

          case 'percentage': {
            const base = config.basedOn === '1rm'
              ? (state.records[exerciseId] || progress.lastWeight)
              : progress.lastWeight;
            return Math.round(base * (1 + config.weeklyIncrease));
          }

          case 'wave': {
            const currentWeek = state.activeProgram!.currentWeek;
            const waveConfig = config.waves.find(w => w.week === currentWeek);
            if (waveConfig) {
              const oneRM = state.records[exerciseId] || progress.lastWeight * 1.3;
              return Math.round(oneRM * (waveConfig.intensityPercent / 100));
            }
            return progress.lastWeight;
          }

          default:
            return progress.lastWeight;
        }
      },

      calculateProgressionTarget: (exerciseId: string, templateReps?: string) => {
        const state = get();
        const defaultResult = {
          weight: null as number | null,
          reps: templateReps || '8-12',
          rpe: null as number | null,
          progressionType: null as string | null,
        };

        if (!state.activeProgram) {
          // No active program - just use template values or last workout
          const lastWorkout = state.getLastWorkoutForExercise(exerciseId);
          const lastSet = lastWorkout?.sets[lastWorkout.sets.length - 1];
          return {
            weight: lastSet?.weight || state.records[exerciseId] || null,
            reps: templateReps || (lastSet?.reps?.toString() || '8'),
            rpe: lastSet?.rpe || null,
            progressionType: null,
          };
        }

        const program = state.programs.find(p => p.id === state.activeProgram!.programId);
        if (!program) return defaultResult;

        const progress = state.activeProgram.exerciseProgress[exerciseId];
        const rule = program.progressionRules.find(r =>
          r.exerciseId === exerciseId || !r.exerciseId
        );

        // Base values from last workout
        const lastWeight = progress?.lastWeight || state.records[exerciseId] || null;
        const lastReps = progress?.lastReps || 8;
        const lastRpe = progress?.lastRpe;

        if (!rule) {
          return {
            weight: lastWeight,
            reps: templateReps || lastReps.toString(),
            rpe: null,
            progressionType: 'none',
          };
        }

        const config = rule.config;

        switch (config.type) {
          case 'linear': {
            // Linear: add weight each successful session
            let targetWeight = lastWeight;
            if (lastWeight && progress?.consecutiveSuccesses > 0) {
              targetWeight = lastWeight + config.weightIncrement;
            } else if (lastWeight && progress?.consecutiveFailures >= config.deloadThreshold) {
              targetWeight = Math.round(lastWeight * (1 - config.deloadPercent));
            }
            return {
              weight: targetWeight,
              reps: templateReps || lastReps.toString(),
              rpe: null,
              progressionType: 'linear',
            };
          }

          case 'double_progression': {
            // Double progression: same weight until top of rep range, then increase
            const [minReps, maxReps] = config.repRange;
            let targetWeight = lastWeight;
            let targetReps: string;

            if (lastWeight && lastReps >= maxReps) {
              // Hit top of range - increase weight, reset to min reps
              targetWeight = lastWeight + config.weightIncrement;
              targetReps = `${minReps}-${maxReps}`;
            } else {
              // Same weight, aim for more reps
              const nextReps = Math.min(lastReps + 1, maxReps);
              targetReps = `${nextReps}-${maxReps}`;
            }
            return {
              weight: targetWeight,
              reps: targetReps,
              rpe: null,
              progressionType: 'double_progression',
            };
          }

          case 'rpe_based': {
            // RPE-based: adjust weight to hit target RPE
            let targetWeight = lastWeight;
            if (lastWeight && lastRpe !== undefined) {
              const rpeDiff = config.targetRpe - lastRpe;
              targetWeight = Math.round(lastWeight + (rpeDiff * config.adjustmentPerPoint));
            }
            return {
              weight: targetWeight,
              reps: templateReps || lastReps.toString(),
              rpe: config.targetRpe,
              progressionType: 'rpe_based',
            };
          }

          case 'percentage': {
            // Percentage: increase by weekly percentage
            const base = config.basedOn === '1rm'
              ? (state.records[exerciseId] || lastWeight || 100)
              : (lastWeight || 100);
            const targetWeight = Math.round(base * (1 + config.weeklyIncrease));
            return {
              weight: targetWeight,
              reps: templateReps || lastReps.toString(),
              rpe: null,
              progressionType: 'percentage',
            };
          }

          case 'wave': {
            // Wave: follow intensity pattern by week
            const currentWeek = state.activeProgram!.currentWeek;
            const waveConfig = config.waves.find(w => w.week === currentWeek);
            if (waveConfig) {
              const oneRM = state.records[exerciseId] || (lastWeight ? lastWeight * 1.3 : 100);
              const targetWeight = Math.round(oneRM * (waveConfig.intensityPercent / 100));
              return {
                weight: targetWeight,
                reps: waveConfig.reps.toString(),
                rpe: null,
                progressionType: 'wave',
              };
            }
            return {
              weight: lastWeight,
              reps: templateReps || lastReps.toString(),
              rpe: null,
              progressionType: 'wave',
            };
          }

          default:
            return {
              weight: lastWeight,
              reps: templateReps || lastReps.toString(),
              rpe: null,
              progressionType: 'none',
            };
        }
      },

      updateExerciseProgress: (exerciseId: string, weight: number, reps: number, rpe?: number) => {
        const state = get();
        if (!state.activeProgram) return;

        const program = state.programs.find(p => p.id === state.activeProgram!.programId);
        if (!program) return;

        // Find applicable progression rule to determine success
        const rule = program.progressionRules.find(r =>
          r.exerciseId === exerciseId || !r.exerciseId
        );

        const currentProgress = state.activeProgram.exerciseProgress[exerciseId] || {
          lastWeight: 0,
          lastReps: 0,
          consecutiveSuccesses: 0,
          consecutiveFailures: 0,
        };

        let isSuccess = true; // Default to success

        if (rule) {
          const config = rule.config;
          switch (config.type) {
            case 'double_progression': {
              const [minReps] = config.repRange;
              isSuccess = reps >= minReps;
              break;
            }
            case 'rpe_based': {
              const [minRpe, maxRpe] = config.rpeRange;
              isSuccess = rpe !== undefined && rpe >= minRpe && rpe <= maxRpe;
              break;
            }
          }
        }

        const newProgress: ExerciseProgressEntry = {
          lastWeight: weight,
          lastReps: reps,
          lastRpe: rpe,
          consecutiveSuccesses: isSuccess ? currentProgress.consecutiveSuccesses + 1 : 0,
          consecutiveFailures: isSuccess ? 0 : currentProgress.consecutiveFailures + 1,
        };

        set((state) => ({
          activeProgram: state.activeProgram ? {
            ...state.activeProgram,
            exerciseProgress: {
              ...state.activeProgram.exerciseProgress,
              [exerciseId]: newProgress,
            },
          } : null,
          pendingSync: true
        }));
        queueSync(get);
      },

      // Program Wizard
      startProgramWizard: () => {
        set({
          programWizardStep: 1,
          programWizardData: {
            name: '',
            description: '',
            cycleType: 'weekly',
            cycleLengthDays: 7,
            goal: 'hypertrophy',
            difficulty: 'intermediate',
            durationWeeks: 4,
            periodization: 'none',
            weeks: [],
            progressionRules: [],
          },
          currentView: 'program-wizard',
          editingProgramId: null
        });
      },

      editProgram: (programId: string) => {
        const state = get();
        const program = state.programs.find(p => p.id === programId);
        if (!program) {
          get().showToast('Program not found');
          return;
        }

        set({
          programWizardStep: 1,
          programWizardData: {
            ...program
          },
          currentView: 'program-wizard',
          editingProgramId: programId
        });
      },

      setProgramWizardStep: (step: number) => {
        set({ programWizardStep: step });
      },

      updateProgramWizardData: (data: Partial<Program>) => {
        set((state) => ({
          programWizardData: state.programWizardData ? {
            ...state.programWizardData,
            ...data,
          } : data
        }));
      },

      finishProgramWizard: () => {
        const state = get();
        if (!state.programWizardData) return null;

        let id: string;

        if (state.editingProgramId) {
          // Update existing program
          get().updateProgram(state.editingProgramId, state.programWizardData);
          id = state.editingProgramId;
          get().showToast('Program updated!');
        } else {
          // Create new program
          id = get().createProgram(state.programWizardData as Omit<Program, 'id' | 'createdAt' | 'updatedAt'>);
          get().showToast('Program created!');
        }

        set({
          programWizardStep: 0,
          programWizardData: null,
          editingProgramId: null,
          currentView: 'programs'
        });

        return id;
      },

      cancelProgramWizard: () => {
        set({
          programWizardStep: 0,
          programWizardData: null,
          editingProgramId: null,
          currentView: 'programs'
        });
      },

      addCampaign: (campaign: Campaign) => {
        set((state) => ({
          campaigns: [...state.campaigns, campaign],
          pendingSync: true
        }));
        queueSync(get);
      },

      updateCampaign: (campaignId: string, updates: Partial<Campaign>) => {
        set((state) => ({
          campaigns: state.campaigns.map(c =>
            c.id === campaignId ? { ...c, ...updates } : c
          ),
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Campaign updated');
      },

      deleteCampaign: (campaignId: string) => {
        set((state) => ({
          campaigns: state.campaigns.filter(c => c.id !== campaignId),
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Campaign deleted');
      },

      updateCampaignProgress: () => {
        const state = get();

        set((state) => ({
          campaigns: state.campaigns.map(campaign => ({
            ...campaign,
            goals: campaign.goals.map(goal => ({
              ...goal,
              currentPR: state.records[goal.exerciseId] || goal.currentPR
            }))
          })),
          pendingSync: true
        }));
        queueSync(get);
      },

      // Analytics
      getVolumeByWeek: (weeks = 8) => {
        const state = get();
        const now = new Date();
        const result: { week: string; volume: number }[] = [];

        for (let i = weeks - 1; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - (i * 7) - now.getDay());
          weekStart.setHours(0, 0, 0, 0);
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekStart.getDate() + 7);

          let weekVolume = 0;
          state.workouts.forEach(workout => {
            const workoutDate = new Date(workout.startTime);
            if (workoutDate >= weekStart && workoutDate < weekEnd) {
              workout.exercises.forEach(ex => {
                ex.sets.forEach(set => {
                  if (!set.isWarmup) {
                    weekVolume += set.weight * set.reps;
                  }
                });
              });
            }
          });

          // Create date range label (e.g., "Nov 4-10" or "Nov 27-Dec 3")
          const endDay = new Date(weekEnd);
          endDay.setDate(endDay.getDate() - 1); // Last day of week (not first day of next week)
          const startMonth = weekStart.toLocaleDateString('en-US', { month: 'short' });
          const endMonth = endDay.toLocaleDateString('en-US', { month: 'short' });
          const startDay = weekStart.getDate();
          const endDayNum = endDay.getDate();
          const label = startMonth === endMonth
            ? `${startMonth} ${startDay}-${endDayNum}`
            : `${startMonth} ${startDay}-${endMonth} ${endDayNum}`;
          result.push({ week: label, volume: weekVolume });
        }

        return result;
      },

      getVolumeByMuscle: () => {
        const state = get();
        const muscleVolume: Record<string, number> = {};
        let totalVolume = 0;

        // Calculate volume for last 30 days
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        state.workouts.forEach(workout => {
          const workoutDate = new Date(workout.startTime);
          if (workoutDate >= thirtyDaysAgo) {
            workout.exercises.forEach(ex => {
              // Check custom exercises first (they may have updated muscle categories)
              const customExercise = state.customExercises.find(e => e.id === ex.id || e.name === ex.name);
              const standardExercise = EXERCISES.find(e => e.id === ex.id || e.name === ex.name);
              // Custom exercise muscle takes priority over standard
              const muscle = customExercise?.muscle || standardExercise?.muscle || 'other';

              ex.sets.forEach(set => {
                if (!set.isWarmup) {
                  const setVolume = set.weight * set.reps;
                  muscleVolume[muscle] = (muscleVolume[muscle] || 0) + setVolume;
                  totalVolume += setVolume;
                }
              });
            });
          }
        });

        return Object.entries(muscleVolume)
          .map(([muscle, volume]) => ({
            muscle,
            volume,
            percentage: totalVolume > 0 ? Math.round((volume / totalVolume) * 100) : 0
          }))
          .sort((a, b) => b.volume - a.volume);
      },

      getStrengthProgress: (exerciseId: string) => {
        const state = get();
        const progress: { date: string; weight: number }[] = [];
        const seenDates = new Set<string>();

        // Get max weight per workout day for this exercise
        state.workouts
          .filter(w => w.exercises.some(e => e.id === exerciseId || e.name === exerciseId))
          .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
          .forEach(workout => {
            const dateKey = new Date(workout.startTime).toLocaleDateString();
            if (seenDates.has(dateKey)) return;

            const exercise = workout.exercises.find(e => e.id === exerciseId || e.name === exerciseId);
            if (exercise) {
              const maxWeight = Math.max(...exercise.sets.filter(s => !s.isWarmup).map(s => s.weight));
              if (maxWeight > 0) {
                progress.push({
                  date: dateKey,
                  weight: maxWeight
                });
                seenDates.add(dateKey);
              }
            }
          });

        return progress;
      },

      getWeeklySummary: () => {
        const state = get();
        const now = new Date();
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        weekStart.setHours(0, 0, 0, 0);

        let workouts = 0;
        let sets = 0;
        let volume = 0;
        let xp = 0;

        state.workouts.forEach(workout => {
          const workoutDate = new Date(workout.startTime);
          if (workoutDate >= weekStart) {
            workouts++;
            xp += workout.totalXP;
            workout.exercises.forEach(ex => {
              ex.sets.forEach(set => {
                if (!set.isWarmup) {
                  sets++;
                  volume += set.weight * set.reps;
                }
              });
            });
          }
        });

        return { workouts, sets, volume, xp };
      },

      getMonthlySummary: () => {
        const state = get();
        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        let workouts = 0;
        let sets = 0;
        let volume = 0;
        let xp = 0;

        state.workouts.forEach(workout => {
          const workoutDate = new Date(workout.startTime);
          if (workoutDate >= monthStart) {
            workouts++;
            xp += workout.totalXP;
            workout.exercises.forEach(ex => {
              ex.sets.forEach(set => {
                if (!set.isWarmup) {
                  sets++;
                  volume += set.weight * set.reps;
                }
              });
            });
          }
        });

        return { workouts, sets, volume, xp };
      },

      showToast: (message: string) => {
        set({ toastMessage: message });
        setTimeout(() => get().clearToast(), 2500);
      },

      clearToast: () => {
        set({ toastMessage: null });
      },

      completeOnboarding: () => {
        set({ hasCompletedOnboarding: true, pendingSync: true });
        get().saveState();
        queueSync(get);
      },

      setOnlineStatus: (online: boolean) => {
        const wasOffline = !get().isOnline;
        set({ isOnline: online });

        if (online && wasOffline) {
          // Back online - retry sync if needed
          get().retrySyncOnReconnect();
        }
      },

      retrySyncOnReconnect: () => {
        const state = get();
        if (state.pendingSync && state.isOnline) {
          // Reset retry count and attempt sync
          set({ syncRetryCount: 0 });
          get().syncToServer();
        }
      },

      importWorkouts: async (workouts: Workout[]) => {
        const state = get();

        // Merge with existing workouts, avoiding duplicates by ID
        const existingIds = new Set(state.workouts.map(w => w.id));
        const newWorkouts = workouts.filter(w => !existingIds.has(w.id));

        if (newWorkouts.length === 0) {
          get().showToast('No new workouts to import');
          return;
        }

        // Calculate stats from imported workouts
        // Note: PRs are NOT updated from imports so achievements can still be earned manually
        let totalSets = 0;
        let totalVolume = 0;

        for (const workout of newWorkouts) {
          for (const exercise of workout.exercises) {
            for (const s of exercise.sets) {
              totalSets++;
              totalVolume += s.weight * s.reps;
            }
          }
        }

        // Sort all workouts by date (newest first)
        const allWorkouts = [...newWorkouts, ...state.workouts]
          .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());

        // Check if importer achievement should be awarded
        const importerAchievement = GENERAL_ACHIEVEMENTS.find(a => a.id === 'importer');
        const hasImporterAchievement = state.achievements.includes('importer');
        const xpToAward = !hasImporterAchievement && importerAchievement ? importerAchievement.xp : 0;
        const newAchievements = !hasImporterAchievement ? [...state.achievements, 'importer'] : state.achievements;

        set((state) => ({
          workouts: allWorkouts,
          achievements: newAchievements,
          profile: {
            ...state.profile,
            totalWorkouts: state.profile.totalWorkouts + newWorkouts.length,
            totalSets: state.profile.totalSets + totalSets,
            totalVolume: state.profile.totalVolume + totalVolume,
            xp: state.profile.xp + xpToAward,
            level: getLevelFromXP(state.profile.xp + xpToAward)
          },
          pendingSync: true
        }));
        queueSync(get);

        // Sync to unified XP API if achievement was awarded
        if (xpToAward > 0) {
          try {
            await fetch('/api/xp', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                appId: 'fitness',
                action: 'import_achievement',
                xpAmount: xpToAward,
                metadata: {
                  achievement: 'importer',
                  workoutsImported: newWorkouts.length,
                  totalSets,
                  totalVolume
                }
              })
            });
            // Update navbar XP display
            dispatchXPUpdate();
          } catch (error) {
            console.error('Failed to sync import XP:', error);
          }
        }

        // Show appropriate toast message
        if (!hasImporterAchievement && importerAchievement) {
          get().showToast(`${importerAchievement.icon} ${importerAchievement.name} unlocked! +${xpToAward} XP`);
        } else {
          get().showToast(`Imported ${newWorkouts.length} workouts`);
        }
      },

      eraseAllData: () => {
        set({
          ...defaultState,
          currentWorkout: null,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: null,
          currentView: 'home',
          pendingSync: true
        });
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        queueSync(get);
        get().showToast('All data erased');
      },

      deleteWorkout: async (workoutId: string) => {
        const state = get();
        const workout = state.workouts.find(w => w.id === workoutId);

        if (workout && workout.totalXP && workout.totalXP > 0) {
          // Revoke XP from global profile
          try {
            await fetch('/api/xp', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                appId: 'fitness',
                xpAmount: workout.totalXP,
                reason: 'workout_deleted',
              }),
            });
            dispatchXPUpdate();
          } catch (error) {
            console.error('Failed to revoke XP:', error);
          }
        }

        // Calculate stats to subtract
        const workoutVolume = workout?.exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((setTotal, s) => setTotal + (s.weight * s.reps), 0);
        }, 0) || 0;
        const workoutSets = workout?.exercises.reduce((total, ex) => total + ex.sets.length, 0) || 0;

        // Check if workout was from a program and remove from completedWorkouts
        const programDayInfo = workout?.programDayInfo;

        set((state) => {
          // If this was a program workout, remove it from completedWorkouts
          let activeProgram = state.activeProgram;
          if (programDayInfo && activeProgram) {
            const workoutKey = `${programDayInfo.weekNumber}-${programDayInfo.dayNumber}`;
            activeProgram = {
              ...activeProgram,
              completedWorkouts: activeProgram.completedWorkouts.filter(key => key !== workoutKey)
            };
          }

          return {
            workouts: state.workouts.filter(w => w.id !== workoutId),
            profile: {
              ...state.profile,
              xp: Math.max(0, state.profile.xp - (workout?.totalXP || 0)),
              totalWorkouts: Math.max(0, state.profile.totalWorkouts - 1),
              totalVolume: Math.max(0, state.profile.totalVolume - workoutVolume),
              totalSets: Math.max(0, state.profile.totalSets - workoutSets),
            },
            activeProgram,
            currentView: 'history',
            selectedWorkoutId: null,
            pendingSync: true
          };
        });
        queueSync(get);
        get().showToast('Workout deleted');
      },

      editWorkout: (workoutId: string) => {
        const state = get();
        const workout = state.workouts.find(w => w.id === workoutId);
        if (!workout) return;

        // Create a fresh workout with the same exercises/sets but reset metadata
        const editableWorkout: Workout = {
          id: 'workout-' + Date.now(),
          exercises: workout.exercises.map(ex => ({
            ...ex,
            sets: ex.sets.map(s => ({ ...s }))
          })),
          startTime: new Date().toISOString(),
          totalXP: 0, // Will be recalculated when finished
        };

        // Calculate stats to subtract from the original workout
        const workoutVolume = workout.exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((setTotal, s) => setTotal + (s.weight * s.reps), 0);
        }, 0);
        const workoutSets = workout.exercises.reduce((total, ex) => total + ex.sets.length, 0);

        set((state) => ({
          // Remove original workout
          workouts: state.workouts.filter(w => w.id !== workoutId),
          // Subtract original workout stats
          profile: {
            ...state.profile,
            xp: Math.max(0, state.profile.xp - workout.totalXP),
            totalWorkouts: Math.max(0, state.profile.totalWorkouts - 1),
            totalVolume: Math.max(0, state.profile.totalVolume - workoutVolume),
            totalSets: Math.max(0, state.profile.totalSets - workoutSets),
          },
          // Set as current workout for editing
          currentWorkout: editableWorkout,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: Date.now(),
          workoutPRsHit: 0,
          lastActivityTime: Date.now(),
          currentView: 'workout',
          selectedWorkoutId: null,
          pendingSync: true
        }));

        // Revoke XP from global profile for the deleted workout
        fetch('/api/xp', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            appId: 'fitness',
            xpAmount: workout.totalXP,
            reason: 'workout_edited',
          }),
        }).catch(console.error);

        // Save active workout to localStorage
        const activeWorkout = {
          workout: editableWorkout,
          exerciseIndex: 0,
          seconds: 0
        };
        localStorage.setItem(ACTIVE_WORKOUT_KEY, JSON.stringify(activeWorkout));

        queueSync(get);
        get().showToast('Editing workout - make your changes and finish when done');
      },

      updateWorkoutTimes: (workoutId: string, startTime: string, endTime: string) => {
        const startMs = new Date(startTime).getTime();
        const endMs = new Date(endTime).getTime();
        const duration = Math.floor((endMs - startMs) / 1000);

        set((state) => ({
          workouts: state.workouts.map(w =>
            w.id === workoutId
              ? { ...w, startTime, endTime, duration }
              : w
          ),
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Workout times updated');
      },

      syncToServer: async () => {
        const state = get();
        if (state.syncStatus === 'syncing') return;

        // Don't attempt sync if offline
        if (!state.isOnline) {
          set({ syncStatus: 'idle', syncError: 'Offline - will sync when back online' });
          return;
        }

        set({ syncStatus: 'syncing' });

        try {
          const res = await fetch('/api/fitness/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: {
                profile: state.profile,
                workouts: state.workouts,
                records: state.records,
                achievements: state.achievements,
                customExercises: state.customExercises,
                templates: state.templates,
                programs: state.programs,
                activeProgram: state.activeProgram,
                campaigns: state.campaigns,
                exerciseNotes: state.exerciseNotes,
                restTimerPreset: state.restTimerPreset,
                hasCompletedOnboarding: state.hasCompletedOnboarding,
              },
            }),
          });

          if (res.ok) {
            const { updated_at } = await res.json();
            set({
              lastSyncedAt: updated_at,
              pendingSync: false,
              syncStatus: 'idle',
              syncError: null,
              syncRetryCount: 0,
            });
          } else {
            throw new Error('Sync failed');
          }
        } catch (error) {
          const retryCount = get().syncRetryCount;
          const maxRetries = 5;

          set({
            syncStatus: 'error',
            syncError: (error as Error).message,
            syncRetryCount: retryCount + 1,
          });

          // Exponential backoff: 5s, 10s, 20s, 40s, 80s, then stop
          if (retryCount < maxRetries && get().isOnline) {
            const delay = Math.min(5000 * Math.pow(2, retryCount), 80000);
            setTimeout(() => get().syncToServer(), delay);
          }
        }
      },

      fetchFromServer: async () => {
        try {
          const res = await fetch('/api/fitness/sync');
          if (!res.ok) return;

          const serverData = await res.json();
          if (!serverData) return; // No server data yet

          const localLastSynced = get().lastSyncedAt;

          if (!localLastSynced) {
            // First sync - server wins (user logged in on new device)
            set({ ...serverData.data, lastSyncedAt: serverData.updated_at });
          } else if (serverData.updated_at > localLastSynced && !get().pendingSync) {
            // Server is newer and no pending local changes - use server
            set({ ...serverData.data, lastSyncedAt: serverData.updated_at });
          }
          // Otherwise: local wins (we have pending changes)
        } catch (error) {
          console.error('Failed to fetch from server:', error);
        }
      },

      // ============================================
      // Narrative Engine Actions
      // ============================================

      initNarrativeEngine: async () => {
        try {
          // Fetch rivals and settings from server
          const [rivalsRes, settingsRes] = await Promise.all([
            fetch('/api/fitness/narrative/rivals'),
            fetch('/api/fitness/narrative/settings'),
          ]);

          const rivals = rivalsRes.ok ? (await rivalsRes.json()).rivals : [];
          const settings = settingsRes.ok ? await settingsRes.json() : DEFAULT_NARRATIVE_SETTINGS;

          set({
            narrativeEngine: {
              rivals,
              recentEncounters: [],
              settings,
              phantomCache: {},
              lastEncounterTime: null,
            },
          });
        } catch (error) {
          console.error('Failed to initialize narrative engine:', error);
          // Initialize with defaults on error
          set({
            narrativeEngine: {
              rivals: [],
              recentEncounters: [],
              settings: DEFAULT_NARRATIVE_SETTINGS,
              phantomCache: {},
              lastEncounterTime: null,
            },
          });
        }
      },

      addRival: (rival: RivalRelationship) => {
        const engine = get().narrativeEngine;
        if (!engine) return;

        set({
          narrativeEngine: {
            ...engine,
            rivals: [...engine.rivals, rival],
          },
        });
      },

      removeRival: (rivalId: string) => {
        const engine = get().narrativeEngine;
        if (!engine) return;

        set({
          narrativeEngine: {
            ...engine,
            rivals: engine.rivals.filter((r) => r.id !== rivalId),
          },
        });
      },

      updateRivalStats: (rivalId: string, updates: Partial<RivalRelationship>) => {
        const engine = get().narrativeEngine;
        if (!engine) return;

        set({
          narrativeEngine: {
            ...engine,
            rivals: engine.rivals.map((r) =>
              r.id === rivalId ? { ...r, ...updates } : r
            ),
          },
        });
      },

      recordEncounter: (encounter: EncounterRecord) => {
        const engine = get().narrativeEngine;
        if (!engine) return;

        // Keep only last 20 encounters
        const recentEncounters = [encounter, ...engine.recentEncounters].slice(0, 20);

        set({
          narrativeEngine: {
            ...engine,
            recentEncounters,
            lastEncounterTime: encounter.encounterDate,
          },
        });
      },

      updateNarrativeSettings: (settings: Partial<NarrativeSettings>) => {
        const engine = get().narrativeEngine;
        if (!engine) return;

        set({
          narrativeEngine: {
            ...engine,
            settings: { ...engine.settings, ...settings },
          },
        });
      },

      getUserImprovementSnapshot: (): ImprovementSnapshot => {
        const state = get();
        const workouts = state.workouts;
        const records = state.records;

        // Get current week start (Monday)
        const now = new Date();
        const day = now.getDay();
        const diff = day === 0 ? -6 : 1 - day;
        const currentWeekStart = new Date(now);
        currentWeekStart.setDate(now.getDate() + diff);
        currentWeekStart.setHours(0, 0, 0, 0);

        // Get previous week start
        const previousWeekStart = new Date(currentWeekStart);
        previousWeekStart.setDate(currentWeekStart.getDate() - 7);

        const currentWeekEnd = new Date(currentWeekStart);
        currentWeekEnd.setDate(currentWeekStart.getDate() + 7);

        // Filter workouts by week
        const currentWeekWorkouts = workouts.filter((w) => {
          const date = new Date(w.startTime);
          return date >= currentWeekStart && date < currentWeekEnd;
        });

        const previousWeekWorkouts = workouts.filter((w) => {
          const date = new Date(w.startTime);
          return date >= previousWeekStart && date < currentWeekStart;
        });

        // Calculate volumes
        const calculateVolume = (wks: Workout[]) =>
          wks.reduce((total, w) =>
            total + w.exercises.reduce((exTotal, ex) =>
              exTotal + ex.sets.filter((s) => !s.isWarmup)
                .reduce((setTotal, s) => setTotal + s.weight * s.reps, 0), 0), 0);

        const volumeThisWeek = calculateVolume(currentWeekWorkouts);
        const volumeLastWeek = calculateVolume(previousWeekWorkouts);

        // Count PRs (approximation based on current records)
        const prsThisWeek = currentWeekWorkouts.reduce((count, w) => {
          return count + w.exercises.reduce((exCount, ex) => {
            const maxWeight = Math.max(...ex.sets.filter((s) => !s.isWarmup).map((s) => s.weight), 0);
            const record = records[ex.id] || 0;
            return exCount + (maxWeight >= record && maxWeight > 0 ? 1 : 0);
          }, 0);
        }, 0);

        // Consistency score (assuming 4 workouts/week target)
        const consistencyScore = Math.min(100, (currentWeekWorkouts.length / 4) * 100);

        return {
          volumeThisWeek,
          volumeLastWeek,
          workoutsThisWeek: currentWeekWorkouts.length,
          workoutsLastWeek: previousWeekWorkouts.length,
          prsThisWeek,
          consistencyScore,
          topExerciseGains: [],
        };
      },

      shouldTriggerEncounter: (): boolean => {
        const engine = get().narrativeEngine;
        if (!engine || !engine.settings.enabled || engine.rivals.length === 0) {
          return false;
        }

        const { settings, lastEncounterTime } = engine;

        if (!lastEncounterTime) {
          return true; // First encounter
        }

        const lastEncounter = new Date(lastEncounterTime);
        const now = new Date();
        const hoursSince = (now.getTime() - lastEncounter.getTime()) / (1000 * 60 * 60);

        switch (settings.encounterFrequency) {
          case 'every_workout':
            return true;
          case 'daily':
            return hoursSince >= 24;
          case 'weekly':
            return hoursSince >= 168; // 7 days
          case 'custom':
            return hoursSince >= (settings.customFrequencyDays || 1) * 24;
          default:
            return true;
        }
      }
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        profile: state.profile,
        workouts: state.workouts,
        records: state.records,
        achievements: state.achievements,
        customExercises: state.customExercises,
        templates: state.templates,
        programs: state.programs,
        activeProgram: state.activeProgram,
        campaigns: state.campaigns,
        exerciseNotes: state.exerciseNotes,
        restTimerPreset: state.restTimerPreset,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        lastSyncedAt: state.lastSyncedAt
      })
    }
  )
);
