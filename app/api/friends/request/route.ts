import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/friends/request - Send a friend request
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { error: "userId is required" },
        { status: 400 }
      );
    }

    if (userId === user.id) {
      return NextResponse.json(
        { error: "Cannot send friend request to yourself" },
        { status: 400 }
      );
    }

    // Check if target user exists
    const targetUser = await prisma.profiles.findUnique({
      where: { id: userId },
      select: { id: true, display_name: true },
    });

    if (!targetUser) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    // Check for existing friendship in either direction
    const existingFriendship = await prisma.friendships.findFirst({
      where: {
        OR: [
          { requester_id: user.id, addressee_id: userId },
          { requester_id: userId, addressee_id: user.id },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === "ACCEPTED") {
        return NextResponse.json(
          { error: "Already friends with this user" },
          { status: 400 }
        );
      }
      if (existingFriendship.status === "PENDING") {
        // If they sent us a request, auto-accept
        if (existingFriendship.requester_id === userId) {
          const updated = await prisma.friendships.update({
            where: { id: existingFriendship.id },
            data: {
              status: "ACCEPTED",
              accepted_at: new Date(),
            },
          });

          // Create activity for both users
          await prisma.activity_feed.createMany({
            data: [
              {
                user_id: userId,
                actor_id: user.id,
                type: "FRIEND_REQUEST_ACCEPTED",
                entity_type: "friendship",
                entity_id: updated.id,
              },
              {
                user_id: user.id,
                actor_id: userId,
                type: "FRIEND_REQUEST_ACCEPTED",
                entity_type: "friendship",
                entity_id: updated.id,
              },
            ],
          });

          return NextResponse.json({
            message: "Friend request accepted",
            friendship: updated,
            autoAccepted: true,
          });
        }
        return NextResponse.json(
          { error: "Friend request already pending" },
          { status: 400 }
        );
      }
      if (existingFriendship.status === "BLOCKED") {
        return NextResponse.json(
          { error: "Cannot send friend request to this user" },
          { status: 403 }
        );
      }
      if (existingFriendship.status === "DECLINED") {
        // Allow re-sending if previously declined (update the existing record)
        const updated = await prisma.friendships.update({
          where: { id: existingFriendship.id },
          data: {
            requester_id: user.id,
            addressee_id: userId,
            status: "PENDING",
            created_at: new Date(),
            accepted_at: null,
          },
        });

        // Create activity for addressee
        await prisma.activity_feed.create({
          data: {
            user_id: userId,
            actor_id: user.id,
            type: "FRIEND_REQUEST_RECEIVED",
            entity_type: "friendship",
            entity_id: updated.id,
          },
        });

        return NextResponse.json({
          message: "Friend request sent",
          friendship: updated,
        });
      }
    }

    // Create new friend request
    const friendship = await prisma.friendships.create({
      data: {
        requester_id: user.id,
        addressee_id: userId,
        status: "PENDING",
      },
    });

    // Create activity for addressee
    await prisma.activity_feed.create({
      data: {
        user_id: userId,
        actor_id: user.id,
        type: "FRIEND_REQUEST_RECEIVED",
        entity_type: "friendship",
        entity_id: friendship.id,
      },
    });

    return NextResponse.json({
      message: "Friend request sent",
      friendship,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error sending friend request:", error);
    return NextResponse.json(
      { error: "Failed to send friend request" },
      { status: 500 }
    );
  }
}
