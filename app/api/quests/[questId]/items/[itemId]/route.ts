import { z } from "zod";
import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const PatchSchema = z.object({
  completed: z.boolean(),
  rating: z.number().min(0.5).max(5).optional(),
  review: z.string().max(2000).optional(),
});

// Check quest access for user
async function checkQuestAccess(questId: string, userId: string) {
  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    include: {
      party: {
        include: {
          members: { where: { status: "ACCEPTED" } },
        },
      },
    },
  });

  if (!quest) {
    return { error: "not_found" as const, quest: null };
  }

  if (quest.status === "COMPLETED") {
    return { error: "completed" as const, quest };
  }

  const isOwner = quest.user_id === userId;
  const isPartyMember = quest.party?.members.some((m) => m.user_id === userId);

  if (!isOwner && !isPartyMember) {
    return { error: "forbidden" as const, quest };
  }

  return { error: null, quest };
}

// PATCH /api/quests/[questId]/items/[itemId] - Toggle item completion
export const PATCH = withAuthParams<{ questId: string; itemId: string }>(
  async (request, user, { questId, itemId }) => {
    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("completed must be a boolean");
    }

    const { completed, rating, review } = parsed.data;

    // Check quest access
    const { error, quest } = await checkQuestAccess(questId, user.id);

    if (error === "not_found") {
      return Errors.notFound("Quest not found");
    }
    if (error === "completed") {
      return Errors.invalidInput("Cannot modify completed quest");
    }
    if (error === "forbidden") {
      return Errors.forbidden("Access denied");
    }

    // Verify item belongs to quest
    const item = await prisma.travel_quest_items.findFirst({
      where: { id: itemId, quest_id: questId },
    });

    if (!item) {
      return Errors.notFound("Item not found");
    }

    // Update item
    const updatedItem = await prisma.travel_quest_items.update({
      where: { id: itemId },
      data: {
        completed,
        completed_at: completed ? new Date() : null,
        completed_by_id: completed ? user.id : null,
      },
    });

    // Update quest's updated_at
    await prisma.travel_quests.update({
      where: { id: questId },
      data: { updated_at: new Date() },
    });

    // If completing and rating/review provided, save to user location data
    if (completed && (rating || review)) {
      if (rating) {
        await prisma.travel_user_location_data.upsert({
          where: {
            user_id_location_id: {
              user_id: user.id,
              location_id: item.location_id,
            },
          },
          update: {
            personal_rating: rating,
            visited: true,
            visit_count: { increment: 1 },
            last_visited_at: new Date(),
          },
          create: {
            user_id: user.id,
            location_id: item.location_id,
            personal_rating: rating,
            visited: true,
            visit_count: 1,
            last_visited_at: new Date(),
          },
        });
      }

      // Create review if provided
      if (review?.trim() && rating) {
        await prisma.travel_reviews.create({
          data: {
            author_id: user.id,
            location_id: item.location_id,
            content: review.trim(),
            rating: rating,
          },
        });
      }
    }

    // If this was in a party, notify other members
    if (quest?.party && quest.party.members.length > 1) {
      const otherMembers = quest.party.members.filter((m) => m.user_id !== user.id);
      if (otherMembers.length > 0 && completed) {
        const itemWithLocation = await prisma.travel_quest_items.findUnique({
          where: { id: itemId },
          include: { location: { select: { name: true } } },
        });
        const itemName = itemWithLocation?.location?.name || "an item";

        await prisma.activity_feed.createMany({
          data: otherMembers.map((m) => ({
            user_id: m.user_id,
            actor_id: user.id,
            type: "QUEST_ITEM_COMPLETED" as const,
            entity_type: "travel_quest_items",
            entity_id: itemId,
            metadata: {
              questId: quest.id,
              questName: quest.name,
              itemId: itemId,
              itemName: itemName,
            },
          })),
        });
      }
    }

    return NextResponse.json({
      item: {
        id: updatedItem.id,
        completed: updatedItem.completed,
        completedAt: updatedItem.completed_at,
        completedById: updatedItem.completed_by_id,
      },
    });
  }
);

// DELETE /api/quests/[questId]/items/[itemId] - Remove item from quest
export const DELETE = withAuthParams<{ questId: string; itemId: string }>(
  async (request, user, { questId, itemId }) => {
    // Check quest access
    const { error, quest } = await checkQuestAccess(questId, user.id);

    if (error === "not_found") {
      return Errors.notFound("Quest not found");
    }
    if (error === "completed") {
      return Errors.invalidInput("Cannot modify completed quest");
    }
    if (error === "forbidden") {
      return Errors.forbidden("Access denied");
    }

    // Verify item belongs to quest
    const item = await prisma.travel_quest_items.findFirst({
      where: { id: itemId, quest_id: questId },
      include: {
        location: { select: { name: true } },
      },
    });

    if (!item) {
      return Errors.notFound("Item not found");
    }

    // Delete item
    await prisma.travel_quest_items.delete({
      where: { id: itemId },
    });

    // Update quest's updated_at
    await prisma.travel_quests.update({
      where: { id: questId },
      data: { updated_at: new Date() },
    });

    return NextResponse.json({
      success: true,
      message: `"${item.location.name}" removed from quest`,
    });
  }
);
