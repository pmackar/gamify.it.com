import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// POST /api/fitness/coach/programs/[programId]/bulk - Bulk operations
export const POST = withCoachAuthParams<{ programId: string }>(
  async (request, user, { programId }) => {
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
    const { action, source_week_id, target_week_id } = body;

    if (action === "copy_week") {
      if (!source_week_id || !target_week_id) {
        return Errors.invalidInput("source_week_id and target_week_id required");
      }

      // Get source week with all workouts and exercises
      const sourceWeek = await prisma.coaching_program_weeks.findFirst({
        where: { id: source_week_id, program_id: programId },
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
      });

      if (!sourceWeek) {
        return Errors.notFound("Source week not found");
      }

      // Verify target week exists
      const targetWeek = await prisma.coaching_program_weeks.findFirst({
        where: { id: target_week_id, program_id: programId },
        include: {
          workouts: true,
        },
      });

      if (!targetWeek) {
        return Errors.notFound("Target week not found");
      }

      // Use transaction to copy workouts
      await prisma.$transaction(async (tx) => {
        // For each target workout, find the corresponding source workout by day_number
        for (const targetWorkout of targetWeek.workouts) {
          const sourceWorkout = sourceWeek.workouts.find(
            (w) => w.day_number === targetWorkout.day_number
          );

          if (sourceWorkout) {
            // Delete existing exercises in target workout
            await tx.coaching_workout_exercises.deleteMany({
              where: { workout_id: targetWorkout.id },
            });

            // Update workout properties
            await tx.coaching_workouts.update({
              where: { id: targetWorkout.id },
              data: {
                name: sourceWorkout.name,
                notes: sourceWorkout.notes,
                rest_day: sourceWorkout.rest_day,
              },
            });

            // Copy exercises
            if (sourceWorkout.exercises.length > 0) {
              await tx.coaching_workout_exercises.createMany({
                data: sourceWorkout.exercises.map((ex, i) => ({
                  workout_id: targetWorkout.id,
                  exercise_id: ex.exercise_id,
                  exercise_name: ex.exercise_name,
                  order_index: i,
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

        // Copy week name if exists
        await tx.coaching_program_weeks.update({
          where: { id: target_week_id },
          data: {
            name: sourceWeek.name,
            notes: sourceWeek.notes,
          },
        });
      });

      return NextResponse.json({ success: true });
    }

    if (action === "apply_deload") {
      // Apply deload modifications to a week (reduce intensity/volume)
      const { week_id, intensity_modifier, volume_modifier } = body;

      if (!week_id) {
        return Errors.invalidInput("week_id required");
      }

      const intensityMod = intensity_modifier || 0.6; // 60% of normal
      const volumeMod = volume_modifier || 0.5; // 50% of sets

      const week = await prisma.coaching_program_weeks.findFirst({
        where: { id: week_id, program_id: programId },
        include: {
          workouts: {
            include: {
              exercises: true,
            },
          },
        },
      });

      if (!week) {
        return Errors.notFound("Week not found");
      }

      await prisma.$transaction(async (tx) => {
        // Update week name to indicate deload
        await tx.coaching_program_weeks.update({
          where: { id: week_id },
          data: {
            name: `${week.name || ""} (Deload)`.trim(),
          },
        });

        // Reduce sets for all exercises
        for (const workout of week.workouts) {
          for (const exercise of workout.exercises) {
            const newSets = Math.max(1, Math.round(exercise.sets * volumeMod));
            await tx.coaching_workout_exercises.update({
              where: { id: exercise.id },
              data: {
                sets: newSets,
                intensity: `${Math.round(intensityMod * 100)}%`,
              },
            });
          }
        }
      });

      return NextResponse.json({ success: true });
    }

    return Errors.invalidInput("Unknown action");
  }
);
