-- Optimize RLS policies for performance
-- Fix: auth.uid() -> (select auth.uid()) to prevent per-row re-evaluation
-- Fix: Remove duplicate policies on gamify_today_data

-- ============================================
-- GAMIFY_TODAY_DATA - Remove duplicate policies
-- ============================================

DROP POLICY IF EXISTS "Users own data" ON public.gamify_today_data;

-- ============================================
-- USER_DATA - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can read own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can insert own data" ON public.user_data;
DROP POLICY IF EXISTS "Users can update own data" ON public.user_data;

CREATE POLICY "Users can read own data"
  ON public.user_data FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert own data"
  ON public.user_data FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update own data"
  ON public.user_data FOR UPDATE
  USING (user_id = (select auth.uid()));

-- ============================================
-- GAMIFY_TODAY_DATA - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own today data" ON public.gamify_today_data;
DROP POLICY IF EXISTS "Users can insert their own today data" ON public.gamify_today_data;
DROP POLICY IF EXISTS "Users can update their own today data" ON public.gamify_today_data;
DROP POLICY IF EXISTS "Users can delete their own today data" ON public.gamify_today_data;

CREATE POLICY "Users can view their own today data"
  ON public.gamify_today_data FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own today data"
  ON public.gamify_today_data FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own today data"
  ON public.gamify_today_data FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own today data"
  ON public.gamify_today_data FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- PROFILES - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (id = (select auth.uid()));

CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (id = (select auth.uid()));

-- ============================================
-- APP_PROFILES - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own app profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Users can update their own app profiles" ON public.app_profiles;
DROP POLICY IF EXISTS "Users can insert their own app profiles" ON public.app_profiles;

CREATE POLICY "Users can view their own app profiles"
  ON public.app_profiles FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own app profiles"
  ON public.app_profiles FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own app profiles"
  ON public.app_profiles FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- USER_ACHIEVEMENTS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own achievement progress" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can update their own achievement progress" ON public.user_achievements;
DROP POLICY IF EXISTS "Users can insert their own achievement progress" ON public.user_achievements;

CREATE POLICY "Users can view their own achievement progress"
  ON public.user_achievements FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own achievement progress"
  ON public.user_achievements FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own achievement progress"
  ON public.user_achievements FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- GAMIFY_FITNESS_DATA - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own fitness data" ON public.gamify_fitness_data;
DROP POLICY IF EXISTS "Users can insert their own fitness data" ON public.gamify_fitness_data;
DROP POLICY IF EXISTS "Users can update their own fitness data" ON public.gamify_fitness_data;
DROP POLICY IF EXISTS "Users can delete their own fitness data" ON public.gamify_fitness_data;

CREATE POLICY "Users can view their own fitness data"
  ON public.gamify_fitness_data FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own fitness data"
  ON public.gamify_fitness_data FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own fitness data"
  ON public.gamify_fitness_data FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own fitness data"
  ON public.gamify_fitness_data FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- TRAVEL_CITIES - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own cities" ON public.travel_cities;
DROP POLICY IF EXISTS "Users can insert their own cities" ON public.travel_cities;
DROP POLICY IF EXISTS "Users can update their own cities" ON public.travel_cities;
DROP POLICY IF EXISTS "Users can delete their own cities" ON public.travel_cities;

CREATE POLICY "Users can view their own cities"
  ON public.travel_cities FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own cities"
  ON public.travel_cities FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own cities"
  ON public.travel_cities FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own cities"
  ON public.travel_cities FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- TRAVEL_NEIGHBORHOODS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own neighborhoods" ON public.travel_neighborhoods;
DROP POLICY IF EXISTS "Users can insert their own neighborhoods" ON public.travel_neighborhoods;
DROP POLICY IF EXISTS "Users can update their own neighborhoods" ON public.travel_neighborhoods;
DROP POLICY IF EXISTS "Users can delete their own neighborhoods" ON public.travel_neighborhoods;

CREATE POLICY "Users can view their own neighborhoods"
  ON public.travel_neighborhoods FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own neighborhoods"
  ON public.travel_neighborhoods FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own neighborhoods"
  ON public.travel_neighborhoods FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own neighborhoods"
  ON public.travel_neighborhoods FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- TRAVEL_LOCATIONS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own locations or public locations" ON public.travel_locations;
DROP POLICY IF EXISTS "Users can insert their own locations" ON public.travel_locations;
DROP POLICY IF EXISTS "Users can update their own locations" ON public.travel_locations;
DROP POLICY IF EXISTS "Users can delete their own locations" ON public.travel_locations;

CREATE POLICY "Users can view their own locations or public locations"
  ON public.travel_locations FOR SELECT
  USING ((select auth.uid()) = user_id OR user_id IS NULL);

