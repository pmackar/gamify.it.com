-- Fix RLS policies that had incorrect column name assumptions
-- These policies replace ones from 004 that failed due to schema differences

-- ============================================
-- QUEST PARTIES (via quest ownership)
-- ============================================

-- Drop failed policies first
DROP POLICY IF EXISTS "Users can view parties they created or are members of" ON public.quest_parties;
DROP POLICY IF EXISTS "Users can create parties" ON public.quest_parties;
DROP POLICY IF EXISTS "Creators can update their parties" ON public.quest_parties;
DROP POLICY IF EXISTS "Creators can delete their parties" ON public.quest_parties;
DROP POLICY IF EXISTS "Users can view members of parties they're in" ON public.quest_party_members;
DROP POLICY IF EXISTS "Party creators can add members" ON public.quest_party_members;
DROP POLICY IF EXISTS "Party creators can remove members, users can leave" ON public.quest_party_members;

-- Quest parties - access via quest ownership
CREATE POLICY "Users can view parties for their quests or as members"
  ON public.quest_parties FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_quests tq
      WHERE tq.id = quest_parties.quest_id AND tq.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.quest_party_members qpm
      WHERE qpm.party_id = quest_parties.id AND qpm.user_id = auth.uid()
    )
  );

CREATE POLICY "Quest owners can create parties"
  ON public.quest_parties FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.travel_quests tq
      WHERE tq.id = quest_parties.quest_id AND tq.user_id = auth.uid()
    )
  );

CREATE POLICY "Quest owners can update parties"
  ON public.quest_parties FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_quests tq
      WHERE tq.id = quest_parties.quest_id AND tq.user_id = auth.uid()
    )
  );

CREATE POLICY "Quest owners can delete parties"
  ON public.quest_parties FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.travel_quests tq
      WHERE tq.id = quest_parties.quest_id AND tq.user_id = auth.uid()
    )
  );

-- Quest party members
CREATE POLICY "Users can view members of parties they belong to"
  ON public.quest_party_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.quest_parties qp
      JOIN public.travel_quests tq ON tq.id = qp.quest_id
      WHERE qp.id = quest_party_members.party_id
      AND (tq.user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.quest_party_members m
          WHERE m.party_id = qp.id AND m.user_id = auth.uid()
        ))
    )
  );

CREATE POLICY "Quest owners can add party members"
  ON public.quest_party_members FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.quest_parties qp
      JOIN public.travel_quests tq ON tq.id = qp.quest_id
      WHERE qp.id = quest_party_members.party_id AND tq.user_id = auth.uid()
    )
    OR auth.uid() = user_id -- Users can add themselves via invite
  );

CREATE POLICY "Quest owners or self can remove members"
  ON public.quest_party_members FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.quest_parties qp
      JOIN public.travel_quests tq ON tq.id = qp.quest_id
      WHERE qp.id = quest_party_members.party_id AND tq.user_id = auth.uid()
    )
  );

-- ============================================
-- COACHING (fix relationship-based access)
-- ============================================

-- coaching_program_assignments - uses relationship_id, not athlete_id
DROP POLICY IF EXISTS "Users can view their assignments" ON public.coaching_program_assignments;
DROP POLICY IF EXISTS "Coaches can assign programs" ON public.coaching_program_assignments;
DROP POLICY IF EXISTS "Coaches can update assignments" ON public.coaching_program_assignments;
DROP POLICY IF EXISTS "Coaches can delete assignments" ON public.coaching_program_assignments;

CREATE POLICY "Users can view their program assignments"
  ON public.coaching_program_assignments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships cr
      WHERE cr.id = coaching_program_assignments.relationship_id
      AND (cr.coach_id = auth.uid() OR cr.athlete_id = auth.uid())
    )
  );

