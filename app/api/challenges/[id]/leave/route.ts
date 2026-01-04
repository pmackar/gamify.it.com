import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// POST /api/challenges/[id]/leave - Leave a challenge
export const POST = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const challenge = await prisma.challenges.findUnique({
      where: { id },
      select: { id: true, creator_id: true, status: true },
    });

    if (!challenge) {
      return Errors.notFound("Challenge not found");
    }

    // Creator cannot leave their own challenge
    if (challenge.creator_id === user.id) {
      return Errors.invalidInput(
        "Creator cannot leave the challenge. Delete it instead."
      );
    }

    // Find participation
    const participant = await prisma.challenge_participants.findUnique({
      where: {
        challenge_id_user_id: {
          challenge_id: id,
          user_id: user.id,
        },
      },
    });

    if (!participant) {
      return Errors.invalidInput("Not a participant in this challenge");
    }

    // Update status to LEFT
    await prisma.challenge_participants.update({
      where: { id: participant.id },
      data: { status: "LEFT" },
    });

    return NextResponse.json({ success: true, left: true });
  }
);
