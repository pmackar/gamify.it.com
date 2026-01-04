import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// DELETE /api/quests/[questId]/party/members/[userId] - Remove member from party
export const DELETE = withAuthParams<{ questId: string; userId: string }>(
  async (_request, user, { questId, userId: targetUserId }) => {
    const party = await prisma.quest_parties.findUnique({
      where: { quest_id: questId },
      include: {
        members: true,
        quest: {
          select: { user_id: true },
        },
      },
    });

    if (!party) {
      return Errors.notFound("Party not found");
    }

    const currentMember = party.members.find((m) => m.user_id === user.id);
    const targetMember = party.members.find((m) => m.user_id === targetUserId);

    if (!targetMember) {
      return Errors.notFound("User is not a member of this party");
    }

    // Check permissions:
    // - Quest owner can remove anyone except themselves
    // - Party owner can remove anyone except themselves
    // - Members can only remove themselves (use /leave endpoint)
    const isQuestOwner = party.quest.user_id === user.id;
    const isPartyOwner = currentMember?.role === "OWNER";
    const isSelf = user.id === targetUserId;

    if (isSelf) {
      return Errors.invalidInput("Use the /leave endpoint to leave the party");
    }

    if (!isQuestOwner && !isPartyOwner) {
      return Errors.forbidden("Only party/quest owner can remove members");
    }

    // Cannot remove the party owner
    if (targetMember.role === "OWNER") {
      return Errors.invalidInput("Cannot remove the party owner");
    }

    // Remove member
    await prisma.quest_party_members.delete({
      where: { id: targetMember.id },
    });

    return NextResponse.json({ success: true });
  }
);