CREATE POLICY "Coaches can create assignments"
  ON public.coaching_program_assignments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships cr
      WHERE cr.id = coaching_program_assignments.relationship_id
      AND cr.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can update program assignments"
  ON public.coaching_program_assignments FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships cr
      WHERE cr.id = coaching_program_assignments.relationship_id
      AND cr.coach_id = auth.uid()
    )
  );

CREATE POLICY "Coaches can delete program assignments"
  ON public.coaching_program_assignments FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_relationships cr
      WHERE cr.id = coaching_program_assignments.relationship_id
      AND cr.coach_id = auth.uid()
    )
  );

-- Fix coaching_program_weeks policy (references assignments via relationship)
DROP POLICY IF EXISTS "Users can view weeks of accessible programs" ON public.coaching_program_weeks;

CREATE POLICY "Users can view program weeks"
  ON public.coaching_program_weeks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_programs cp
      WHERE cp.id = coaching_program_weeks.program_id
      AND (cp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments cpa
          JOIN public.coaching_relationships cr ON cr.id = cpa.relationship_id
          WHERE cpa.program_id = cp.id AND cr.athlete_id = auth.uid()
        ))
    )
  );

-- Fix coaching_workouts policy
DROP POLICY IF EXISTS "Users can view workouts of accessible weeks" ON public.coaching_workouts;

CREATE POLICY "Users can view coaching workouts"
  ON public.coaching_workouts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_weeks cpw
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cpw.id = coaching_workouts.week_id
      AND (cp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments cpa
          JOIN public.coaching_relationships cr ON cr.id = cpa.relationship_id
          WHERE cpa.program_id = cp.id AND cr.athlete_id = auth.uid()
        ))
    )
  );

-- Fix coaching_workout_exercises policy
DROP POLICY IF EXISTS "Users can view exercises of accessible workouts" ON public.coaching_workout_exercises;

CREATE POLICY "Users can view coaching workout exercises"
  ON public.coaching_workout_exercises FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_workouts cw
      JOIN public.coaching_program_weeks cpw ON cpw.id = cw.week_id
      JOIN public.coaching_programs cp ON cp.id = cpw.program_id
      WHERE cw.id = coaching_workout_exercises.workout_id
      AND (cp.coach_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.coaching_program_assignments cpa
          JOIN public.coaching_relationships cr ON cr.id = cpa.relationship_id
          WHERE cpa.program_id = cp.id AND cr.athlete_id = auth.uid()
        ))
    )
  );

-- coaching_workout_completions - uses assignment_id chain
DROP POLICY IF EXISTS "Users can view completions they're involved in" ON public.coaching_workout_completions;
DROP POLICY IF EXISTS "Athletes can log completions" ON public.coaching_workout_completions;
DROP POLICY IF EXISTS "Athletes can update their completions" ON public.coaching_workout_completions;
DROP POLICY IF EXISTS "Athletes can delete their completions" ON public.coaching_workout_completions;

CREATE POLICY "Users can view their workout completions"
  ON public.coaching_workout_completions FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments cpa
      JOIN public.coaching_relationships cr ON cr.id = cpa.relationship_id
      WHERE cpa.id = coaching_workout_completions.assignment_id
      AND (cr.coach_id = auth.uid() OR cr.athlete_id = auth.uid())
    )
  );

CREATE POLICY "Athletes can log workout completions"
  ON public.coaching_workout_completions FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments cpa
      JOIN public.coaching_relationships cr ON cr.id = cpa.relationship_id
      WHERE cpa.id = coaching_workout_completions.assignment_id
      AND cr.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can update their workout completions"
  ON public.coaching_workout_completions FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments cpa
      JOIN public.coaching_relationships cr ON cr.id = cpa.relationship_id
      WHERE cpa.id = coaching_workout_completions.assignment_id
      AND cr.athlete_id = auth.uid()
    )
  );

CREATE POLICY "Athletes can delete their workout completions"
  ON public.coaching_workout_completions FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.coaching_program_assignments cpa
      JOIN public.coaching_relationships cr ON cr.id = cpa.relationship_id
      WHERE cpa.id = coaching_workout_completions.assignment_id
      AND cr.athlete_id = auth.uid()
    )
  );

