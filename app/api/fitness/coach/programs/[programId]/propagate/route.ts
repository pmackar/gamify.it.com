import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";
import { Prisma } from "@prisma/client";

type PropagationMode = "immediate" | "next_week" | "new_assignments_only";

// POST /api/fitness/coach/programs/[programId]/propagate - Push program updates to athletes
export const POST = withCoachAuthParams<{ programId: string }>(
  async (request, user, { programId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
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

    const body = await request.json();
    const { mode, notes } = body as {
      mode: PropagationMode;
      notes?: string;
    };

    if (!mode || !["immediate", "next_week", "new_assignments_only"].includes(mode)) {
      return Errors.invalidInput("Invalid propagation mode");
    }

    // Get or create version
    const lastVersion = await prisma.coaching_program_versions.findFirst({
      where: { program_id: programId },
      orderBy: { version: "desc" },
      select: { version: true },
    });

    const nextVersion = (lastVersion?.version || 0) + 1;

    // Create snapshot of current program state
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

    // Create new version
    const version = await prisma.coaching_program_versions.create({
      data: {
        program_id: programId,
        version: nextVersion,
        snapshot: snapshot as Prisma.InputJsonValue,
        notes: notes || `Program updated (${mode})`,
        created_by: user.id,
      },
    });

    const affectedAthletes: string[] = [];
    const notificationPromises: Promise<unknown>[] = [];

    if (mode === "new_assignments_only") {
      // Don't update existing assignments, they keep their current version
      // Just record that the version was created
    } else {
      // Update assignments based on mode
      for (const assignment of program.assignments) {
        const athlete = assignment.relationship.athlete;
        affectedAthletes.push(athlete.id);

        if (mode === "immediate") {
          // Update immediately - athlete sees new program right away
          await prisma.coaching_program_assignments.update({
            where: { id: assignment.id },
            data: {
              program_version: nextVersion,
              version_synced_at: new Date(),
              updated_at: new Date(),
            },
          });
        } else if (mode === "next_week") {
          // Schedule update for next week - set version but note it's pending
          // The version will be applied when they advance to next week
          await prisma.coaching_program_assignments.update({
            where: { id: assignment.id },
            data: {
              program_version: nextVersion,
              version_synced_at: null, // null indicates pending sync
              updated_at: new Date(),
            },
          });
        }

        // Send notification to athlete
        const notificationTitle = mode === "immediate"
          ? "Program Updated"
          : "Program Update Scheduled";

        const notificationBody = mode === "immediate"
          ? `Your program "${program.name}" has been updated with new changes.`
          : `Your program "${program.name}" will be updated starting next week.`;

        notificationPromises.push(
          prisma.coaching_notifications.create({
            data: {
              recipient_id: athlete.id,
              sender_id: user.id,
              type: "PROGRAM_UPDATED",
              title: notificationTitle,
              body: notificationBody,
              data: {
                program_id: programId,
                program_name: program.name,
                version: nextVersion,
                mode,
                notes,
              } as Prisma.InputJsonValue,
            },
          })
        );
      }
    }

    // Fire notifications in background
    Promise.all(notificationPromises).catch((err) => {
      console.error("Error sending program update notifications:", err);
    });

    return NextResponse.json({
      success: true,
      version: {
        id: version.id,
        version: nextVersion,
        notes: version.notes,
      },
      mode,
      affectedAthletes: affectedAthletes.length,
      message:
        mode === "immediate"
          ? `Program updated for ${affectedAthletes.length} athlete(s) immediately`
          : mode === "next_week"
            ? `Program update scheduled for ${affectedAthletes.length} athlete(s) starting next week`
            : `New version created. Future assignments will use version ${nextVersion}`,
    });
  }
);
