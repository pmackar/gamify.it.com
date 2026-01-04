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
  ViewType,
  SyncState,
  Streaks,
  StreakInfo,
  DailyQuest,
  DailyQuestsState,
  RecurrenceRule,
  RecurrenceFrequency
} from './types';
import {
  XP_CONFIG,
  xpToNextLevel,
  calculateXPPreview,
  ACHIEVEMENTS
} from './data';
import { dispatchXPUpdate } from '@/components/XPContext';

const STORAGE_KEY = 'gamify_life';

// Sync debounce timeout
let syncTimeout: ReturnType<typeof setTimeout> | null = null;

interface TodayStore extends TodayState, SyncState {
  // UI State
  currentView: ViewType;
  toastMessage: string | null;
  toastType: 'success' | 'error' | 'info';
  theme: 'light' | 'dark';

  // Actions
  loadState: () => void;

  // Sync actions
  syncToServer: () => Promise<void>;
  fetchFromServer: (forceRefresh?: boolean) => Promise<void>;

  // Profile actions
  addXP: (amount: number) => boolean; // returns true if leveled up
  updateProfileName: (name: string) => void;

  // Task actions
  createTask: (data: Partial<Task>) => Task;
  updateTask: (taskId: string, updates: Partial<Task>) => void;
  deleteTask: (taskId: string) => void;
  toggleTaskComplete: (taskId: string) => { xpEarned: number; leveledUp: boolean; newAchievements: typeof ACHIEVEMENTS };
  reorderTasks: (taskIds: string[]) => void;

  // Subtask helpers
  getSubtasks: (parentId: string) => Task[];
  getSubtaskProgress: (parentId: string) => { completed: number; total: number };
  createSubtask: (parentId: string, data: Partial<Task>) => Task;

  // Start date / Someday helpers
  deferTask: (taskId: string, until?: string) => void;
  undeferTask: (taskId: string) => void;

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

  // Daily quests
  getDailyQuests: () => DailyQuestsState;
  updateDailyQuestProgress: (task: Task) => void;

  // Data management
  eraseAllData: () => void;
}

const defaultStreakInfo: StreakInfo = { current: 0, longest: 0, last_date: null };

const defaultStreaks: Streaks = {
  daily: { ...defaultStreakInfo },
  inbox_zero: { ...defaultStreakInfo },
  early_bird: { ...defaultStreakInfo },
  night_owl: { ...defaultStreakInfo },
};

const defaultProfile: Profile = {
  name: 'User',
  level: 1,
  xp: 0,
  xp_to_next: 100,
  total_tasks_completed: 0,
  current_streak: 0,
  longest_streak: 0,
  achievements: [],
  last_task_date: null,
  streaks: { ...defaultStreaks },
};

const defaultState: TodayState = {
  profile: defaultProfile,
  tasks: [],
  projects: [],
  categories: [],
  daily_stats: [],
  personal_records: {}
};

// Calculate base XP without streak (for API - API applies its own streak)
function calculateBaseTaskXP(task: Task): number {
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

  return Math.floor(xp);
}

// Calculate XP with streak (for local UI)
function calculateTaskXP(task: Task, currentStreak: number): number {
  const baseXP = calculateBaseTaskXP(task);

  // Streak bonus
  const streakMultiplier = Math.min(
    1 + currentStreak * XP_CONFIG.STREAK_BONUS_PER_DAY,
    XP_CONFIG.MAX_STREAK_MULTIPLIER
  );

  return Math.floor(baseXP * streakMultiplier);
}

