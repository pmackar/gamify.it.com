import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const RespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

// POST /api/accountability/[id]/respond - Accept or decline partnership
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const body = await request.json();
    const parsed = RespondSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Invalid action");
    }

    const { action } = parsed.data;

    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
      include: {
        requester: {
          select: { id: true, display_name: true, username: true },
        },
      },
    });

    if (!partnership) {
      return Errors.notFound("Partnership not found");
    }

    // Only the partner (addressee) can respond
    if (partnership.partner_id !== user.id) {
      return Errors.forbidden("Not authorized");
    }

    if (partnership.status !== "PENDING") {
      return Errors.invalidInput("Partnership is not pending");
    }

    if (action === "accept") {
      await prisma.accountability_partnerships.update({
        where: { id },
        data: {
          status: "ACTIVE",
          started_at: new Date(),
        },
      });

      // Notify requester
      await prisma.activity_feed.create({
        data: {
          user_id: partnership.requester_id,
          actor_id: user.id,
          type: "FRIEND_REQUEST_ACCEPTED", // Reusing
          entity_type: "accountability_partnership",
          entity_id: id,
          metadata: {
            partnershipId: id,
          },
        },
      });

      return NextResponse.json({ success: true, status: "ACTIVE" });
    } else {
      await prisma.accountability_partnerships.update({
        where: { id },
        data: {
          status: "ENDED",
          ended_at: new Date(),
        },
      });

      return NextResponse.json({ success: true, status: "ENDED" });
    }
  }
);
