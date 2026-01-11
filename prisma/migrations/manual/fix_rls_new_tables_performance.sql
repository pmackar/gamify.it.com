-- Fix RLS Performance for newly added tables
-- Drops and recreates policies with (select auth.uid()) optimization
-- Run this in Supabase SQL Editor

-- ============================================
-- FITNESS_RIVALRY_REQUESTS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own rivalry requests" ON public.fitness_rivalry_requests;
DROP POLICY IF EXISTS "Users can create rivalry requests" ON public.fitness_rivalry_requests;
DROP POLICY IF EXISTS "Users can update their received requests" ON public.fitness_rivalry_requests;
DROP POLICY IF EXISTS "Users can delete their own requests" ON public.fitness_rivalry_requests;

CREATE POLICY "Users can view their own rivalry requests" ON public.fitness_rivalry_requests
  FOR SELECT USING ((select auth.uid()) = requester_id OR (select auth.uid()) = addressee_id);

CREATE POLICY "Users can create rivalry requests" ON public.fitness_rivalry_requests
  FOR INSERT WITH CHECK ((select auth.uid()) = requester_id);

CREATE POLICY "Users can update their received requests" ON public.fitness_rivalry_requests
  FOR UPDATE USING ((select auth.uid()) = addressee_id);

CREATE POLICY "Users can delete their own requests" ON public.fitness_rivalry_requests
  FOR DELETE USING ((select auth.uid()) = requester_id OR (select auth.uid()) = addressee_id);

-- ============================================
-- FITNESS_FRIEND_RIVALRIES
-- ============================================
DROP POLICY IF EXISTS "Users can view their own friend rivalries" ON public.fitness_friend_rivalries;
DROP POLICY IF EXISTS "Users can create friend rivalries" ON public.fitness_friend_rivalries;
DROP POLICY IF EXISTS "Users can update their own friend rivalries" ON public.fitness_friend_rivalries;
DROP POLICY IF EXISTS "Users can delete their own friend rivalries" ON public.fitness_friend_rivalries;

CREATE POLICY "Users can view their own friend rivalries" ON public.fitness_friend_rivalries
  FOR SELECT USING ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

CREATE POLICY "Users can create friend rivalries" ON public.fitness_friend_rivalries
  FOR INSERT WITH CHECK ((select auth.uid()) = user1_id);

CREATE POLICY "Users can update their own friend rivalries" ON public.fitness_friend_rivalries
  FOR UPDATE USING ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

CREATE POLICY "Users can delete their own friend rivalries" ON public.fitness_friend_rivalries
  FOR DELETE USING ((select auth.uid()) = user1_id OR (select auth.uid()) = user2_id);

-- ============================================
-- FITNESS_RIVALS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own rivals" ON public.fitness_rivals;
DROP POLICY IF EXISTS "Users can create their own rivals" ON public.fitness_rivals;
DROP POLICY IF EXISTS "Users can update their own rivals" ON public.fitness_rivals;
DROP POLICY IF EXISTS "Users can delete their own rivals" ON public.fitness_rivals;

CREATE POLICY "Users can view their own rivals" ON public.fitness_rivals
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own rivals" ON public.fitness_rivals
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own rivals" ON public.fitness_rivals
  FOR UPDATE USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can delete their own rivals" ON public.fitness_rivals
  FOR DELETE USING ((select auth.uid()) = user_id);

-- ============================================
-- FITNESS_ENCOUNTERS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own encounters" ON public.fitness_encounters;
DROP POLICY IF EXISTS "Users can create their own encounters" ON public.fitness_encounters;

CREATE POLICY "Users can view their own encounters" ON public.fitness_encounters
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own encounters" ON public.fitness_encounters
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- ============================================
-- FITNESS_NARRATIVE_SETTINGS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own narrative settings" ON public.fitness_narrative_settings;
DROP POLICY IF EXISTS "Users can create their own narrative settings" ON public.fitness_narrative_settings;
DROP POLICY IF EXISTS "Users can update their own narrative settings" ON public.fitness_narrative_settings;

CREATE POLICY "Users can view their own narrative settings" ON public.fitness_narrative_settings
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can create their own narrative settings" ON public.fitness_narrative_settings
  FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

