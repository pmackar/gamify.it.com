import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ programId: string }>;
}

// GET /api/fitness/coach/programs/[programId] - Get full program details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { programId } = await params;

  // Get coach profile
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
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
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  return NextResponse.json({ program });
}

// PUT /api/fitness/coach/programs/[programId] - Update program
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { programId } = await params;

  // Get coach profile
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  // Verify ownership
  const existing = await prisma.coaching_programs.findFirst({
    where: { id: programId, coach_id: coach.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const body = await request.json();
  const { name, description, difficulty, goal, is_template } = body;

  const program = await prisma.coaching_programs.update({
    where: { id: programId },
    data: {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(difficulty !== undefined && { difficulty }),
      ...(goal !== undefined && { goal }),
      ...(is_template !== undefined && { is_template }),
      updated_at: new Date(),
    },
  });

  return NextResponse.json({ program });
}

// DELETE /api/fitness/coach/programs/[programId] - Delete program
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { programId } = await params;

  // Get coach profile
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  // Verify ownership
  const existing = await prisma.coaching_programs.findFirst({
    where: { id: programId, coach_id: coach.id },
    include: { assignments: { where: { status: "active" } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  if (existing.assignments.length > 0) {
    return NextResponse.json(
      { error: "Cannot delete program with active assignments" },
      { status: 400 }
    );
  }

  await prisma.coaching_programs.delete({
    where: { id: programId },
  });

  return NextResponse.json({ success: true });
}
