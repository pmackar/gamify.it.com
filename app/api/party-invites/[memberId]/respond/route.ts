import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ memberId: string }>;
}

// POST /api/party-invites/[memberId]/respond - Accept or decline party invite
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { memberId } = await params;
  const { action } = await request.json();

  if (!action || !["accept", "decline"].includes(action)) {
    return NextResponse.json(
      { error: "action must be 'accept' or 'decline'" },
      { status: 400 }
    );
  }

  const member = await prisma.quest_party_members.findUnique({
    where: { id: memberId },
    include: {
      party: {
        include: {
          quest: {
            select: { id: true, name: true, user_id: true },
          },
          members: {
            where: { status: "ACCEPTED" },
          },
        },
      },
    },
  });

  if (!member) {
    return NextResponse.json({ error: "Invite not found" }, { status: 404 });
  }

  if (member.user_id !== user.id) {
    return NextResponse.json(
      { error: "This invite is not for you" },
      { status: 403 }
    );
  }

  if (member.status !== "PENDING") {
    return NextResponse.json(
      { error: "This invite has already been responded to" },
      { status: 400 }
    );
  }

  if (action === "decline") {
    await prisma.quest_party_members.update({
      where: { id: memberId },
      data: { status: "DECLINED" },
    });

    return NextResponse.json({ success: true, status: "declined" });
  }

  // Accept
  const MAX_PARTY_MEMBERS = 10;
  if (member.party.members.length >= MAX_PARTY_MEMBERS) {
    return NextResponse.json(
      { error: "Party is now full" },
      { status: 400 }
    );
  }

  await prisma.quest_party_members.update({
    where: { id: memberId },
    data: {
      status: "ACCEPTED",
      joined_at: new Date(),
    },
  });

  // Notify party members
  const otherMembers = member.party.members.filter((m) => m.user_id !== user.id);
  if (otherMembers.length > 0) {
    await prisma.activity_feed.createMany({
      data: otherMembers.map((m) => ({
        user_id: m.user_id,
        actor_id: user.id,
        type: "PARTY_MEMBER_JOINED" as const,
        entity_type: "quest_party",
        entity_id: member.party.id,
        metadata: {
          questId: member.party.quest.id,
          questName: member.party.quest.name,
        },
      })),
    });
  }

  return NextResponse.json({
    success: true,
    status: "accepted",
    questId: member.party.quest.id,
  });
}
