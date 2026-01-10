import { NextResponse } from "next/server";
import { withCoachAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/fitness/coach/dashboard - Get coach dashboard stats
export const GET = withCoachAuth(async (_request, user) => {
  const coachProfile = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coachProfile) {
    return Errors.notFound("Not registered as a coach");
  }

    // Get athlete counts by status
    const athleteCounts = await prisma.coaching_relationships.groupBy({
      by: ["status"],
      where: { coach_id: coachProfile.id },
      _count: { id: true },
    });

    const statusCounts: Record<string, number> = {};
    athleteCounts.forEach((c) => {
      statusCounts[c.status] = c._count.id;
    });

    // Get active athletes
    const activeAthletes = await prisma.coaching_relationships.findMany({
      where: {
        coach_id: coachProfile.id,
        status: "ACTIVE",
      },
      select: {
        athlete_id: true,
        athlete: {
          select: {
            id: true,
            display_name: true,
            email: true,
            avatar_url: true,
          },
        },
        assignments: {
          where: { status: "active" },
          select: {
            current_week: true,
            program: { select: { name: true, duration_weeks: true } },
            completions: {
              where: {
                scheduled_date: {
                  gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
                },
              },
              select: {
                completed_at: true,
                skipped: true,
              },
            },
          },
        },
      },
    });

    // Get fitness data for all active athletes
    const athleteIds = activeAthletes.map((a) => a.athlete_id);
    const fitnessData = await prisma.gamify_fitness_data.findMany({
      where: { user_id: { in: athleteIds } },
      select: { user_id: true, data: true, updated_at: true },
    });

    const fitnessMap = new Map(fitnessData.map((f) => [f.user_id, f]));

    // Calculate stats
    let totalWorkoutsThisWeek = 0;
    let athletesNeedingAttention: any[] = [];
    let recentActivity: any[] = [];

    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    activeAthletes.forEach((rel) => {
      const fitness = fitnessMap.get(rel.athlete_id);
      const fitnessJson = fitness?.data as any;
      const workouts = fitnessJson?.workouts || [];

      // Count workouts this week
      const workoutsThisWeek = workouts.filter((w: any) => {
        const date = new Date(w.endTime || w.startTime);
        return date >= oneWeekAgo;
      });
      totalWorkoutsThisWeek += workoutsThisWeek.length;

      // Check if athlete needs attention (no workout in 4+ days)
      const lastWorkout = workouts[0];
      const lastWorkoutDate = lastWorkout
        ? new Date(lastWorkout.endTime || lastWorkout.startTime)
        : null;
      const daysSinceLastWorkout = lastWorkoutDate
        ? Math.floor(
            (Date.now() - lastWorkoutDate.getTime()) / (24 * 60 * 60 * 1000)
          )
        : null;

      if (daysSinceLastWorkout === null || daysSinceLastWorkout >= 4) {
        athletesNeedingAttention.push({
          athlete: rel.athlete,
          days_since_workout: daysSinceLastWorkout,
          reason:
            daysSinceLastWorkout === null
              ? "No workouts logged"
              : `No workout in ${daysSinceLastWorkout} days`,
        });
      }

      // Add recent workouts to activity feed
      workoutsThisWeek.slice(0, 3).forEach((w: any) => {
        recentActivity.push({
          type: "workout_completed",
          athlete: rel.athlete,
          workout: {
            date: w.endTime || w.startTime,
            duration: w.duration,
            exercises: w.exercises?.length || 0,
            totalXP: w.totalXP,
          },
          program:
            rel.assignments[0]?.program?.name || null,
        });
      });
    });

    // Sort activity by date
    recentActivity.sort(
      (a, b) =>
        new Date(b.workout.date).getTime() - new Date(a.workout.date).getTime()
    );

    // Calculate overall compliance (from assignments)
    let totalScheduled = 0;
    let totalCompleted = 0;
    activeAthletes.forEach((rel) => {
      rel.assignments.forEach((assignment) => {
        assignment.completions.forEach((c) => {
          totalScheduled++;
          if (c.completed_at) totalCompleted++;
        });
      });
    });

    const complianceRate =
      totalScheduled > 0
        ? Math.round((totalCompleted / totalScheduled) * 100)
        : null;

  return NextResponse.json({
    stats: {
      total_athletes: statusCounts.ACTIVE || 0,
      pending_invites: statusCounts.PENDING || 0,
      workouts_this_week: totalWorkoutsThisWeek,
      compliance_rate: complianceRate,
      max_athletes: coachProfile.max_athletes,
    },
    athletes_needing_attention: athletesNeedingAttention.slice(0, 5),
    recent_activity: recentActivity.slice(0, 10),
  });
});
