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
  ViewType,
  SyncState
} from './types';
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

  // UI state
  currentView: ViewType;
  selectedWorkoutId: string | null;
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

  // Navigation
  setView: (view: ViewType) => void;
  showWorkoutDetail: (workoutId: string) => void;

  // Records & Achievements
  checkPR: (exerciseId: string, weight: number) => boolean;
  checkMilestone: (exerciseId: string, weight: number) => { name: string; icon: string; xp: number } | null;

  // Templates
  saveTemplate: (name: string) => void;

  // Campaigns
  addCampaign: (campaign: Campaign) => void;
  updateCampaignProgress: () => void;

  // Toast
  showToast: (message: string) => void;
  clearToast: () => void;

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
  restTimerPreset: 90
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

      // UI state
      currentView: 'home',
      selectedWorkoutId: null,
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
            setTimeout(() => get().showToast(`Level Up! Now level ${newLevel}`), 100);
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
        const template = state.templates.find(t => t.id === templateId);
        if (!template) return;

        const exercises: WorkoutExercise[] = template.exercises.map(exId => {
          const exercise = getExerciseById(exId);
          return {
            id: exId,
            name: exercise?.name || exId,
            sets: []
          };
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
            setTimeout(() => get().showToast(`${milestone.icon} ${milestone.name} unlocked!`), isPR ? 2500 : 0);
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

        const template: WorkoutTemplate = {
          id: Date.now().toString(),
          name,
          exercises: state.currentWorkout.exercises.map(e => e.id)
        };

        set((state) => ({
          templates: [...state.templates, template],
          pendingSync: true
        }));
        queueSync(get);

        get().showToast(`Template "${name}" saved`);
      },

      addCampaign: (campaign: Campaign) => {
        set((state) => ({
          campaigns: [...state.campaigns, campaign],
          pendingSync: true
        }));
        queueSync(get);
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

      importWorkouts: async (workouts: Workout[]) => {
        const state = get();

        // Merge with existing workouts, avoiding duplicates by ID
        const existingIds = new Set(state.workouts.map(w => w.id));
        const newWorkouts = workouts.filter(w => !existingIds.has(w.id));

        if (newWorkouts.length === 0) {
          get().showToast('No new workouts to import');
          return;
        }

        // Calculate stats from imported workouts (no XP per set for imports)
        let totalSets = 0;
        let totalVolume = 0;
        const newRecords: Record<string, number> = { ...state.records };

        for (const workout of newWorkouts) {
          for (const exercise of workout.exercises) {
            for (const s of exercise.sets) {
              totalSets++;
              totalVolume += s.weight * s.reps;

              // Update PRs
              if (s.weight > (newRecords[exercise.id] || 0)) {
                newRecords[exercise.id] = s.weight;
              }
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
          records: newRecords,
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
            });
          } else {
            throw new Error('Sync failed');
          }
        } catch (error) {
          set({ syncStatus: 'error', syncError: (error as Error).message });
          // Retry in 5 seconds
          setTimeout(() => get().syncToServer(), 5000);
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
        lastSyncedAt: state.lastSyncedAt
      })
    }
  )
);
