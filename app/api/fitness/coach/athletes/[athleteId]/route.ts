import { NextResponse } from "next/server";
import { withCoachAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/fitness/coach/athletes/[athleteId] - Get athlete details
export const GET = withCoachAuthParams<{ athleteId: string }>(
  async (_request, user, { athleteId }) => {
    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return Errors.notFound("Not registered as a coach");
    }

    // Find the relationship
    const relationship = await prisma.coaching_relationships.findFirst({
      where: {
        coach_id: coachProfile.id,
        athlete_id: athleteId,
        status: { in: ["ACTIVE", "PAUSED"] },
      },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            display_name: true,
            username: true,
            avatar_url: true,
            main_level: true,
            total_xp: true,
            created_at: true,
          },
        },
        assignments: {
          include: {
            program: true,
            completions: {
              orderBy: { scheduled_date: "desc" },
              take: 10,
            },
          },
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!relationship) {
      return Errors.notFound("Athlete not found or not actively coached");
    }

    // Get athlete's fitness data
    const fitnessData = await prisma.gamify_fitness_data.findUnique({
      where: { user_id: athleteId },
    });

    const fitnessJson = fitnessData?.data as any;

    // Calculate compliance rate for active assignment
    let complianceRate = null;
    const activeAssignment = relationship.assignments.find(
      (a) => a.status === "active"
    );
    if (activeAssignment && activeAssignment.completions.length > 0) {
      const completed = activeAssignment.completions.filter(
        (c) => c.completed_at
      ).length;
      const total = activeAssignment.completions.length;
      complianceRate = Math.round((completed / total) * 100);
    }

    return NextResponse.json({
      relationship: {
        id: relationship.id,
        status: relationship.status,
        invited_at: relationship.invited_at,
        accepted_at: relationship.accepted_at,
        coach_notes: relationship.coach_notes,
      },
      athlete: relationship.athlete,
      current_assignment: activeAssignment || null,
      assignments: relationship.assignments,
      fitness_data: fitnessJson
        ? {
            profile: fitnessJson.profile,
            records: fitnessJson.records,
            total_workouts: fitnessJson.workouts?.length || 0,
            recent_workouts: (fitnessJson.workouts || []).slice(0, 10),
            achievements: fitnessJson.achievements,
          }
        : null,
      compliance_rate: complianceRate,
    });
  }
);

// PUT /api/fitness/coach/athletes/[athleteId] - Update relationship (notes, status)
export const PUT = withCoachAuthParams<{ athleteId: string }>(
  async (request, user, { athleteId }) => {
    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return Errors.notFound("Not registered as a coach");
    }

    const relationship = await prisma.coaching_relationships.findFirst({
      where: {
        coach_id: coachProfile.id,
        athlete_id: athleteId,
      },
    });

    if (!relationship) {
      return Errors.notFound("Athlete relationship not found");
    }

    const body = await request.json();
    const { coach_notes, status } = body;

    const updated = await prisma.coaching_relationships.update({
      where: { id: relationship.id },
      data: {
        ...(coach_notes !== undefined && { coach_notes }),
        ...(status !== undefined && {
          status,
          ...(status === "ENDED" && { ended_at: new Date() }),
          ...(status === "ACTIVE" && relationship.status === "PENDING" && {
            accepted_at: new Date(),
          }),
        }),
      },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            display_name: true,
            username: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      relationship: updated,
    });
  }
);

// DELETE /api/fitness/coach/athletes/[athleteId] - End coaching relationship
export const DELETE = withCoachAuthParams<{ athleteId: string }>(
  async (_request, user, { athleteId }) => {
    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return Errors.notFound("Not registered as a coach");
    }

    const relationship = await prisma.coaching_relationships.findFirst({
      where: {
        coach_id: coachProfile.id,
        athlete_id: athleteId,
      },
    });

    if (!relationship) {
      return Errors.notFound("Athlete relationship not found");
    }

    // End the relationship (soft delete)
    await prisma.coaching_relationships.update({
      where: { id: relationship.id },
      data: {
        status: "ENDED",
        ended_at: new Date(),
      },
    });

    // Also pause any active assignments
    await prisma.coaching_program_assignments.updateMany({
      where: {
        relationship_id: relationship.id,
        status: "active",
      },
      data: {
        status: "paused",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Coaching relationship ended",
    });
  }
);
