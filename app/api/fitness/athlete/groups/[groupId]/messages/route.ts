import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuthParams, Errors } from "@/lib/api";
import { sendNotification } from "@/lib/notifications";

// GET /api/fitness/athlete/groups/[groupId]/messages - Get group messages (athlete view)
export const GET = withAuthParams<{ groupId: string }>(
  async (request, user, { groupId }) => {
    // Verify athlete is a member of this group
    const membership = await prisma.coaching_group_members.findFirst({
      where: {
        group_id: groupId,
        athlete_id: user.id,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            color: true,
            coach_id: true,
            coach: {
              select: {
                user: {
                  select: {
                    id: true,
                    display_name: true,
                    avatar_url: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!membership) {
      return Errors.forbidden("You are not a member of this group");
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

    // Update read status for athlete
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
      group: membership.group,
      messages: messages.reverse(),
      hasMore: messages.length === limit,
    });
  }
);

// POST /api/fitness/athlete/groups/[groupId]/messages - Send message to group (athlete)
export const POST = withAuthParams<{ groupId: string }>(
  async (request, user, { groupId }) => {
    // Verify athlete is a member of this group
    const membership = await prisma.coaching_group_members.findFirst({
      where: {
        group_id: groupId,
        athlete_id: user.id,
      },
      include: {
        group: {
          select: {
            id: true,
            name: true,
            coach_id: true,
            coach: {
              select: {
                user_id: true,
              },
            },
          },
        },
        athlete: {
          select: {
            display_name: true,
          },
        },
      },
    });

    if (!membership) {
      return Errors.forbidden("You are not a member of this group");
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

    // Notify coach (fire and forget)
    const athleteName = membership.athlete.display_name || "An athlete";
    sendNotification({
      recipientId: membership.group.coach.user_id,
      senderId: user.id,
      type: "ATHLETE_MESSAGE",
      title: `Group: ${membership.group.name}`,
      body: `${athleteName}: ${content.substring(0, 50)}${content.length > 50 ? "..." : ""}`,
      data: { groupId, messageId: message.id },
    }).catch(console.error);

    return NextResponse.json({ message });
  }
);
