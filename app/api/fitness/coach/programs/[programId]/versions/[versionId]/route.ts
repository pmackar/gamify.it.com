import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ programId: string; versionId: string }>;
}

// GET /api/fitness/coach/programs/[programId]/versions/[versionId] - Get version details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { programId, versionId } = await params;
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

  const version = await prisma.coaching_program_versions.findFirst({
    where: { id: versionId, program_id: programId },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  return NextResponse.json({ version });
}

// POST /api/fitness/coach/programs/[programId]/versions/[versionId] - Restore this version
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { programId, versionId } = await params;
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

  const version = await prisma.coaching_program_versions.findFirst({
    where: { id: versionId, program_id: programId },
  });

  if (!version) {
    return NextResponse.json({ error: "Version not found" }, { status: 404 });
  }

  const snapshot = version.snapshot as any;

  // Use a transaction to restore the program
  await prisma.$transaction(async (tx) => {
    // Update program metadata
    await tx.coaching_programs.update({
      where: { id: programId },
      data: {
        name: snapshot.name,
        description: snapshot.description,
        difficulty: snapshot.difficulty,
        goal: snapshot.goal,
        progression_config: snapshot.progression_config,
        updated_at: new Date(),
      },
    });

    // Get existing weeks
    const existingWeeks = await tx.coaching_program_weeks.findMany({
      where: { program_id: programId },
      include: { workouts: true },
    });

    // For each week in snapshot, update or create
    for (const snapshotWeek of snapshot.weeks) {
      const existingWeek = existingWeeks.find(
        (w) => w.week_number === snapshotWeek.week_number
      );

      if (existingWeek) {
        // Update week
        await tx.coaching_program_weeks.update({
          where: { id: existingWeek.id },
          data: {
            name: snapshotWeek.name,
            notes: snapshotWeek.notes,
          },
        });

        // Update workouts in this week
        for (const snapshotWorkout of snapshotWeek.workouts) {
          const existingWorkout = existingWeek.workouts.find(
            (w) => w.day_number === snapshotWorkout.day_number
          );

          if (existingWorkout) {
            // Delete existing exercises
            await tx.coaching_workout_exercises.deleteMany({
              where: { workout_id: existingWorkout.id },
            });

            // Update workout
            await tx.coaching_workouts.update({
              where: { id: existingWorkout.id },
              data: {
                name: snapshotWorkout.name,
                notes: snapshotWorkout.notes,
                rest_day: snapshotWorkout.rest_day,
              },
            });

            // Create exercises
            if (snapshotWorkout.exercises.length > 0) {
              await tx.coaching_workout_exercises.createMany({
                data: snapshotWorkout.exercises.map((ex: any) => ({
                  workout_id: existingWorkout.id,
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
              });
            }
          }
        }
      }
    }
  });

  return NextResponse.json({
    success: true,
    message: `Restored to version ${version.version}`,
  });
}
