import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// GET /api/fitness/coach/messages/[conversationId] - Get messages
export const GET = withCoachAuthParams<{ conversationId: string }>(
  async (request, user, { conversationId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify conversation belongs to this coach
    const conversation = await prisma.coaching_conversations.findFirst({
      where: { id: conversationId, coach_id: coach.id },
      include: {
        athlete: {
          select: {
            id: true,
            display_name: true,
            username: true,
            avatar_url: true,
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
    const before = searchParams.get("before"); // cursor for pagination

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

    // Mark messages as read (for coach)
    if (conversation.coach_unread > 0) {
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
          data: { coach_unread: 0 },
        }),
      ]);
    }

    return NextResponse.json({
      conversation: {
        id: conversation.id,
        athlete: conversation.athlete,
      },
      messages: messages.reverse(), // Return in chronological order
      hasMore: messages.length === limit,
    });
  }
);

// POST /api/fitness/coach/messages/[conversationId] - Send message
export const POST = withCoachAuthParams<{ conversationId: string }>(
  async (request, user, { conversationId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify conversation belongs to this coach
    const conversation = await prisma.coaching_conversations.findFirst({
      where: { id: conversationId, coach_id: coach.id },
    });

    if (!conversation) {
      return Errors.notFound("Conversation not found");
    }

    const body = await request.json();
    const { content, attachments } = body;

    if (!content?.trim()) {
      return Errors.invalidInput("Message content is required");
    }

    // Create message and update conversation in transaction
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
          athlete_unread: { increment: 1 },
        },
      }),
    ]);

    return NextResponse.json({ message });
  }
);

// PATCH /api/fitness/coach/messages/[conversationId] - Mark messages as read
export const PATCH = withCoachAuthParams<{ conversationId: string }>(
  async (_request, user, { conversationId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    // Verify conversation belongs to this coach
    const conversation = await prisma.coaching_conversations.findFirst({
      where: { id: conversationId, coach_id: coach.id },
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
        data: { coach_unread: 0 },
      }),
    ]);

    return NextResponse.json({ success: true });
  }
);
