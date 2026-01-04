import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/travel/leaderboard - Get friends travel leaderboard
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "places"; // places, countries, cities

  // Get user's friends
  const friendships = await prisma.friendships.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requester_id: user.id }, { addressee_id: user.id }],
    },
    select: {
      requester_id: true,
      addressee_id: true,
    },
  });

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Include current user
  const allUserIds = [user.id, ...friendIds];

  // Get visit data for all users
  const visitData = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: { in: allUserIds },
      visited: true,
    },
    include: {
      location: {
        select: {
          city: {
            select: {
              id: true,
              country: true,
            },
          },
        },
      },
    },
  });

  // Calculate stats per user
  const userStats = new Map<
    string,
    { places: number; cities: Set<string>; countries: Set<string> }
  >();

  for (const userId of allUserIds) {
    userStats.set(userId, {
      places: 0,
      cities: new Set(),
      countries: new Set(),
    });
  }

  for (const visit of visitData) {
    const stats = userStats.get(visit.user_id);
    if (stats) {
      stats.places++;
      if (visit.location?.city) {
        stats.cities.add(visit.location.city.id);
        if (visit.location.city.country) {
          stats.countries.add(visit.location.city.country);
        }
      }
    }
  }

  // Get user profiles
  const profiles = await prisma.profiles.findMany({
    where: { id: { in: allUserIds } },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      main_level: true,
    },
  });

  const profileMap = new Map(profiles.map((p) => [p.id, p]));

  // Build leaderboard entries
  const entries = allUserIds.map((userId) => {
    const stats = userStats.get(userId)!;
    const profile = profileMap.get(userId);

    let value = 0;
    switch (type) {
      case "countries":
        value = stats.countries.size;
        break;
      case "cities":
        value = stats.cities.size;
        break;
      default:
        value = stats.places;
    }

    return {
      id: userId,
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
      level: profile?.main_level || 1,
      value,
      places: stats.places,
      cities: stats.cities.size,
      countries: stats.countries.size,
      isCurrentUser: userId === user.id,
    };
  });

  // Sort by value descending
  entries.sort((a, b) => b.value - a.value);

  // Add ranks
  const leaderboard = entries.map((entry, index) => ({
    ...entry,
    rank: index + 1,
  }));

  // Find current user's rank
  const currentUserRank = leaderboard.find((e) => e.isCurrentUser)?.rank || 0;

  return NextResponse.json({
    leaderboard,
    currentUserRank,
    type,
    totalFriends: friendIds.length,
  });
});
