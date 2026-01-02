import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET /api/users/[userId] - Get public user profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;

  // Get current user for friendship status (optional)
  const currentUser = await getAuthUser().catch(() => null);

  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      bio: true,
      total_xp: true,
      main_level: true,
      current_streak: true,
      created_at: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get friendship status if logged in
  let friendshipStatus: {
    status: string | null;
    friendshipId: string | null;
    isRequester: boolean;
  } = { status: null, friendshipId: null, isRequester: false };

  if (currentUser && currentUser.id !== userId) {
    const friendship = await prisma.friendships.findFirst({
      where: {
        OR: [
          { requester_id: currentUser.id, addressee_id: userId },
          { requester_id: userId, addressee_id: currentUser.id },
        ],
      },
    });

    if (friendship) {
      friendshipStatus = {
        status: friendship.status,
        friendshipId: friendship.id,
        isRequester: friendship.requester_id === currentUser.id,
      };
    }
  }

  // Get user stats
  const [visitedCount, reviewCount, questCount, locationCount] = await Promise.all([
    prisma.travel_user_location_data.count({
      where: { user_id: userId, visited: true },
    }),
    prisma.travel_reviews.count({
      where: { author_id: userId, status: "APPROVED" },
    }),
    prisma.travel_quests.count({
      where: { user_id: userId, status: "COMPLETED" },
    }),
    prisma.travel_locations.count({
      where: { user_id: userId },
    }),
  ]);

  // Get user's recent visited locations
  const visitedLocations = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: userId,
      visited: true,
    },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          type: true,
          latitude: true,
          longitude: true,
          city: {
            select: { id: true, name: true, country: true },
          },
        },
      },
    },
    orderBy: { last_visited_at: "desc" },
    take: 12,
  });

  return NextResponse.json({
    user: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      level: profile.main_level || 1,
      xp: profile.total_xp || 0,
      currentStreak: profile.current_streak || 0,
      createdAt: profile.created_at,
    },
    friendship: friendshipStatus,
    stats: {
      visitedCount,
      reviewCount,
      questCount,
      locationCount,
    },
    visitedLocations: visitedLocations.map((vl) => ({
      id: vl.location.id,
      name: vl.location.name,
      type: vl.location.type,
      latitude: vl.location.latitude,
      longitude: vl.location.longitude,
      city: vl.location.city,
      visitedAt: vl.last_visited_at,
    })),
  });
}
