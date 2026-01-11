-- Fix RLS Performance: Wrap auth.uid() in (select auth.uid())
-- This prevents re-evaluation for each row
-- Run this in Supabase SQL Editor

-- ============================================
-- FRIENDSHIPS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own friendships" ON public.friendships;
DROP POLICY IF EXISTS "Users can send friend requests" ON public.friendships;
DROP POLICY IF EXISTS "Users can update friendships they're part of" ON public.friendships;
DROP POLICY IF EXISTS "Users can delete friendships they're part of" ON public.friendships;

CREATE POLICY "Users can view their own friendships" ON public.friendships
  FOR SELECT USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));

CREATE POLICY "Users can send friend requests" ON public.friendships
  FOR INSERT WITH CHECK (requester_id = (select auth.uid()));

CREATE POLICY "Users can update friendships they're part of" ON public.friendships
  FOR UPDATE USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));

CREATE POLICY "Users can delete friendships they're part of" ON public.friendships
  FOR DELETE USING (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()));

-- ============================================
-- ACTIVITY_FEED
-- ============================================
DROP POLICY IF EXISTS "Users can view own and friends' activity" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can update their own activity" ON public.activity_feed;
DROP POLICY IF EXISTS "Users can delete their own activity" ON public.activity_feed;

CREATE POLICY "Users can view own and friends' activity" ON public.activity_feed
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR user_id IN (
      SELECT CASE WHEN requester_id = (select auth.uid()) THEN addressee_id ELSE requester_id END
      FROM public.friendships
      WHERE (requester_id = (select auth.uid()) OR addressee_id = (select auth.uid()))
      AND status = 'ACCEPTED'
    )
  );

CREATE POLICY "Users can insert their own activity" ON public.activity_feed
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own activity" ON public.activity_feed
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own activity" ON public.activity_feed
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- USER_SUBSCRIPTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can manage their subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can view their own subscriptions" ON public.user_subscriptions;
DROP POLICY IF EXISTS "Users can update their subscriptions" ON public.user_subscriptions;

CREATE POLICY "Users can view their own subscriptions" ON public.user_subscriptions
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can manage their subscriptions" ON public.user_subscriptions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their subscriptions" ON public.user_subscriptions
  FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- ACTIVITY_KUDOS
-- ============================================
DROP POLICY IF EXISTS "Users can view kudos on visible activities" ON public.activity_kudos;
DROP POLICY IF EXISTS "Users can give kudos" ON public.activity_kudos;
DROP POLICY IF EXISTS "Users can remove their own kudos" ON public.activity_kudos;

