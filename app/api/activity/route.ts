import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/activity - Get user's activity feed / notifications
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 50);
  const cursor = searchParams.get("cursor");
  const unreadOnly = searchParams.get("unread") === "true";

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
    },
    orderBy: { created_at: "desc" },
    take: limit + 1,
    ...(cursor && { cursor: { id: cursor }, skip: 1 }),
  });

  const hasMore = activities.length > limit;
  const items = hasMore ? activities.slice(0, -1) : activities;

  // Get unread count
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
    })),
    nextCursor: hasMore ? items[items.length - 1].id : null,
    unreadCount,
  });
}

// POST /api/activity - Mark all as read
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { action } = await request.json();

  if (action === "read-all") {
    await prisma.activity_feed.updateMany({
      where: { user_id: user.id, read: false },
      data: { read: true },
    });
    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
