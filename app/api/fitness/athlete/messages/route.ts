import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";

// GET /api/fitness/athlete/messages - List all conversations for athlete
export const GET = withAuth(async (_request, user) => {
  const conversations = await prisma.coaching_conversations.findMany({
    where: { athlete_id: user.id },
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
      messages: {
        orderBy: { created_at: "desc" },
        take: 1,
        select: {
          content: true,
          sender_id: true,
          created_at: true,
        },
      },
    },
    orderBy: { last_message_at: "desc" },
  });

  // Transform to include coach info and last message preview
  const formatted = conversations.map((conv) => ({
    id: conv.id,
    coach: {
      id: conv.coach.id,
      userId: conv.coach.user_id,
      businessName: conv.coach.business_name,
      user: conv.coach.user,
    },
    lastMessage: conv.messages[0] || null,
    unreadCount: conv.athlete_unread,
    lastMessageAt: conv.last_message_at,
    createdAt: conv.created_at,
  }));

  return NextResponse.json({ conversations: formatted });
});
