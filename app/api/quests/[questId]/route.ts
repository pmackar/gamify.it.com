import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";
import { awardXP, calculateQuestCompletionXP, checkAchievements } from "@/lib/services/gamification.service";
import { toUserPublicResponse } from "@/lib/services/response-transformers";

const PatchSchema = z.object({
  action: z.enum(["edit", "complete"]),
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).optional(),
  startDate: z.string().datetime().nullable().optional(),
  endDate: z.string().datetime().nullable().optional(),
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
});

// GET /api/quests/[questId] - Get quest details
export const GET = withAuthParams<{ questId: string }>(
  async (_request, user, { questId }) => {
    const quest = await prisma.travel_quests.findUnique({
      where: { id: questId },
      include: {
        user: {
          select: { id: true, username: true, display_name: true, avatar_url: true },
        },
        target_city: { select: { id: true, name: true, country: true } },
        target_neighborhood: { select: { id: true, name: true } },
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
                id: true, name: true, type: true, latitude: true, longitude: true,
                city: { select: { id: true, name: true, country: true } },
              },
            },
            added_by: { select: { id: true, username: true, display_name: true, avatar_url: true } },
            completed_by: { select: { id: true, username: true, display_name: true, avatar_url: true } },
          },
          orderBy: [{ sort_order: "asc" }, { completed: "asc" }],
        },
        party: {
          include: {
            members: {
              include: {
                user: { select: { id: true, username: true, display_name: true, avatar_url: true, main_level: true } },
              },
              orderBy: [{ role: "asc" }, { joined_at: "asc" }],
            },
          },
        },
      },
    });

    if (!quest) {
      return Errors.notFound("Quest not found");
    }

    const isOwner = quest.user_id === user.id;
    const isPartyMember = quest.party?.members.some(
      (m) => m.user_id === user.id && m.status === "ACCEPTED"
    );

    if (!isOwner && !isPartyMember) {
      return Errors.forbidden("Access denied");
    }

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
        owner: toUserPublicResponse(quest.user),
        targetCity: quest.target_city,
        targetNeighborhood: quest.target_neighborhood,
        cities: quest.cities.map((qc) => qc.city),
        neighborhoods: quest.neighborhoods.map((qn) => qn.neighborhood),
        items: quest.items.map((item) => ({
          id: item.id,
          completed: item.completed,
          completedAt: item.completed_at,
          sortOrder: item.sort_order,
          priority: item.priority,
          notes: item.notes,
          location: {
            ...item.location,
            photoUrl: null,
          },
          addedBy: item.added_by ? toUserPublicResponse(item.added_by) : null,
          completedBy: item.completed_by ? toUserPublicResponse(item.completed_by) : null,
        })),
        party: quest.party ? {
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
            user: { ...toUserPublicResponse(m.user), level: m.user.main_level || 1 },
          })),
        } : null,
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
);

// PATCH /api/quests/[questId] - Update or complete quest
export const PATCH = withAuthParams<{ questId: string }>(
  async (request, user, { questId }) => {
    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Invalid request body");
    }

    const { action, name, description, startDate, endDate, status } = parsed.data;

    // Handle edit action
    if (action === "edit") {
      const quest = await prisma.travel_quests.findUnique({
        where: { id: questId },
        select: { id: true, user_id: true },
      });

      if (!quest) {
        return Errors.notFound("Quest not found");
      }

      if (quest.user_id !== user.id) {
        return Errors.forbidden("Only the quest owner can edit it");
      }

      const updateData: Record<string, unknown> = { updated_at: new Date() };
      if (name !== undefined) updateData.name = name;
      if (description !== undefined) updateData.description = description;
      if (startDate !== undefined) updateData.start_date = startDate ? new Date(startDate) : null;
      if (endDate !== undefined) updateData.end_date = endDate ? new Date(endDate) : null;
      if (status !== undefined) updateData.status = status;

      const updatedQuest = await prisma.travel_quests.update({
        where: { id: questId },
        data: updateData,
        select: { id: true, name: true, description: true, status: true, start_date: true, end_date: true },
      });

      return NextResponse.json({
        success: true,
        quest: {
          id: updatedQuest.id,
          name: updatedQuest.name,
          description: updatedQuest.description,
          status: updatedQuest.status,
          startDate: updatedQuest.start_date,
          endDate: updatedQuest.end_date,
        },
      });
    }

    // Handle complete action
    const quest = await prisma.travel_quests.findUnique({
      where: { id: questId },
      include: {
        items: true,
        party: {
          include: {
            members: {
              where: { status: "ACCEPTED" },
              include: { user: { select: { id: true, username: true, display_name: true } } },
            },
          },
        },
      },
    });

    if (!quest) {
      return Errors.notFound("Quest not found");
    }

    if (quest.status === "COMPLETED") {
      return Errors.conflict("Quest is already completed");
    }

    if (quest.user_id !== user.id) {
      return Errors.forbidden("Only the quest owner can complete it");
    }

    const incompleteItems = quest.items.filter((i) => !i.completed);
    if (incompleteItems.length > 0) {
      return Errors.invalidInput("All items must be completed before finishing the quest");
    }

    // Calculate XP using gamification service
    const itemCount = quest.items.length;
    const hasParty = quest.party && quest.party.members.length > 1;
    const partyMembers = quest.party?.members || [];
    const totalXP = calculateQuestCompletionXP(itemCount, hasParty || false, partyMembers.length);

    // Mark quest as completed
    await prisma.travel_quests.update({
      where: { id: questId },
      data: { status: "COMPLETED", updated_at: new Date() },
    });

    // Award XP to owner using gamification service
    const ownerXPResult = await awardXP(user.id, "travel", totalXP, {
      reason: "quest_complete",
      metadata: { questId, questName: quest.name, itemCount },
    });

    // Award XP to party members
    const memberXPResults: { userId: string; username: string; xp: number }[] = [];
    if (hasParty) {
      for (const member of partyMembers) {
        if (member.user_id !== user.id) {
          await awardXP(member.user_id, "travel", totalXP, {
            reason: "quest_complete",
            metadata: { questId, questName: quest.name, itemCount },
          });
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
              metadata: { questId, questName: quest.name, xpAwarded: totalXP },
            },
          });
        }
      }
    }

    // Check achievements for all party members
    const achievementChecks = [checkAchievements(user.id, "travel")];
    for (const member of partyMembers) {
      if (member.user_id !== user.id) {
        achievementChecks.push(checkAchievements(member.user_id, "travel"));
      }
    }
    await Promise.all(achievementChecks);

    return NextResponse.json({
      success: true,
      questId,
      xpAwarded: {
        base: totalXP,
        partyBonus: hasParty ? Math.floor(totalXP * 0.25) : 0,
        total: totalXP,
      },
      partyMembers: memberXPResults,
      ownerLevelUp: ownerXPResult.appLeveledUp,
      ownerNewLevel: ownerXPResult.newAppLevel,
    });
  }
);

// DELETE /api/quests/[questId] - Delete quest
export const DELETE = withAuthParams<{ questId: string }>(
  async (_request, user, { questId }) => {
    const quest = await prisma.travel_quests.findUnique({
      where: { id: questId },
      select: { id: true, user_id: true, name: true },
    });

    if (!quest) {
      return Errors.notFound("Quest not found");
    }

    if (quest.user_id !== user.id) {
      return Errors.forbidden("Only the quest owner can delete it");
    }

    await prisma.travel_quests.delete({ where: { id: questId } });

    return NextResponse.json({
      success: true,
      message: `Quest "${quest.name}" deleted successfully`,
    });
  }
);
