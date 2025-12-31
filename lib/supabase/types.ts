export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          bio: string | null;
          total_xp: number;
          main_level: number;
          current_streak: number;
          longest_streak: number;
          last_activity_date: string | null;
          legacy_prisma_id: string | null;
          legacy_clerk_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          total_xp?: number;
          main_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          legacy_prisma_id?: string | null;
          legacy_clerk_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          bio?: string | null;
          total_xp?: number;
          main_level?: number;
          current_streak?: number;
          longest_streak?: number;
          last_activity_date?: string | null;
          legacy_prisma_id?: string | null;
          legacy_clerk_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      app_profiles: {
        Row: {
          id: string;
          user_id: string;
          app_id: string;
          xp: number;
          level: number;
          xp_to_next: number;
          stats: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          app_id: string;
          xp?: number;
          level?: number;
          xp_to_next?: number;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          app_id?: string;
          xp?: number;
          level?: number;
          xp_to_next?: number;
          stats?: Json;
          created_at?: string;
          updated_at?: string;
        };
      };
      achievements: {
        Row: {
          id: string;
          code: string;
          app_id: string;
          name: string;
          description: string;
          icon: string | null;
          xp_reward: number;
          category: string;
          criteria: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          code: string;
          app_id: string;
          name: string;
          description: string;
          icon?: string | null;
          xp_reward?: number;
          category: string;
          criteria?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          code?: string;
          app_id?: string;
          name?: string;
          description?: string;
          icon?: string | null;
          xp_reward?: number;
          category?: string;
          criteria?: Json;
          created_at?: string;
        };
      };
      user_achievements: {
        Row: {
          id: string;
          user_id: string;
          achievement_id: string;
          progress: number;
          is_completed: boolean;
          completed_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          achievement_id: string;
          progress?: number;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          achievement_id?: string;
          progress?: number;
          is_completed?: boolean;
          completed_at?: string | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      calculate_level_from_xp: {
        Args: { total_xp: number };
        Returns: number;
      };
    };
    Enums: {
      [_ in never]: never;
    };
  };
}

// Helper types for easier usage
export type Profile = Database['public']['Tables']['profiles']['Row'];
export type AppProfile = Database['public']['Tables']['app_profiles']['Row'];
export type Achievement = Database['public']['Tables']['achievements']['Row'];
export type UserAchievement = Database['public']['Tables']['user_achievements']['Row'];

// App IDs
export type AppId = 'fitness' | 'travel' | 'today';
