import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const ReorderItemSchema = z.object({
  id: z.string().uuid(),
  sortOrder: z.number().int().min(0),
});

const ReorderSchema = z.object({
  items: z.array(ReorderItemSchema).min(1),
});

// PATCH /api/quests/[questId]/items/reorder - Reorder quest items
export const PATCH = withAuthParams<{ questId: string }>(
  async (request, user, { questId }) => {
    const body = await request.json();
    const parsed = ReorderSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("items array is required with id and sortOrder");
    }

    const { items } = parsed.data;

    // Get quest with party info
    const quest = await prisma.travel_quests.findUnique({
      where: { id: questId },
      include: {
        party: {
          include: {
            members: {
              where: { status: "ACCEPTED" },
            },
          },
        },
        items: {
          select: { id: true },
        },
      },
    });

    if (!quest) {
      return Errors.notFound("Quest not found");
    }

    if (quest.status === "COMPLETED") {
      return Errors.invalidInput("Cannot modify completed quest");
    }

    // Check if user has access (owner or party member)
    const isOwner = quest.user_id === user.id;
    const isPartyMember = quest.party?.members.some(
      (m) => m.user_id === user.id
    );

    if (!isOwner && !isPartyMember) {
      return Errors.forbidden("Access denied");
    }

    // Verify all items belong to quest
    const questItemIds = new Set(quest.items.map((i) => i.id));
    for (const item of items) {
      if (!questItemIds.has(item.id)) {
        return Errors.invalidInput(
          `Item ${item.id} does not belong to this quest`
        );
      }
    }

    // Update all items in a transaction
    await prisma.$transaction(
      items.map((item) =>
        prisma.travel_quest_items.update({
          where: { id: item.id },
          data: { sort_order: item.sortOrder },
        })
      )
    );

    // Update quest's updated_at
    await prisma.travel_quests.update({
      where: { id: questId },
      data: { updated_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: "Items reordered successfully",
      itemCount: items.length,
    });
  }
);
