import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// PATCH /api/quests/[questId]/items/reorder - Reorder quest items
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;
  const body = await request.json();
  const { items } = body;

  // Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json(
      { error: "items array is required" },
      { status: 400 }
    );
  }

  // Validate each item has id and sortOrder
  for (const item of items) {
    if (!item.id || typeof item.sortOrder !== "number") {
      return NextResponse.json(
        { error: "Each item must have id and sortOrder" },
        { status: 400 }
      );
    }
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
      items: {
        select: { id: true },
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

  // Verify all items belong to quest
  const questItemIds = new Set(quest.items.map((i) => i.id));
  for (const item of items) {
    if (!questItemIds.has(item.id)) {
      return NextResponse.json(
        { error: `Item ${item.id} does not belong to this quest` },
        { status: 400 }
      );
    }
  }

  // Update all items in a transaction
  await prisma.$transaction(
    items.map((item: { id: string; sortOrder: number }) =>
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
