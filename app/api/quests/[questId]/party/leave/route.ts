import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// POST /api/quests/[questId]/party/leave - Leave party
export const POST = withAuthParams<{ questId: string }>(
  async (_request, user, { questId }) => {
    const party = await prisma.quest_parties.findUnique({
      where: { quest_id: questId },
      include: {
        members: true,
      },
    });

    if (!party) {
      return Errors.notFound("Party not found");
    }

    const member = party.members.find((m) => m.user_id === user.id);

    if (!member) {
      return Errors.invalidInput("You are not a member of this party");
    }

    // Owner cannot leave - they must dissolve the party
    if (member.role === "OWNER") {
      return Errors.invalidInput(
        "Party owner cannot leave. Dissolve the party instead."
      );
    }

    // Remove member
    await prisma.quest_party_members.delete({
      where: { id: member.id },
    });

    return NextResponse.json({ success: true });
  }
);
