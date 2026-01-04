import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const MAX_PARTY_MEMBERS = 10;

const InviteSchema = z.object({
  userId: z.string().uuid(),
});

// POST /api/quests/[questId]/party/invite - Invite friend to party
export const POST = withAuthParams<{ questId: string }>(
  async (request, user, { questId }) => {
    const body = await request.json();
    const parsed = InviteSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("userId is required");
    }

    const { userId } = parsed.data;

    // Get quest and party
    const quest = await prisma.travel_quests.findUnique({
      where: { id: questId },
      select: { id: true, user_id: true, status: true, name: true },
    });

    if (!quest) {
      return Errors.notFound("Quest not found");
    }

    if (quest.status === "COMPLETED") {
      return Errors.invalidInput("Cannot invite to completed quest");
    }

    const party = await prisma.quest_parties.findUnique({
      where: { quest_id: questId },
      include: {
        members: true,
      },
    });

    if (!party) {
      return Errors.notFound("Party not found. Create a party first.");
    }

    // Check if inviter is a member
    const inviterMember = party.members.find(
      (m) => m.user_id === user.id && m.status === "ACCEPTED"
    );

    if (!inviterMember) {
      return Errors.forbidden("You must be a party member to invite others");
    }

    // Check party size limit
    const acceptedMembers = party.members.filter((m) => m.status === "ACCEPTED");
    if (acceptedMembers.length >= MAX_PARTY_MEMBERS) {
      return Errors.invalidInput(`Party is full (max ${MAX_PARTY_MEMBERS} members)`);
    }

    // Check if user is already a member or invited
    const existingMember = party.members.find((m) => m.user_id === userId);
    if (existingMember) {
      if (existingMember.status === "ACCEPTED") {
        return Errors.invalidInput("User is already a party member");
      }
      if (existingMember.status === "PENDING") {
        return Errors.invalidInput("User already has a pending invite");
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
      return Errors.invalidInput("You can only invite friends to your party");
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
);
