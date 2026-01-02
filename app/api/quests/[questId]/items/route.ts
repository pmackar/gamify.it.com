import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// POST /api/quests/[questId]/items - Add a location to quest
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;
  const body = await request.json();
  const { locationId, notes } = body;

  if (!locationId || typeof locationId !== "string") {
    return NextResponse.json(
      { error: "locationId is required" },
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
      items: {
        select: { sort_order: true },
        orderBy: { sort_order: "desc" },
        take: 1,
      },
    },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  if (quest.status === "COMPLETED") {
    return NextResponse.json(
      { error: "Cannot add items to a completed quest" },
      { status: 400 }
    );
  }

  // Check if user has access (owner or accepted party member)
  const isOwner = quest.user_id === user.id;
  const isPartyMember = quest.party?.members.some((m) => m.user_id === user.id);

  if (!isOwner && !isPartyMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Verify location exists
  const location = await prisma.travel_locations.findUnique({
    where: { id: locationId },
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Check if location is already in quest
  const existingItem = await prisma.travel_quest_items.findUnique({
    where: {
      quest_id_location_id: {
        quest_id: questId,
        location_id: locationId,
      },
    },
  });

  if (existingItem) {
    return NextResponse.json(
      { error: "Location is already in this quest" },
      { status: 409 }
    );
  }

  // Get next sort order
  const maxSortOrder = quest.items[0]?.sort_order ?? -1;
  const nextSortOrder = maxSortOrder + 1;

  // Create quest item
  const item = await prisma.travel_quest_items.create({
    data: {
      quest_id: questId,
      location_id: locationId,
      added_by_id: user.id,
      sort_order: nextSortOrder,
      notes: notes?.trim() || null,
    },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          type: true,
          latitude: true,
          longitude: true,
          city: { select: { id: true, name: true, country: true } },
          neighborhood: { select: { id: true, name: true } },
        },
      },
      added_by: {
        select: { id: true, username: true, display_name: true, avatar_url: true },
      },
    },
  });

  // Notify other party members
  if (quest.party && quest.party.members.length > 1) {
    const otherMembers = quest.party.members.filter((m) => m.user_id !== user.id);
    if (otherMembers.length > 0) {
      await prisma.activity_feed.createMany({
        data: otherMembers.map((m) => ({
          user_id: m.user_id,
          actor_id: user.id,
          type: "QUEST_ITEM_ADDED" as const,
          entity_type: "travel_quest_items",
          entity_id: item.id,
          metadata: {
            questId: quest.id,
            questName: quest.name,
            locationName: location.name,
          },
        })),
      });
    }
  }

  // Update quest's updated_at
  await prisma.travel_quests.update({
    where: { id: questId },
    data: { updated_at: new Date() },
  });

  return NextResponse.json({
    item: {
      id: item.id,
      completed: item.completed,
      completedAt: item.completed_at,
      sortOrder: item.sort_order,
      notes: item.notes,
      location: {
        id: item.location.id,
        name: item.location.name,
        type: item.location.type,
        latitude: item.location.latitude,
        longitude: item.location.longitude,
        city: item.location.city,
        neighborhood: item.location.neighborhood,
      },
      addedBy: item.added_by
        ? {
            id: item.added_by.id,
            username: item.added_by.username,
            displayName: item.added_by.display_name,
            avatarUrl: item.added_by.avatar_url,
          }
        : null,
    },
  });
}
