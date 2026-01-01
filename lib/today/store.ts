'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  TodayState,
  Task,
  Project,
  Category,
  DailyStat,
  Profile,
  ViewType
} from './types';
import {
  XP_CONFIG,
  xpToNextLevel,
  calculateXPPreview,
  ACHIEVEMENTS
} from './data';

const STORAGE_KEY = 'gamify_life';

interface TodayStore extends TodayState {
  // UI State
  currentView: ViewType;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  theme: 'light' | 'dark';

  // Actions
  loadState: () => void;

  // Profile actions
  addXP: (amount: number) => boolean; // returns true if leveled up
  updateProfileName: (name: string) => void;

  // Task actions
  createTask: (data: Partial<Task>) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskComplete: (taskId: string) => { xpEarned: number; leveledUp: boolean; newAchievements: typeof ACHIEVEMENTS };

  // Project actions
  createProject: (data: Partial<Project>) => Project;
  updateProject: (projectId: string, updates: Partial<Project>) => void;
  deleteProject: (projectId: string) => void;

  // Category actions
  createCategory: (data: Partial<Category>) => Category;
  updateCategory: (categoryId: string, updates: Partial<Category>) => void;
  deleteCategory: (categoryId: string) => void;

  // View actions
  setView: (view: ViewType) => void;
  setTheme: (theme: 'light' | 'dark') => void;

  // Toast
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  clearToast: () => void;

  // Filtered tasks
  getFilteredTasks: () => Task[];

  // Data management
  eraseAllData: () => void;
}

const defaultProfile: Profile = {
  name: 'User',
  level: 1,
  xp: 0,
  xp_to_next: 100,
  total_tasks_completed: 0,
  current_streak: 0,
  longest_streak: 0,
  achievements: [],
  last_task_date: null
};

const defaultState: TodayState = {
  profile: defaultProfile,
  tasks: [],
  projects: [],
  categories: [],
  daily_stats: [],
  personal_records: {}
};

function calculateTaskXP(task: Task, currentStreak: number): number {
  let xp = XP_CONFIG.BASE_XP;
  xp *= XP_CONFIG.TIER_MULTIPLIER[task.tier] || XP_CONFIG.TIER_MULTIPLIER.tier3;
  xp *= XP_CONFIG.DIFFICULTY_MULTIPLIER[task.difficulty] || XP_CONFIG.DIFFICULTY_MULTIPLIER.medium;

  // On-time bonus
  if (task.due_date) {
    const wasOnTime = new Date() <= new Date(task.due_date);
    if (wasOnTime) {
      xp *= XP_CONFIG.ON_TIME_BONUS;
    }
  }

  // Streak bonus
  const streakMultiplier = Math.min(
    1 + currentStreak * XP_CONFIG.STREAK_BONUS_PER_DAY,
    XP_CONFIG.MAX_STREAK_MULTIPLIER
  );
  xp *= streakMultiplier;

  return Math.floor(xp);
}

