import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";

// GET /api/fitness/coach/messages - List all conversations for coach
export const GET = withCoachAuth(async (_request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const conversations = await prisma.coaching_conversations.findMany({
    where: { coach_id: coach.id },
    include: {
      athlete: {
        select: {
          id: true,
          display_name: true,
          username: true,
          avatar_url: true,
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

  // Transform to include last message preview
  const formatted = conversations.map((conv) => ({
    id: conv.id,
    athlete: conv.athlete,
    lastMessage: conv.messages[0] || null,
    unreadCount: conv.coach_unread,
    lastMessageAt: conv.last_message_at,
    createdAt: conv.created_at,
  }));

  return NextResponse.json({ conversations: formatted });
});

// POST /api/fitness/coach/messages - Start or get conversation with athlete
export const POST = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const body = await request.json();
  const { athleteId } = body;

  if (!athleteId) {
    return Errors.invalidInput("athleteId is required");
  }

  // Verify the athlete is coached by this coach
  const relationship = await prisma.coaching_relationships.findFirst({
    where: {
      coach_id: coach.id,
      athlete_id: athleteId,
      status: "ACTIVE",
    },
  });

  if (!relationship) {
    return Errors.forbidden("This athlete is not in your roster");
  }

  // Find or create conversation
  let conversation = await prisma.coaching_conversations.findUnique({
    where: {
      coach_id_athlete_id: {
        coach_id: coach.id,
        athlete_id: athleteId,
      },
    },
  });

  if (!conversation) {
    conversation = await prisma.coaching_conversations.create({
      data: {
        coach_id: coach.id,
        athlete_id: athleteId,
      },
    });
  }

  return NextResponse.json({ conversation });
});
