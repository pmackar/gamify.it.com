import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const NudgeSchema = z.object({
  message: z.string().max(200).optional(),
});

// POST /api/accountability/[id]/nudge - Send a nudge to partner
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
    });

    if (!partnership) {
      return Errors.notFound("Partnership not found");
    }

    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
    }

    if (partnership.status !== "ACTIVE") {
      return Errors.invalidInput("Partnership is not active");
    }

    const partnerId =
      partnership.requester_id === user.id
        ? partnership.partner_id
        : partnership.requester_id;

    const body = await request.json();
    const parsed = NudgeSchema.safeParse(body);
    const message = parsed.success ? parsed.data.message : undefined;

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
      return Errors.invalidInput("Already nudged today. Try again tomorrow!");
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
  }
);

// GET /api/accountability/[id]/nudge - Get nudge history
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
    });

    if (!partnership) {
      return Errors.notFound("Partnership not found");
    }

    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
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
);