CREATE POLICY "Users can view kudos on visible activities" ON public.activity_kudos
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed af
      WHERE af.id = activity_id
      AND (af.user_id = (select auth.uid()) OR af.actor_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can give kudos" ON public.activity_kudos
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can remove their own kudos" ON public.activity_kudos
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- ACTIVITY_COMMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can view comments on visible activities" ON public.activity_comments;
DROP POLICY IF EXISTS "Users can add comments" ON public.activity_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON public.activity_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.activity_comments;

CREATE POLICY "Users can view comments on visible activities" ON public.activity_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed af
      WHERE af.id = activity_id
      AND (af.user_id = (select auth.uid()) OR af.actor_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can add comments" ON public.activity_comments
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own comments" ON public.activity_comments
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own comments" ON public.activity_comments
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- COACH_PROFILES
-- ============================================
DROP POLICY IF EXISTS "Users can create their own coach profile" ON public.coach_profiles;
DROP POLICY IF EXISTS "Users can update their own coach profile" ON public.coach_profiles;
DROP POLICY IF EXISTS "Users can delete their own coach profile" ON public.coach_profiles;

CREATE POLICY "Users can create their own coach profile" ON public.coach_profiles
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their own coach profile" ON public.coach_profiles
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their own coach profile" ON public.coach_profiles
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- COACHING_RELATIONSHIPS
-- ============================================
DROP POLICY IF EXISTS "Users can view relationships they're part of" ON public.coaching_relationships;
DROP POLICY IF EXISTS "Coaches can create relationships" ON public.coaching_relationships;
DROP POLICY IF EXISTS "Participants can update relationship" ON public.coaching_relationships;
DROP POLICY IF EXISTS "Participants can end relationship" ON public.coaching_relationships;

CREATE POLICY "Users can view relationships they're part of" ON public.coaching_relationships
  FOR SELECT USING (
    athlete_id = (select auth.uid())
    OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

CREATE POLICY "Coaches can create relationships" ON public.coaching_relationships
  FOR INSERT WITH CHECK ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Participants can update relationship" ON public.coaching_relationships
  FOR UPDATE USING (
    athlete_id = (select auth.uid())
    OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

CREATE POLICY "Participants can end relationship" ON public.coaching_relationships
  FOR DELETE USING (
    athlete_id = (select auth.uid())
    OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

-- ============================================
-- COACHING_PROGRAMS
-- ============================================
DROP POLICY IF EXISTS "Coaches can create programs" ON public.coaching_programs;
DROP POLICY IF EXISTS "Coaches can update their programs" ON public.coaching_programs;
DROP POLICY IF EXISTS "Coaches can delete their programs" ON public.coaching_programs;

CREATE POLICY "Coaches can create programs" ON public.coaching_programs
  FOR INSERT WITH CHECK ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can update their programs" ON public.coaching_programs
  FOR UPDATE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can delete their programs" ON public.coaching_programs
  FOR DELETE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

-- ============================================
-- COACHING_PROGRAM_WEEKS
-- ============================================
DROP POLICY IF EXISTS "Users can view program weeks" ON public.coaching_program_weeks;
DROP POLICY IF EXISTS "Coaches can manage weeks" ON public.coaching_program_weeks;
DROP POLICY IF EXISTS "Coaches can update weeks" ON public.coaching_program_weeks;
DROP POLICY IF EXISTS "Coaches can delete weeks" ON public.coaching_program_weeks;

CREATE POLICY "Users can view program weeks" ON public.coaching_program_weeks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments a
          JOIN public.coaching_relationships r ON a.relationship_id = r.id
          WHERE a.program_id = p.id AND r.athlete_id = (select auth.uid())
        ))
    )
  );

CREATE POLICY "Coaches can manage weeks" ON public.coaching_program_weeks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can update weeks" ON public.coaching_program_weeks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can delete weeks" ON public.coaching_program_weeks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

-- ============================================
-- COACHING_WORKOUTS
-- ============================================
DROP POLICY IF EXISTS "Users can view coaching workouts" ON public.coaching_workouts;
DROP POLICY IF EXISTS "Coaches can manage workouts" ON public.coaching_workouts;
DROP POLICY IF EXISTS "Coaches can update workouts" ON public.coaching_workouts;
DROP POLICY IF EXISTS "Coaches can delete workouts" ON public.coaching_workouts;

CREATE POLICY "Users can view coaching workouts" ON public.coaching_workouts
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks w
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE w.id = week_id
      AND ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments a
          JOIN public.coaching_relationships r ON a.relationship_id = r.id
          WHERE a.program_id = p.id AND r.athlete_id = (select auth.uid())
        ))
    )
  );

CREATE POLICY "Coaches can manage workouts" ON public.coaching_workouts
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks w
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE w.id = week_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can update workouts" ON public.coaching_workouts
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks w
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE w.id = week_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can delete workouts" ON public.coaching_workouts
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks w
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE w.id = week_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

-- ============================================
-- COACHING_WORKOUT_EXERCISES
-- ============================================
DROP POLICY IF EXISTS "Users can view coaching workout exercises" ON public.coaching_workout_exercises;
DROP POLICY IF EXISTS "Coaches can manage exercises" ON public.coaching_workout_exercises;
DROP POLICY IF EXISTS "Coaches can update exercises" ON public.coaching_workout_exercises;
DROP POLICY IF EXISTS "Coaches can delete exercises" ON public.coaching_workout_exercises;

CREATE POLICY "Users can view coaching workout exercises" ON public.coaching_workout_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks w ON cw.week_id = w.id
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE cw.id = workout_id
      AND ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments a
          JOIN public.coaching_relationships r ON a.relationship_id = r.id
          WHERE a.program_id = p.id AND r.athlete_id = (select auth.uid())
        ))
    )
  );

