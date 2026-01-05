import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/fitness/stats - Get aggregate fitness stats for landing page
export async function GET() {
  try {
    // Get all fitness data from gamify_fitness_data table
    const allFitnessData = await prisma.gamify_fitness_data.findMany({
      select: {
        data: true,
      },
    });

    let totalSets = 0;
    let totalPRs = 0;
    const exerciseSet = new Set<string>();

    // Aggregate stats from all users' fitness data
    allFitnessData.forEach((record) => {
      const data = record.data as any;
      if (!data) return;

      // Count sets from workouts
      const workouts = data.workouts || [];
      workouts.forEach((workout: any) => {
        if (workout.exercises && Array.isArray(workout.exercises)) {
          workout.exercises.forEach((exercise: any) => {
            // Add to unique exercises
            if (exercise.name) {
              exerciseSet.add(exercise.name.toLowerCase());
            }
            // Count sets
            if (exercise.sets && Array.isArray(exercise.sets)) {
              totalSets += exercise.sets.length;
            }
          });
        }
      });

      // Count PRs from records object
      const records = data.records || {};
      totalPRs += Object.keys(records).length;
    });

    const uniqueExercises = exerciseSet.size;

    // Count total users with fitness data
    const userCount = allFitnessData.length;

    // Format numbers for display
    const formatNumber = (num: number): string => {
      if (num >= 10000) return `${Math.floor(num / 1000)}K+`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };

    return NextResponse.json({
      setsLogged: formatNumber(totalSets),
      setsLoggedRaw: totalSets,
      prsHit: formatNumber(totalPRs),
      prsHitRaw: totalPRs,
      exercises: uniqueExercises > 0 ? uniqueExercises : 60, // Default to 60 if no data
      exercisesRaw: uniqueExercises,
      users: formatNumber(userCount),
      usersRaw: userCount,
      levels: "∞", // Levels are unlimited
    }, {
      headers: {
        // Cache for 5 minutes
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (error) {
    console.error("Error fetching fitness stats:", error);
    // Return fallback values on error
    return NextResponse.json({
      setsLogged: "0",
      setsLoggedRaw: 0,
      prsHit: "0",
      prsHitRaw: 0,
      exercises: 60,
      exercisesRaw: 60,
      users: "0",
      usersRaw: 0,
      levels: "∞",
    });
  }
}
