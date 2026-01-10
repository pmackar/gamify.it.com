import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";
import { sendNotification, sendBulkNotifications } from "@/lib/notifications";
import { coaching_notification_type } from "@prisma/client";

// GET /api/fitness/coach/notifications - Get coach's notifications
export const GET = withCoachAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = parseInt(searchParams.get("offset") || "0");

  const [notifications, unreadCount] = await Promise.all([
    prisma.coaching_notifications.findMany({
      where: { recipient_id: user.id },
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
  ]);

  return NextResponse.json({ notifications, unreadCount });
});

// POST /api/fitness/coach/notifications - Send notification to athlete(s)
export const POST = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
    include: { user: { select: { display_name: true } } },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const body = await request.json();
  const { athleteIds, type, title, body: messageBody, data } = body;

  if (!athleteIds?.length) {
    return Errors.invalidInput("athleteIds is required");
  }

  if (!type || !title || !messageBody) {
    return Errors.invalidInput("type, title, and body are required");
  }

  // Verify all athletes are coached by this coach
  const relationships = await prisma.coaching_relationships.findMany({
    where: {
      coach_id: coach.id,
      athlete_id: { in: athleteIds },
      status: "ACTIVE",
    },
  });

  const validAthleteIds = relationships.map((r) => r.athlete_id);
  const invalidIds = athleteIds.filter(
    (id: string) => !validAthleteIds.includes(id)
  );

  if (invalidIds.length > 0) {
    return Errors.forbidden(
      `Some athletes are not in your roster: ${invalidIds.join(", ")}`
    );
  }

  // Send notifications
  if (validAthleteIds.length === 1) {
    await sendNotification({
      recipientId: validAthleteIds[0],
      senderId: user.id,
      type: type as coaching_notification_type,
      title,
      body: messageBody,
      data,
    });
  } else {
    await sendBulkNotifications(
      validAthleteIds.map((athleteId: string) => ({
        recipientId: athleteId,
        senderId: user.id,
        type: type as coaching_notification_type,
        title,
        body: messageBody,
        data,
      }))
    );
  }

  return NextResponse.json({
    success: true,
    sent: validAthleteIds.length,
  });
});