// Daily quest templates
const DAILY_QUEST_TEMPLATES: Array<{
  type: DailyQuest['type'];
  title: string;
  description: string;
  target: number;
  xp_reward: number;
}> = [
  { type: 'complete_tasks', title: 'Task Warrior', description: 'Complete 3 tasks today', target: 3, xp_reward: 30 },
  { type: 'complete_tasks', title: 'Productivity Master', description: 'Complete 5 tasks today', target: 5, xp_reward: 50 },
  { type: 'complete_epic', title: 'Boss Slayer', description: 'Complete an Epic difficulty task', target: 1, xp_reward: 75 },
  { type: 'inbox_zero', title: 'Inbox Champion', description: 'Clear all tasks from your inbox', target: 1, xp_reward: 40 },
  { type: 'early_task', title: 'Early Bird', description: 'Complete a task before 9am', target: 1, xp_reward: 25 },
  { type: 'streak_maintain', title: 'Streak Keeper', description: 'Maintain your daily streak', target: 1, xp_reward: 35 },
  { type: 'complete_project_task', title: 'Project Focus', description: 'Complete a task from any project', target: 1, xp_reward: 20 },
];

// Generate daily quests based on date seed
function generateDailyQuests(dateStr: string): DailyQuest[] {
  // Use date as seed for consistent daily quests
  const seed = dateStr.split('-').reduce((acc, n) => acc + parseInt(n), 0);
  const shuffled = [...DAILY_QUEST_TEMPLATES].sort((a, b) => {
    const hashA = (seed * 31 + a.type.charCodeAt(0)) % 100;
    const hashB = (seed * 31 + b.type.charCodeAt(0)) % 100;
    return hashA - hashB;
  });

  // Pick 3 quests, avoiding duplicates
  const selected: DailyQuest[] = [];
  const usedTypes = new Set<string>();

  for (const template of shuffled) {
    if (!usedTypes.has(template.type) && selected.length < 3) {
      selected.push({
        id: `${dateStr}-${template.type}`,
        ...template,
        progress: 0,
        completed: false,
      });
      usedTypes.add(template.type);
    }
  }

  return selected;
}

// Update streak helper - returns updated streak info
function updateStreak(streakInfo: StreakInfo | undefined, today: string): StreakInfo {
  const info = streakInfo || { current: 0, longest: 0, last_date: null };
  const lastDate = info.last_date;

  if (!lastDate) {
    return { current: 1, longest: Math.max(info.longest, 1), last_date: today };
  }

  const last = new Date(lastDate);
  const now = new Date(today);
  const diffDays = Math.floor((now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    // Same day - no change
    return info;
  } else if (diffDays === 1) {
    // Consecutive day
    const newCurrent = info.current + 1;
    return {
      current: newCurrent,
      longest: Math.max(info.longest, newCurrent),
      last_date: today,
    };
  } else {
    // Streak broken
    return { current: 1, longest: info.longest, last_date: today };
  }
}

// Calculate next occurrence date for recurring tasks
function calculateNextOccurrence(currentDate: string, rule: RecurrenceRule): string | null {
  const current = new Date(currentDate);
  const next = new Date(current);

  switch (rule.frequency) {
    case 'daily':
      next.setDate(next.getDate() + rule.interval);
      break;
    case 'weekly':
      if (rule.daysOfWeek && rule.daysOfWeek.length > 0) {
        // Find next matching day of week
        const currentDayOfWeek = next.getDay();
        const sortedDays = [...rule.daysOfWeek].sort((a, b) => a - b);
        let found = false;

        // Look for next day in same week
        for (const day of sortedDays) {
          if (day > currentDayOfWeek) {
            next.setDate(next.getDate() + (day - currentDayOfWeek));
            found = true;
            break;
          }
        }

        // If not found, go to first day of next week cycle
        if (!found) {
          const daysUntilNext = 7 * rule.interval - currentDayOfWeek + sortedDays[0];
          next.setDate(next.getDate() + daysUntilNext);
        }
      } else {
        next.setDate(next.getDate() + 7 * rule.interval);
      }
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + rule.interval);
      if (rule.dayOfMonth) {
        const lastDayOfMonth = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
        next.setDate(Math.min(rule.dayOfMonth, lastDayOfMonth));
      }
      break;
    case 'yearly':
      next.setFullYear(next.getFullYear() + rule.interval);
      break;
  }

  // Check if past end date
  if (rule.endDate && next > new Date(rule.endDate)) {
    return null;
  }

  return next.toISOString().split('T')[0];
}

