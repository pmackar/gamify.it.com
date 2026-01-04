import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/quests/[questId]/party - Get party details
export const GET = withAuthParams<{ questId: string }>(
  async (_request, user, { questId }) => {
    // Get the quest and verify access
    const quest = await prisma.travel_quests.findUnique({
      where: { id: questId },
      select: { id: true, user_id: true, name: true, status: true },
    });

    if (!quest) {
      return Errors.notFound("Quest not found");
    }

    // Get party if exists
    const party = await prisma.quest_parties.findUnique({
      where: { quest_id: questId },
      include: {
        members: {
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
          orderBy: [{ role: "asc" }, { joined_at: "asc" }],
        },
      },
    });

    if (!party) {
      return NextResponse.json({ party: null });
    }

    // Check if user is a member or quest owner
    const isMember = party.members.some(
      (m) => m.user_id === user.id && m.status === "ACCEPTED"
    );
    const isOwner = quest.user_id === user.id;

    if (!isMember && !isOwner) {
      return Errors.forbidden("Not authorized");
    }

    return NextResponse.json({
      party: {
        id: party.id,
        questId: party.quest_id,
        createdAt: party.created_at,
        members: party.members.map((m) => ({
          id: m.id,
          userId: m.user_id,
          role: m.role,
          status: m.status,
          invitedAt: m.invited_at,
          joinedAt: m.joined_at,
          user: {
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.display_name,
            avatarUrl: m.user.avatar_url,
            level: m.user.main_level || 1,
          },
        })),
      },
    });
  }
);

// POST /api/quests/[questId]/party - Create party for quest
export const POST = withAuthParams<{ questId: string }>(
  async (_request, user, { questId }) => {
    // Verify user owns the quest
    const quest = await prisma.travel_quests.findUnique({
      where: { id: questId },
      select: { id: true, user_id: true, status: true },
    });

    if (!quest) {
      return Errors.notFound("Quest not found");
    }

    if (quest.user_id !== user.id) {
      return Errors.forbidden("Only quest owner can create a party");
    }

    if (quest.status === "COMPLETED") {
      return Errors.invalidInput("Cannot create party for completed quest");
    }

    // Check if party already exists
    const existingParty = await prisma.quest_parties.findUnique({
      where: { quest_id: questId },
    });

    if (existingParty) {
      return Errors.invalidInput("Party already exists for this quest");
    }

    // Create party with owner as first member
    const party = await prisma.quest_parties.create({
      data: {
        quest_id: questId,
        members: {
          create: {
            user_id: user.id,
            role: "OWNER",
            status: "ACCEPTED",
            joined_at: new Date(),
          },
        },
      },
      include: {
        members: {
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
        },
      },
    });

    return NextResponse.json({
      party: {
        id: party.id,
        questId: party.quest_id,
        createdAt: party.created_at,
        members: party.members.map((m) => ({
          id: m.id,
          userId: m.user_id,
          role: m.role,
          status: m.status,
          invitedAt: m.invited_at,
          joinedAt: m.joined_at,
          user: {
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.display_name,
            avatarUrl: m.user.avatar_url,
            level: m.user.main_level || 1,
          },
        })),
      },
    });
  }
);