CREATE POLICY "Coaches can manage exercises" ON public.coaching_workout_exercises
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks w ON cw.week_id = w.id
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE cw.id = workout_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can update exercises" ON public.coaching_workout_exercises
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks w ON cw.week_id = w.id
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE cw.id = workout_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can delete exercises" ON public.coaching_workout_exercises
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks w ON cw.week_id = w.id
      JOIN public.coaching_programs p ON w.program_id = p.id
      WHERE cw.id = workout_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

-- ============================================
-- DAILY_LOGIN_CLAIMS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own login claims" ON public.daily_login_claims;
DROP POLICY IF EXISTS "Users can insert their own login claims" ON public.daily_login_claims;

CREATE POLICY "Users can view their own login claims" ON public.daily_login_claims
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert their own login claims" ON public.daily_login_claims
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- USER_INVENTORY
-- ============================================
DROP POLICY IF EXISTS "Users can view their own inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can add to their inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can update their inventory" ON public.user_inventory;
DROP POLICY IF EXISTS "Users can delete from their inventory" ON public.user_inventory;

CREATE POLICY "Users can view their own inventory" ON public.user_inventory
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can add to their inventory" ON public.user_inventory
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their inventory" ON public.user_inventory
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete from their inventory" ON public.user_inventory
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- PUSH_SUBSCRIPTIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view their push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can add push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can update their push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Users can delete their push subscriptions" ON public.push_subscriptions;

CREATE POLICY "Users can view their push subscriptions" ON public.push_subscriptions
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can add push subscriptions" ON public.push_subscriptions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their push subscriptions" ON public.push_subscriptions
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their push subscriptions" ON public.push_subscriptions
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- NOTIFICATION_PREFERENCES
-- ============================================
DROP POLICY IF EXISTS "Users can view their notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can set their notification preferences" ON public.notification_preferences;
DROP POLICY IF EXISTS "Users can update their notification preferences" ON public.notification_preferences;

CREATE POLICY "Users can view their notification preferences" ON public.notification_preferences
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can set their notification preferences" ON public.notification_preferences
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their notification preferences" ON public.notification_preferences
  FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- NOTIFICATION_LOG
-- ============================================
DROP POLICY IF EXISTS "Users can view their notifications" ON public.notification_log;
DROP POLICY IF EXISTS "System can insert notifications" ON public.notification_log;
DROP POLICY IF EXISTS "Users can update their notifications (mark read)" ON public.notification_log;

CREATE POLICY "Users can view their notifications" ON public.notification_log
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert notifications" ON public.notification_log
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can update their notifications (mark read)" ON public.notification_log
  FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- AI_QUEST_USAGE
-- ============================================
DROP POLICY IF EXISTS "Users can view their AI usage" ON public.ai_quest_usage;
DROP POLICY IF EXISTS "Users can insert AI usage" ON public.ai_quest_usage;

CREATE POLICY "Users can view their AI usage" ON public.ai_quest_usage
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can insert AI usage" ON public.ai_quest_usage
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- CHALLENGES
-- ============================================
DROP POLICY IF EXISTS "System/admins can create challenges" ON public.challenges;
DROP POLICY IF EXISTS "Creators can update challenges" ON public.challenges;

CREATE POLICY "System/admins can create challenges" ON public.challenges
  FOR INSERT WITH CHECK (creator_id = (select auth.uid()));

CREATE POLICY "Creators can update challenges" ON public.challenges
  FOR UPDATE USING (creator_id = (select auth.uid()));

-- ============================================
-- CHALLENGE_PARTICIPANTS
-- ============================================
DROP POLICY IF EXISTS "Users can join challenges" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.challenge_participants;
DROP POLICY IF EXISTS "Users can leave challenges" ON public.challenge_participants;

CREATE POLICY "Users can join challenges" ON public.challenge_participants
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their participation" ON public.challenge_participants
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can leave challenges" ON public.challenge_participants
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- LEAGUE_MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Users can join leagues" ON public.league_members;
DROP POLICY IF EXISTS "Users can update their membership" ON public.league_members;
DROP POLICY IF EXISTS "Users can leave leagues" ON public.league_members;

CREATE POLICY "Users can join leagues" ON public.league_members
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their membership" ON public.league_members
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can leave leagues" ON public.league_members
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- LEAGUE_HISTORY
-- ============================================
DROP POLICY IF EXISTS "Users can view their league history" ON public.league_history;
DROP POLICY IF EXISTS "System can insert league history" ON public.league_history;