export const useTodayStore = create<TodayStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // UI State
      currentView: 'inbox',
      toastMessage: null,
      toastType: 'info',
      theme: 'light',

      loadState: () => {
        // Theme is handled separately
        const savedTheme = localStorage.getItem('gamify-theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          set({ theme: savedTheme });
        }
      },

      addXP: (amount: number) => {
        let leveledUp = false;
        set((state) => {
          let newXP = state.profile.xp + amount;
          let newLevel = state.profile.level;
          let xpToNext = state.profile.xp_to_next;

          while (newXP >= xpToNext) {
            newXP -= xpToNext;
            newLevel++;
            xpToNext = xpToNextLevel(newLevel);
            leveledUp = true;
          }

          return {
            profile: {
              ...state.profile,
              xp: newXP,
              level: newLevel,
              xp_to_next: xpToNext
            }
          };
        });
        return leveledUp;
      },

      updateProfileName: (name: string) => {
        set((state) => ({
          profile: { ...state.profile, name }
        }));
      },

      createTask: (data: Partial<Task>) => {
        const state = get();
        const task: Task = {
          id: Date.now().toString(),
          title: data.title || '',
          description: data.description || '',
          status: 'Not started',
          priority: data.priority || null,
          tier: data.tier || 'tier3',
          difficulty: data.difficulty || 'medium',
          due_date: data.due_date || null,
          is_completed: false,
          completed_at: null,
          xp_earned: 0,
          was_on_time: null,
          project_id: data.project_id || null,
          category_id: data.category_id || null,
          tags: data.tags || [],
          order_index: state.tasks.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        set((state) => ({
          tasks: [...state.tasks, task]
        }));

        return task;
      },

      updateTask: (taskId: string, updates: Partial<Task>) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, ...updates, updated_at: new Date().toISOString() }
              : t
          )
        }));
      },

      deleteTask: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId)
        }));
      },

      toggleTaskComplete: (taskId: string) => {
        const state = get();
        const task = state.tasks.find((t) => t.id === taskId);
        if (!task) return { xpEarned: 0, leveledUp: false, newAchievements: [] };

        if (!task.is_completed) {
          // Completing task
          const xpEarned = calculateTaskXP(task, state.profile.current_streak);
          const wasOnTime = task.due_date ? new Date() <= new Date(task.due_date) : null;
          const today = new Date().toISOString().split('T')[0];
          const lastDate = state.profile.last_task_date;

          // Calculate new streak
          let newStreak = state.profile.current_streak;
          if (!lastDate) {
            newStreak = 1;
          } else {
            const last = new Date(lastDate);
            const now = new Date(today);
            const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays === 1) {
              newStreak++;
            } else if (diffDays > 1) {
              newStreak = 1;
            }
          }

          // Update task
          set((state) => ({
            tasks: state.tasks.map((t) =>
              t.id === taskId
                ? {
                    ...t,
                    is_completed: true,
                    completed_at: new Date().toISOString(),
                    xp_earned: xpEarned,
                    was_on_time: wasOnTime,
                    updated_at: new Date().toISOString()
                  }
                : t
            ),
            profile: {
              ...state.profile,
              total_tasks_completed: state.profile.total_tasks_completed + 1,
              current_streak: newStreak,
              longest_streak: Math.max(state.profile.longest_streak, newStreak),
              last_task_date: today
            },
            daily_stats: updateDailyStats(state.daily_stats, today, xpEarned)
          }));

          // Add XP
          const leveledUp = get().addXP(xpEarned);

          // Check achievements
          const newAchievements = checkAchievements(get());

          return { xpEarned, leveledUp, newAchievements };
        } else {
          // Uncompleting task
          const revokedXP = task.xp_earned || 0;

          set((state) => {
            let newXP = state.profile.xp - revokedXP;
            let newLevel = state.profile.level;
            let xpToNext = state.profile.xp_to_next;

            // Handle level down
            while (newXP < 0 && newLevel > 1) {
              newLevel--;
              xpToNext = xpToNextLevel(newLevel);
              newXP += xpToNext;
            }
            newXP = Math.max(0, newXP);

            return {
              tasks: state.tasks.map((t) =>
                t.id === taskId
                  ? {
                      ...t,
                      is_completed: false,
                      completed_at: null,
                      xp_earned: 0,
                      was_on_time: null,
                      updated_at: new Date().toISOString()
                    }
                  : t
              ),
              profile: {
                ...state.profile,
                xp: newXP,
                level: newLevel,
                xp_to_next: xpToNext,
                total_tasks_completed: Math.max(0, state.profile.total_tasks_completed - 1)
              }
            };
          });

          return { xpEarned: -revokedXP, leveledUp: false, newAchievements: [] };
        }
      },

      createProject: (data: Partial<Project>) => {
        const project: Project = {
          id: Date.now().toString(),
          name: data.name || '',
          description: data.description || '',
          status: 'Not started',
          start_date: data.start_date || null,
          due_date: data.due_date || null,
          tier: 'tier2',
          xp_earned: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        set((state) => ({
          projects: [...state.projects, project]
        }));

        return project;
      },

      updateProject: (projectId: string, updates: Partial<Project>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, ...updates, updated_at: new Date().toISOString() }
              : p
          )
        }));
      },

      deleteProject: (projectId: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          tasks: state.tasks.map((t) =>
            t.project_id === projectId
              ? { ...t, project_id: null, updated_at: new Date().toISOString() }
              : t
          )
        }));

        // If viewing this project, go to inbox
        if (get().currentView === `project-${projectId}`) {
          set({ currentView: 'inbox' });
        }
      },

      createCategory: (data: Partial<Category>) => {
        const state = get();
        const category: Category = {
          id: Date.now().toString(),
          name: data.name || '',
          color: data.color || '#6b7280',
          order_index: state.categories.length,
          created_at: new Date().toISOString()
        };

        set((state) => ({
          categories: [...state.categories, category]
        }));

        return category;
      },

      updateCategory: (categoryId: string, updates: Partial<Category>) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, ...updates } : c
          )
        }));
      },

      deleteCategory: (categoryId: string) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== categoryId),
          tasks: state.tasks.map((t) =>
            t.category_id === categoryId
              ? { ...t, category_id: null, updated_at: new Date().toISOString() }
              : t
          )
        }));

        // If viewing this category, go to inbox
        if (get().currentView === `category-${categoryId}`) {
          set({ currentView: 'inbox' });
        }
      },

      setView: (view: ViewType) => {
        set({ currentView: view });
      },

      setTheme: (theme: 'light' | 'dark') => {
        set({ theme });
        localStorage.setItem('gamify-theme', theme);
      },

      showToast: (message: string, type: 'success' | 'error' | 'info' = 'info') => {
        set({ toastMessage: message, toastType: type });
        setTimeout(() => get().clearToast(), 3000);
      },

      clearToast: () => {
        set({ toastMessage: null });
      },

      getFilteredTasks: () => {
        const state = get();
        let filtered = [...state.tasks];
        const view = state.currentView;

        if (view === 'today') {
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          filtered = filtered.filter(
            (t) => !t.is_completed && t.due_date && new Date(t.due_date) <= today
          );
        } else if (view === 'upcoming') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          filtered = filtered.filter(
            (t) => !t.is_completed && t.due_date && new Date(t.due_date) >= tomorrow
          );
        } else if (view === 'completed') {
          filtered = filtered.filter((t) => t.is_completed);
        } else if (view.startsWith('project-')) {
          const projectId = view.replace('project-', '');
          filtered = filtered.filter((t) => t.project_id === projectId && !t.is_completed);
        } else if (view.startsWith('category-')) {
          const categoryId = view.replace('category-', '');
          filtered = filtered.filter((t) => t.category_id === categoryId && !t.is_completed);
        } else {
          // Inbox: all incomplete tasks
          filtered = filtered.filter((t) => !t.is_completed);
        }

        // Sort by order_index, then by created_at
        filtered.sort(
          (a, b) =>
            (a.order_index || 0) - (b.order_index || 0) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return filtered;
      },

      eraseAllData: () => {
        set({
          ...defaultState,
          currentView: 'inbox',
          toastMessage: null,
          theme: get().theme
        });
        get().showToast('All data erased', 'success');
      }
    }),
    {
      name: STORAGE_KEY,
      partialize: (state) => ({
        profile: state.profile,
        tasks: state.tasks,
        projects: state.projects,
        categories: state.categories,
        daily_stats: state.daily_stats,
        personal_records: state.personal_records
      })
    }
  )
);

function updateDailyStats(stats: DailyStat[], date: string, xpEarned: number): DailyStat[] {
  const existing = stats.find((s) => s.date === date);
  if (existing) {
    return stats.map((s) =>
      s.date === date
        ? { ...s, tasks_completed: s.tasks_completed + 1, xp_earned: s.xp_earned + xpEarned }
        : s
    );
  } else {
    return [{ date, tasks_completed: 1, xp_earned: xpEarned }, ...stats];
  }
}

function checkAchievements(state: TodayStore): typeof ACHIEVEMENTS {
  const newAchievements: typeof ACHIEVEMENTS = [];

  ACHIEVEMENTS.forEach((achievement) => {
    if (
      !state.profile.achievements.includes(achievement.id) &&
      achievement.check({ profile: state.profile, tasks: state.tasks })
    ) {
      // Add achievement
      state.profile.achievements.push(achievement.id);
      state.addXP(achievement.xp);
      newAchievements.push(achievement);
    }
  });

  return newAchievements;
}