CREATE POLICY "Users can update their own narrative settings" ON public.fitness_narrative_settings
  FOR UPDATE USING ((select auth.uid()) = user_id);

-- ============================================
-- WORKOUT_PROPS
-- ============================================
DROP POLICY IF EXISTS "Users can create props they give" ON public.workout_props;
DROP POLICY IF EXISTS "Users can delete props they gave" ON public.workout_props;

CREATE POLICY "Users can create props they give" ON public.workout_props
  FOR INSERT WITH CHECK ((select auth.uid()) = giver_id);

CREATE POLICY "Users can delete props they gave" ON public.workout_props
  FOR DELETE USING ((select auth.uid()) = giver_id);

-- ============================================
-- COACHING_WORKOUT_TEMPLATES
-- ============================================
DROP POLICY IF EXISTS "Coaches can view their own templates" ON public.coaching_workout_templates;
DROP POLICY IF EXISTS "Coaches can create their own templates" ON public.coaching_workout_templates;
DROP POLICY IF EXISTS "Coaches can update their own templates" ON public.coaching_workout_templates;
DROP POLICY IF EXISTS "Coaches can delete their own templates" ON public.coaching_workout_templates;

CREATE POLICY "Coaches can view their own templates" ON public.coaching_workout_templates
  FOR SELECT USING (
    (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
    OR is_public = true
  );

CREATE POLICY "Coaches can create their own templates" ON public.coaching_workout_templates
  FOR INSERT WITH CHECK ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can update their own templates" ON public.coaching_workout_templates
  FOR UPDATE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can delete their own templates" ON public.coaching_workout_templates
  FOR DELETE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

-- ============================================
-- COACHING_TEMPLATE_EXERCISES
-- ============================================
DROP POLICY IF EXISTS "Users can view template exercises for accessible templates" ON public.coaching_template_exercises;
DROP POLICY IF EXISTS "Coaches can manage their template exercises" ON public.coaching_template_exercises;

CREATE POLICY "Users can view template exercises for accessible templates" ON public.coaching_template_exercises
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workout_templates t
      WHERE t.id = template_id
      AND (t.is_public = true OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = t.coach_id))
    )
  );

CREATE POLICY "Coaches can manage their template exercises" ON public.coaching_template_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workout_templates t
      WHERE t.id = template_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = t.coach_id)
    )
  );

-- ============================================
-- COACHING_PROGRAM_VERSIONS
-- ============================================
DROP POLICY IF EXISTS "Coaches can view their program versions" ON public.coaching_program_versions;
DROP POLICY IF EXISTS "Coaches can create program versions" ON public.coaching_program_versions;

CREATE POLICY "Coaches can view their program versions" ON public.coaching_program_versions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can create program versions" ON public.coaching_program_versions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

-- ============================================
-- COACHING_CONVERSATIONS
-- ============================================
DROP POLICY IF EXISTS "Participants can view their conversations" ON public.coaching_conversations;
DROP POLICY IF EXISTS "Coaches can create conversations" ON public.coaching_conversations;
DROP POLICY IF EXISTS "Participants can update conversations" ON public.coaching_conversations;

CREATE POLICY "Participants can view their conversations" ON public.coaching_conversations
  FOR SELECT USING (
    (select auth.uid()) = athlete_id
    OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

CREATE POLICY "Coaches can create conversations" ON public.coaching_conversations
  FOR INSERT WITH CHECK ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Participants can update conversations" ON public.coaching_conversations
  FOR UPDATE USING (
    (select auth.uid()) = athlete_id
    OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

-- ============================================
-- COACHING_MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Participants can view messages in their conversations" ON public.coaching_messages;
DROP POLICY IF EXISTS "Participants can send messages" ON public.coaching_messages;
DROP POLICY IF EXISTS "Recipients can update messages (mark read)" ON public.coaching_messages;

CREATE POLICY "Participants can view messages in their conversations" ON public.coaching_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_conversations c
      WHERE c.id = conversation_id
      AND (c.athlete_id = (select auth.uid()) OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = c.coach_id))
    )
  );

CREATE POLICY "Participants can send messages" ON public.coaching_messages
  FOR INSERT WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM public.coaching_conversations c
      WHERE c.id = conversation_id
      AND (c.athlete_id = (select auth.uid()) OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = c.coach_id))
    )
  );

