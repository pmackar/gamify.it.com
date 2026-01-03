import { NextResponse } from "next/server";
import prisma from "@/lib/db";

// GET /api/fitness/stats - Get aggregate fitness stats for landing page
export async function GET() {
  try {
    // Count total sets logged across all users
    // Sets are stored in workout exercises as JSON arrays
    const workouts = await prisma.fitness_workouts.findMany({
      select: {
        exercises: true,
      },
    });

    let totalSets = 0;
    workouts.forEach((workout) => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        (workout.exercises as { sets?: unknown[] }[]).forEach((exercise) => {
          if (exercise.sets && Array.isArray(exercise.sets)) {
            totalSets += exercise.sets.length;
          }
        });
      }
    });

    // Count total PRs hit
    // PRs are stored per user per exercise - count all PR entries
    const prCount = await prisma.fitness_user_stats.count();

    // Count unique exercises used
    const exerciseSet = new Set<string>();
    workouts.forEach((workout) => {
      if (workout.exercises && Array.isArray(workout.exercises)) {
        (workout.exercises as { name?: string }[]).forEach((exercise) => {
          if (exercise.name) {
            exerciseSet.add(exercise.name.toLowerCase());
          }
        });
      }
    });
    const uniqueExercises = exerciseSet.size;

    // Count total users
    const userCount = await prisma.users.count();

    // Format numbers for display
    const formatNumber = (num: number): string => {
      if (num >= 10000) return `${Math.floor(num / 1000)}K+`;
      if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
      return num.toString();
    };

    return NextResponse.json({
      setsLogged: formatNumber(totalSets),
      setsLoggedRaw: totalSets,
      prsHit: formatNumber(prCount),
      prsHitRaw: prCount,
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
