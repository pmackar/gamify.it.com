import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// POST /api/activity/[id] - Mark single notification as read
export const POST = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const activity = await prisma.activity_feed.findUnique({
      where: { id },
    });

    if (!activity) {
      return Errors.notFound("Notification not found");
    }

    if (activity.user_id !== user.id) {
      return Errors.forbidden("Access denied");
    }

    await prisma.activity_feed.update({
      where: { id },
      data: { read: true },
    });

    return NextResponse.json({ success: true });
  }
);

// DELETE /api/activity/[id] - Delete notification
export const DELETE = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const activity = await prisma.activity_feed.findUnique({
      where: { id },
    });

    if (!activity) {
      return Errors.notFound("Notification not found");
    }

    if (activity.user_id !== user.id) {
      return Errors.forbidden("Access denied");
    }

    await prisma.activity_feed.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  }
);
