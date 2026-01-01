'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  FitnessState,
  Workout,
  WorkoutExercise,
  Set,
  Profile,
  Campaign,
  WorkoutTemplate,
  ViewType
} from './types';
import { dispatchXPUpdate } from '@/components/XPContext';
import {
  DEFAULT_TEMPLATES,
  MILESTONES,
  calculateSetXP,
  getLevelFromXP,
  getExerciseById,
  EXERCISES
} from './data';

const STORAGE_KEY = 'gamify_fitness';
const ACTIVE_WORKOUT_KEY = 'gamify_fitness_active';

interface FitnessStore extends FitnessState {
  // Current workout state
  currentWorkout: Workout | null;
  currentExerciseIndex: number;
  workoutSeconds: number;

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

  // Workout actions
  startWorkout: () => void;
  startWorkoutFromTemplate: (templateId: string) => void;
  startWorkoutWithExercise: (exerciseId: string) => void;
  addExerciseToWorkout: (exerciseId: string) => void;
  addCustomExercise: (name: string) => void;
  selectExercise: (index: number) => void;
  logSet: (weight: number, reps: number, rpe?: number) => void;
  finishWorkout: () => void;
  cancelWorkout: () => void;

  // Timer
  incrementTimer: () => void;
  resetTimer: () => void;

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
  importWorkouts: (workouts: Workout[]) => void;
  eraseAllData: () => void;
  deleteWorkout: (workoutId: string) => void;
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
  campaigns: []
};

export const useFitnessStore = create<FitnessStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // Current workout state
      currentWorkout: null,
      currentExerciseIndex: 0,
      workoutSeconds: 0,

      // UI state
      currentView: 'home',
      selectedWorkoutId: null,
      toastMessage: null,

      loadState: () => {
        // Load active workout from separate storage
        try {
          const activeWorkout = localStorage.getItem(ACTIVE_WORKOUT_KEY);
          if (activeWorkout) {
            const parsed = JSON.parse(activeWorkout);
            set({
              currentWorkout: parsed.workout,
              currentExerciseIndex: parsed.exerciseIndex || 0,
              workoutSeconds: parsed.seconds || 0,
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
            seconds: state.workoutSeconds
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
            }
          };
        });
      },

      updateProfileName: (name: string) => {
        set((state) => ({
          profile: { ...state.profile, name }
        }));
      },

      startWorkout: () => {
        const workout: Workout = {
          id: Date.now().toString(),
          exercises: [],
          startTime: new Date().toISOString(),
          totalXP: 0
        };
        set({
          currentWorkout: workout,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
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

        const workout: Workout = {
          id: Date.now().toString(),
          exercises,
          startTime: new Date().toISOString(),
          totalXP: 0
        };

        set({
          currentWorkout: workout,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          currentView: 'workout'
        });
        get().saveState();
      },

      startWorkoutWithExercise: (exerciseId: string) => {
        const exercise = getExerciseById(exerciseId);
        if (!exercise) return;

        const workout: Workout = {
          id: Date.now().toString(),
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
            customExercises: [...state.customExercises, { id, name: formattedName, muscle: 'other' }]
          }));
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

      logSet: (weight: number, reps: number, rpe?: number) => {
        const state = get();
        if (!state.currentWorkout) return;

        const exercise = state.currentWorkout.exercises[state.currentExerciseIndex];
        if (!exercise) return;

        const xp = calculateSetXP(exercise.id, weight, reps);

        const newSet: Set = {
          weight,
          reps,
          rpe,
          timestamp: new Date().toISOString(),
          xp
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
              totalVolume: state.profile.totalVolume + (weight * reps)
            }
          };
        });

        // Add XP
        get().addXP(xp);

        // Check PR
        const isPR = get().checkPR(exercise.id, weight);
        if (isPR) {
          get().showToast(`🏆 New PR: ${weight} lbs!`);
        }

        // Check milestone
        const milestone = get().checkMilestone(exercise.id, weight);
        if (milestone) {
          get().addXP(milestone.xp);
          setTimeout(() => get().showToast(`${milestone.icon} ${milestone.name} unlocked!`), isPR ? 2500 : 0);
        }

        get().saveState();
        get().updateCampaignProgress();
      },

      finishWorkout: () => {
        const state = get();
        if (!state.currentWorkout) return;

        const endTime = new Date().toISOString();
        const duration = state.workoutSeconds;

        const completedWorkout: Workout = {
          ...state.currentWorkout,
          endTime,
          duration
        };

        set((state) => ({
          workouts: [completedWorkout, ...state.workouts],
          profile: {
            ...state.profile,
            totalWorkouts: state.profile.totalWorkouts + 1
          },
          currentWorkout: null,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          currentView: 'home'
        }));

        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        get().showToast(`Workout complete! +${completedWorkout.totalXP} XP`);

        // Update navbar XP display
        dispatchXPUpdate();
      },

      cancelWorkout: () => {
        set({
          currentWorkout: null,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          currentView: 'home'
        });
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        get().showToast('Workout cancelled');
      },

      incrementTimer: () => {
        set((state) => ({ workoutSeconds: state.workoutSeconds + 1 }));
      },

      resetTimer: () => {
        set({ workoutSeconds: 0 });
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
            records: { ...state.records, [exerciseId]: weight }
          }));
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
              achievements: [...state.achievements, key]
            }));
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
          templates: [...state.templates, template]
        }));

        get().showToast(`Template "${name}" saved`);
      },

      addCampaign: (campaign: Campaign) => {
        set((state) => ({
          campaigns: [...state.campaigns, campaign]
        }));
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
          }))
        }));
      },

      showToast: (message: string) => {
        set({ toastMessage: message });
        setTimeout(() => get().clearToast(), 2500);
      },

      clearToast: () => {
        set({ toastMessage: null });
      },

      importWorkouts: (workouts: Workout[]) => {
        set((state) => ({
          workouts: [...workouts, ...state.workouts]
        }));
        get().showToast(`Imported ${workouts.length} workouts`);
      },

      eraseAllData: () => {
        set({
          ...defaultState,
          currentWorkout: null,
          currentExerciseIndex: 0,
          workoutSeconds: 0,
          currentView: 'home'
        });
        localStorage.removeItem(ACTIVE_WORKOUT_KEY);
        get().showToast('All data erased');
      },

      deleteWorkout: (workoutId: string) => {
        set((state) => ({
          workouts: state.workouts.filter(w => w.id !== workoutId),
          currentView: 'history',
          selectedWorkoutId: null
        }));
        get().showToast('Workout deleted');
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
        campaigns: state.campaigns
      })
    }
  )
);
