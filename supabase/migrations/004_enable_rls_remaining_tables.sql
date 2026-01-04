-- Enable Row Level Security on remaining tables
-- Fixes Supabase security warnings for 47 tables missing RLS
-- Generated: January 2026

-- ============================================
-- FRIENDSHIPS (bidirectional relationship)
-- ============================================

ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friendships"
  ON public.friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can send friend requests"
  ON public.friendships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update friendships they're part of"
  ON public.friendships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can delete friendships they're part of"
  ON public.friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- ============================================
-- ACTIVITY FEED & SOCIAL
-- ============================================

ALTER TABLE public.activity_feed ENABLE ROW LEVEL SECURITY;

-- Activity visible to user and their friends
CREATE POLICY "Users can view own and friends' activity"
  ON public.activity_feed FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.friendships
      WHERE status = 'ACCEPTED'
      AND ((requester_id = auth.uid() AND addressee_id = activity_feed.user_id)
        OR (addressee_id = auth.uid() AND requester_id = activity_feed.user_id))
    )
  );

CREATE POLICY "Users can insert their own activity"
  ON public.activity_feed FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own activity"
  ON public.activity_feed FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own activity"
  ON public.activity_feed FOR DELETE
  USING (auth.uid() = user_id);

-- Activity kudos
ALTER TABLE public.activity_kudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view kudos on visible activities"
  ON public.activity_kudos FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed af
      WHERE af.id = activity_kudos.activity_id
      AND (af.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.friendships
          WHERE status = 'ACCEPTED'
          AND ((requester_id = auth.uid() AND addressee_id = af.user_id)
            OR (addressee_id = auth.uid() AND requester_id = af.user_id))
        ))
    )
  );

CREATE POLICY "Users can give kudos"
  ON public.activity_kudos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove their own kudos"
  ON public.activity_kudos FOR DELETE
  USING (auth.uid() = user_id);

-- Activity comments
ALTER TABLE public.activity_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view comments on visible activities"
  ON public.activity_comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.activity_feed af
      WHERE af.id = activity_comments.activity_id
      AND (af.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.friendships
          WHERE status = 'ACCEPTED'
          AND ((requester_id = auth.uid() AND addressee_id = af.user_id)
            OR (addressee_id = auth.uid() AND requester_id = af.user_id))
        ))
    )
  );

CREATE POLICY "Users can add comments"
  ON public.activity_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own comments"
  ON public.activity_comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own comments"
  ON public.activity_comments FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- QUEST PARTIES (collaborative)
-- ============================================

ALTER TABLE public.quest_parties ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view parties they created or are members of"
  ON public.quest_parties FOR SELECT
  USING (
    auth.uid() = creator_id
    OR EXISTS (
      SELECT 1 FROM public.quest_party_members
      WHERE party_id = quest_parties.id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create parties"
  ON public.quest_parties FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update their parties"
  ON public.quest_parties FOR UPDATE
  USING (auth.uid() = creator_id);

CREATE POLICY "Creators can delete their parties"
  ON public.quest_parties FOR DELETE
  USING (auth.uid() = creator_id);

-- Quest party members
ALTER TABLE public.quest_party_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view members of parties they're in"
  ON public.quest_party_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quest_parties qp
      WHERE qp.id = quest_party_members.party_id
      AND (qp.creator_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quest_party_members qpm
          WHERE qpm.party_id = qp.id AND qpm.user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Party creators can add members"
  ON public.quest_party_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quest_parties
      WHERE id = quest_party_members.party_id AND creator_id = auth.uid()
    )
    OR auth.uid() = user_id -- Users can join themselves via invite
  );

CREATE POLICY "Party creators can remove members, users can leave"
  ON public.quest_party_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.quest_parties
      WHERE id = quest_party_members.party_id AND creator_id = auth.uid()
    )
  );

-- ============================================
-- COACHING SYSTEM
-- ============================================

ALTER TABLE public.coach_profiles ENABLE ROW LEVEL SECURITY;

-- Public profiles for discovery, editable only by owner
CREATE POLICY "Anyone can view coach profiles"
  ON public.coach_profiles FOR SELECT
  USING (true);

CREATE POLICY "Users can create their own coach profile"
  ON public.coach_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own coach profile"
  ON public.coach_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own coach profile"
  ON public.coach_profiles FOR DELETE
  USING (auth.uid() = user_id);

-- Coaching relationships
ALTER TABLE public.coaching_relationships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view relationships they're part of"
  ON public.coaching_relationships FOR SELECT
  USING (auth.uid() = coach_id OR auth.uid() = athlete_id);

