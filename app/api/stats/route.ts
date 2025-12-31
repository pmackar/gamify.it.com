import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuth();

    // Find the Prisma user by email for legacy data access
    const prismaUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    if (!prismaUser) {
      return NextResponse.json({
        user: {
          level: user.main_level || 1,
          xp: user.total_xp || 0,
          currentStreak: user.current_streak || 0,
          longestStreak: user.longest_streak || 0,
          memberSince: user.created_at,
        },
        counts: {
          cities: 0,
          locations: 0,
          visits: 0,
          countries: 0,
          recentVisits: 0,
        },
        achievements: {
          unlocked: 0,
          total: 0,
        },
        locationsByType: [],
        topLocations: [],
        visitsByMonth: {},
      });
    }

    // Get stats from actual schema
    const [visitedCount, reviewsCount, achievementsCount, totalAchievements] =
      await Promise.all([
        prisma.userLocationData.count({
          where: { userId: prismaUser.id, visited: true },
        }),
        prisma.review.count({
          where: { authorId: prismaUser.id },
        }),
        prisma.userAchievement.count({
          where: { userId: prismaUser.id, isCompleted: true },
        }),
        prisma.achievement.count(),
      ]);

    // Get unique cities
    const cities = await prisma.userLocationData.findMany({
      where: {
        userId: prismaUser.id,
        visited: true,
      },
      include: {
        location: {
          select: {
            city: true,
            country: true,
            category: true,
          },
        },
      },
    });

    type LocationData = { city: string; country: string; category: string };
    const uniqueCities = new Set(
      cities.map((c) => c.location.city).filter(Boolean)
    );
    const uniqueCountries = new Set(cities.map((c) => c.location.country));

    // Group by category
    const categoryCount: Record<string, number> = {};
    cities.forEach((c) => {
      const cat = c.location.category;
      categoryCount[cat] = (categoryCount[cat] || 0) + 1;
    });

    return NextResponse.json({
      user: {
        level: user.main_level || 1,
        xp: user.total_xp || 0,
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
        memberSince: user.created_at,
      },
      counts: {
        cities: uniqueCities.size,
        locations: visitedCount,
        visits: visitedCount,
        countries: uniqueCountries.size,
        reviews: reviewsCount,
      },
      achievements: {
        unlocked: achievementsCount,
        total: totalAchievements,
      },
      locationsByType: Object.entries(categoryCount).map(([type, count]) => ({
        type,
        count,
      })),
      topLocations: [],
      visitsByMonth: {},
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
