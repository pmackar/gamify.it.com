import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/friends/leaderboard - Get friend leaderboard
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type") || "xp"; // xp, streak, level

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

  // Extract friend IDs and include current user
  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );
  const allIds = [user.id, ...friendIds];

  // Determine sort field
  let orderBy: Record<string, "desc"> = { total_xp: "desc" };
  if (type === "streak") {
    orderBy = { current_streak: "desc" };
  } else if (type === "level") {
    orderBy = { main_level: "desc" };
  }

  // Get profiles with rankings
  const profiles = await prisma.profiles.findMany({
    where: {
      id: { in: allIds },
    },
    select: {
      id: true,
      username: true,
      display_name: true,
      avatar_url: true,
      total_xp: true,
      main_level: true,
      current_streak: true,
      longest_streak: true,
    },
    orderBy,
  });

  // Add rank and determine if current user
  const leaderboard = profiles.map((p, index) => ({
    rank: index + 1,
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    xp: p.total_xp || 0,
    level: p.main_level || 1,
    currentStreak: p.current_streak || 0,
    longestStreak: p.longest_streak || 0,
    isCurrentUser: p.id === user.id,
  }));

  // Find current user's rank
  const currentUserRank = leaderboard.find((p) => p.isCurrentUser)?.rank || 0;

  return NextResponse.json({
    leaderboard,
    currentUserRank,
    type,
    totalFriends: friendIds.length,
  });
}