// Check if a task is visible (not hidden by start_date)
function isTaskVisible(task: Task): boolean {
  if (!task.start_date) return true;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return new Date(task.start_date) <= today;
}

// Queue sync helper - for updates (debounced)
const queueSync = (get: () => TodayStore) => {
  get().pendingSync; // Access to ensure we can set it
  if (syncTimeout) clearTimeout(syncTimeout);
  syncTimeout = setTimeout(() => {
    get().syncToServer();
  }, 500);
};

// Immediate sync helper - for critical operations like task creation
const syncImmediate = (get: () => TodayStore) => {
  // Clear any pending debounced sync
  if (syncTimeout) clearTimeout(syncTimeout);
  // Sync immediately (fire and forget - don't block UI)
  Promise.resolve(get().syncToServer()).catch((err: Error) => {
    console.error('Sync failed:', err);
  });
};

// Get sync payload for sendBeacon
export const getSyncPayload = (): string | null => {
  const state = useTodayStore.getState();
  if (!state.pendingSync) return null;

  return JSON.stringify({
    data: {
      profile: state.profile,
      tasks: state.tasks,
      projects: state.projects,
      categories: state.categories,
      daily_stats: state.daily_stats,
      personal_records: state.personal_records,
    },
  });
};

// Sync using sendBeacon - guaranteed delivery even during page unload
export const syncViaSendBeacon = (): boolean => {
  const payload = getSyncPayload();
  if (!payload) return false;

  try {
    // sendBeacon with proper content-type
    const blob = new Blob([payload], { type: 'application/json' });
    const sent = navigator.sendBeacon('/api/today/sync', blob);

    if (sent) {
      // Mark as synced (optimistically)
      useTodayStore.setState({
        pendingSync: false,
        lastSyncedAt: new Date().toISOString(),
      });
    }

    return sent;
  } catch (e) {
    console.error('sendBeacon failed:', e);
    return false;
  }
};

