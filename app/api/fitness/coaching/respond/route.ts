import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const RespondSchema = z.object({
  relationship_id: z.string().uuid(),
  action: z.enum(["accept", "decline"]),
});

// POST /api/fitness/coaching/respond - Accept or decline coaching invite
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const parsed = RespondSchema.safeParse(body);

  if (!parsed.success) {
    return Errors.invalidInput("Missing relationship_id or action must be 'accept' or 'decline'");
  }

  const { relationship_id, action } = parsed.data;

  // Find the relationship
  const relationship = await prisma.coaching_relationships.findFirst({
      where: {
        id: relationship_id,
        athlete_id: user.id,
        status: "PENDING",
      },
      include: {
        coach: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                display_name: true,
              },
            },
          },
        },
      },
    });

  if (!relationship) {
    return Errors.notFound("Invite not found or already responded");
  }

  if (action === "accept") {
    // Accept the invite
    await prisma.coaching_relationships.update({
      where: { id: relationship.id },
      data: {
        status: "ACTIVE",
        accepted_at: new Date(),
      },
    });

    // Notify coach
    await prisma.activity_feed.create({
      data: {
        user_id: relationship.coach.user_id,
        actor_id: user.id,
        type: "PARTY_MEMBER_JOINED", // Reusing for coaching acceptance
        entity_type: "coaching",
        entity_id: relationship.id,
        metadata: {
          athlete_name: user.email,
          type: "coaching_accepted",
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: "Coaching invite accepted",
      status: "ACTIVE",
    });
  } else {
    // Decline the invite
    await prisma.coaching_relationships.update({
      where: { id: relationship.id },
      data: {
        status: "ENDED",
        ended_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: "Coaching invite declined",
      status: "ENDED",
    });
  }
});
