import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/friends/respond - Accept or decline a friend request
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { friendshipId, action } = body;

    if (!friendshipId || !action) {
      return NextResponse.json(
        { error: "friendshipId and action are required" },
        { status: 400 }
      );
    }

    if (!["accept", "decline"].includes(action)) {
      return NextResponse.json(
        { error: "action must be 'accept' or 'decline'" },
        { status: 400 }
      );
    }

    // Find the friendship request
    const friendship = await prisma.friendships.findUnique({
      where: { id: friendshipId },
      include: {
        requester: {
          select: { id: true, display_name: true },
        },
      },
    });

    if (!friendship) {
      return NextResponse.json(
        { error: "Friend request not found" },
        { status: 404 }
      );
    }

    // Ensure the current user is the addressee (recipient of the request)
    if (friendship.addressee_id !== user.id) {
      return NextResponse.json(
        { error: "Not authorized to respond to this request" },
        { status: 403 }
      );
    }

    if (friendship.status !== "PENDING") {
      return NextResponse.json(
        { error: "This request has already been responded to" },
        { status: 400 }
      );
    }

    if (action === "accept") {
      const updated = await prisma.friendships.update({
        where: { id: friendshipId },
        data: {
          status: "ACCEPTED",
          accepted_at: new Date(),
        },
      });

      // Create activity for the requester
      await prisma.activity_feed.create({
        data: {
          user_id: friendship.requester_id,
          actor_id: user.id,
          type: "FRIEND_REQUEST_ACCEPTED",
          entity_type: "friendship",
          entity_id: friendshipId,
        },
      });

      return NextResponse.json({
        message: "Friend request accepted",
        friendship: updated,
      });
    } else {
      const updated = await prisma.friendships.update({
        where: { id: friendshipId },
        data: {
          status: "DECLINED",
        },
      });

      return NextResponse.json({
        message: "Friend request declined",
        friendship: updated,
      });
    }
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error responding to friend request:", error);
    return NextResponse.json(
      { error: "Failed to respond to friend request" },
      { status: 500 }
    );
  }
}
