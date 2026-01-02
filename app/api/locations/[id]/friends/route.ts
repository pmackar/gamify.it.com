import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/locations/[id]/friends - Get friends who have visited this location
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id: locationId } = await params;

  // First get the user's friends
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
    return NextResponse.json({ friends: [], count: 0 });
  }

  // Get friends who have visited this location
  const friendVisits = await prisma.travel_user_location_data.findMany({
    where: {
      location_id: locationId,
      user_id: { in: friendIds },
      visited: true,
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          main_level: true,
        },
      },
    },
    orderBy: {
      visited_at: "desc",
    },
  });

  return NextResponse.json({
    friends: friendVisits.map((v) => ({
      id: v.user.id,
      username: v.user.username,
      displayName: v.user.display_name,
      avatarUrl: v.user.avatar_url,
      level: v.user.main_level || 1,
      visitedAt: v.visited_at,
      rating: v.personal_rating,
    })),
    count: friendVisits.length,
  });
}
