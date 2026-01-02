import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { addXP, XP_VALUES } from "@/lib/gamification";
import { checkAchievements } from "@/lib/achievements";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// GET /api/quests/[questId] - Get quest details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;

  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      // Legacy single city/neighborhood
      target_city: {
        select: { id: true, name: true, country: true },
      },
      target_neighborhood: {
        select: { id: true, name: true },
      },
      // Multi-city/neighborhood support
      cities: {
        include: { city: { select: { id: true, name: true, country: true } } },
        orderBy: { sort_order: "asc" },
      },
      neighborhoods: {
        include: { neighborhood: { select: { id: true, name: true } } },
      },
      items: {
        include: {
          location: {
            select: {
              id: true,
              name: true,
              type: true,
              latitude: true,
              longitude: true,
              city: {
                select: { id: true, name: true, country: true },
              },
            },
          },
          added_by: {
            select: { id: true, username: true, display_name: true, avatar_url: true },
          },
          completed_by: {
            select: { id: true, username: true, display_name: true, avatar_url: true },
          },
        },
        orderBy: [{ sort_order: "asc" }, { completed: "asc" }],
      },
      party: {
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
      },
    },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // Check if user has access to this quest
  const isOwner = quest.user_id === user.id;
  const isPartyMember = quest.party?.members.some(
    (m) => m.user_id === user.id && m.status === "ACCEPTED"
  );

  if (!isOwner && !isPartyMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Calculate completion stats
  const totalItems = quest.items.length;
  const completedItems = quest.items.filter((i) => i.completed).length;

  return NextResponse.json({
    quest: {
      id: quest.id,
      name: quest.name,
      description: quest.description,
      status: quest.status,
      startDate: quest.start_date,
      endDate: quest.end_date,
      createdAt: quest.created_at,
      updatedAt: quest.updated_at,
      owner: {
        id: quest.user.id,
        username: quest.user.username,
        displayName: quest.user.display_name,
        avatarUrl: quest.user.avatar_url,
      },
      targetCity: quest.target_city
        ? {
            id: quest.target_city.id,
            name: quest.target_city.name,
            country: quest.target_city.country,
          }
        : null,
      targetNeighborhood: quest.target_neighborhood
        ? {
            id: quest.target_neighborhood.id,
            name: quest.target_neighborhood.name,
          }
        : null,
      // Multi-city/neighborhood arrays
      cities: quest.cities.map((qc) => ({
        id: qc.city.id,
        name: qc.city.name,
        country: qc.city.country,
      })),
      neighborhoods: quest.neighborhoods.map((qn) => ({
        id: qn.neighborhood.id,
        name: qn.neighborhood.name,
      })),
      items: quest.items.map((item) => ({
        id: item.id,
        completed: item.completed,
        completedAt: item.completed_at,
        sortOrder: item.sort_order,
        priority: item.priority,
        notes: item.notes,
        location: {
          id: item.location.id,
          name: item.location.name,
          type: item.location.type,
          latitude: item.location.latitude,
          longitude: item.location.longitude,
          photoUrl: null,
          city: item.location.city
            ? {
                id: item.location.city.id,
                name: item.location.city.name,
                country: item.location.city.country,
              }
            : null,
        },
        addedBy: item.added_by
          ? {
              id: item.added_by.id,
              username: item.added_by.username,
              displayName: item.added_by.display_name,
              avatarUrl: item.added_by.avatar_url,
            }
          : null,
        completedBy: item.completed_by
          ? {
              id: item.completed_by.id,
              username: item.completed_by.username,
              displayName: item.completed_by.display_name,
              avatarUrl: item.completed_by.avatar_url,
            }
          : null,
      })),
      party: quest.party
        ? {
            id: quest.party.id,
            questId: quest.party.quest_id,
            createdAt: quest.party.created_at,
            members: quest.party.members.map((m) => ({
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
          }
        : null,
      completionStats: {
        total: totalItems,
        completed: completedItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      },
    },
    isOwner,
    isPartyMember: isPartyMember || false,
    currentUserId: user.id,
  });
}

// PATCH /api/quests/[questId] - Complete quest
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;
  const { action } = await request.json();

  if (action !== "complete") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Get quest with party and items
  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    include: {
      items: true,
      party: {
        include: {
          members: {
            where: { status: "ACCEPTED" },
            include: {
              user: {
                select: { id: true, username: true, display_name: true },
              },
            },
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
      { error: "Quest is already completed" },
      { status: 400 }
    );
  }

  // Only owner can complete quest
  if (quest.user_id !== user.id) {
    return NextResponse.json(
      { error: "Only the quest owner can complete it" },
      { status: 403 }
    );
  }

  // Check that all items are completed
  const incompletItems = quest.items.filter((i) => !i.completed);
  if (incompletItems.length > 0) {
    return NextResponse.json(
      { error: "All items must be completed before finishing the quest" },
      { status: 400 }
    );
  }

  // Calculate XP
  const itemCount = quest.items.length;
  let baseXP = XP_VALUES.quest_complete_base + itemCount * XP_VALUES.quest_complete_per_item;

  const hasParty = quest.party && quest.party.members.length > 1;
  const partyMembers = quest.party?.members || [];

  let totalXP = baseXP;
  if (hasParty) {
    // Apply party bonus
    totalXP = Math.floor(baseXP * XP_VALUES.party_bonus_multiplier);
    // Add bonus per member
    totalXP += (partyMembers.length - 1) * XP_VALUES.party_member_bonus;
  }

  // Mark quest as completed
  await prisma.travel_quests.update({
    where: { id: questId },
    data: {
      status: "COMPLETED",
      updated_at: new Date(),
    },
  });

  // Award XP to owner
  const ownerXPResult = await addXP(user.id, totalXP);

  // Award XP to party members (same amount for fairness)
  const memberXPResults: { userId: string; username: string; xp: number }[] = [];
  if (hasParty) {
    for (const member of partyMembers) {
      if (member.user_id !== user.id) {
        await addXP(member.user_id, totalXP);
        memberXPResults.push({
          userId: member.user_id,
          username: member.user.display_name || member.user.username || "Unknown",
          xp: totalXP,
        });

        // Notify party members
        await prisma.activity_feed.create({
          data: {
            user_id: member.user_id,
            actor_id: user.id,
            type: "QUEST_COMPLETED",
            entity_type: "travel_quests",
            entity_id: questId,
            metadata: {
              questId,
              questName: quest.name,
              xpAwarded: totalXP,
            },
          },
        });
      }
    }
  }

  // Check achievements for all party members
  const achievementChecks = [checkAchievements(user.id)];
  for (const member of partyMembers) {
    if (member.user_id !== user.id) {
      achievementChecks.push(checkAchievements(member.user_id));
    }
  }
  await Promise.all(achievementChecks);

  return NextResponse.json({
    success: true,
    questId,
    xpAwarded: {
      base: baseXP,
      partyBonus: hasParty ? totalXP - baseXP : 0,
      total: totalXP,
    },
    partyMembers: memberXPResults,
    ownerLevelUp: ownerXPResult.leveledUp,
    ownerNewLevel: ownerXPResult.newLevel,
  });
}

// DELETE /api/quests/[questId] - Delete quest
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;

  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    select: { id: true, user_id: true, name: true },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // Only owner can delete quest
  if (quest.user_id !== user.id) {
    return NextResponse.json(
      { error: "Only the quest owner can delete it" },
      { status: 403 }
    );
  }

  // Delete quest (cascade will remove items, cities, neighborhoods, party)
  await prisma.travel_quests.delete({
    where: { id: questId },
  });

  return NextResponse.json({
    success: true,
    message: `Quest "${quest.name}" deleted successfully`,
  });
}
