/**
 * Day Quest - Type Definitions
 */

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority?: 'High' | 'Medium' | 'Low' | null;
  tier: 'tier1' | 'tier2' | 'tier3';
  difficulty: 'easy' | 'medium' | 'hard' | 'epic';
  due_date?: string | null;
  is_completed: boolean;
  completed_at?: string | null;
  xp_earned: number;
  was_on_time?: boolean | null;
  project_id?: string | null;
  category_id?: string | null;
  tags: string[];
  order_index: number;
  created_at: string;
  updated_at: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  status: string;
  start_date?: string | null;
  due_date?: string | null;
  tier: string;
  xp_earned: number;
  created_at: string;
  updated_at: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
  order_index: number;
  created_at: string;
}

export interface DailyStat {
  date: string;
  tasks_completed: number;
  xp_earned: number;
}

export interface Profile {
  name: string;
  level: number;
  xp: number;
  xp_to_next: number;
  total_tasks_completed: number;
  current_streak: number;
  longest_streak: number;
  achievements: string[];
  last_task_date?: string | null;
}

export interface TodayState {
  profile: Profile;
  tasks: Task[];
  projects: Project[];
  categories: Category[];
  daily_stats: DailyStat[];
  personal_records: Record<string, { value: number; date: string }>;
}

export type ViewType =
  | 'inbox'
  | 'today'
  | 'upcoming'
  | 'completed'
  | 'stats'
  | `project-${string}`
  | `category-${string}`;

export interface Command {
  id: string;
  title: string;
  description: string;
  icon: string;
  shortcut: string[];
  category: string;
}
