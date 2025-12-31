// Placeholder for Supabase generated types
// Run `npx supabase gen types typescript` to generate

export type Database = {
  public: {
    Tables: {
      users: {
        Row: {
          id: string;
          email: string;
          username: string | null;
          display_name: string | null;
          avatar_url: string | null;
          total_xp: number;
          main_level: number;
          current_streak: number;
          longest_streak: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          total_xp?: number;
          main_level?: number;
          current_streak?: number;
          longest_streak?: number;
        };
        Update: {
          email?: string;
          username?: string | null;
          display_name?: string | null;
          avatar_url?: string | null;
          total_xp?: number;
          main_level?: number;
          current_streak?: number;
          longest_streak?: number;
        };
      };
      app_profiles: {
        Row: {
          id: string;
          user_id: string;
          app_id: string;
          xp: number;
          level: number;
          stats: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          app_id: string;
          xp?: number;
          level?: number;
          stats?: Record<string, unknown>;
        };
        Update: {
          xp?: number;
          level?: number;
          stats?: Record<string, unknown>;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
  };
};
