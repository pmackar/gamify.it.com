import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import prisma from "@/lib/db";

interface Activity {
  type: string;
  metadata: unknown;
}

function getActivitySummary(activities: Activity[]): string {
  if (activities.length === 0) return "";

  const types = activities.map((a) => a.type);

  if (types.includes("QUEST_ITEM_COMPLETED")) {
    return "Completed a quest item";
  }
  if (types.includes("QUEST_COMPLETED")) {
    return "Finished a quest!";
  }
  if (types.includes("PARTY_MEMBER_JOINED")) {
    return "Joined a party";
  }

  return `${activities.length} action${activities.length > 1 ? "s" : ""} today`;
}

// GET /api/friends/activity - Get friends' recent activity for accountability
export const GET = withAuth(async (_request, user) => {
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

  // Extract friend IDs
  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  if (friendIds.length === 0) {
    return NextResponse.json({
      friends: [],
      totalActive: 0,
    });
  }

  // Get friend profiles with streak info
  const profiles = await prisma.profiles.findMany({
    where: {
      id: { in: friendIds },
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      total_xp: true,
      main_level: true,
      current_streak: true,
      last_activity_date: true,
    },
  });

  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Get recent activity from friends (last 24 hours)
  const recentActivity = await prisma.activity_feed.findMany({
    where: {
      user_id: { in: friendIds },
      created_at: {
        gte: today,
      },
    },
    select: {
      user_id: true,
      type: true,
      metadata: true,
      created_at: true,
    },
    orderBy: {
      created_at: "desc",
    },
    take: 50,
  });

  // Build friend activity data
  const friendsWithActivity = profiles.map((profile) => {
    const activities = recentActivity.filter((a) => a.user_id === profile.id);
    const isActiveToday = activities.length > 0;

    // Check if they were active in the last hour
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const isOnline =
      profile.last_activity_date &&
      new Date(profile.last_activity_date) > oneHourAgo;

    // Get a summary of their activity
    const activitySummary =
      activities.length > 0 ? getActivitySummary(activities.slice(0, 3)) : null;

    return {
      id: profile.id,
      username: profile.username,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url,
      level: profile.main_level || 1,
      streak: profile.current_streak || 0,
      xp: profile.total_xp || 0,
      isActiveToday,
      isOnline,
      activityCount: activities.length,
      lastActivity: activities[0]?.created_at?.toISOString() || null,
      activitySummary,
    };
  });

  // Sort by: online first, then active today, then by streak
  const sortedFriends = friendsWithActivity.sort((a, b) => {
    if (a.isOnline !== b.isOnline) return a.isOnline ? -1 : 1;
    if (a.isActiveToday !== b.isActiveToday) return a.isActiveToday ? -1 : 1;
    return b.streak - a.streak;
  });

  const totalActive = friendsWithActivity.filter((f) => f.isActiveToday).length;

  return NextResponse.json({
    friends: sortedFriends.slice(0, 10), // Limit to top 10
    totalActive,
    totalFriends: friendIds.length,
  });
});
