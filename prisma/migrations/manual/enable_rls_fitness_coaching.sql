-- Enable RLS on fitness and coaching tables
-- Run this in Supabase SQL Editor

-- ============================================
-- FITNESS RIVALRY TABLES
-- ============================================

-- fitness_rivalry_requests
ALTER TABLE public.fitness_rivalry_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rivalry requests"
  ON public.fitness_rivalry_requests FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

CREATE POLICY "Users can create rivalry requests"
  ON public.fitness_rivalry_requests FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can update their received requests"
  ON public.fitness_rivalry_requests FOR UPDATE
  USING (auth.uid() = addressee_id);

CREATE POLICY "Users can delete their own requests"
  ON public.fitness_rivalry_requests FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- fitness_friend_rivalries
ALTER TABLE public.fitness_friend_rivalries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own friend rivalries"
  ON public.fitness_friend_rivalries FOR SELECT
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can create friend rivalries"
  ON public.fitness_friend_rivalries FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own friend rivalries"
  ON public.fitness_friend_rivalries FOR UPDATE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

CREATE POLICY "Users can delete their own friend rivalries"
  ON public.fitness_friend_rivalries FOR DELETE
  USING (auth.uid() = user_id OR auth.uid() = friend_id);

-- fitness_rivals
ALTER TABLE public.fitness_rivals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rivals"
  ON public.fitness_rivals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own rivals"
  ON public.fitness_rivals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own rivals"
  ON public.fitness_rivals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own rivals"
  ON public.fitness_rivals FOR DELETE
  USING (auth.uid() = user_id);

-- fitness_encounters
ALTER TABLE public.fitness_encounters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own encounters"
  ON public.fitness_encounters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own encounters"
  ON public.fitness_encounters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- fitness_narrative_settings
ALTER TABLE public.fitness_narrative_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own narrative settings"
  ON public.fitness_narrative_settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own narrative settings"
  ON public.fitness_narrative_settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own narrative settings"
  ON public.fitness_narrative_settings FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- WORKOUT PROPS
-- ============================================

ALTER TABLE public.workout_props ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workout props"
  ON public.workout_props FOR SELECT
  USING (true); -- Props are public for social features

CREATE POLICY "Users can create props they give"
  ON public.workout_props FOR INSERT
  WITH CHECK (auth.uid() = giver_id);

CREATE POLICY "Users can delete props they gave"
  ON public.workout_props FOR DELETE
  USING (auth.uid() = giver_id);

-- ============================================
-- COACHING: TEMPLATES
-- ============================================

-- coaching_workout_templates
ALTER TABLE public.coaching_workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their own templates"
  ON public.coaching_workout_templates FOR SELECT
  USING (
    auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
    OR is_public = true
  );

CREATE POLICY "Coaches can create their own templates"
  ON public.coaching_workout_templates FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can update their own templates"
  ON public.coaching_workout_templates FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can delete their own templates"
  ON public.coaching_workout_templates FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

-- coaching_template_exercises
ALTER TABLE public.coaching_template_exercises ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view template exercises for accessible templates"
  ON public.coaching_template_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workout_templates t
      WHERE t.id = template_id
      AND (t.is_public = true OR auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = t.coach_id))
    )
  );

CREATE POLICY "Coaches can manage their template exercises"
  ON public.coaching_template_exercises FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workout_templates t
      WHERE t.id = template_id
      AND auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = t.coach_id)
    )
  );

-- coaching_program_versions
ALTER TABLE public.coaching_program_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their program versions"
  ON public.coaching_program_versions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

CREATE POLICY "Coaches can create program versions"
  ON public.coaching_program_versions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_programs p
      WHERE p.id = program_id
      AND auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = p.coach_id)
    )
  );

-- ============================================
-- COACHING: MESSAGING
-- ============================================

-- coaching_conversations
ALTER TABLE public.coaching_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their conversations"
  ON public.coaching_conversations FOR SELECT
  USING (
    auth.uid() = athlete_id
    OR auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

CREATE POLICY "Coaches can create conversations"
  ON public.coaching_conversations FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Participants can update conversations"
  ON public.coaching_conversations FOR UPDATE
  USING (
    auth.uid() = athlete_id
    OR auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id)
  );

-- coaching_messages
ALTER TABLE public.coaching_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view messages in their conversations"
  ON public.coaching_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_conversations c
      WHERE c.id = conversation_id
      AND (c.athlete_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = c.coach_id))
    )
  );

CREATE POLICY "Participants can send messages"
  ON public.coaching_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.coaching_conversations c
      WHERE c.id = conversation_id
      AND (c.athlete_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = c.coach_id))
    )
  );

