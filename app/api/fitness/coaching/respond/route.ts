import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/fitness/coaching/respond - Accept or decline coaching invite
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { relationship_id, action } = body;

    if (!relationship_id || !action) {
      return NextResponse.json(
        { error: "Missing relationship_id or action" },
        { status: 400 }
      );
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "Action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Invite not found or already responded" },
        { status: 404 }
      );
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
  } catch (error) {
    console.error("Error responding to coaching invite:", error);
    return NextResponse.json(
      { error: "Failed to respond to invite" },
      { status: 500 }
    );
  }
}
