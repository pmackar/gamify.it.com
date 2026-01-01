import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get travel stats
    const [
      citiesCount,
      locationsCount,
      visitsCount,
      achievementsCount,
      totalAchievements,
    ] = await Promise.all([
      prisma.travel_cities.count({
        where: { user_id: user.id },
      }),
      prisma.travel_locations.count({
        where: { user_id: user.id },
      }),
      prisma.travel_visits.count({
        where: { user_id: user.id },
      }),
      prisma.user_achievements.count({
        where: {
          user_id: user.id,
          is_completed: true,
          achievements: { app_id: 'travel' },
        },
      }),
      prisma.achievements.count({
        where: { app_id: 'travel' },
      }),
    ]);

    // Get unique countries
    const cities = await prisma.travel_cities.findMany({
      where: { user_id: user.id },
      select: { country: true },
    });
    const uniqueCountries = new Set(cities.map((c) => c.country));

    // Get locations by type
    const locationsByType = await prisma.travel_locations.groupBy({
      by: ['type'],
      where: { user_id: user.id },
      _count: { type: true },
    });

    // Get top rated locations
    const topLocations = await prisma.travel_locations.findMany({
      where: {
        user_id: user.id,
        avg_rating: { not: null },
      },
      orderBy: { avg_rating: 'desc' },
      take: 5,
      include: {
        city: {
          select: { name: true, country: true },
        },
      },
    });

    return NextResponse.json({
      user: {
        level: user.travel.level,
        xp: user.travel.xp,
        xpToNext: user.travel.xpToNext,
        currentStreak: user.currentStreak,
        longestStreak: user.longestStreak,
      },
      counts: {
        cities: citiesCount,
        locations: locationsCount,
        visits: visitsCount,
        countries: uniqueCountries.size,
        recentVisits: 0,
      },
      achievements: {
        unlocked: achievementsCount,
        total: totalAchievements,
      },
      locationsByType: locationsByType.map((item) => ({
        type: item.type,
        count: item._count.type,
      })),
      topLocations: topLocations.map((loc) => ({
        id: loc.id,
        name: loc.name,
        type: loc.type,
        avgRating: loc.avg_rating,
        city: {
          name: loc.city.name,
          country: loc.city.country,
        },
      })),
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
