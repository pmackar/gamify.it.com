import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateBody, validateQuery, Errors } from "@/lib/api";

// Query params schema for GET
const activityQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  cursor: z.string().uuid().optional(),
  unread: z.enum(["true", "false"]).optional(),
});

// Body schema for POST
const activityActionSchema = z.object({
  action: z.enum(["read-all"]),
});

// GET /api/activity - Get user's activity feed / notifications
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, activityQuerySchema);
  if (params instanceof NextResponse) return params;

  const { limit, cursor, unread } = params;
  const unreadOnly = unread === "true";

  try {
    const where = {
      user_id: user.id,
      ...(unreadOnly && { read: false }),
    };

    const activities = await prisma.activity_feed.findMany({
      where,
      include: {
        actor: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
        kudos: {
          select: {
            id: true,
            user_id: true,
            emoji: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit + 1,
      ...(cursor && { cursor: { id: cursor }, skip: 1 }),
    });

    const hasMore = activities.length > limit;
    const items = hasMore ? activities.slice(0, -1) : activities;

    const unreadCount = await prisma.activity_feed.count({
      where: { user_id: user.id, read: false },
    });

    return NextResponse.json({
      data: items.map((item) => ({
        id: item.id,
        type: item.type,
        entityType: item.entity_type,
        entityId: item.entity_id,
        metadata: item.metadata,
        read: item.read,
        createdAt: item.created_at,
        actor: item.actor
          ? {
              id: item.actor.id,
              username: item.actor.username,
              displayName: item.actor.display_name,
              avatarUrl: item.actor.avatar_url,
            }
          : null,
        kudosCount: item.kudos.length,
        hasGivenKudos: item.kudos.some((k) => k.user_id === user.id),
      })),
      nextCursor: hasMore ? items[items.length - 1].id : null,
      unreadCount,
    });
  } catch (error) {
    console.error("Error fetching activity feed:", error);
    // Return empty response on error to prevent blocking UI
    return NextResponse.json({
      data: [],
      nextCursor: null,
      unreadCount: 0,
    });
  }
});

// POST /api/activity - Mark all as read
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, activityActionSchema);
  if (body instanceof NextResponse) return body;

  try {
    if (body.action === "read-all") {
      await prisma.activity_feed.updateMany({
        where: { user_id: user.id, read: false },
        data: { read: true },
      });
      return NextResponse.json({ success: true });
    }

    return Errors.invalidInput("Invalid action");
  } catch (error) {
    console.error("Error updating activity feed:", error);
    return Errors.database("Failed to update activity feed");
  }
});
