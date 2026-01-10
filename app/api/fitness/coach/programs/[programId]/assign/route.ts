import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// POST /api/fitness/coach/programs/[programId]/assign - Assign program to athlete
export const POST = withCoachAuthParams<{ programId: string }>(
  async (request, user, { programId }) => {
    // Get coach profile
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify program ownership
    const program = await prisma.coaching_programs.findFirst({
      where: { id: programId, coach_id: coach.id },
    });

    if (!program) {
      return Errors.notFound("Program not found");
    }

    const body = await request.json();
    const { athlete_id, start_date } = body;

    if (!athlete_id || !start_date) {
      return Errors.invalidInput("athlete_id and start_date are required");
    }

    // Find the coaching relationship
    const relationship = await prisma.coaching_relationships.findFirst({
      where: {
        coach_id: coach.id,
        athlete_id,
        status: "ACTIVE",
      },
    });

    if (!relationship) {
      return Errors.invalidInput(
        "No active coaching relationship with this athlete"
      );
    }

    // Check for existing active assignment
    const existingAssignment =
      await prisma.coaching_program_assignments.findFirst({
        where: {
          relationship_id: relationship.id,
          status: "active",
        },
      });

    if (existingAssignment) {
      // Mark existing assignment as paused
      await prisma.coaching_program_assignments.update({
        where: { id: existingAssignment.id },
        data: { status: "paused" },
      });
    }

    // Create new assignment
    const assignment = await prisma.coaching_program_assignments.create({
      data: {
        program_id: programId,
        relationship_id: relationship.id,
        start_date: new Date(start_date),
        current_week: 1,
        status: "active",
      },
      include: {
        program: {
          select: { name: true, duration_weeks: true },
        },
        relationship: {
          include: {
            athlete: {
              select: {
                id: true,
                display_name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json({ assignment }, { status: 201 });
  }
);

// GET /api/fitness/coach/programs/[programId]/assign - Get assignments for program
export const GET = withCoachAuthParams<{ programId: string }>(
  async (_request, user, { programId }) => {
    // Get coach profile
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify program ownership
    const program = await prisma.coaching_programs.findFirst({
      where: { id: programId, coach_id: coach.id },
    });

    if (!program) {
      return Errors.notFound("Program not found");
    }

    const assignments = await prisma.coaching_program_assignments.findMany({
      where: { program_id: programId },
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
      orderBy: { created_at: "desc" },
    });

    return NextResponse.json({ assignments });
  }
);
