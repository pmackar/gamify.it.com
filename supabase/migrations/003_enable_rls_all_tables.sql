-- Enable Row Level Security on all tables exposed to PostgREST
-- This migration secures tables that were missing RLS policies

-- ============================================
-- GAMIFY APP DATA TABLES
-- ============================================

-- gamify_fitness_data
ALTER TABLE public.gamify_fitness_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own fitness data"
  ON public.gamify_fitness_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own fitness data"
  ON public.gamify_fitness_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own fitness data"
  ON public.gamify_fitness_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own fitness data"
  ON public.gamify_fitness_data FOR DELETE
  USING (auth.uid() = user_id);

-- gamify_today_data
ALTER TABLE public.gamify_today_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own today data"
  ON public.gamify_today_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own today data"
  ON public.gamify_today_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own today data"
  ON public.gamify_today_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own today data"
  ON public.gamify_today_data FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- TRAVEL APP TABLES
-- ============================================

-- travel_cities
ALTER TABLE public.travel_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own cities"
  ON public.travel_cities FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own cities"
  ON public.travel_cities FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own cities"
  ON public.travel_cities FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own cities"
  ON public.travel_cities FOR DELETE
  USING (auth.uid() = user_id);

-- travel_neighborhoods
ALTER TABLE public.travel_neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own neighborhoods"
  ON public.travel_neighborhoods FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own neighborhoods"
  ON public.travel_neighborhoods FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own neighborhoods"
  ON public.travel_neighborhoods FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own neighborhoods"
  ON public.travel_neighborhoods FOR DELETE
  USING (auth.uid() = user_id);

-- travel_locations (user_id is nullable - supports shared/public locations)
ALTER TABLE public.travel_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own locations or public locations"
  ON public.travel_locations FOR SELECT
  USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own locations"
  ON public.travel_locations FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own locations"
  ON public.travel_locations FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own locations"
  ON public.travel_locations FOR DELETE
  USING (auth.uid() = user_id);

-- travel_visits
ALTER TABLE public.travel_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own visits"
  ON public.travel_visits FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own visits"
  ON public.travel_visits FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own visits"
  ON public.travel_visits FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own visits"
  ON public.travel_visits FOR DELETE
  USING (auth.uid() = user_id);

-- travel_photos
ALTER TABLE public.travel_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own photos"
  ON public.travel_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own photos"
  ON public.travel_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own photos"
  ON public.travel_photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own photos"
  ON public.travel_photos FOR DELETE
  USING (auth.uid() = user_id);

-- travel_reviews
ALTER TABLE public.travel_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view approved reviews or their own"
  ON public.travel_reviews FOR SELECT
  USING (status = 'APPROVED' OR auth.uid() = author_id);

CREATE POLICY "Users can insert their own reviews"
  ON public.travel_reviews FOR INSERT
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users can update their own reviews"
  ON public.travel_reviews FOR UPDATE
  USING (auth.uid() = author_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.travel_reviews FOR DELETE
  USING (auth.uid() = author_id);

-- travel_quests
ALTER TABLE public.travel_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quests"
  ON public.travel_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own quests"
  ON public.travel_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own quests"
  ON public.travel_quests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own quests"
  ON public.travel_quests FOR DELETE
  USING (auth.uid() = user_id);

-- travel_quest_items (access via quest ownership)
ALTER TABLE public.travel_quest_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own quest items"
  ON public.travel_quest_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can insert items to their own quests"
  ON public.travel_quest_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can update items in their own quests"
  ON public.travel_quest_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = auth.uid()
  ));

CREATE POLICY "Users can delete items from their own quests"
  ON public.travel_quest_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = auth.uid()
  ));

-- travel_user_location_data
ALTER TABLE public.travel_user_location_data ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own location data"
  ON public.travel_user_location_data FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own location data"
  ON public.travel_user_location_data FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own location data"
  ON public.travel_user_location_data FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own location data"
  ON public.travel_user_location_data FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FIX FUNCTION SEARCH PATHS
-- ============================================

-- Recreate functions with search_path set to prevent SQL injection

-- calculate_level_from_xp (BIGINT version)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp BIGINT)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  level INTEGER := 1;
  xp_remaining BIGINT := total_xp;
  xp_needed BIGINT := 100;
BEGIN
  WHILE xp_remaining >= xp_needed LOOP
    xp_remaining := xp_remaining - xp_needed;
    level := level + 1;
    xp_needed := FLOOR(xp_needed * 1.5);
  END LOOP;
  RETURN level;
END;
$$;

-- calculate_level_from_xp (INTEGER version)
CREATE OR REPLACE FUNCTION public.calculate_level_from_xp(total_xp INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
BEGIN
  RETURN public.calculate_level_from_xp(total_xp::BIGINT);
END;
$$;

-- update_profile_total_xp
CREATE OR REPLACE FUNCTION public.update_profile_total_xp()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.profiles
  SET
    total_xp = (
      SELECT COALESCE(SUM(xp), 0)
      FROM public.app_profiles
      WHERE user_id = COALESCE(NEW.user_id, OLD.user_id)
    ),
    main_level = public.calculate_level_from_xp(
      (SELECT COALESCE(SUM(xp), 0) FROM public.app_profiles WHERE user_id = COALESCE(NEW.user_id, OLD.user_id))
    ),
    updated_at = NOW()
  WHERE id = COALESCE(NEW.user_id, OLD.user_id);

  RETURN COALESCE(NEW, OLD);
END;
$$;

-- handle_new_user
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, display_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    display_name = COALESCE(EXCLUDED.display_name, public.profiles.display_name),
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- ============================================
-- GRANT SERVICE ROLE BYPASS
-- ============================================
-- Prisma uses the service role which bypasses RLS by default.
-- This ensures our API routes continue to work while PostgREST
-- (anon/authenticated roles) are properly restricted.
