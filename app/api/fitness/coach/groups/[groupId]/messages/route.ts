import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";
import { sendBulkNotifications } from "@/lib/notifications";

// GET /api/fitness/coach/groups/[groupId]/messages - Get group messages
export const GET = withCoachAuthParams<{ groupId: string }>(
  async (request, user, { groupId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify group belongs to this coach
    const group = await prisma.coaching_groups.findFirst({
      where: { id: groupId, coach_id: coach.id },
      include: {
        members: {
          select: { athlete_id: true },
        },
      },
    });

    if (!group) {
      return Errors.notFound("Group not found");
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before");

    const messages = await prisma.coaching_group_messages.findMany({
      where: {
        group_id: groupId,
        ...(before ? { created_at: { lt: new Date(before) } } : {}),
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
    });

    // Update read status for coach
    await prisma.coaching_group_read_status.upsert({
      where: {
        group_id_user_id: {
          group_id: groupId,
          user_id: user.id,
        },
      },
      update: { last_read_at: new Date() },
      create: {
        group_id: groupId,
        user_id: user.id,
        last_read_at: new Date(),
      },
    });

    return NextResponse.json({
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit,
    });
  }
);

// POST /api/fitness/coach/groups/[groupId]/messages - Send message to group
export const POST = withCoachAuthParams<{ groupId: string }>(
  async (request, user, { groupId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
      include: {
        user: { select: { display_name: true } },
      },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify group belongs to this coach
    const group = await prisma.coaching_groups.findFirst({
      where: { id: groupId, coach_id: coach.id },
      include: {
        members: {
          select: { athlete_id: true },
        },
      },
    });

    if (!group) {
      return Errors.notFound("Group not found");
    }

    const body = await request.json();
    const { content, attachments } = body;

    if (!content?.trim()) {
      return Errors.invalidInput("Message content is required");
    }

    // Create message
    const message = await prisma.coaching_group_messages.create({
      data: {
        group_id: groupId,
        sender_id: user.id,
        content: content.trim(),
        attachments: attachments || null,
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
    });

    // Notify all group members (fire and forget)
    if (group.members.length > 0) {
      const coachName = coach.business_name || coach.user.display_name || "Your coach";
      const notifications = group.members.map((m) => ({
        recipientId: m.athlete_id,
        senderId: user.id,
        type: "COACH_MESSAGE" as const,
        title: `Group: ${group.name}`,
        body: `${coachName}: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
        data: { groupId, messageId: message.id },
      }));

      sendBulkNotifications(notifications).catch(console.error);
    }

    return NextResponse.json({ message });
  }
);