CREATE POLICY "Users can view their league history" ON public.league_history
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "System can insert league history" ON public.league_history
  FOR INSERT WITH CHECK (true);

-- ============================================
-- LEAGUE_STATS
-- ============================================
DROP POLICY IF EXISTS "Users can view their league stats" ON public.league_stats;
DROP POLICY IF EXISTS "System can manage league stats" ON public.league_stats;
DROP POLICY IF EXISTS "System can update league stats" ON public.league_stats;

CREATE POLICY "Users can view their league stats" ON public.league_stats
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "System can manage league stats" ON public.league_stats
  FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update league stats" ON public.league_stats
  FOR UPDATE USING (true);

-- ============================================
-- LIFE_QUESTS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own life quests" ON public.life_quests;
DROP POLICY IF EXISTS "Users can create life quests" ON public.life_quests;
DROP POLICY IF EXISTS "Users can update their life quests" ON public.life_quests;
DROP POLICY IF EXISTS "Users can delete their life quests" ON public.life_quests;

CREATE POLICY "Users can view their own life quests" ON public.life_quests
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can create life quests" ON public.life_quests
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their life quests" ON public.life_quests
  FOR UPDATE USING (user_id = (select auth.uid()));

CREATE POLICY "Users can delete their life quests" ON public.life_quests
  FOR DELETE USING (user_id = (select auth.uid()));

-- ============================================
-- LIFE_QUEST_MILESTONES
-- ============================================
DROP POLICY IF EXISTS "Users can view milestones of their quests" ON public.life_quest_milestones;
DROP POLICY IF EXISTS "Users can add milestones to their quests" ON public.life_quest_milestones;
DROP POLICY IF EXISTS "Users can update their milestones" ON public.life_quest_milestones;
DROP POLICY IF EXISTS "Users can delete their milestones" ON public.life_quest_milestones;

CREATE POLICY "Users can view milestones of their quests" ON public.life_quest_milestones
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can add milestones to their quests" ON public.life_quest_milestones
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can update their milestones" ON public.life_quest_milestones
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can delete their milestones" ON public.life_quest_milestones
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

-- ============================================
-- LIFE_QUEST_TASKS
-- ============================================
DROP POLICY IF EXISTS "Users can view tasks of their quests" ON public.life_quest_tasks;
DROP POLICY IF EXISTS "Users can add tasks to their quests" ON public.life_quest_tasks;
DROP POLICY IF EXISTS "Users can update their tasks" ON public.life_quest_tasks;
DROP POLICY IF EXISTS "Users can delete their tasks" ON public.life_quest_tasks;

CREATE POLICY "Users can view tasks of their quests" ON public.life_quest_tasks
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can add tasks to their quests" ON public.life_quest_tasks
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can update their tasks" ON public.life_quest_tasks
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can delete their tasks" ON public.life_quest_tasks
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

-- ============================================
-- LIFE_QUEST_LOGS
-- ============================================
DROP POLICY IF EXISTS "Users can view logs of their quests" ON public.life_quest_logs;
DROP POLICY IF EXISTS "Users can add logs to their quests" ON public.life_quest_logs;
DROP POLICY IF EXISTS "Users can update their logs" ON public.life_quest_logs;

CREATE POLICY "Users can view logs of their quests" ON public.life_quest_logs
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can add logs to their quests" ON public.life_quest_logs
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Users can update their logs" ON public.life_quest_logs
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

-- ============================================
-- QUEST_PARTIES
-- ============================================
DROP POLICY IF EXISTS "Users can view parties for their quests or as members" ON public.quest_parties;
DROP POLICY IF EXISTS "Quest owners can create parties" ON public.quest_parties;
DROP POLICY IF EXISTS "Quest owners can update parties" ON public.quest_parties;
DROP POLICY IF EXISTS "Quest owners can delete parties" ON public.quest_parties;

CREATE POLICY "Users can view parties for their quests or as members" ON public.quest_parties
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
    OR EXISTS (SELECT 1 FROM public.quest_party_members m WHERE m.party_id = id AND m.user_id = (select auth.uid()))
  );

CREATE POLICY "Quest owners can create parties" ON public.quest_parties
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Quest owners can update parties" ON public.quest_parties
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

