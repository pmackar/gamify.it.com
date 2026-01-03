import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string; itemId: string }>;
}

// PATCH /api/quests/[questId]/items/[itemId] - Toggle item completion
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId, itemId } = await params;
  const { completed } = await request.json();

  if (typeof completed !== "boolean") {
    return NextResponse.json(
      { error: "completed must be a boolean" },
      { status: 400 }
    );
  }

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
    },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot modify completed quest" },
      { status: 400 }
    );
  }

  // Check if user has access (owner or party member)
  const isOwner = quest.user_id === user.id;
  const isPartyMember = quest.party?.members.some((m) => m.user_id === user.id);

  if (!isOwner && !isPartyMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Verify item belongs to quest
  const item = await prisma.travel_quest_items.findFirst({
    where: { id: itemId, quest_id: questId },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
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

  // If this was in a party, notify other members
  if (quest.party && quest.party.members.length > 1) {
    const otherMembers = quest.party.members.filter((m) => m.user_id !== user.id);
    if (otherMembers.length > 0 && completed) {
      // Get item name for notification
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

// DELETE /api/quests/[questId]/items/[itemId] - Remove item from quest
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId, itemId } = await params;

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
    },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot modify completed quest" },
      { status: 400 }
    );
  }

  // Check if user has access (owner or party member)
  const isOwner = quest.user_id === user.id;
  const isPartyMember = quest.party?.members.some((m) => m.user_id === user.id);

  if (!isOwner && !isPartyMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Verify item belongs to quest
  const item = await prisma.travel_quest_items.findFirst({
    where: { id: itemId, quest_id: questId },
    include: {
      location: { select: { name: true } },
    },
  });

  if (!item) {
    return NextResponse.json({ error: "Item not found" }, { status: 404 });
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