-- ============================================
-- ACCOUNTABILITY PARTNERSHIPS (requester_id/partner_id)
-- ============================================

DROP POLICY IF EXISTS "Users can view partnerships they're in" ON public.accountability_partnerships;
DROP POLICY IF EXISTS "Users can create partnerships" ON public.accountability_partnerships;
DROP POLICY IF EXISTS "Partners can update partnership" ON public.accountability_partnerships;
DROP POLICY IF EXISTS "Partners can delete partnership" ON public.accountability_partnerships;
DROP POLICY IF EXISTS "Users can view goals from their partnerships" ON public.partnership_goals;
DROP POLICY IF EXISTS "Partners can add goals" ON public.partnership_goals;
DROP POLICY IF EXISTS "Partners can update goals" ON public.partnership_goals;
DROP POLICY IF EXISTS "Partners can delete goals" ON public.partnership_goals;
DROP POLICY IF EXISTS "Users can view checkins from their partnerships" ON public.partnership_checkins;
DROP POLICY IF EXISTS "Partners can add checkins" ON public.partnership_checkins;
DROP POLICY IF EXISTS "Users can update their own checkins" ON public.partnership_checkins;
DROP POLICY IF EXISTS "Users can view nudges from their partnerships" ON public.partnership_nudges;
DROP POLICY IF EXISTS "Partners can send nudges" ON public.partnership_nudges;
DROP POLICY IF EXISTS "Senders can update their nudges" ON public.partnership_nudges;

CREATE POLICY "Users can view their accountability partnerships"
  ON public.accountability_partnerships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = partner_id);

CREATE POLICY "Users can create accountability partnerships"
  ON public.accountability_partnerships FOR INSERT
  WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Partners can update their partnership"
  ON public.accountability_partnerships FOR UPDATE
  USING (auth.uid() = requester_id OR auth.uid() = partner_id);

CREATE POLICY "Partners can delete their partnership"
  ON public.accountability_partnerships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = partner_id);

-- partnership_goals
CREATE POLICY "Users can view their partnership goals"
  ON public.partnership_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.requester_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can add partnership goals"
  ON public.partnership_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.requester_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can update partnership goals"
  ON public.partnership_goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.requester_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can delete partnership goals"
  ON public.partnership_goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_goals.partnership_id
      AND (ap.requester_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

-- partnership_checkins
CREATE POLICY "Users can view their partnership checkins"
  ON public.partnership_checkins FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_checkins.partnership_id
      AND (ap.requester_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can add partnership checkins"
  ON public.partnership_checkins FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their partnership checkins"
  ON public.partnership_checkins FOR UPDATE
  USING (auth.uid() = user_id);

-- partnership_nudges
CREATE POLICY "Users can view their partnership nudges"
  ON public.partnership_nudges FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.accountability_partnerships ap
      WHERE ap.id = partnership_nudges.partnership_id
      AND (ap.requester_id = auth.uid() OR ap.partner_id = auth.uid())
    )
  );

CREATE POLICY "Partners can send partnership nudges"
  ON public.partnership_nudges FOR INSERT
  WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Senders can update their partnership nudges"
  ON public.partnership_nudges FOR UPDATE
  USING (auth.uid() = sender_id);

-- ============================================
-- LEAGUES (tier-based, no ownership)
-- ============================================

-- Leagues are system-managed reference data - read only
DROP POLICY IF EXISTS "Anyone can view leagues" ON public.leagues;
DROP POLICY IF EXISTS "Creators can create leagues" ON public.leagues;
DROP POLICY IF EXISTS "Creators can update leagues" ON public.leagues;

CREATE POLICY "Anyone can view leagues"
  ON public.leagues FOR SELECT
  USING (true);

-- No insert/update/delete for users - system managed
