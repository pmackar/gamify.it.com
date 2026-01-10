import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// PATCH /api/fitness/coach/notifications/[notificationId] - Mark as read
export const PATCH = withCoachAuthParams<{ notificationId: string }>(
  async (_request, user, { notificationId }) => {
    const notification = await prisma.coaching_notifications.findFirst({
      where: { id: notificationId, recipient_id: user.id },
    });

    if (!notification) {
      return Errors.notFound("Notification not found");
    }

    await prisma.coaching_notifications.update({
      where: { id: notificationId },
      data: { read: true, read_at: new Date() },
    });

    return NextResponse.json({ success: true });
  }
);

// DELETE /api/fitness/coach/notifications/[notificationId] - Delete notification
export const DELETE = withCoachAuthParams<{ notificationId: string }>(
  async (_request, user, { notificationId }) => {
    const notification = await prisma.coaching_notifications.findFirst({
      where: { id: notificationId, recipient_id: user.id },
    });

    if (!notification) {
      return Errors.notFound("Notification not found");
    }

    await prisma.coaching_notifications.delete({
      where: { id: notificationId },
    });

    return NextResponse.json({ success: true });
  }
);
