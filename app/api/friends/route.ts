import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateQuery, SelectFields } from "@/lib/api";

// Query params schema
const friendsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/friends - List accepted friends
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, friendsQuerySchema);
  if (params instanceof NextResponse) return params;

  const { limit, offset } = params;

  // Get accepted friendships where user is either requester or addressee
  const friendships = await prisma.friendships.findMany({
    where: {
      status: "ACCEPTED",
      OR: [
        { requester_id: user.id },
        { addressee_id: user.id },
      ],
    },
    include: {
      requester: {
        select: {
          ...SelectFields.userWithLevel,
        },
      },
      addressee: {
        select: {
          ...SelectFields.userWithLevel,
        },
      },
    },
    orderBy: { accepted_at: "desc" },
    take: limit,
    skip: offset,
  });

  // Map to friend objects (the other user in each friendship)
  const friends = friendships.map((f) => {
    const friend = f.requester_id === user.id ? f.addressee : f.requester;
    return {
      friendshipId: f.id,
      id: friend.id,
      username: friend.username,
      displayName: friend.display_name,
      avatarUrl: friend.avatar_url,
      level: friend.main_level || 1,
      friendSince: f.accepted_at,
    };
  });

  const total = await prisma.friendships.count({
    where: {
      status: "ACCEPTED",
      OR: [
        { requester_id: user.id },
        { addressee_id: user.id },
      ],
    },
  });

  return NextResponse.json({
    data: friends,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + friends.length < total,
    },
  });
});