CREATE POLICY "Coaches can create relationships"
  ON public.coaching_relationships FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Participants can update relationship"
  ON public.coaching_relationships FOR UPDATE
  USING (auth.uid() = coach_id OR auth.uid() = athlete_id);

CREATE POLICY "Participants can end relationship"
  ON public.coaching_relationships FOR DELETE
  USING (auth.uid() = coach_id OR auth.uid() = athlete_id);

-- Coaching programs
ALTER TABLE public.coaching_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view programs they coach or are assigned"
  ON public.coaching_programs FOR SELECT
  USING (
    auth.uid() = coach_id
    OR EXISTS (
      SELECT 1 FROM public.coaching_program_assignments
      WHERE program_id = coaching_programs.id AND athlete_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can create programs"
  ON public.coaching_programs FOR INSERT
  WITH CHECK (auth.uid() = coach_id);

CREATE POLICY "Coaches can update their programs"
  ON public.coaching_programs FOR UPDATE
  USING (auth.uid() = coach_id);

CREATE POLICY "Coaches can delete their programs"
  ON public.coaching_programs FOR DELETE
  USING (auth.uid() = coach_id);

-- Coaching program assignments
ALTER TABLE public.coaching_program_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their assignments"
  ON public.coaching_program_assignments FOR SELECT
  USING (
    auth.uid() = athlete_id
    OR EXISTS (
      SELECT 1 FROM public.coaching_programs
      WHERE id = coaching_program_assignments.program_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can assign programs"
  ON public.coaching_program_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_programs
      WHERE id = coaching_program_assignments.program_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update assignments"
  ON public.coaching_program_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs
      WHERE id = coaching_program_assignments.program_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete assignments"
  ON public.coaching_program_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs
      WHERE id = coaching_program_assignments.program_id AND coach_id = auth.uid()
    )
  );

-- Coaching program weeks
ALTER TABLE public.coaching_program_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view weeks of accessible programs"
  ON public.coaching_program_weeks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs cp
      WHERE cp.id = coaching_program_weeks.program_id
      AND (cp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments
          WHERE program_id = cp.id AND athlete_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Coaches can manage weeks"
  ON public.coaching_program_weeks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_programs
      WHERE id = coaching_program_weeks.program_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update weeks"
  ON public.coaching_program_weeks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs
      WHERE id = coaching_program_weeks.program_id AND coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete weeks"
  ON public.coaching_program_weeks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs
      WHERE id = coaching_program_weeks.program_id AND coach_id = auth.uid()
    )
  );

-- Coaching workouts
ALTER TABLE public.coaching_workouts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workouts of accessible weeks"
  ON public.coaching_workouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks cpw
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cpw.id = coaching_workouts.week_id
      AND (cp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments
          WHERE program_id = cp.id AND athlete_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Coaches can manage workouts"
  ON public.coaching_workouts FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks cpw
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cpw.id = coaching_workouts.week_id AND cp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update workouts"
  ON public.coaching_workouts FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks cpw
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cpw.id = coaching_workouts.week_id AND cp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete workouts"
  ON public.coaching_workouts FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks cpw
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cpw.id = coaching_workouts.week_id AND cp.coach_id = auth.uid()
    )
  );

-- Coaching workout exercises
ALTER TABLE public.coaching_workout_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view exercises of accessible workouts"
  ON public.coaching_workout_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks cpw ON cpw.id = cw.week_id
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cw.id = coaching_workout_exercises.workout_id
      AND (cp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments
          WHERE program_id = cp.id AND athlete_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Coaches can manage exercises"
  ON public.coaching_workout_exercises FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks cpw ON cpw.id = cw.week_id
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cw.id = coaching_workout_exercises.workout_id AND cp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update exercises"
  ON public.coaching_workout_exercises FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks cpw ON cpw.id = cw.week_id
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cw.id = coaching_workout_exercises.workout_id AND cp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete exercises"
  ON public.coaching_workout_exercises FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks cpw ON cpw.id = cw.week_id
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cw.id = coaching_workout_exercises.workout_id AND cp.coach_id = auth.uid()
    )
  );

