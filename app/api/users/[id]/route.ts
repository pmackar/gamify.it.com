import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withOptionalAuth, Errors } from "@/lib/api";

// GET /api/users/[id] - Get public profile of a user
export const GET = withOptionalAuth(async (request, currentUser) => {
  // Extract user ID from URL
  const url = new URL(request.url);
  const pathParts = url.pathname.split("/");
  const userId = pathParts[pathParts.length - 1];

  if (!userId) {
    return Errors.invalidInput("User ID is required");
  }

  // Get the user's profile
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
      longest_streak: true,
      created_at: true,
    },
  });

  if (!profile) {
    return Errors.notFound("User");
  }

  // Check if current user is friends with this user
  let friendshipStatus: "none" | "friends" | "pending_sent" | "pending_received" = "none";
  let friendshipId: string | null = null;

  if (currentUser && currentUser.id !== userId) {
    const friendship = await prisma.friendships.findFirst({
      where: {
        OR: [
          { requester_id: currentUser.id, addressee_id: userId },
          { requester_id: userId, addressee_id: currentUser.id },
        ],
      },
      select: {
        id: true,
        status: true,
        requester_id: true,
      },
    });

    if (friendship) {
      friendshipId = friendship.id;
      if (friendship.status === "ACCEPTED") {
        friendshipStatus = "friends";
      } else if (friendship.status === "PENDING") {
        friendshipStatus = friendship.requester_id === currentUser.id
          ? "pending_sent"
          : "pending_received";
      }
    }
  }

  // Get app-specific stats
  const appProfiles = await prisma.app_profiles.findMany({
    where: { user_id: userId },
    select: {
      app_id: true,
      xp: true,
      level: true,
    },
  });

  // Get recent activity (public)
  const recentActivity = await prisma.activity_feed.findMany({
    where: {
      user_id: userId,
      // Only show public-friendly activity types
      type: {
        in: ["QUEST_COMPLETED", "QUEST_ITEM_COMPLETED", "PARTY_MEMBER_JOINED"],
      },
    },
    select: {
      id: true,
      type: true,
      metadata: true,
      created_at: true,
    },
    orderBy: { created_at: "desc" },
    take: 10,
  });

  // Get travel stats if friends
  let travelStats = null;
  if (friendshipStatus === "friends" || currentUser?.id === userId) {
    const [locationCount, countryCount] = await Promise.all([
      prisma.travel_user_location_data.count({
        where: {
          user_id: userId,
          visited: true,
        },
      }),
      prisma.travel_user_location_data.findMany({
        where: {
          user_id: userId,
          visited: true,
        },
        select: {
          location: {
            select: {
              city: {
                select: { country: true },
              },
            },
          },
        },
      }),
    ]);

    const uniqueCountries = new Set(
      countryCount.map((l) => l.location?.city?.country).filter(Boolean)
    );

    travelStats = {
      locationsVisited: locationCount,
      countriesVisited: uniqueCountries.size,
    };
  }

  return NextResponse.json({
    profile: {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      bio: profile.bio,
      xp: profile.total_xp || 0,
      level: profile.main_level || 1,
      currentStreak: profile.current_streak || 0,
      longestStreak: profile.longest_streak || 0,
      memberSince: profile.created_at?.toISOString() || null,
    },
    appStats: appProfiles.map((ap) => ({
      app: ap.app_id,
      xp: ap.xp || 0,
      level: ap.level || 1,
    })),
    travelStats,
    recentActivity: recentActivity.map((a) => ({
      id: a.id,
      type: a.type,
      metadata: a.metadata,
      createdAt: a.created_at?.toISOString(),
    })),
    friendshipStatus,
    friendshipId,
    isCurrentUser: currentUser?.id === userId,
  });
});
