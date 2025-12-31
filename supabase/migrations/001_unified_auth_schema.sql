-- Unified Authentication Schema for gamify.* Ecosystem
-- This migration creates the shared auth tables that work across all gamify apps

-- ============================================
-- PROFILES TABLE (linked to Supabase Auth)
-- ============================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  bio TEXT,

  -- Aggregated XP (calculated from app_profiles via trigger)
  total_xp INTEGER DEFAULT 0,
  main_level INTEGER DEFAULT 1,

  -- Streaks
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_activity_date DATE,

  -- Migration tracking (to link legacy accounts)
  legacy_prisma_id TEXT,
  legacy_clerk_id TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ============================================
-- APP PROFILES (per-app XP/level tracking)
-- ============================================

CREATE TABLE IF NOT EXISTS public.app_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app_id TEXT NOT NULL, -- 'fitness', 'travel', 'today', etc.

  xp INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  xp_to_next INTEGER DEFAULT 100,

  -- App-specific stats stored as JSON
  stats JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, app_id)
);

-- Enable RLS
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own app profiles"
  ON public.app_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own app profiles"
  ON public.app_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own app profiles"
  ON public.app_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- UNIFIED ACHIEVEMENTS
-- ============================================

CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  app_id TEXT NOT NULL, -- 'fitness', 'travel', 'global'
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  icon TEXT,
  xp_reward INTEGER DEFAULT 0,
  category TEXT NOT NULL,
  criteria JSONB NOT NULL DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.user_achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  achievement_id UUID NOT NULL REFERENCES public.achievements(id) ON DELETE CASCADE,

  progress INTEGER DEFAULT 0,
  is_completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(user_id, achievement_id)
);

-- Enable RLS
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_achievements ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Achievements are viewable by everyone"
  ON public.achievements FOR SELECT
  USING (true);

CREATE POLICY "Users can view their own achievement progress"
  ON public.user_achievements FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own achievement progress"
  ON public.user_achievements FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own achievement progress"
  ON public.user_achievements FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- LEVEL CALCULATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER AS $$
DECLARE
  level INTEGER := 1;
  xp_remaining INTEGER := total_xp;
  xp_needed INTEGER := 100;
BEGIN
  -- Each level requires progressively more XP
  -- Level 1->2: 100, 2->3: 150, 3->4: 225, etc. (1.5x multiplier)
  WHILE xp_remaining >= xp_needed LOOP
    xp_remaining := xp_remaining - xp_needed;
    level := level + 1;
    xp_needed := FLOOR(xp_needed * 1.5);
  END LOOP;

  RETURN level;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- ============================================
-- XP AGGREGATION TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_profile_total_xp()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_xp = (
      SELECT COALESCE(SUM(xp), 0)
      FROM public.app_profiles
      WHERE user_id = NEW.user_id
    ),
    main_level = calculate_level_from_xp(
      (SELECT COALESCE(SUM(xp), 0)
       FROM public.app_profiles
       WHERE user_id = NEW.user_id)
    ),
    updated_at = NOW()
  WHERE id = NEW.user_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_update_total_xp
AFTER INSERT OR UPDATE OF xp ON public.app_profiles
FOR EACH ROW EXECUTE FUNCTION update_profile_total_xp();

-- ============================================
-- AUTO-CREATE PROFILE ON AUTH SIGNUP
-- ============================================

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(profiles.display_name, EXCLUDED.display_name),
    avatar_url = COALESCE(profiles.avatar_url, EXCLUDED.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================
-- INDEXES
-- ============================================

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_app_profiles_user_id ON public.app_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_app_profiles_app_id ON public.app_profiles(app_id);
CREATE INDEX IF NOT EXISTS idx_achievements_app_id ON public.achievements(app_id);
CREATE INDEX IF NOT EXISTS idx_user_achievements_user_id ON public.user_achievements(user_id);

-- ============================================
-- SEED DEFAULT ACHIEVEMENTS
-- ============================================

INSERT INTO public.achievements (code, app_id, name, description, icon, xp_reward, category, criteria) VALUES
  -- Fitness achievements
  ('fitness_first_workout', 'fitness', 'First Rep', 'Complete your first workout', 'dumbbell', 50, 'milestone', '{"workouts": 1}'),
  ('fitness_10_workouts', 'fitness', 'Gym Rat', 'Complete 10 workouts', 'fire', 200, 'milestone', '{"workouts": 10}'),
  ('fitness_100_workouts', 'fitness', 'Iron Warrior', 'Complete 100 workouts', 'trophy', 1000, 'milestone', '{"workouts": 100}'),
  ('fitness_7_day_streak', 'fitness', 'Week Strong', '7-day workout streak', 'zap', 150, 'streak', '{"streak": 7}'),
  ('fitness_30_day_streak', 'fitness', 'Monthly Beast', '30-day workout streak', 'crown', 500, 'streak', '{"streak": 30}'),

  -- Travel achievements
  ('travel_first_visit', 'travel', 'First Steps', 'Log your first location', 'map-pin', 50, 'milestone', '{"visits": 1}'),
  ('travel_10_locations', 'travel', 'Explorer', 'Visit 10 unique locations', 'compass', 200, 'milestone', '{"visits": 10}'),
  ('travel_5_cities', 'travel', 'City Hopper', 'Visit locations in 5 different cities', 'globe', 300, 'exploration', '{"cities": 5}'),
  ('travel_first_review', 'travel', 'Critic', 'Write your first review', 'star', 75, 'social', '{"reviews": 1}'),
  ('travel_quest_complete', 'travel', 'Quest Master', 'Complete your first quest', 'check-circle', 150, 'quest', '{"quests": 1}'),

  -- Global achievements
  ('global_multi_gamer', 'global', 'Multi-Gamer', 'Earn XP in 2+ different apps', 'layers', 100, 'milestone', '{"apps": 2}'),
  ('global_level_10', 'global', 'Rising Star', 'Reach main level 10', 'star', 500, 'milestone', '{"level": 10}'),
  ('global_level_25', 'global', 'Power Player', 'Reach main level 25', 'crown', 1000, 'milestone', '{"level": 25}')
ON CONFLICT (code) DO NOTHING;