CREATE POLICY "Recipients can update messages (mark read)"
  ON public.coaching_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_conversations c
      WHERE c.id = conversation_id
      AND (c.athlete_id = auth.uid() OR auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = c.coach_id))
    )
  );

-- ============================================
-- COACHING: NOTIFICATIONS
-- ============================================

ALTER TABLE public.coaching_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
  ON public.coaching_notifications FOR SELECT
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can create notifications for others"
  ON public.coaching_notifications FOR INSERT
  WITH CHECK (auth.uid() = sender_id OR sender_id IS NULL);

CREATE POLICY "Users can update their own notifications"
  ON public.coaching_notifications FOR UPDATE
  USING (auth.uid() = recipient_id);

CREATE POLICY "Users can delete their own notifications"
  ON public.coaching_notifications FOR DELETE
  USING (auth.uid() = recipient_id);

-- ============================================
-- COACHING: GROUPS
-- ============================================

-- coaching_groups
ALTER TABLE public.coaching_groups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Coaches can view their own groups"
  ON public.coaching_groups FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Members can view their groups"
  ON public.coaching_groups FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_group_members m
      WHERE m.group_id = id AND m.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can create groups"
  ON public.coaching_groups FOR INSERT
  WITH CHECK (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can update their groups"
  ON public.coaching_groups FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Coaches can delete their groups"
  ON public.coaching_groups FOR DELETE
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

-- coaching_group_members
ALTER TABLE public.coaching_group_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group coaches and members can view membership"
  ON public.coaching_group_members FOR SELECT
  USING (
    auth.uid() = athlete_id
    OR EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
    )
  );

CREATE POLICY "Coaches can manage group membership"
  ON public.coaching_group_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
    )
  );

-- coaching_group_messages
ALTER TABLE public.coaching_group_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Group participants can view messages"
  ON public.coaching_group_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND (
        auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
        OR EXISTS (SELECT 1 FROM public.coaching_group_members m WHERE m.group_id = g.id AND m.athlete_id = auth.uid())
      )
    )
  );

CREATE POLICY "Group participants can send messages"
  ON public.coaching_group_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.coaching_groups g
      WHERE g.id = group_id
      AND (
        auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = g.coach_id)
        OR EXISTS (SELECT 1 FROM public.coaching_group_members m WHERE m.group_id = g.id AND m.athlete_id = auth.uid())
      )
    )
  );

-- coaching_group_read_status
ALTER TABLE public.coaching_group_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own read status"
  ON public.coaching_group_read_status FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own read status"
  ON public.coaching_group_read_status FOR ALL
  USING (auth.uid() = user_id);

-- ============================================
-- COACHING: CHECK-INS
-- ============================================

ALTER TABLE public.coaching_check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view their own check-ins"
  ON public.coaching_check_ins FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view their athletes check-ins"
  ON public.coaching_check_ins FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can create their own check-ins"
  ON public.coaching_check_ins FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update their own check-ins"
  ON public.coaching_check_ins FOR UPDATE
  USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can update check-ins (add feedback)"
  ON public.coaching_check_ins FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

-- ============================================
-- COACHING: FORM CHECKS
-- ============================================

ALTER TABLE public.coaching_form_checks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view their own form checks"
  ON public.coaching_form_checks FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view their athletes form checks"
  ON public.coaching_form_checks FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can create form checks"
  ON public.coaching_form_checks FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update their pending form checks"
  ON public.coaching_form_checks FOR UPDATE
  USING (auth.uid() = athlete_id AND status = 'PENDING');

CREATE POLICY "Coaches can update form checks (review)"
  ON public.coaching_form_checks FOR UPDATE
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can delete their pending form checks"
  ON public.coaching_form_checks FOR DELETE
  USING (auth.uid() = athlete_id AND status = 'PENDING');

-- ============================================
-- COACHING: LIVE SESSIONS
-- ============================================

ALTER TABLE public.coaching_live_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Athletes can view their own live sessions"
  ON public.coaching_live_sessions FOR SELECT
  USING (auth.uid() = athlete_id);

CREATE POLICY "Coaches can view their athletes live sessions"
  ON public.coaching_live_sessions FOR SELECT
  USING (auth.uid() IN (SELECT user_id FROM public.coach_profiles WHERE id = coach_id));

CREATE POLICY "Athletes can create their own live sessions"
  ON public.coaching_live_sessions FOR INSERT
  WITH CHECK (auth.uid() = athlete_id);

CREATE POLICY "Athletes can update their own live sessions"
  ON public.coaching_live_sessions FOR UPDATE
  USING (auth.uid() = athlete_id);

CREATE POLICY "Athletes can delete their own live sessions"
  ON public.coaching_live_sessions FOR DELETE
  USING (auth.uid() = athlete_id);
