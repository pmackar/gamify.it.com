import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// POST /api/quests/[questId]/party/leave - Leave party
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;

  const party = await prisma.quest_parties.findUnique({
    where: { quest_id: questId },
    include: {
      members: true,
    },
  });

  if (!party) {
    return NextResponse.json({ error: "Party not found" }, { status: 404 });
  }

  const member = party.members.find((m) => m.user_id === user.id);

  if (!member) {
    return NextResponse.json(
      { error: "You are not a member of this party" },
      { status: 400 }
    );
  }

  // Owner cannot leave - they must dissolve the party
  if (member.role === "OWNER") {
    return NextResponse.json(
      { error: "Party owner cannot leave. Dissolve the party instead." },
      { status: 400 }
    );
  }

  // Remove member
  await prisma.quest_party_members.delete({
    where: { id: member.id },
  });

  return NextResponse.json({ success: true });
}
