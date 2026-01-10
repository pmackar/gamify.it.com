import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// GET /api/fitness/coach/programs/[programId] - Get full program details
export const GET = withCoachAuthParams<{ programId: string }>(
  async (_request, user, { programId }) => {
    // Get coach profile
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const program = await prisma.coaching_programs.findFirst({
      where: {
        id: programId,
        coach_id: coach.id,
      },
      include: {
        weeks: {
          include: {
            workouts: {
              include: {
                exercises: {
                  orderBy: { order_index: "asc" },
                },
              },
              orderBy: { day_number: "asc" },
            },
          },
          orderBy: { week_number: "asc" },
        },
        assignments: {
          where: { status: "active" },
          include: {
            relationship: {
              include: {
                athlete: {
                  select: {
                    id: true,
                    display_name: true,
                    email: true,
                    avatar_url: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!program) {
      return Errors.notFound("Program not found");
    }

    return NextResponse.json({ program });
  }
);

// PUT /api/fitness/coach/programs/[programId] - Update program
export const PUT = withCoachAuthParams<{ programId: string }>(
  async (request, user, { programId }) => {
    // Get coach profile
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify ownership
    const existing = await prisma.coaching_programs.findFirst({
      where: { id: programId, coach_id: coach.id },
    });

    if (!existing) {
      return Errors.notFound("Program not found");
    }

    const body = await request.json();
    const {
      name,
      description,
      difficulty,
      goal,
      goalPriorities,
      is_template,
      progression_config,
    } = body;

    // Support both legacy goal and new goalPriorities
    const primaryGoal = goalPriorities?.[0] || goal;

    const program = await prisma.coaching_programs.update({
      where: { id: programId },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(difficulty !== undefined && { difficulty }),
        ...(primaryGoal !== undefined && { goal: primaryGoal }),
        ...(goalPriorities !== undefined && { goal_priorities: goalPriorities }),
        ...(is_template !== undefined && { is_template }),
        ...(progression_config !== undefined && { progression_config }),
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ program });
  }
);

// DELETE /api/fitness/coach/programs/[programId] - Delete program
export const DELETE = withCoachAuthParams<{ programId: string }>(
  async (_request, user, { programId }) => {
    // Get coach profile
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify ownership
    const existing = await prisma.coaching_programs.findFirst({
      where: { id: programId, coach_id: coach.id },
      include: { assignments: { where: { status: "active" } } },
    });

    if (!existing) {
      return Errors.notFound("Program not found");
    }

    if (existing.assignments.length > 0) {
      return Errors.invalidInput("Cannot delete program with active assignments");
    }

    await prisma.coaching_programs.delete({
      where: { id: programId },
    });

    return NextResponse.json({ success: true });
  }
);
