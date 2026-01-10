import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// GET /api/fitness/coach/programs/[programId]/workouts/[workoutId] - Get workout details
export const GET = withCoachAuthParams<{ programId: string; workoutId: string }>(
  async (_request, user, { programId, workoutId }) => {
    // Get coach profile
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify ownership through program
    const workout = await prisma.coaching_workouts.findFirst({
      where: {
        id: workoutId,
        week: {
          program: {
            id: programId,
            coach_id: coach.id,
          },
        },
      },
      include: {
        exercises: {
          orderBy: { order_index: "asc" },
        },
        week: {
          select: { week_number: true, name: true },
        },
      },
    });

    if (!workout) {
      return Errors.notFound("Workout not found");
    }

    return NextResponse.json({ workout });
  }
);

// PUT /api/fitness/coach/programs/[programId]/workouts/[workoutId] - Update workout
export const PUT = withCoachAuthParams<{ programId: string; workoutId: string }>(
  async (request, user, { programId, workoutId }) => {
    // Get coach profile
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify ownership
    const existing = await prisma.coaching_workouts.findFirst({
      where: {
        id: workoutId,
        week: {
          program: {
            id: programId,
            coach_id: coach.id,
          },
        },
      },
    });

    if (!existing) {
      return Errors.notFound("Workout not found");
    }

    const body = await request.json();
    const { name, notes, rest_day, exercises } = body;

    // Update workout
    await prisma.coaching_workouts.update({
      where: { id: workoutId },
      data: {
        ...(name !== undefined && { name }),
        ...(notes !== undefined && { notes }),
        ...(rest_day !== undefined && { rest_day }),
      },
    });

    // If exercises provided, replace all exercises
    if (exercises && Array.isArray(exercises)) {
      // Delete existing exercises
      await prisma.coaching_workout_exercises.deleteMany({
        where: { workout_id: workoutId },
      });

      // Create new exercises
      if (exercises.length > 0) {
        await prisma.coaching_workout_exercises.createMany({
          data: exercises.map((ex: any, index: number) => ({
            workout_id: workoutId,
            exercise_id: ex.exercise_id,
            exercise_name: ex.exercise_name,
            order_index: index,
            sets: ex.sets || 3,
            reps_min: ex.reps_min || 8,
            reps_max: ex.reps_max || null,
            intensity: ex.intensity || null,
            rest_seconds: ex.rest_seconds || null,
            notes: ex.notes || null,
          })),
        });
      }
    }

    // Fetch updated workout with exercises
    const updated = await prisma.coaching_workouts.findUnique({
      where: { id: workoutId },
      include: {
        exercises: {
          orderBy: { order_index: "asc" },
        },
      },
    });

    // Update program's updated_at
    await prisma.coaching_programs.update({
      where: { id: programId },
      data: { updated_at: new Date() },
    });

    return NextResponse.json({ workout: updated });
  }
);