CREATE POLICY "Quest owners can delete parties" ON public.quest_parties
  FOR DELETE USING (
    EXISTS (SELECT 1 FROM public.life_quests q WHERE q.id = quest_id AND q.user_id = (select auth.uid()))
  );

-- ============================================
-- QUEST_PARTY_MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Users can view members of parties they belong to" ON public.quest_party_members;
DROP POLICY IF EXISTS "Quest owners can add party members" ON public.quest_party_members;
DROP POLICY IF EXISTS "Quest owners or self can remove members" ON public.quest_party_members;

CREATE POLICY "Users can view members of parties they belong to" ON public.quest_party_members
  FOR SELECT USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quest_parties p
      JOIN public.life_quests q ON p.quest_id = q.id
      WHERE p.id = party_id AND q.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Quest owners can add party members" ON public.quest_party_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quest_parties p
      JOIN public.life_quests q ON p.quest_id = q.id
      WHERE p.id = party_id AND q.user_id = (select auth.uid())
    )
  );

CREATE POLICY "Quest owners or self can remove members" ON public.quest_party_members
  FOR DELETE USING (
    user_id = (select auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.quest_parties p
      JOIN public.life_quests q ON p.quest_id = q.id
      WHERE p.id = party_id AND q.user_id = (select auth.uid())
    )
  );

-- ============================================
-- USER_SEASON_PROGRESS
-- ============================================
DROP POLICY IF EXISTS "Users can view their season progress" ON public.user_season_progress;
DROP POLICY IF EXISTS "Users can track their season progress" ON public.user_season_progress;
DROP POLICY IF EXISTS "Users can update their season progress" ON public.user_season_progress;

CREATE POLICY "Users can view their season progress" ON public.user_season_progress
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can track their season progress" ON public.user_season_progress
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

CREATE POLICY "Users can update their season progress" ON public.user_season_progress
  FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- SEASON_CHALLENGE_COMPLETIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view their challenge completions" ON public.season_challenge_completions;
DROP POLICY IF EXISTS "Users can record challenge completions" ON public.season_challenge_completions;

CREATE POLICY "Users can view their challenge completions" ON public.season_challenge_completions
  FOR SELECT USING (user_id = (select auth.uid()));

CREATE POLICY "Users can record challenge completions" ON public.season_challenge_completions
  FOR INSERT WITH CHECK (user_id = (select auth.uid()));

-- ============================================
-- USER_ROLES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;

CREATE POLICY "Users can view their own roles" ON public.user_roles
  FOR SELECT USING (user_id = (select auth.uid()));

-- ============================================
-- COACHING_PROGRAM_ASSIGNMENTS
-- ============================================
DROP POLICY IF EXISTS "Users can view their program assignments" ON public.coaching_program_assignments;
DROP POLICY IF EXISTS "Coaches can create assignments" ON public.coaching_program_assignments;
DROP POLICY IF EXISTS "Coaches can update program assignments" ON public.coaching_program_assignments;
DROP POLICY IF EXISTS "Coaches can delete program assignments" ON public.coaching_program_assignments;

CREATE POLICY "Users can view their program assignments" ON public.coaching_program_assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships r
      WHERE r.id = relationship_id AND r.athlete_id = (select auth.uid())
    )
    OR EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can create assignments" ON public.coaching_program_assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can update program assignments" ON public.coaching_program_assignments
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can delete program assignments" ON public.coaching_program_assignments
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

-- ============================================
-- COACHING_WORKOUT_COMPLETIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view their workout completions" ON public.coaching_workout_completions;
DROP POLICY IF EXISTS "Athletes can log workout completions" ON public.coaching_workout_completions;
DROP POLICY IF EXISTS "Athletes can update their workout completions" ON public.coaching_workout_completions;
DROP POLICY IF EXISTS "Athletes can delete their workout completions" ON public.coaching_workout_completions;

CREATE POLICY "Users can view their workout completions" ON public.coaching_workout_completions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments a
      JOIN public.coaching_relationships r ON a.relationship_id = r.id
      WHERE a.id = assignment_id
      AND (r.athlete_id = (select auth.uid()) OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = r.coach_id))
    )
  );

CREATE POLICY "Athletes can log workout completions" ON public.coaching_workout_completions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments a
      JOIN public.coaching_relationships r ON a.relationship_id = r.id
      WHERE a.id = assignment_id AND r.athlete_id = (select auth.uid())
    )
  );

