import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

const MAX_PARTY_MEMBERS = 10;

// POST /api/quests/[questId]/party/invite - Invite friend to party
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;
  const { userId } = await request.json();

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 });
  }

  // Get quest and party
  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    select: { id: true, user_id: true, status: true, name: true },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot invite to completed quest" },
      { status: 400 }
    );
  }

  const party = await prisma.quest_parties.findUnique({
    where: { quest_id: questId },
    include: {
      members: true,
    },
  });

  if (!party) {
    return NextResponse.json(
      { error: "Party not found. Create a party first." },
      { status: 404 }
    );
  }

  // Check if inviter is a member
  const inviterMember = party.members.find(
    (m) => m.user_id === user.id && m.status === "ACCEPTED"
  );

  if (!inviterMember) {
    return NextResponse.json(
      { error: "You must be a party member to invite others" },
      { status: 403 }
    );
  }

  // Check party size limit
  const acceptedMembers = party.members.filter((m) => m.status === "ACCEPTED");
  if (acceptedMembers.length >= MAX_PARTY_MEMBERS) {
    return NextResponse.json(
      { error: `Party is full (max ${MAX_PARTY_MEMBERS} members)` },
      { status: 400 }
    );
  }

  // Check if user is already a member or invited
  const existingMember = party.members.find((m) => m.user_id === userId);
  if (existingMember) {
    if (existingMember.status === "ACCEPTED") {
      return NextResponse.json(
        { error: "User is already a party member" },
        { status: 400 }
      );
    }
    if (existingMember.status === "PENDING") {
      return NextResponse.json(
        { error: "User already has a pending invite" },
        { status: 400 }
      );
    }
  }

  // Verify they are friends
  const friendship = await prisma.friendships.findFirst({
    where: {
      status: "ACCEPTED",
      OR: [
        { requester_id: user.id, addressee_id: userId },
        { requester_id: userId, addressee_id: user.id },
      ],
    },
  });

  if (!friendship) {
    return NextResponse.json(
      { error: "You can only invite friends to your party" },
      { status: 400 }
    );
  }

  // Create the invite
  const member = await prisma.quest_party_members.create({
    data: {
      party_id: party.id,
      user_id: userId,
      role: "MEMBER",
      status: "PENDING",
    },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          main_level: true,
        },
      },
    },
  });

  // Create activity feed notification
  await prisma.activity_feed.create({
    data: {
      user_id: userId,
      actor_id: user.id,
      type: "PARTY_INVITE_RECEIVED",
      entity_type: "quest_party",
      entity_id: party.id,
      metadata: {
        questId: quest.id,
        questName: quest.name,
        memberId: member.id,
      },
    },
  });

  return NextResponse.json({
    member: {
      id: member.id,
      userId: member.user_id,
      role: member.role,
      status: member.status,
      invitedAt: member.invited_at,
      user: {
        id: member.user.id,
        username: member.user.username,
        displayName: member.user.display_name,
        avatarUrl: member.user.avatar_url,
        level: member.user.main_level || 1,
      },
    },
  });
}
