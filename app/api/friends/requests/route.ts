import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateQuery, SelectFields } from "@/lib/api";

// Query params schema
const requestsQuerySchema = z.object({
  type: z.enum(["incoming", "sent"]).default("incoming"),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// GET /api/friends/requests - List pending friend requests
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, requestsQuerySchema);
  if (params instanceof NextResponse) return params;

  const { type, limit, offset } = params;

  const whereClause = type === "sent"
    ? { requester_id: user.id, status: "PENDING" as const }
    : { addressee_id: user.id, status: "PENDING" as const };

  const [requests, total] = await Promise.all([
    prisma.friendships.findMany({
      where: whereClause,
      include: {
        requester: {
          select: SelectFields.userWithLevel,
        },
        addressee: {
          select: SelectFields.userWithLevel,
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.friendships.count({ where: whereClause }),
  ]);

  // Map to request objects with the relevant user
  const data = requests.map((r) => {
    const otherUser = type === "sent" ? r.addressee : r.requester;
    return {
      friendshipId: r.id,
      id: otherUser.id,
      username: otherUser.username,
      displayName: otherUser.display_name,
      avatarUrl: otherUser.avatar_url,
      level: otherUser.main_level || 1,
      requestedAt: r.created_at,
    };
  });

  return NextResponse.json({
    data,
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + data.length < total,
    },
  });
});
