import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

// GET /api/fitness/coach/templates - List all templates for coach
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get coach profile
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  // Get all templates (own + public ones)
  const templates = await prisma.coaching_workout_templates.findMany({
    where: {
      OR: [
        { coach_id: coach.id },
        { is_public: true },
      ],
    },
    include: {
      exercises: {
        orderBy: { order_index: "asc" },
      },
      coach: {
        select: {
          business_name: true,
          user: {
            select: { display_name: true },
          },
        },
      },
    },
    orderBy: { updated_at: "desc" },
  });

  const result = templates.map((t) => ({
    id: t.id,
    name: t.name,
    description: t.description,
    is_public: t.is_public,
    is_own: t.coach_id === coach.id,
    exercise_count: t.exercises.length,
    exercises: t.exercises.map((ex) => ({
      id: ex.id,
      exercise_id: ex.exercise_id,
      exercise_name: ex.exercise_name,
      order_index: ex.order_index,
      sets: ex.sets,
      reps_min: ex.reps_min,
      reps_max: ex.reps_max,
      intensity: ex.intensity,
      rest_seconds: ex.rest_seconds,
      notes: ex.notes,
    })),
    coach_name: t.coach.business_name || t.coach.user.display_name || "Unknown",
    created_at: t.created_at,
    updated_at: t.updated_at,
  }));

  return NextResponse.json({ templates: result });
}

// POST /api/fitness/coach/templates - Create new template
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get coach profile
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, is_public, exercises } = body;

  if (!name) {
    return NextResponse.json(
      { error: "Template name is required" },
      { status: 400 }
    );
  }

  // Create template with exercises
  const template = await prisma.coaching_workout_templates.create({
    data: {
      coach_id: coach.id,
      name,
      description: description || null,
      is_public: is_public || false,
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

  return NextResponse.json({ template }, { status: 201 });
}
