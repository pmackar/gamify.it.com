import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// POST /api/challenges/[id]/leave - Leave a challenge
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const challenge = await prisma.challenges.findUnique({
    where: { id },
    select: { id: true, creator_id: true, status: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  // Creator cannot leave their own challenge
  if (challenge.creator_id === user.id) {
    return NextResponse.json(
      { error: "Creator cannot leave the challenge. Delete it instead." },
      { status: 400 }
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
    return NextResponse.json(
      { error: "Not a participant in this challenge" },
      { status: 400 }
    );
  }

  // Update status to LEFT
  await prisma.challenge_participants.update({
    where: { id: participant.id },
    data: { status: "LEFT" },
  });

  return NextResponse.json({ success: true, left: true });
}
