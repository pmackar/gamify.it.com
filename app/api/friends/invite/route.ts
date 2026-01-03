import { NextRequest, NextResponse } from "next/server";
import { requireAuth, getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { generateInviteCode, validateInviteCode } from "@/lib/invite-codes";

// GET /api/friends/invite - Generate an invite code for the current user
export async function GET() {
  try {
    const user = await requireAuth();

    const invite = generateInviteCode(user.id);

    return NextResponse.json({
      code: invite.code,
      link: invite.link,
      expiresAt: invite.expiresAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error generating invite code:", error);
    return NextResponse.json(
      { error: "Failed to generate invite code" },
      { status: 500 }
    );
  }
}

// POST /api/friends/invite - Redeem an invite code (send friend request to inviter)
export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { error: "Invite code is required" },
        { status: 400 }
      );
    }

    // Validate the invite code
    const validation = validateInviteCode(code);

    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Invalid invite code" },
        { status: 400 }
      );
    }

    const inviterId = validation.userId!;

    // Can't use your own invite code
    if (inviterId === user.id) {
      return NextResponse.json(
        { error: "Cannot use your own invite code" },
        { status: 400 }
      );
    }

    // Check if inviter exists
    const inviter = await prisma.profiles.findUnique({
      where: { id: inviterId },
      select: { id: true, display_name: true, username: true, avatar_url: true },
    });

    if (!inviter) {
      return NextResponse.json(
        { error: "Inviter not found" },
        { status: 404 }
      );
    }

    // Check for existing friendship in either direction
    const existingFriendship = await prisma.friendships.findFirst({
      where: {
        OR: [
          { requester_id: user.id, addressee_id: inviterId },
          { requester_id: inviterId, addressee_id: user.id },
        ],
      },
    });

    if (existingFriendship) {
      if (existingFriendship.status === "ACCEPTED") {
        return NextResponse.json({
          message: "Already friends",
          alreadyFriends: true,
          inviter,
        });
      }
      if (existingFriendship.status === "PENDING") {
        // If inviter already sent us a request, auto-accept
        if (existingFriendship.requester_id === inviterId) {
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
                user_id: inviterId,
                actor_id: user.id,
                type: "FRIEND_REQUEST_ACCEPTED",
                entity_type: "friendship",
                entity_id: updated.id,
              },
              {
                user_id: user.id,
                actor_id: inviterId,
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
            inviter,
          });
        }
        // We already sent them a request
        return NextResponse.json({
          message: "Friend request already pending",
          alreadyPending: true,
          inviter,
        });
      }
      if (existingFriendship.status === "BLOCKED") {
        return NextResponse.json(
          { error: "Cannot connect with this user" },
          { status: 403 }
        );
      }
      // DECLINED - allow re-sending
      if (existingFriendship.status === "DECLINED") {
        const updated = await prisma.friendships.update({
          where: { id: existingFriendship.id },
          data: {
            requester_id: user.id,
            addressee_id: inviterId,
            status: "PENDING",
            created_at: new Date(),
            accepted_at: null,
          },
        });

        await prisma.activity_feed.create({
          data: {
            user_id: inviterId,
            actor_id: user.id,
            type: "FRIEND_REQUEST_RECEIVED",
            entity_type: "friendship",
            entity_id: updated.id,
          },
        });

        return NextResponse.json({
          message: "Friend request sent",
          friendship: updated,
          inviter,
        });
      }
    }

    // Create new friend request from redeemer to inviter
    const friendship = await prisma.friendships.create({
      data: {
        requester_id: user.id,
        addressee_id: inviterId,
        status: "PENDING",
      },
    });

    // Create activity for inviter
    await prisma.activity_feed.create({
      data: {
        user_id: inviterId,
        actor_id: user.id,
        type: "FRIEND_REQUEST_RECEIVED",
        entity_type: "friendship",
        entity_id: friendship.id,
      },
    });

    return NextResponse.json({
      message: "Friend request sent",
      friendship,
      inviter,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error redeeming invite code:", error);
    return NextResponse.json(
      { error: "Failed to redeem invite code" },
      { status: 500 }
    );
  }
}