CREATE POLICY "Users can insert their own locations"
  ON public.travel_locations FOR INSERT
  WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own locations"
  ON public.travel_locations FOR UPDATE
  USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own locations"
  ON public.travel_locations FOR DELETE
  USING ((select auth.uid()) = user_id);

-- ============================================
-- TRAVEL_VISITS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own visits" ON public.travel_visits;
DROP POLICY IF EXISTS "Users can insert their own visits" ON public.travel_visits;
DROP POLICY IF EXISTS "Users can update their own visits" ON public.travel_visits;
DROP POLICY IF EXISTS "Users can delete their own visits" ON public.travel_visits;

CREATE POLICY "Users can view their own visits"
  ON public.travel_visits FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own visits"
  ON public.travel_visits FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own visits"
  ON public.travel_visits FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own visits"
  ON public.travel_visits FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- TRAVEL_PHOTOS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own photos" ON public.travel_photos;
DROP POLICY IF EXISTS "Users can insert their own photos" ON public.travel_photos;
DROP POLICY IF EXISTS "Users can update their own photos" ON public.travel_photos;
DROP POLICY IF EXISTS "Users can delete their own photos" ON public.travel_photos;

CREATE POLICY "Users can view their own photos"
  ON public.travel_photos FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own photos"
  ON public.travel_photos FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own photos"
  ON public.travel_photos FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own photos"
  ON public.travel_photos FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- TRAVEL_REVIEWS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view approved reviews or their own" ON public.travel_reviews;
DROP POLICY IF EXISTS "Users can insert their own reviews" ON public.travel_reviews;
DROP POLICY IF EXISTS "Users can update their own reviews" ON public.travel_reviews;
DROP POLICY IF EXISTS "Users can delete their own reviews" ON public.travel_reviews;

CREATE POLICY "Users can view approved reviews or their own"
  ON public.travel_reviews FOR SELECT
  USING (status = 'APPROVED' OR (select auth.uid()) = author_id);

CREATE POLICY "Users can insert their own reviews"
  ON public.travel_reviews FOR INSERT
  WITH CHECK ((select auth.uid()) = author_id);

CREATE POLICY "Users can update their own reviews"
  ON public.travel_reviews FOR UPDATE
  USING ((select auth.uid()) = author_id);

CREATE POLICY "Users can delete their own reviews"
  ON public.travel_reviews FOR DELETE
  USING ((select auth.uid()) = author_id);

-- ============================================
-- TRAVEL_QUESTS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own quests" ON public.travel_quests;
DROP POLICY IF EXISTS "Users can insert their own quests" ON public.travel_quests;
DROP POLICY IF EXISTS "Users can update their own quests" ON public.travel_quests;
DROP POLICY IF EXISTS "Users can delete their own quests" ON public.travel_quests;

CREATE POLICY "Users can view their own quests"
  ON public.travel_quests FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own quests"
  ON public.travel_quests FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own quests"
  ON public.travel_quests FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own quests"
  ON public.travel_quests FOR DELETE
  USING (user_id = (select auth.uid()));

-- ============================================
-- TRAVEL_QUEST_ITEMS - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own quest items" ON public.travel_quest_items;
DROP POLICY IF EXISTS "Users can insert items to their own quests" ON public.travel_quest_items;
DROP POLICY IF EXISTS "Users can update items in their own quests" ON public.travel_quest_items;
DROP POLICY IF EXISTS "Users can delete items from their own quests" ON public.travel_quest_items;

CREATE POLICY "Users can view their own quest items"
  ON public.travel_quest_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = (select auth.uid())
  ));

CREATE POLICY "Users can insert items to their own quests"
  ON public.travel_quest_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = (select auth.uid())
  ));

CREATE POLICY "Users can update items in their own quests"
  ON public.travel_quest_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = (select auth.uid())
  ));

CREATE POLICY "Users can delete items from their own quests"
  ON public.travel_quest_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM public.travel_quests
    WHERE id = travel_quest_items.quest_id
    AND user_id = (select auth.uid())
  ));

-- ============================================
-- TRAVEL_USER_LOCATION_DATA - Optimize auth.uid() calls
-- ============================================

DROP POLICY IF EXISTS "Users can view their own location data" ON public.travel_user_location_data;
DROP POLICY IF EXISTS "Users can insert their own location data" ON public.travel_user_location_data;
DROP POLICY IF EXISTS "Users can update their own location data" ON public.travel_user_location_data;
DROP POLICY IF EXISTS "Users can delete their own location data" ON public.travel_user_location_data;

CREATE POLICY "Users can view their own location data"
  ON public.travel_user_location_data FOR SELECT
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own location data"
  ON public.travel_user_location_data FOR INSERT
  WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own location data"
  ON public.travel_user_location_data FOR UPDATE
  USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own location data"
  ON public.travel_user_location_data FOR DELETE
  USING (user_id = (select auth.uid()));
