import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string; userId: string }>;
}

// DELETE /api/quests/[questId]/party/members/[userId] - Remove member from party
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId, userId: targetUserId } = await params;

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
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const currentMember = party.members.find((m) => m.user_id === user.id);
  const targetMember = party.members.find((m) => m.user_id === targetUserId);

  if (!targetMember) {
    return NextResponse.json(
      { error: "User is not a member of this party" },
      { status: 404 }
    );
  }

  // Check permissions:
  // - Quest owner can remove anyone except themselves
  // - Party owner can remove anyone except themselves
  // - Members can only remove themselves (use /leave endpoint)
  const isQuestOwner = party.quest.user_id === user.id;
  const isPartyOwner = currentMember?.role === "OWNER";
  const isSelf = user.id === targetUserId;

  if (isSelf) {
    return NextResponse.json(
      { error: "Use the /leave endpoint to leave the party" },
      { status: 400 }
    );
  }

  if (!isQuestOwner && !isPartyOwner) {
    return NextResponse.json(
      { error: "Only party/quest owner can remove members" },
      { status: 403 }
    );
  }

  // Cannot remove the party owner
  if (targetMember.role === "OWNER") {
    return NextResponse.json(
      { error: "Cannot remove the party owner" },
      { status: 400 }
    );
  }

  // Remove member
  await prisma.quest_party_members.delete({
    where: { id: targetMember.id },
  });

  return NextResponse.json({ success: true });
}
