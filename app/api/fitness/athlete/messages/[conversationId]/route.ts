import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuthParams, Errors } from "@/lib/api";
import { sendNotification, NotificationTemplates } from "@/lib/notifications";

// GET /api/fitness/athlete/messages/[conversationId] - Get messages
export const GET = withAuthParams<{ conversationId: string }>(
  async (request, user, { conversationId }) => {
    // Verify conversation belongs to this athlete
    const conversation = await prisma.coaching_conversations.findFirst({
      where: { id: conversationId, athlete_id: user.id },
      include: {
        coach: {
          include: {
            user: {
              select: {
                id: true,
                display_name: true,
                username: true,
                avatar_url: true,
              },
            },
          },
        },
      },
    });

    if (!conversation) {
      return Errors.notFound("Conversation not found");
    }

    // Get pagination params
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const before = searchParams.get("before");

    const messages = await prisma.coaching_messages.findMany({
      where: {
        conversation_id: conversationId,
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

    // Mark messages as read (for athlete)
    if (conversation.athlete_unread > 0) {
      await prisma.$transaction([
        prisma.coaching_messages.updateMany({
          where: {
            conversation_id: conversationId,
            sender_id: { not: user.id },
            read_at: null,
          },
          data: { read_at: new Date() },
        }),
        prisma.coaching_conversations.update({
          where: { id: conversationId },
          data: { athlete_unread: 0 },
        }),
      ]);
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        coach: {
          id: conversation.coach.id,
          businessName: conversation.coach.business_name,
          user: conversation.coach.user,
        },
      },
      messages: messages.reverse(),
      hasMore: messages.length === limit,
    });
  }
);

// POST /api/fitness/athlete/messages/[conversationId] - Send message
export const POST = withAuthParams<{ conversationId: string }>(
  async (request, user, { conversationId }) => {
    // Verify conversation belongs to this athlete and get coach info
    const conversation = await prisma.coaching_conversations.findFirst({
      where: { id: conversationId, athlete_id: user.id },
      include: {
        coach: {
          select: { user_id: true },
        },
        athlete: {
          select: { display_name: true },
        },
      },
    });

    if (!conversation) {
      return Errors.notFound("Conversation not found");
    }

    const body = await request.json();
    const { content, attachments } = body;

    if (!content?.trim()) {
      return Errors.invalidInput("Message content is required");
    }

    // Create message and update conversation
    const [message] = await prisma.$transaction([
      prisma.coaching_messages.create({
        data: {
          conversation_id: conversationId,
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
      }),
      prisma.coaching_conversations.update({
        where: { id: conversationId },
        data: {
          last_message_at: new Date(),
          coach_unread: { increment: 1 },
        },
      }),
    ]);

    // Send notification to coach (fire and forget)
    const athleteName = conversation.athlete.display_name || "An athlete";
    const template = NotificationTemplates.newMessage(athleteName, false);
    sendNotification({
      recipientId: conversation.coach.user_id,
      senderId: user.id,
      type: template.type,
      title: template.title,
      body: template.body,
      data: { conversationId },
    }).catch(console.error);

    return NextResponse.json({ message });
  }
);

// PATCH /api/fitness/athlete/messages/[conversationId] - Mark as read
export const PATCH = withAuthParams<{ conversationId: string }>(
  async (_request, user, { conversationId }) => {
    const conversation = await prisma.coaching_conversations.findFirst({
      where: { id: conversationId, athlete_id: user.id },
    });

    if (!conversation) {
      return Errors.notFound("Conversation not found");
    }

    await prisma.$transaction([
      prisma.coaching_messages.updateMany({
        where: {
          conversation_id: conversationId,
          sender_id: { not: user.id },
          read_at: null,
        },
        data: { read_at: new Date() },
      }),
      prisma.coaching_conversations.update({
        where: { id: conversationId },
        data: { athlete_unread: 0 },
      }),
    ]);

    return NextResponse.json({ success: true });
  }
);