-- Coaching workout completions
ALTER TABLE public.coaching_workout_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view completions they're involved in"
  ON public.coaching_workout_completions FOR SELECT
  USING (
    auth.uid() = athlete_id
    OR EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks cpw ON cpw.id = cw.week_id
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cw.id = coaching_workout_completions.workout_id AND cp.coach_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can log completions"
  ON public.coaching_workout_completions FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update their completions"
  ON public.coaching_workout_completions FOR UPDATE
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can delete their completions"
  ON public.coaching_workout_completions FOR DELETE
  USING (auth.uid() = athlete_id);

-- ============================================
-- USER-OWNED DATA
-- ============================================

ALTER TABLE public.daily_login_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own login claims"
  ON public.daily_login_claims FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own login claims"
  ON public.daily_login_claims FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- user_inventory
ALTER TABLE public.user_inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own inventory"
  ON public.user_inventory FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add to their inventory"
  ON public.user_inventory FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their inventory"
  ON public.user_inventory FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete from their inventory"
  ON public.user_inventory FOR DELETE
  USING (auth.uid() = user_id);

-- user_subscriptions
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON public.user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their subscriptions"
  ON public.user_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their subscriptions"
  ON public.user_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

-- push_subscriptions
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their push subscriptions"
  ON public.push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can add push subscriptions"
  ON public.push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their push subscriptions"
  ON public.push_subscriptions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their push subscriptions"
  ON public.push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);

-- notification_preferences
ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notification preferences"
  ON public.notification_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can set their notification preferences"
  ON public.notification_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notification preferences"
  ON public.notification_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- notification_log
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their notifications"
  ON public.notification_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
  ON public.notification_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their notifications (mark read)"
  ON public.notification_log FOR UPDATE
  USING (auth.uid() = user_id);

-- ai_quest_usage
ALTER TABLE public.ai_quest_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their AI usage"
  ON public.ai_quest_usage FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert AI usage"
  ON public.ai_quest_usage FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- ACCOUNTABILITY PARTNERSHIPS
-- ============================================

ALTER TABLE public.accountability_partnerships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view partnerships they're in"
  ON public.accountability_partnerships FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Users can create partnerships"
  ON public.accountability_partnerships FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Partners can update partnership"
  ON public.accountability_partnerships FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

CREATE POLICY "Partners can delete partnership"
  ON public.accountability_partnerships FOR DELETE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- partnership_goals
ALTER TABLE public.partnership_goals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view goals from their partnerships"
  ON public.partnership_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    )
  );

CREATE POLICY "Partners can add goals"
  ON public.partnership_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    )
  );

CREATE POLICY "Partners can update goals"
  ON public.partnership_goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    )
  );

CREATE POLICY "Partners can delete goals"
  ON public.partnership_goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    )
  );

-- partnership_checkins
ALTER TABLE public.partnership_checkins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view checkins from their partnerships"
  ON public.partnership_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_checkins.partnership_id
      AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    )
  );

CREATE POLICY "Partners can add checkins"
  ON public.partnership_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own checkins"
  ON public.partnership_checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- partnership_nudges
ALTER TABLE public.partnership_nudges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view nudges from their partnerships"
  ON public.partnership_nudges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_nudges.partnership_id
      AND (ap.user1_id = auth.uid() OR ap.user2_id = auth.uid())
    )
  );

CREATE POLICY "Partners can send nudges"
  ON public.partnership_nudges FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can update their nudges"
  ON public.partnership_nudges FOR UPDATE
  USING (auth.uid() = sender_id);

-- ============================================
-- CHALLENGES & LEAGUES
-- ============================================

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;

-- Challenges are public to view
CREATE POLICY "Anyone can view active challenges"
  ON public.challenges FOR SELECT
  USING (true);

CREATE POLICY "System/admins can create challenges"
  ON public.challenges FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update challenges"
  ON public.challenges FOR UPDATE
  USING (auth.uid() = creator_id);

-- challenge_participants
ALTER TABLE public.challenge_participants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view challenge participants"
  ON public.challenge_participants FOR SELECT
  USING (true);

CREATE POLICY "Users can join challenges"
  ON public.challenge_participants FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation"
  ON public.challenge_participants FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave challenges"
  ON public.challenge_participants FOR DELETE
  USING (auth.uid() = user_id);

-- leagues
ALTER TABLE public.leagues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view leagues"
  ON public.leagues FOR SELECT
  USING (true);

CREATE POLICY "Creators can create leagues"
  ON public.leagues FOR INSERT
  WITH CHECK (auth.uid() = creator_id);

CREATE POLICY "Creators can update leagues"
  ON public.leagues FOR UPDATE
  USING (auth.uid() = creator_id);

