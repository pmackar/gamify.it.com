import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";
import { generateInviteCode, validateInviteCode } from "@/lib/invite-codes";

const RedeemSchema = z.object({
  code: z.string().min(1),
});

// GET /api/friends/invite - Generate an invite code for the current user
export const GET = withAuth(async (_request, user) => {
  const invite = generateInviteCode(user.id);

  return NextResponse.json({
    code: invite.code,
    link: invite.link,
    expiresAt: invite.expiresAt.toISOString(),
  });
});

// POST /api/friends/invite - Redeem an invite code (send friend request to inviter)
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const parsed = RedeemSchema.safeParse(body);

  if (!parsed.success) {
    return Errors.invalidInput("Invite code is required");
  }

  const { code } = parsed.data;

  // Validate the invite code
  const validation = validateInviteCode(code);

  if (!validation.valid) {
    return Errors.invalidInput(validation.error || "Invalid invite code");
  }

  const inviterId = validation.userId!;

  // Can't use your own invite code
  if (inviterId === user.id) {
    return Errors.invalidInput("Cannot use your own invite code");
  }

  // Check if inviter exists
  const inviter = await prisma.profiles.findUnique({
    where: { id: inviterId },
    select: { id: true, display_name: true, username: true, avatar_url: true },
  });

  if (!inviter) {
    return Errors.notFound("Inviter not found");
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
      return Errors.forbidden("Cannot connect with this user");
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

  // Create friendship as ACCEPTED (inviter consented by generating the code)
  const friendship = await prisma.friendships.create({
    data: {
      requester_id: inviterId, // Inviter is the requester (they initiated via code)
      addressee_id: user.id, // Redeemer is the addressee
      status: "ACCEPTED",
      accepted_at: new Date(),
    },
  });

  // Create activity for both users
  await Promise.all([
    prisma.activity_feed.create({
      data: {
        user_id: inviterId,
        actor_id: user.id,
        type: "FRIEND_REQUEST_ACCEPTED",
        entity_type: "friendship",
        entity_id: friendship.id,
      },
    }),
    prisma.activity_feed.create({
      data: {
        user_id: user.id,
        actor_id: inviterId,
        type: "FRIEND_REQUEST_ACCEPTED",
        entity_type: "friendship",
        entity_id: friendship.id,
      },
    }),
  ]);

  return NextResponse.json({
    message: "You are now friends!",
    friendship,
    inviter,
    autoAccepted: true,
  });
});