export const useTodayStore = create<TodayStore>()(
  persist(
    (set, get) => ({
      ...defaultState,

      // UI State
      currentView: 'inbox',
      toastMessage: null,
      toastType: 'info',
      theme: 'light',

      // Sync State
      lastSyncedAt: null,
      pendingSync: false,
      syncStatus: 'idle',
      syncError: null,

      loadState: () => {
        // Theme is handled separately
        const savedTheme = localStorage.getItem('gamify-theme');
        if (savedTheme === 'dark' || savedTheme === 'light') {
          set({ theme: savedTheme });
        }
      },

      syncToServer: async () => {
        const state = get();
        if (state.syncStatus === 'syncing') return;

        set({ syncStatus: 'syncing', pendingSync: true });

        try {
          const res = await fetch('/api/today/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              data: {
                profile: state.profile,
                tasks: state.tasks,
                projects: state.projects,
                categories: state.categories,
                daily_stats: state.daily_stats,
                personal_records: state.personal_records,
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
          set({
            syncStatus: 'error',
            syncError: error instanceof Error ? error.message : 'Sync failed',
          });
          // Retry in 5 seconds
          setTimeout(() => {
            if (get().pendingSync) {
              get().syncToServer();
            }
          }, 5000);
        }
      },

      fetchFromServer: async (forceRefresh = false) => {
        try {
          const res = await fetch('/api/today/sync');
          if (!res.ok) return;

          const serverData = await res.json();
          if (!serverData || !serverData.data) return;

          const localState = get();
          const localLastSynced = localState.lastSyncedAt;
          const hasPendingChanges = localState.pendingSync;
          const serverUpdatedAt = serverData.updated_at;

          // Determine if server data is newer
          const serverIsNewer = !localLastSynced || serverUpdatedAt > localLastSynced;

          if (!localLastSynced || forceRefresh) {
            // First sync on this device or forced refresh - server wins
            set({
              ...serverData.data,
              lastSyncedAt: serverUpdatedAt,
              pendingSync: false,
              syncStatus: 'idle',
            });
          } else if (serverIsNewer && !hasPendingChanges) {
            // Server is newer and no pending local changes - use server
            set({
              ...serverData.data,
              lastSyncedAt: serverUpdatedAt,
              pendingSync: false,
              syncStatus: 'idle',
            });
          } else if (serverIsNewer && hasPendingChanges) {
            // Both have changes - merge by ID, keeping newer items
            const serverTasks: Task[] = serverData.data.tasks || [];
            const localTasks: Task[] = localState.tasks || [];
            const serverProjects: Project[] = serverData.data.projects || [];
            const localProjects: Project[] = localState.projects || [];
            const serverCategories: Category[] = serverData.data.categories || [];
            const localCategories: Category[] = localState.categories || [];

            // Merge tasks by ID - keep newer version based on updated_at
            const taskMap = new Map<string, Task>();
            for (const task of serverTasks) {
              taskMap.set(task.id, task);
            }
            for (const task of localTasks) {
              const existing = taskMap.get(task.id);
              if (!existing || new Date(task.updated_at) > new Date(existing.updated_at)) {
                taskMap.set(task.id, task);
              }
            }
            const mergedTasks = Array.from(taskMap.values());

            // Merge projects by ID
            const projectMap = new Map<string, Project>();
            for (const project of serverProjects) {
              projectMap.set(project.id, project);
            }
            for (const project of localProjects) {
              const existing = projectMap.get(project.id);
              if (!existing || new Date(project.updated_at) > new Date(existing.updated_at)) {
                projectMap.set(project.id, project);
              }
            }
            const mergedProjects = Array.from(projectMap.values());

            // Merge categories by ID
            const categoryMap = new Map<string, Category>();
            for (const cat of serverCategories) {
              categoryMap.set(cat.id, cat);
            }
            for (const cat of localCategories) {
              categoryMap.set(cat.id, cat); // Local categories win (no updated_at)
            }
            const mergedCategories = Array.from(categoryMap.values());

            // Use local profile if it has more XP/tasks completed
            const localProfile = localState.profile;
            const serverProfile = serverData.data.profile || defaultProfile;
            const mergedProfile = (localProfile.total_tasks_completed >= serverProfile.total_tasks_completed)
              ? localProfile
              : serverProfile;

            // Update state with merged data
            set({
              tasks: mergedTasks,
              projects: mergedProjects,
              categories: mergedCategories,
              profile: mergedProfile,
              daily_stats: serverData.data.daily_stats || localState.daily_stats,
              personal_records: serverData.data.personal_records || localState.personal_records,
              lastSyncedAt: new Date().toISOString(),
              pendingSync: true, // Mark as pending to push merged data
              syncStatus: 'idle',
            });

            // Push merged data to server
            await get().syncToServer();
          }
          // Otherwise: local is newer and no pending changes - keep local
        } catch (error) {
          console.error('Failed to fetch from server:', error);
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
          estimated_time: data.estimated_time || 0.25,
          difficulty: data.difficulty || 'medium',
          due_date: data.due_date || null,
          start_date: data.start_date || null,
          is_completed: false,
          completed_at: null,
          xp_earned: 0,
          was_on_time: null,
          project_id: data.project_id || null,
          category_id: data.category_id || null,
          parent_task_id: data.parent_task_id || null,
          recurrence_rule: data.recurrence_rule || null,
          recurrence_parent_id: data.recurrence_parent_id || null,
          is_someday: data.is_someday || false,
          tags: data.tags || [],
          order_index: state.tasks.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };

        set((state) => ({
          tasks: [...state.tasks, task],
          pendingSync: true,
        }));
        // Sync immediately for task creation - critical data must not be lost
        syncImmediate(get);

        return task;
      },

      updateTask: (taskId: string, updates: Partial<Task>) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? { ...t, ...updates, updated_at: new Date().toISOString() }
              : t
          ),
          pendingSync: true,
        }));
        queueSync(get);
      },

      deleteTask: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.filter((t) => t.id !== taskId),
          pendingSync: true,
        }));
        // Sync immediately for task deletion - critical data must not be lost
        syncImmediate(get);
      },

      toggleTaskComplete: (taskId: string) => {
        console.log('[STORE DEBUG] toggleTaskComplete called with taskId:', taskId);
        const state = get();
        console.log('[STORE DEBUG] Current tasks count:', state.tasks.length);
        const task = state.tasks.find((t) => t.id === taskId);
        console.log('[STORE DEBUG] Found task:', task?.title, 'is_completed:', task?.is_completed);
        if (!task) {
          console.log('[STORE DEBUG] Task not found, returning early');
          return { xpEarned: 0, leveledUp: false, newAchievements: [] };
        }

        if (!task.is_completed) {
          console.log('[STORE DEBUG] Task is not completed, marking as complete...');
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

          // Update special streaks based on completion time
          const now = new Date();
          const hour = now.getHours();
          const currentStreaks = state.profile.streaks || { ...defaultStreaks };

          // Update daily streak (always)
          const newDailyStreak = updateStreak(currentStreaks.daily, today);

          // Update early bird streak (completed before 9am)
          const newEarlyBirdStreak = hour < 9
            ? updateStreak(currentStreaks.early_bird, today)
            : currentStreaks.early_bird;

          // Update night owl streak (completed after 8pm)
          const newNightOwlStreak = hour >= 20
            ? updateStreak(currentStreaks.night_owl, today)
            : currentStreaks.night_owl;

          // Check for inbox zero (no incomplete tasks) - update after this task
          const remainingIncompleteTasks = state.tasks.filter(t => !t.is_completed && t.id !== taskId).length;
          const newInboxZeroStreak = remainingIncompleteTasks === 0
            ? updateStreak(currentStreaks.inbox_zero, today)
            : currentStreaks.inbox_zero;

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
              last_task_date: today,
              streaks: {
                daily: newDailyStreak,
                inbox_zero: newInboxZeroStreak,
                early_bird: newEarlyBirdStreak,
                night_owl: newNightOwlStreak,
              },
            },
            daily_stats: updateDailyStats(state.daily_stats, today, xpEarned),
            pendingSync: true,
          }));
          console.log('[STORE DEBUG] State updated via set(), task should now be completed');
          console.log('[STORE DEBUG] Checking updated state:', get().tasks.find(t => t.id === taskId)?.is_completed);
          // Sync immediately for task completion - critical data
          syncImmediate(get);

          // Add XP locally
          const leveledUp = get().addXP(xpEarned);

          // Update daily quests progress
          get().updateDailyQuestProgress(task);

          // Check local achievements
          const newAchievements = checkAchievements(get());

          // Handle recurring tasks - create next occurrence
          if (task.recurrence_rule && task.due_date) {
            const nextDueDate = calculateNextOccurrence(task.due_date, task.recurrence_rule);
            if (nextDueDate) {
              // Create the next occurrence
              const nextTask: Task = {
                id: Date.now().toString() + '-recur',
                title: task.title,
                description: task.description || '',
                status: 'Not started',
                priority: task.priority,
                tier: task.tier,
                difficulty: task.difficulty,
                due_date: nextDueDate,
                start_date: null,
                is_completed: false,
                completed_at: null,
                xp_earned: 0,
                was_on_time: null,
                project_id: task.project_id,
                category_id: task.category_id,
                parent_task_id: null,
                recurrence_rule: task.recurrence_rule,
                recurrence_parent_id: task.recurrence_parent_id || task.id,
                is_someday: false,
                tags: [...task.tags],
                order_index: get().tasks.length,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              };

              set((state) => ({
                tasks: [...state.tasks, nextTask],
                pendingSync: true,
              }));

              get().showToast(`Next occurrence scheduled for ${nextDueDate}`, 'info');
            }
          }

          // Check if parent task should be auto-completed (all subtasks done)
          if (task.parent_task_id) {
            const parent = get().tasks.find((t) => t.id === task.parent_task_id);
            if (parent && !parent.is_completed) {
              const allSubtasksComplete = get()
                .tasks.filter((t) => t.parent_task_id === task.parent_task_id)
                .every((t) => t.is_completed || t.id === taskId);

              if (allSubtasksComplete) {
                // Auto-complete parent
                setTimeout(() => {
                  get().toggleTaskComplete(task.parent_task_id!);
                  get().showToast('Parent task completed!', 'success');
                }, 300);
              }
            }
          }

          // Call unified XP API (async, don't block)
          // Send BASE XP - API applies its own streak multiplier
          const baseXP = calculateBaseTaskXP(task);
          const newTotalTasks = get().profile.total_tasks_completed;
          fetch('/api/xp', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              appId: 'today',
              action: 'task_complete',
              xpAmount: baseXP,
              metadata: {
                taskCount: newTotalTasks,
                taskTier: task.tier,
                difficulty: task.difficulty,
              }
            })
          }).then(response => {
            if (response.ok) {
              return response.json();
            }
          }).then(data => {
            if (data?.achievements?.length > 0) {
              window.dispatchEvent(new CustomEvent('achievement-unlocked', {
                detail: data.achievements
              }));
            }
            // Update navbar XP
            dispatchXPUpdate();
          }).catch(() => {
            // Silently fail - local XP already updated
          });

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
              },
              pendingSync: true,
            };
          });
          // Sync immediately for task uncomplete - critical data
          syncImmediate(get);

          // Revoke XP from global profile (async, don't block)
          if (revokedXP > 0) {
            fetch('/api/xp', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                appId: 'today',
                xpAmount: revokedXP,
                reason: 'task_uncompleted',
              })
            }).then(() => {
              dispatchXPUpdate();
            }).catch(() => {
              // Silently fail - local XP already updated
            });
          }

          return { xpEarned: -revokedXP, leveledUp: false, newAchievements: [] };
        }
      },

      reorderTasks: (taskIds: string[]) => {
        set((state) => ({
          tasks: state.tasks.map((task) => {
            const newIndex = taskIds.indexOf(task.id);
            if (newIndex !== -1) {
              return { ...task, order_index: newIndex, updated_at: new Date().toISOString() };
            }
            return task;
          }),
          pendingSync: true,
        }));
        queueSync(get);
      },

      // Subtask helpers
      getSubtasks: (parentId: string) => {
        return get().tasks
          .filter((t) => t.parent_task_id === parentId)
          .sort((a, b) => a.order_index - b.order_index);
      },

      getSubtaskProgress: (parentId: string) => {
        const subtasks = get().tasks.filter((t) => t.parent_task_id === parentId);
        const completed = subtasks.filter((t) => t.is_completed).length;
        return { completed, total: subtasks.length };
      },

      createSubtask: (parentId: string, data: Partial<Task>) => {
        const state = get();
        const parent = state.tasks.find((t) => t.id === parentId);
        const existingSubtasks = state.tasks.filter((t) => t.parent_task_id === parentId);

        const task: Task = {
          id: Date.now().toString(),
          title: data.title || '',
          description: data.description || '',
          status: 'Not started',
          priority: data.priority || parent?.priority || null,
          tier: data.tier || parent?.tier || 'tier3',
          difficulty: data.difficulty || 'easy', // Subtasks default to easy
          due_date: data.due_date || parent?.due_date || null,
          start_date: data.start_date || null,
          is_completed: false,
          completed_at: null,
          xp_earned: 0,
          was_on_time: null,
          project_id: parent?.project_id || null,
          category_id: parent?.category_id || null,
          parent_task_id: parentId,
          tags: data.tags || [],
          order_index: existingSubtasks.length,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        set((state) => ({
          tasks: [...state.tasks, task],
          pendingSync: true,
        }));
        // Sync immediately for subtask creation - critical data
        syncImmediate(get);

        return task;
      },

      // Start date / Someday helpers
      deferTask: (taskId: string, until?: string) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  is_someday: !until,
                  start_date: until || null,
                  updated_at: new Date().toISOString(),
                }
              : t
          ),
          pendingSync: true,
        }));
        queueSync(get);
      },

      undeferTask: (taskId: string) => {
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  is_someday: false,
                  start_date: null,
                  updated_at: new Date().toISOString(),
                }
              : t
          ),
          pendingSync: true,
        }));
        queueSync(get);
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
          projects: [...state.projects, project],
          pendingSync: true,
        }));
        // Sync immediately for project creation - critical data
        syncImmediate(get);

        return project;
      },

      updateProject: (projectId: string, updates: Partial<Project>) => {
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, ...updates, updated_at: new Date().toISOString() }
              : p
          ),
          pendingSync: true,
        }));
        queueSync(get);
      },

      deleteProject: (projectId: string) => {
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== projectId),
          tasks: state.tasks.map((t) =>
            t.project_id === projectId
              ? { ...t, project_id: null, updated_at: new Date().toISOString() }
              : t
          ),
          pendingSync: true,
        }));
        // Sync immediately for project deletion - critical data
        syncImmediate(get);

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
          categories: [...state.categories, category],
          pendingSync: true,
        }));
        // Sync immediately for category creation - critical data
        syncImmediate(get);

        return category;
      },

      updateCategory: (categoryId: string, updates: Partial<Category>) => {
        set((state) => ({
          categories: state.categories.map((c) =>
            c.id === categoryId ? { ...c, ...updates } : c
          ),
          pendingSync: true,
        }));
        queueSync(get);
      },

      deleteCategory: (categoryId: string) => {
        set((state) => ({
          categories: state.categories.filter((c) => c.id !== categoryId),
          tasks: state.tasks.map((t) =>
            t.category_id === categoryId
              ? { ...t, category_id: null, updated_at: new Date().toISOString() }
              : t
          ),
          pendingSync: true,
        }));
        // Sync immediately for category deletion - critical data
        syncImmediate(get);

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

        // Base filters for most views (except completed and someday):
        // - Hide subtasks (shown under parent)
        // - Hide tasks with future start_date
        // - Hide someday tasks
        const applyBaseFilters = (tasks: Task[]) =>
          tasks.filter(
            (t) =>
              !t.parent_task_id && // Not a subtask
              isTaskVisible(t) && // Start date has passed or not set
              !t.is_someday // Not deferred to someday
          );

        if (view === 'someday') {
          // Someday view: only show deferred tasks
          filtered = filtered.filter((t) => t.is_someday && !t.is_completed && !t.parent_task_id);
        } else if (view === 'today') {
          const today = new Date();
          today.setHours(23, 59, 59, 999);
          filtered = applyBaseFilters(filtered).filter(
            (t) => !t.is_completed && t.due_date && new Date(t.due_date) <= today
          );
        } else if (view === 'upcoming') {
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setHours(0, 0, 0, 0);
          filtered = applyBaseFilters(filtered).filter(
            (t) => !t.is_completed && t.due_date && new Date(t.due_date) >= tomorrow
          );
        } else if (view === 'completed') {
          // Completed view shows all completed tasks including subtasks
          filtered = filtered.filter((t) => t.is_completed && !t.parent_task_id);
        } else if (view.startsWith('project-')) {
          const projectId = view.replace('project-', '');
          filtered = applyBaseFilters(filtered).filter(
            (t) => t.project_id === projectId && !t.is_completed
          );
        } else if (view.startsWith('category-')) {
          const categoryId = view.replace('category-', '');
          filtered = applyBaseFilters(filtered).filter(
            (t) => t.category_id === categoryId && !t.is_completed
          );
        } else {
          // Inbox: all incomplete, visible, non-subtask, non-someday tasks
          filtered = applyBaseFilters(filtered).filter((t) => !t.is_completed);
        }

        // Sort by order_index, then by created_at
        filtered.sort(
          (a, b) =>
            (a.order_index || 0) - (b.order_index || 0) ||
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );

        return filtered;
      },

      getDailyQuests: () => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];

        // Check if we need to generate new daily quests
        if (!state.daily_quests || state.daily_quests.date !== today) {
          const quests = generateDailyQuests(today);
          const newQuestsState: DailyQuestsState = {
            date: today,
            quests,
            all_completed_bonus: false,
          };
          set({ daily_quests: newQuestsState, pendingSync: true });
          return newQuestsState;
        }

        return state.daily_quests;
      },

      updateDailyQuestProgress: (task: Task) => {
        const state = get();
        const today = new Date().toISOString().split('T')[0];
        const hour = new Date().getHours();

        // Ensure we have today's quests
        let questsState = state.daily_quests;
        if (!questsState || questsState.date !== today) {
          questsState = {
            date: today,
            quests: generateDailyQuests(today),
            all_completed_bonus: false,
          };
        }

        // Update progress for each applicable quest
        const updatedQuests = questsState.quests.map((quest) => {
          if (quest.completed) return quest;

          let newProgress = quest.progress;

          switch (quest.type) {
            case 'complete_tasks':
              newProgress++;
              break;
            case 'complete_epic':
              if (task.difficulty === 'epic') newProgress++;
              break;
            case 'inbox_zero':
              const remainingTasks = state.tasks.filter(t => !t.is_completed && t.id !== task.id).length;
              if (remainingTasks === 0) newProgress = 1;
              break;
            case 'early_task':
              if (hour < 9) newProgress = 1;
              break;
            case 'streak_maintain':
              if (state.profile.current_streak > 0) newProgress = 1;
              break;
            case 'complete_project_task':
              if (task.project_id) newProgress = 1;
              break;
          }

          const completed = newProgress >= quest.target;
          return { ...quest, progress: newProgress, completed };
        });

        const allCompleted = updatedQuests.every(q => q.completed);

        set({
          daily_quests: {
            date: today,
            quests: updatedQuests,
            all_completed_bonus: allCompleted && !questsState.all_completed_bonus,
          },
          pendingSync: true,
        });

        // Check for newly completed quests and award XP
        updatedQuests.forEach((quest, i) => {
          if (quest.completed && !questsState!.quests[i].completed) {
            get().addXP(quest.xp_reward);
            get().showToast(`Quest Complete: ${quest.title}! +${quest.xp_reward} XP`, 'success');
          }
        });

        // Bonus for completing all 3
        if (allCompleted && !questsState.all_completed_bonus) {
          const bonusXP = 50;
          get().addXP(bonusXP);
          setTimeout(() => {
            get().showToast(`All Daily Quests Complete! Bonus +${bonusXP} XP`, 'success');
          }, 1500);
        }
      },

      eraseAllData: () => {
        set({
          ...defaultState,
          currentView: 'inbox',
          toastMessage: null,
          theme: get().theme,
          lastSyncedAt: null,
          pendingSync: false,
          syncStatus: 'idle',
          syncError: null,
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
        personal_records: state.personal_records,
        lastSyncedAt: state.lastSyncedAt,
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
      // Track achievement locally for UI purposes
      // XP is awarded by the API to avoid double-counting
      state.profile.achievements.push(achievement.id);
      newAchievements.push(achievement);
    }
  });

  return newAchievements;
}