-- league_members
ALTER TABLE public.league_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view league members"
  ON public.league_members FOR SELECT
  USING (true);

CREATE POLICY "Users can join leagues"
  ON public.league_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their membership"
  ON public.league_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave leagues"
  ON public.league_members FOR DELETE
  USING (auth.uid() = user_id);

-- league_history
ALTER TABLE public.league_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their league history"
  ON public.league_history FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can insert league history"
  ON public.league_history FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- league_stats
ALTER TABLE public.league_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their league stats"
  ON public.league_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "System can manage league stats"
  ON public.league_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can update league stats"
  ON public.league_stats FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- LIFE QUESTS (user-owned)
-- ============================================

ALTER TABLE public.life_quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own life quests"
  ON public.life_quests FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create life quests"
  ON public.life_quests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their life quests"
  ON public.life_quests FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their life quests"
  ON public.life_quests FOR DELETE
  USING (auth.uid() = user_id);

-- life_quest_milestones
ALTER TABLE public.life_quest_milestones ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view milestones of their quests"
  ON public.life_quest_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_milestones.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add milestones to their quests"
  ON public.life_quest_milestones FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_milestones.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their milestones"
  ON public.life_quest_milestones FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_milestones.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their milestones"
  ON public.life_quest_milestones FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_milestones.quest_id AND user_id = auth.uid()
    )
  );

-- life_quest_tasks
ALTER TABLE public.life_quest_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view tasks of their quests"
  ON public.life_quest_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_tasks.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add tasks to their quests"
  ON public.life_quest_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_tasks.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their tasks"
  ON public.life_quest_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_tasks.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their tasks"
  ON public.life_quest_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_tasks.quest_id AND user_id = auth.uid()
    )
  );

-- life_quest_logs
ALTER TABLE public.life_quest_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view logs of their quests"
  ON public.life_quest_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_logs.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can add logs to their quests"
  ON public.life_quest_logs FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_logs.quest_id AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their logs"
  ON public.life_quest_logs FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.life_quests
      WHERE id = life_quest_logs.quest_id AND user_id = auth.uid()
    )
  );

-- ============================================
-- SEASONS (XP Battle Pass system)
-- ============================================

ALTER TABLE public.seasons ENABLE ROW LEVEL SECURITY;

-- Seasons are public reference data
CREATE POLICY "Anyone can view seasons"
  ON public.seasons FOR SELECT
  USING (true);

-- season_tiers
ALTER TABLE public.season_tiers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season tiers"
  ON public.season_tiers FOR SELECT
  USING (true);

-- season_challenges
ALTER TABLE public.season_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view season challenges"
  ON public.season_challenges FOR SELECT
  USING (true);

-- user_season_progress
ALTER TABLE public.user_season_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their season progress"
  ON public.user_season_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can track their season progress"
  ON public.user_season_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their season progress"
  ON public.user_season_progress FOR UPDATE
  USING (auth.uid() = user_id);

-- season_challenge_completions
ALTER TABLE public.season_challenge_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their challenge completions"
  ON public.season_challenge_completions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can record challenge completions"
  ON public.season_challenge_completions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- REFERENCE/LOOKUP TABLES (Read-only for authenticated)
-- ============================================

-- inventory_items (item definitions)
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view inventory items"
  ON public.inventory_items FOR SELECT
  USING (true);

-- app_features (feature flags)
ALTER TABLE public.app_features ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view app features"
  ON public.app_features FOR SELECT
  USING (true);

-- user_roles (admin management - very restricted)
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own roles"
  ON public.user_roles FOR SELECT
  USING (auth.uid() = user_id);

-- travel_states (geographic reference data)
ALTER TABLE public.travel_states ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view states"
  ON public.travel_states FOR SELECT
  USING (true);

-- travel_quest_cities (quest templates by city)
ALTER TABLE public.travel_quest_cities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest cities"
  ON public.travel_quest_cities FOR SELECT
  USING (true);

-- travel_quest_neighborhoods
ALTER TABLE public.travel_quest_neighborhoods ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view quest neighborhoods"
  ON public.travel_quest_neighborhoods FOR SELECT
  USING (true);

-- life_quest_templates
ALTER TABLE public.life_quest_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view life quest templates"
  ON public.life_quest_templates FOR SELECT
  USING (true);

-- ============================================
-- SERVICE ROLE NOTES
-- ============================================
-- Prisma uses the service role which bypasses RLS by default.
-- These policies only affect PostgREST (anon/authenticated roles).
-- API routes will continue to work normally.
