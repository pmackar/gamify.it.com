import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// POST /api/challenges/[id]/join - Join a challenge
export const POST = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const challenge = await prisma.challenges.findUnique({
      where: { id },
      select: { id: true, status: true, creator_id: true, title: true },
    });

    if (!challenge) {
      return Errors.notFound("Challenge not found");
    }

    if (challenge.status !== "ACTIVE" && challenge.status !== "DRAFT") {
      return Errors.invalidInput("Challenge is not accepting participants");
    }

    // Check if already a participant
    const existing = await prisma.challenge_participants.findUnique({
      where: {
        challenge_id_user_id: {
          challenge_id: id,
          user_id: user.id,
        },
      },
    });

    if (existing?.status === "JOINED") {
      return Errors.invalidInput("Already joined this challenge");
    }

    // Check if user is friends with creator (for non-public challenges)
    const isFriend = await prisma.friendships.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requester_id: user.id, addressee_id: challenge.creator_id },
          { requester_id: challenge.creator_id, addressee_id: user.id },
        ],
      },
    });

    const isCreator = challenge.creator_id === user.id;
    const isInvited = existing?.status === "INVITED";

    if (!isFriend && !isCreator && !isInvited) {
      return Errors.forbidden(
        "You must be friends with the creator or invited to join"
      );
    }

    // Join or update status
    if (existing) {
      await prisma.challenge_participants.update({
        where: { id: existing.id },
        data: {
          status: "JOINED",
          joined_at: new Date(),
        },
      });
    } else {
      await prisma.challenge_participants.create({
        data: {
          challenge_id: id,
          user_id: user.id,
          status: "JOINED",
          joined_at: new Date(),
        },
      });
    }

    // Notify challenge creator
    if (challenge.creator_id !== user.id) {
      await prisma.activity_feed.create({
        data: {
          user_id: challenge.creator_id,
          actor_id: user.id,
          type: "PARTY_MEMBER_JOINED", // Reusing for challenge joins
          entity_type: "challenge",
          entity_id: id,
          metadata: {
            challengeTitle: challenge.title,
            challengeId: id,
          },
        },
      });
    }

    return NextResponse.json({ success: true, joined: true });
  }
);
