import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ templateId: string }>;
}

// GET /api/fitness/coach/templates/[templateId] - Get template details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  const template = await prisma.coaching_workout_templates.findFirst({
    where: {
      id: templateId,
      OR: [
        { coach_id: coach.id },
        { is_public: true },
      ],
    },
    include: {
      exercises: {
        orderBy: { order_index: "asc" },
      },
    },
  });

  if (!template) {
    return NextResponse.json({ error: "Template not found" }, { status: 404 });
  }

  return NextResponse.json({ template });
}

// PUT /api/fitness/coach/templates/[templateId] - Update template
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  // Check ownership
  const existing = await prisma.coaching_workout_templates.findFirst({
    where: { id: templateId, coach_id: coach.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Template not found or not owned by you" },
      { status: 404 }
    );
  }

  const body = await request.json();
  const { name, description, is_public, exercises } = body;

  // Update template and replace exercises
  const template = await prisma.$transaction(async (tx) => {
    // Delete existing exercises
    await tx.coaching_template_exercises.deleteMany({
      where: { template_id: templateId },
    });

    // Update template and create new exercises
    return tx.coaching_workout_templates.update({
      where: { id: templateId },
      data: {
        name: name ?? existing.name,
        description: description ?? existing.description,
        is_public: is_public ?? existing.is_public,
        updated_at: new Date(),
        exercises: exercises?.length
          ? {
              create: exercises.map((ex: any, i: number) => ({
                exercise_id: ex.exercise_id,
                exercise_name: ex.exercise_name,
                order_index: i,
                sets: ex.sets || 3,
                reps_min: ex.reps_min || 8,
                reps_max: ex.reps_max || null,
                intensity: ex.intensity || null,
                rest_seconds: ex.rest_seconds || 90,
                notes: ex.notes || null,
              })),
            }
          : undefined,
      },
      include: {
        exercises: {
          orderBy: { order_index: "asc" },
        },
      },
    });
  });

  return NextResponse.json({ template });
}

// DELETE /api/fitness/coach/templates/[templateId] - Delete template
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { templateId } = await params;
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  // Check ownership
  const existing = await prisma.coaching_workout_templates.findFirst({
    where: { id: templateId, coach_id: coach.id },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "Template not found or not owned by you" },
      { status: 404 }
    );
  }

  await prisma.coaching_workout_templates.delete({
    where: { id: templateId },
  });

  return NextResponse.json({ success: true });
}
