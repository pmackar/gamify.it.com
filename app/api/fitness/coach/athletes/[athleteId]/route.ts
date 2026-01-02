import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/fitness/coach/athletes/[athleteId] - Get athlete details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { athleteId } = await params;

    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return NextResponse.json(
        { error: "Not registered as a coach" },
        { status: 404 }
      );
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
      return NextResponse.json(
        { error: "Athlete not found or not actively coached" },
        { status: 404 }
      );
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
  } catch (error) {
    console.error("Error fetching athlete:", error);
    return NextResponse.json(
      { error: "Failed to fetch athlete" },
      { status: 500 }
    );
  }
}

// PUT /api/fitness/coach/athletes/[athleteId] - Update relationship (notes, status)
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { athleteId } = await params;

    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return NextResponse.json(
        { error: "Not registered as a coach" },
        { status: 404 }
      );
    }

    const relationship = await prisma.coaching_relationships.findFirst({
      where: {
        coach_id: coachProfile.id,
        athlete_id: athleteId,
      },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: "Athlete relationship not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
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
  } catch (error) {
    console.error("Error updating athlete relationship:", error);
    return NextResponse.json(
      { error: "Failed to update relationship" },
      { status: 500 }
    );
  }
}

// DELETE /api/fitness/coach/athletes/[athleteId] - End coaching relationship
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ athleteId: string }> }
) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { athleteId } = await params;

    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return NextResponse.json(
        { error: "Not registered as a coach" },
        { status: 404 }
      );
    }

    const relationship = await prisma.coaching_relationships.findFirst({
      where: {
        coach_id: coachProfile.id,
        athlete_id: athleteId,
      },
    });

    if (!relationship) {
      return NextResponse.json(
        { error: "Athlete relationship not found" },
        { status: 404 }
      );
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
  } catch (error) {
    console.error("Error ending coaching relationship:", error);
    return NextResponse.json(
      { error: "Failed to end relationship" },
      { status: 500 }
    );
  }
}