CREATE POLICY "Recipients can update messages (mark read)" ON public.coaching_messages
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.coaching_conversations c
      WHERE c.id = conversation_id
      AND (c.athlete_id = (select auth.uid()) OR (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = c.coach_id))
    )
  );

-- ============================================
-- COACHING_NOTIFICATIONS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.coaching_notifications;
DROP POLICY IF EXISTS "Users can create notifications for others" ON public.coaching_notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.coaching_notifications;
DROP POLICY IF EXISTS "Users can delete their own notifications" ON public.coaching_notifications;

CREATE POLICY "Users can view their own notifications" ON public.coaching_notifications
  FOR SELECT USING ((select auth.uid()) = recipient_id);

CREATE POLICY "Users can create notifications for others" ON public.coaching_notifications
  FOR INSERT WITH CHECK ((select auth.uid()) = sender_id OR sender_id IS NULL);

CREATE POLICY "Users can update their own notifications" ON public.coaching_notifications
  FOR UPDATE USING ((select auth.uid()) = recipient_id);

CREATE POLICY "Users can delete their own notifications" ON public.coaching_notifications
  FOR DELETE USING ((select auth.uid()) = recipient_id);

-- ============================================
-- COACHING_GROUPS
-- ============================================
DROP POLICY IF EXISTS "Coaches can view their own groups" ON public.coaching_groups;
DROP POLICY IF EXISTS "Members can view their groups" ON public.coaching_groups;
DROP POLICY IF EXISTS "Coaches can create groups" ON public.coaching_groups;
DROP POLICY IF EXISTS "Coaches can update their groups" ON public.coaching_groups;
DROP POLICY IF EXISTS "Coaches can delete their groups" ON public.coaching_groups;

CREATE POLICY "Coaches can view their own groups" ON public.coaching_groups
  FOR SELECT USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Members can view their groups" ON public.coaching_groups
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_group_members m
      WHERE m.group_id = id AND m.athlete_id = (select auth.uid())
    )
  );

CREATE POLICY "Coaches can create groups" ON public.coaching_groups
  FOR INSERT WITH CHECK ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can update their groups" ON public.coaching_groups
  FOR UPDATE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can delete their groups" ON public.coaching_groups
  FOR DELETE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

-- ============================================
-- COACHING_GROUP_MEMBERS
-- ============================================
DROP POLICY IF EXISTS "Group coaches and members can view membership" ON public.coaching_group_members;
DROP POLICY IF EXISTS "Coaches can manage group membership" ON public.coaching_group_members;

CREATE POLICY "Group coaches and members can view membership" ON public.coaching_group_members
  FOR SELECT USING (
    (select auth.uid()) = athlete_id
    OR EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
    )
  );

CREATE POLICY "Coaches can manage group membership" ON public.coaching_group_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
    )
  );

-- ============================================
-- COACHING_GROUP_MESSAGES
-- ============================================
DROP POLICY IF EXISTS "Group participants can view messages" ON public.coaching_group_messages;
DROP POLICY IF EXISTS "Group participants can send messages" ON public.coaching_group_messages;

CREATE POLICY "Group participants can view messages" ON public.coaching_group_messages
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND (
        (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
        OR EXISTS (SELECT 1 FROM public.coaching_group_members m WHERE m.group_id = g.id AND m.athlete_id = (select auth.uid()))
      )
    )
  );

CREATE POLICY "Group participants can send messages" ON public.coaching_group_messages
  FOR INSERT WITH CHECK (
    (select auth.uid()) = sender_id
    AND EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND (
        (select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
        OR EXISTS (SELECT 1 FROM public.coaching_group_members m WHERE m.group_id = g.id AND m.athlete_id = (select auth.uid()))
      )
    )
  );

-- ============================================
-- COACHING_GROUP_READ_STATUS
-- ============================================
DROP POLICY IF EXISTS "Users can view their own read status" ON public.coaching_group_read_status;
DROP POLICY IF EXISTS "Users can manage their own read status" ON public.coaching_group_read_status;

CREATE POLICY "Users can view their own read status" ON public.coaching_group_read_status
  FOR SELECT USING ((select auth.uid()) = user_id);

CREATE POLICY "Users can manage their own read status" ON public.coaching_group_read_status
  FOR ALL USING ((select auth.uid()) = user_id);

