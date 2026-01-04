import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const RespondSchema = z.object({
  action: z.enum(["accept", "decline"]),
});

const MAX_PARTY_MEMBERS = 10;

// POST /api/party-invites/[memberId]/respond - Accept or decline party invite
export const POST = withAuthParams<{ memberId: string }>(
  async (request, user, { memberId }) => {
    const body = await request.json();
    const parsed = RespondSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("action must be 'accept' or 'decline'");
    }

    const { action } = parsed.data;

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
      return Errors.notFound("Invite not found");
    }

    if (member.user_id !== user.id) {
      return Errors.forbidden("This invite is not for you");
    }

    if (member.status !== "PENDING") {
      return Errors.invalidInput("This invite has already been responded to");
    }

    if (action === "decline") {
      await prisma.quest_party_members.update({
        where: { id: memberId },
        data: { status: "DECLINED" },
      });

      return NextResponse.json({ success: true, status: "declined" });
    }

    // Accept
    if (member.party.members.length >= MAX_PARTY_MEMBERS) {
      return Errors.invalidInput("Party is now full");
    }

    await prisma.quest_party_members.update({
      where: { id: memberId },
      data: {
        status: "ACCEPTED",
        joined_at: new Date(),
      },
    });

    // Notify party members
    const otherMembers = member.party.members.filter(
      (m) => m.user_id !== user.id
    );
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
);