CREATE POLICY "Athletes can update their workout completions" ON public.coaching_workout_completions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments a
      JOIN public.coaching_relationships r ON a.relationship_id = r.id
      WHERE a.id = assignment_id AND r.athlete_id = (select auth.uid())
    )
  );

CREATE POLICY "Athletes can delete their workout completions" ON public.coaching_workout_completions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments a
      JOIN public.coaching_relationships r ON a.relationship_id = r.id
      WHERE a.id = assignment_id AND r.athlete_id = (select auth.uid())
    )
  );

-- ============================================
-- ACCOUNTABILITY_PARTNERSHIPS
-- ============================================
DROP POLICY IF EXISTS "Users can view their accountability partnerships" ON public.accountability_partnerships;
DROP POLICY IF EXISTS "Users can create accountability partnerships" ON public.accountability_partnerships;
DROP POLICY IF EXISTS "Partners can update their partnership" ON public.accountability_partnerships;
DROP POLICY IF EXISTS "Partners can delete their partnership" ON public.accountability_partnerships;

CREATE POLICY "Users can view their accountability partnerships" ON public.accountability_partnerships
  FOR SELECT USING (user1_id = (select auth.uid()) OR user2_id = (select auth.uid()));

CREATE POLICY "Users can create accountability partnerships" ON public.accountability_partnerships
  FOR INSERT WITH CHECK (user1_id = (select auth.uid()) OR user2_id = (select auth.uid()));

CREATE POLICY "Partners can update their partnership" ON public.accountability_partnerships
  FOR UPDATE USING (user1_id = (select auth.uid()) OR user2_id = (select auth.uid()));

CREATE POLICY "Partners can delete their partnership" ON public.accountability_partnerships
  FOR DELETE USING (user1_id = (select auth.uid()) OR user2_id = (select auth.uid()));

-- ============================================
-- PARTNERSHIP_GOALS
-- ============================================
DROP POLICY IF EXISTS "Users can view their partnership goals" ON public.partnership_goals;
DROP POLICY IF EXISTS "Partners can add partnership goals" ON public.partnership_goals;
DROP POLICY IF EXISTS "Partners can update partnership goals" ON public.partnership_goals;
DROP POLICY IF EXISTS "Partners can delete partnership goals" ON public.partnership_goals;

CREATE POLICY "Users can view their partnership goals" ON public.partnership_goals
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Partners can add partnership goals" ON public.partnership_goals
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Partners can update partnership goals" ON public.partnership_goals
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Partners can delete partnership goals" ON public.partnership_goals
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

-- ============================================
-- PARTNERSHIP_CHECKINS
-- ============================================
DROP POLICY IF EXISTS "Users can view their partnership checkins" ON public.partnership_checkins;
DROP POLICY IF EXISTS "Partners can add partnership checkins" ON public.partnership_checkins;
DROP POLICY IF EXISTS "Users can update their partnership checkins" ON public.partnership_checkins;

CREATE POLICY "Users can view their partnership checkins" ON public.partnership_checkins
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Partners can add partnership checkins" ON public.partnership_checkins
  FOR INSERT WITH CHECK (
    user_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Users can update their partnership checkins" ON public.partnership_checkins
  FOR UPDATE USING (user_id = (select auth.uid()));

-- ============================================
-- PARTNERSHIP_NUDGES
-- ============================================
DROP POLICY IF EXISTS "Users can view their partnership nudges" ON public.partnership_nudges;
DROP POLICY IF EXISTS "Partners can send partnership nudges" ON public.partnership_nudges;
DROP POLICY IF EXISTS "Senders can update their partnership nudges" ON public.partnership_nudges;

CREATE POLICY "Users can view their partnership nudges" ON public.partnership_nudges
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Partners can send partnership nudges" ON public.partnership_nudges
  FOR INSERT WITH CHECK (
    sender_id = (select auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.accountability_partnerships p
      WHERE p.id = partnership_id AND (p.user1_id = (select auth.uid()) OR p.user2_id = (select auth.uid()))
    )
  );

CREATE POLICY "Senders can update their partnership nudges" ON public.partnership_nudges
  FOR UPDATE USING (sender_id = (select auth.uid()));
