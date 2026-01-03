import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/accountability/[id]/nudge - Send a nudge to partner
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const partnership = await prisma.accountability_partnerships.findUnique({
    where: { id },
  });

  if (!partnership) {
    return NextResponse.json(
      { error: "Partnership not found" },
      { status: 404 }
    );
  }

  if (
    partnership.requester_id !== user.id &&
    partnership.partner_id !== user.id
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (partnership.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Partnership is not active" },
      { status: 400 }
    );
  }

  const partnerId =
    partnership.requester_id === user.id
      ? partnership.partner_id
      : partnership.requester_id;

  try {
    const body = await request.json();
    const { message } = body;

    // Check if already nudged today
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const recentNudge = await prisma.partnership_nudges.findFirst({
      where: {
        partnership_id: id,
        sender_id: user.id,
        created_at: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (recentNudge) {
      return NextResponse.json(
        { error: "Already nudged today. Try again tomorrow!" },
        { status: 400 }
      );
    }

    // Create nudge
    const nudge = await prisma.partnership_nudges.create({
      data: {
        partnership_id: id,
        sender_id: user.id,
        recipient_id: partnerId,
        message,
      },
    });

    // Notify partner
    await prisma.activity_feed.create({
      data: {
        user_id: partnerId,
        actor_id: user.id,
        type: "KUDOS", // Reusing for nudges
        entity_type: "accountability_nudge",
        entity_id: nudge.id,
        metadata: {
          partnershipId: id,
          message: message || "Your accountability partner sent you a nudge! 💪",
        },
      },
    });

    return NextResponse.json({
      success: true,
      nudge: {
        id: nudge.id,
        message: nudge.message,
        createdAt: nudge.created_at.toISOString(),
      },
    });
  } catch (error) {
    console.error("Error sending nudge:", error);
    return NextResponse.json(
      { error: "Failed to send nudge" },
      { status: 500 }
    );
  }
}

// GET /api/accountability/[id]/nudge - Get nudge history
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const partnership = await prisma.accountability_partnerships.findUnique({
    where: { id },
  });

  if (!partnership) {
    return NextResponse.json(
      { error: "Partnership not found" },
      { status: 404 }
    );
  }

  if (
    partnership.requester_id !== user.id &&
    partnership.partner_id !== user.id
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const nudges = await prisma.partnership_nudges.findMany({
    where: { partnership_id: id },
    include: {
      sender: {
        select: {
          id: true,
          username: true,
          display_name: true,
        },
      },
    },
    orderBy: { created_at: "desc" },
    take: 20,
  });

  // Mark received nudges as read
  await prisma.partnership_nudges.updateMany({
    where: {
      partnership_id: id,
      recipient_id: user.id,
      read: false,
    },
    data: { read: true },
  });

  return NextResponse.json({
    nudges: nudges.map((n) => ({
      id: n.id,
      message: n.message,
      sentByMe: n.sender_id === user.id,
      sender: {
        id: n.sender.id,
        username: n.sender.username,
        displayName: n.sender.display_name,
      },
      createdAt: n.created_at.toISOString(),
    })),
  });
}