-- ============================================
-- COACHING_CHECK_INS
-- ============================================
DROP POLICY IF EXISTS "Athletes can view their own check-ins" ON public.coaching_check_ins;
DROP POLICY IF EXISTS "Coaches can view their athletes check-ins" ON public.coaching_check_ins;
DROP POLICY IF EXISTS "Athletes can create their own check-ins" ON public.coaching_check_ins;
DROP POLICY IF EXISTS "Athletes can update their own check-ins" ON public.coaching_check_ins;
DROP POLICY IF EXISTS "Coaches can update check-ins (add feedback)" ON public.coaching_check_ins;

CREATE POLICY "Athletes can view their own check-ins" ON public.coaching_check_ins
  FOR SELECT USING ((select auth.uid()) = athlete_id);

CREATE POLICY "Coaches can view their athletes check-ins" ON public.coaching_check_ins
  FOR SELECT USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can create their own check-ins" ON public.coaching_check_ins
  FOR INSERT WITH CHECK ((select auth.uid()) = athlete_id);

CREATE POLICY "Athletes can update their own check-ins" ON public.coaching_check_ins
  FOR UPDATE USING ((select auth.uid()) = athlete_id);

CREATE POLICY "Coaches can update check-ins (add feedback)" ON public.coaching_check_ins
  FOR UPDATE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

-- ============================================
-- COACHING_FORM_CHECKS
-- ============================================
DROP POLICY IF EXISTS "Athletes can view their own form checks" ON public.coaching_form_checks;
DROP POLICY IF EXISTS "Coaches can view their athletes form checks" ON public.coaching_form_checks;
DROP POLICY IF EXISTS "Athletes can create form checks" ON public.coaching_form_checks;
DROP POLICY IF EXISTS "Athletes can update their pending form checks" ON public.coaching_form_checks;
DROP POLICY IF EXISTS "Coaches can update form checks (review)" ON public.coaching_form_checks;
DROP POLICY IF EXISTS "Athletes can delete their pending form checks" ON public.coaching_form_checks;

CREATE POLICY "Athletes can view their own form checks" ON public.coaching_form_checks
  FOR SELECT USING ((select auth.uid()) = athlete_id);

CREATE POLICY "Coaches can view their athletes form checks" ON public.coaching_form_checks
  FOR SELECT USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can create form checks" ON public.coaching_form_checks
  FOR INSERT WITH CHECK ((select auth.uid()) = athlete_id);

CREATE POLICY "Athletes can update their pending form checks" ON public.coaching_form_checks
  FOR UPDATE USING ((select auth.uid()) = athlete_id AND status = 'PENDING');

CREATE POLICY "Coaches can update form checks (review)" ON public.coaching_form_checks
  FOR UPDATE USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can delete their pending form checks" ON public.coaching_form_checks
  FOR DELETE USING ((select auth.uid()) = athlete_id AND status = 'PENDING');

-- ============================================
-- COACHING_LIVE_SESSIONS
-- ============================================
DROP POLICY IF EXISTS "Athletes can view their own live sessions" ON public.coaching_live_sessions;
DROP POLICY IF EXISTS "Coaches can view their athletes live sessions" ON public.coaching_live_sessions;
DROP POLICY IF EXISTS "Athletes can create their own live sessions" ON public.coaching_live_sessions;
DROP POLICY IF EXISTS "Athletes can update their own live sessions" ON public.coaching_live_sessions;
DROP POLICY IF EXISTS "Athletes can delete their own live sessions" ON public.coaching_live_sessions;

CREATE POLICY "Athletes can view their own live sessions" ON public.coaching_live_sessions
  FOR SELECT USING ((select auth.uid()) = athlete_id);

CREATE POLICY "Coaches can view their athletes live sessions" ON public.coaching_live_sessions
  FOR SELECT USING ((select auth.uid()) IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can create their own live sessions" ON public.coaching_live_sessions
  FOR INSERT WITH CHECK ((select auth.uid()) = athlete_id);

CREATE POLICY "Athletes can update their own live sessions" ON public.coaching_live_sessions
  FOR UPDATE USING ((select auth.uid()) = athlete_id);

CREATE POLICY "Athletes can delete their own live sessions" ON public.coaching_live_sessions
  FOR DELETE USING ((select auth.uid()) = athlete_id);
