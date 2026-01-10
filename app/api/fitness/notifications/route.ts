import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "@/lib/api";
import { markAllAsRead } from "@/lib/notifications";

// GET /api/fitness/notifications - Get user's notifications
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");
  const unreadOnly = searchParams.get("unread") === "true";

  const [notifications, unreadCount, total] = await Promise.all([
    prisma.coaching_notifications.findMany({
      where: {
        recipient_id: user.id,
        ...(unreadOnly ? { read: false } : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
      orderBy: { created_at: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.coaching_notifications.count({
      where: { recipient_id: user.id, read: false },
    }),
    prisma.coaching_notifications.count({
      where: {
        recipient_id: user.id,
        ...(unreadOnly ? { read: false } : {}),
      },
    }),
  ]);

  return NextResponse.json({
    notifications,
    unreadCount,
    total,
    hasMore: offset + notifications.length < total,
  });
});

// PATCH /api/fitness/notifications - Mark all as read
export const PATCH = withAuth(async (_request, user) => {
  await markAllAsRead(user.id);
  return NextResponse.json({ success: true });
});
