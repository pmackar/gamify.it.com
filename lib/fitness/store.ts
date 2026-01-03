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
  ViewType,
  SyncState
} from './types';
import { isLegacyTemplate } from './types';
import { dispatchXPUpdate } from '@/components/XPContext';
import {
  DEFAULT_TEMPLATES,
  MILESTONES,
  GENERAL_ACHIEVEMENTS,
  calculateSetXP,
  getLevelFromXP,
  getExerciseById,
  EXERCISES
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
  selectExercise: (index: number) => void;
  logSet: (weight: number, reps: number, rpe?: number, isWarmup?: boolean) => void;
  updateSet: (setIndex: number, weight: number, reps: number, rpe?: number, isWarmup?: boolean) => void;
  removeSet: (exerciseIndex: number, setIndex: number) => void;
  removeExercise: (exerciseIndex: number) => void;
  reorderExercises: (fromIndex: number, toIndex: number) => void;
  linkSuperset: (exerciseIndex: number) => void;  // Link exercise to previous exercise's superset
  unlinkSuperset: (exerciseIndex: number) => void;  // Remove exercise from superset
  finishWorkout: () => Promise<void>;
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
  checkPR: (exerciseId: string, weight: number) => boolean;
  checkMilestone: (exerciseId: string, weight: number) => { name: string; icon: string; xp: number } | null;

  // Templates
  saveTemplate: (name: string) => void;
  createTemplate: (template: Omit<WorkoutTemplate, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateTemplate: (id: string, updates: Partial<WorkoutTemplate>) => void;
  deleteTemplate: (id: string) => void;
  duplicateTemplate: (id: string) => void;
  editTemplate: (id: string | null) => void;
  getTemplateById: (id: string) => WorkoutTemplate | null;
  migrateTemplate: (template: WorkoutTemplate | LegacyWorkoutTemplate) => WorkoutTemplate;

  // Campaigns
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (campaignId: string, updates: Partial<Campaign>) => void;
  deleteCampaign: (campaignId: string) => void;
  updateCampaignProgress: () => void;

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

  // Sync
  syncToServer: () => Promise<void>;
  fetchFromServer: () => Promise<void>;
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
  achievements: [],
  customExercises: [],
  templates: [...DEFAULT_TEMPLATES],
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
      toastMessage: null,

      // Sync state
      lastSyncedAt: null,
      pendingSync: false,
      syncStatus: 'idle',
      syncError: null,

      loadState: () => {
        // Load active workout from separate storage
        try {
          const activeWorkout = localStorage.getItem(ACTIVE_WORKOUT_KEY);
          if (activeWorkout) {
            const parsed = JSON.parse(activeWorkout);
            const startTime = parsed.startTime || Date.now();
            const elapsedSeconds = Math.floor((Date.now() - startTime) / 1000);
            set({
              currentWorkout: parsed.workout,
              currentExerciseIndex: parsed.exerciseIndex || 0,
              workoutStartTime: startTime,
              workoutSeconds: elapsedSeconds,
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
            startTime: state.workoutStartTime
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
          totalXP: 0
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
          return {
            id: ex.exerciseId,
            name: ex.exerciseName || exerciseData?.name || ex.exerciseId,
            sets: [],
            supersetGroup: ex.supersetGroup,
            // Store target info for UI hints (not used directly in workout)
            _targetSets: ex.targetSets,
            _targetReps: ex.targetReps,
            _targetRpe: ex.targetRpe,
          } as WorkoutExercise;
        });

        const now = Date.now();
        const workout: Workout = {
          id: now.toString(),
          exercises,
          startTime: new Date().toISOString(),
          totalXP: 0
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
          totalXP: 0
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

      selectExercise: (index: number) => {
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
          const isPR = get().checkPR(exercise.id, weight);
          if (isPR) {
            set((state) => ({ workoutPRsHit: state.workoutPRsHit + 1 }));
            get().showToast(`🏆 New PR: ${weight} lbs!`);
            // Strong haptic for PR
            haptic([100, 50, 100, 50, 200]);
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
        const state = get();
        if (!state.currentWorkout) return;

        const endTime = new Date().toISOString();
        // Calculate duration from start time for accuracy
        const duration = state.workoutStartTime
          ? Math.floor((Date.now() - state.workoutStartTime) / 1000)
          : state.workoutSeconds;

        const completedWorkout: Workout = {
          ...state.currentWorkout,
          endTime,
          duration
        };

        // Calculate total volume for this workout
        const workoutVolume = completedWorkout.exercises.reduce((total, ex) => {
          return total + ex.sets.reduce((setTotal, s) => setTotal + (s.weight * s.reps), 0);
        }, 0);

        const newTotalWorkouts = state.profile.totalWorkouts + 1;
        const newTotalVolume = state.profile.totalVolume + workoutVolume;

        set((state) => ({
          workouts: [completedWorkout, ...state.workouts],
          profile: {
            ...state.profile,
            totalWorkouts: newTotalWorkouts,
            totalVolume: newTotalVolume
          },
          currentWorkout: null,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: null,
          workoutPRsHit: 0,
          currentView: 'home',
          pendingSync: true
        }));

        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        queueSync(get);

        // Call unified XP API
        const prsHit = state.workoutPRsHit;
        try {
          const response = await fetch('/api/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appId: 'fitness',
              action: 'workout_complete',
              xpAmount: completedWorkout.totalXP,
              metadata: {
                workoutCount: newTotalWorkouts,
                totalVolume: newTotalVolume,
                totalSets: completedWorkout.exercises.reduce((t, e) => t + e.sets.length, 0),
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
          } else {
            get().showToast(`Workout complete! +${completedWorkout.totalXP} XP`);
          }
        } catch {
          // Fallback if API fails
          get().showToast(`Workout complete! +${completedWorkout.totalXP} XP`);
        }

        // Update navbar XP display
        dispatchXPUpdate();
      },

      cancelWorkout: () => {
        set({
          currentWorkout: null,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          workoutStartTime: null,
          workoutPRsHit: 0,
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

      checkPR: (exerciseId: string, weight: number) => {
        const state = get();
        const currentPR = state.records[exerciseId] || 0;

        if (weight > currentPR) {
          set((state) => ({
            records: { ...state.records, [exerciseId]: weight },
            pendingSync: true
          }));
          queueSync(get);
          return true;
        }
        return false;
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

        set((state) => ({
          workouts: state.workouts.filter(w => w.id !== workoutId),
          profile: {
            ...state.profile,
            xp: Math.max(0, state.profile.xp - (workout?.totalXP || 0)),
            totalWorkouts: Math.max(0, state.profile.totalWorkouts - 1),
            totalVolume: Math.max(0, state.profile.totalVolume - workoutVolume),
            totalSets: Math.max(0, state.profile.totalSets - workoutSets),
          },
          currentView: 'history',
          selectedWorkoutId: null,
          pendingSync: true
        }));
        queueSync(get);
        get().showToast('Workout deleted');
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
        campaigns: state.campaigns,
        exerciseNotes: state.exerciseNotes,
        restTimerPreset: state.restTimerPreset,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        lastSyncedAt: state.lastSyncedAt
      })
    }
  )
);
