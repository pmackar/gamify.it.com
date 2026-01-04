import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ programId: string }>;
}

// GET /api/fitness/coach/programs/[programId]/versions - List all versions
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { programId } = await params;
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

  // Verify program ownership
  const program = await prisma.coaching_programs.findFirst({
    where: { id: programId, coach_id: coach.id },
  });

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const versions = await prisma.coaching_program_versions.findMany({
    where: { program_id: programId },
    orderBy: { version: "desc" },
    select: {
      id: true,
      version: true,
      notes: true,
      created_by: true,
      created_at: true,
    },
  });

  return NextResponse.json({ versions });
}

// POST /api/fitness/coach/programs/[programId]/versions - Create new version
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { programId } = await params;
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

  // Get full program with all nested data
  const program = await prisma.coaching_programs.findFirst({
    where: { id: programId, coach_id: coach.id },
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
    },
  });

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const body = await request.json();
  const { notes } = body;

  // Get the next version number
  const lastVersion = await prisma.coaching_program_versions.findFirst({
    where: { program_id: programId },
    orderBy: { version: "desc" },
    select: { version: true },
  });

  const nextVersion = (lastVersion?.version || 0) + 1;

  // Create snapshot of current state
  const snapshot = {
    name: program.name,
    description: program.description,
    duration_weeks: program.duration_weeks,
    difficulty: program.difficulty,
    goal: program.goal,
    progression_config: program.progression_config,
    weeks: program.weeks.map((week) => ({
      week_number: week.week_number,
      name: week.name,
      notes: week.notes,
      workouts: week.workouts.map((workout) => ({
        day_number: workout.day_number,
        name: workout.name,
        notes: workout.notes,
        rest_day: workout.rest_day,
        exercises: workout.exercises.map((ex) => ({
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
      })),
    })),
  };

  const version = await prisma.coaching_program_versions.create({
    data: {
      program_id: programId,
      version: nextVersion,
      snapshot,
      notes: notes || `Version ${nextVersion}`,
      created_by: user.id,
    },
  });

  return NextResponse.json({ version }, { status: 201 });
}
