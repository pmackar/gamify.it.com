import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/friends/suggestions - Get friend suggestions based on mutual friends
export async function GET() {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current user's friends
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

  if (friendIds.length === 0) {
    // No friends yet - suggest popular users instead
    const popularUsers = await prisma.profiles.findMany({
      where: {
        id: { not: user.id },
      },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        main_level: true,
        total_xp: true,
      },
      orderBy: { total_xp: "desc" },
      take: 10,
    });

    return NextResponse.json({
      suggestions: popularUsers.map((u) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name,
        avatarUrl: u.avatar_url,
        level: u.main_level || 1,
        mutualFriends: 0,
        mutualFriendNames: [],
        reason: "Popular player",
      })),
      type: "popular",
    });
  }

  // Find friends of friends (potential suggestions)
  const friendsOfFriends = await prisma.friendships.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requester_id: { in: friendIds } },
        { addressee_id: { in: friendIds } },
      ],
    },
    select: {
      requester_id: true,
      addressee_id: true,
    },
  });

  // Build a map of potential suggestions with mutual friend counts
  const suggestionMap = new Map<string, Set<string>>();

  for (const friendship of friendsOfFriends) {
    const potentialFriendId =
      friendIds.includes(friendship.requester_id)
        ? friendship.addressee_id
        : friendship.requester_id;

    const mutualFriendId =
      friendIds.includes(friendship.requester_id)
        ? friendship.requester_id
        : friendship.addressee_id;

    // Skip if it's the current user or already a friend
    if (potentialFriendId === user.id || friendIds.includes(potentialFriendId)) {
      continue;
    }

    if (!suggestionMap.has(potentialFriendId)) {
      suggestionMap.set(potentialFriendId, new Set());
    }
    suggestionMap.get(potentialFriendId)!.add(mutualFriendId);
  }

  // Check for existing pending requests to exclude
  const pendingRequests = await prisma.friendships.findMany({
    where: {
      status: "PENDING",
      OR: [
        { requester_id: user.id },
        { addressee_id: user.id },
      ],
    },
    select: {
      requester_id: true,
      addressee_id: true,
    },
  });

  const pendingUserIds = new Set(
    pendingRequests.map((r) =>
      r.requester_id === user.id ? r.addressee_id : r.requester_id
    )
  );

  // Filter out users with pending requests
  for (const userId of pendingUserIds) {
    suggestionMap.delete(userId);
  }

  // Sort by number of mutual friends
  const sortedSuggestions = Array.from(suggestionMap.entries())
    .sort((a, b) => b[1].size - a[1].size)
    .slice(0, 10);

  if (sortedSuggestions.length === 0) {
    return NextResponse.json({
      suggestions: [],
      type: "mutual",
    });
  }

  // Get user profiles and mutual friend names
  const suggestionIds = sortedSuggestions.map(([id]) => id);
  const allMutualFriendIds = new Set<string>();
  for (const [, mutuals] of sortedSuggestions) {
    for (const id of mutuals) {
      allMutualFriendIds.add(id);
    }
  }

  const [profiles, mutualFriendProfiles] = await Promise.all([
    prisma.profiles.findMany({
      where: { id: { in: suggestionIds } },
      select: {
        id: true,
        username: true,
        display_name: true,
        avatar_url: true,
        main_level: true,
      },
    }),
    prisma.profiles.findMany({
      where: { id: { in: Array.from(allMutualFriendIds) } },
      select: {
        id: true,
        username: true,
        display_name: true,
      },
    }),
  ]);

  const profileMap = new Map(profiles.map((p) => [p.id, p]));
  const mutualFriendMap = new Map(
    mutualFriendProfiles.map((p) => [p.id, p.display_name || p.username || "Friend"])
  );

  const suggestions = sortedSuggestions.map(([userId, mutualIds]) => {
    const profile = profileMap.get(userId);
    const mutualNames = Array.from(mutualIds)
      .slice(0, 3)
      .map((id) => mutualFriendMap.get(id) || "Friend");

    return {
      id: userId,
      username: profile?.username || null,
      displayName: profile?.display_name || null,
      avatarUrl: profile?.avatar_url || null,
      level: profile?.main_level || 1,
      mutualFriends: mutualIds.size,
      mutualFriendNames: mutualNames,
      reason:
        mutualIds.size === 1
          ? `Friends with ${mutualNames[0]}`
          : `${mutualIds.size} mutual friends`,
    };
  });

  return NextResponse.json({
    suggestions,
    type: "mutual",
  });
}
