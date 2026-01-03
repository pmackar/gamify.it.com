import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ locationId: string }>;
}

// GET /api/locations/[locationId]/hotlist-friends - Get friends who have this location on their hotlist
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { locationId } = await params;

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

  if (friendIds.length === 0) {
    return NextResponse.json({ friends: [], count: 0 });
  }

  // Get friends who have this location on their hotlist
  const hotlistData = await prisma.travel_user_location_data.findMany({
    where: {
      location_id: locationId,
      user_id: { in: friendIds },
      hotlist: true,
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
  });

  const friends = hotlistData.map((data) => ({
    id: data.user.id,
    username: data.user.username,
    displayName: data.user.display_name,
    avatarUrl: data.user.avatar_url,
    level: data.user.main_level || 1,
  }));

  return NextResponse.json({
    friends,
    count: friends.length,
  });
}
