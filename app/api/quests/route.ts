import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateBody, validateQuery, Errors } from "@/lib/api";

// Query params schema for GET
const questsQuerySchema = z.object({
  status: z.enum(["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Body schema for POST
const createQuestSchema = z.object({
  name: z.string().trim().min(1).max(200),
  description: z.string().trim().max(2000).optional().nullable(),
  cityIds: z.array(z.string().uuid()).min(1),
  neighborhoodIds: z.array(z.string().uuid()).optional(),
  startDate: z.string().datetime().optional().nullable(),
  endDate: z.string().datetime().optional().nullable(),
  autoPopulate: z.boolean().default(true),
  inviteUserIds: z.array(z.string().uuid()).optional().default([]),
});

// POST /api/quests - Create a new quest
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createQuestSchema);
  if (body instanceof NextResponse) return body;

  const { name, description, cityIds, neighborhoodIds, startDate, endDate, autoPopulate, inviteUserIds } = body;

  try {
    // Verify cities exist and belong to user
    const cities = await prisma.travel_cities.findMany({
      where: {
        id: { in: cityIds },
        user_id: user.id,
      },
    });

    if (cities.length !== cityIds.length) {
      return Errors.invalidInput("One or more cities not found or not owned by user");
    }

    // Verify neighborhoods if provided
    if (neighborhoodIds && neighborhoodIds.length > 0) {
      const neighborhoods = await prisma.travel_neighborhoods.findMany({
        where: {
          id: { in: neighborhoodIds },
          user_id: user.id,
          city_id: { in: cityIds },
        },
      });

      if (neighborhoods.length !== neighborhoodIds.length) {
        return Errors.invalidInput("One or more neighborhoods not found or not in selected cities");
      }
    }

    // Create the quest
    const quest = await prisma.travel_quests.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        start_date: startDate ? new Date(startDate) : null,
        end_date: endDate ? new Date(endDate) : null,
        status: "PLANNING",
        user_id: user.id,
        target_city_id: cityIds[0],
        target_neighborhood_id: neighborhoodIds?.[0] || null,
        cities: {
          createMany: {
            data: cityIds.map((cityId: string, index: number) => ({
              city_id: cityId,
              sort_order: index,
            })),
          },
        },
        neighborhoods: neighborhoodIds?.length
          ? {
              createMany: {
                data: neighborhoodIds.map((neighborhoodId: string) => ({
                  neighborhood_id: neighborhoodId,
                })),
              },
            }
          : undefined,
      },
      include: {
        cities: {
          include: { city: { select: { id: true, name: true, country: true } } },
          orderBy: { sort_order: "asc" },
        },
        neighborhoods: {
          include: { neighborhood: { select: { id: true, name: true } } },
        },
      },
    });

    // Create party and send invites if users were selected
    let partyCreated = false;
    if (inviteUserIds && inviteUserIds.length > 0) {
      const invitedUsers = await prisma.profiles.findMany({
        where: { id: { in: inviteUserIds } },
        select: { id: true },
      });

      if (invitedUsers.length > 0) {
        await prisma.quest_parties.create({
          data: {
            quest_id: quest.id,
            members: {
              createMany: {
                data: [
                  { user_id: user.id, role: "OWNER", status: "ACCEPTED" },
                  ...invitedUsers.map((u) => ({
                    user_id: u.id,
                    role: "MEMBER" as const,
                    status: "PENDING" as const,
                  })),
                ],
              },
            },
          },
        });
        partyCreated = true;

        try {
          await prisma.activity_feed.createMany({
            data: invitedUsers.map((u) => ({
              user_id: u.id,
              actor_id: user.id,
              type: "PARTY_INVITE_RECEIVED",
              entity_type: "travel_quests",
              entity_id: quest.id,
              metadata: {
                questId: quest.id,
                questName: quest.name,
                invitedBy: user.id,
                invitedByName: user.email,
              },
            })),
          });
        } catch {
          // Activity feed is optional
        }
      }
    }

    // Auto-populate from hotlist if requested
    let itemsCreated = 0;
    if (autoPopulate) {
      const locationFilter: {
        city_id?: { in: string[] };
        neighborhood_id?: { in: string[] };
      } = {};

      if (neighborhoodIds && neighborhoodIds.length > 0) {
        locationFilter.neighborhood_id = { in: neighborhoodIds };
      } else {
        locationFilter.city_id = { in: cityIds };
      }

      const partyMemberIds = [user.id];
      if (inviteUserIds && inviteUserIds.length > 0) {
        partyMemberIds.push(...inviteUserIds);
      }

      const hotlistItems = await prisma.travel_user_location_data.findMany({
        where: {
          user_id: { in: partyMemberIds },
          hotlist: true,
          location: locationFilter,
        },
        include: {
          location: { select: { id: true, name: true, type: true } },
          user: { select: { id: true } },
        },
        orderBy: { updated_at: "desc" },
      });

      const locationHotlistMap = new Map<string, { locationId: string; hotlistedBy: string[]; isOwnerHotlist: boolean }>();
      for (const item of hotlistItems) {
        if (!locationHotlistMap.has(item.location_id)) {
          locationHotlistMap.set(item.location_id, {
            locationId: item.location_id,
            hotlistedBy: [],
            isOwnerHotlist: false,
          });
        }
        const entry = locationHotlistMap.get(item.location_id)!;
        entry.hotlistedBy.push(item.user.id);
        if (item.user.id === user.id) {
          entry.isOwnerHotlist = true;
        }
      }

      const sortedLocations = Array.from(locationHotlistMap.values())
        .sort((a, b) => {
          if (a.isOwnerHotlist !== b.isOwnerHotlist) {
            return a.isOwnerHotlist ? -1 : 1;
          }
          return b.hotlistedBy.length - a.hotlistedBy.length;
        });

      if (sortedLocations.length > 0) {
        await prisma.travel_quest_items.createMany({
          data: sortedLocations.map((item, index) => ({
            quest_id: quest.id,
            location_id: item.locationId,
            added_by_id: user.id,
            sort_order: index,
          })),
        });
        itemsCreated = sortedLocations.length;
      }
    }

    // Fetch the complete quest with items
    const completeQuest = await prisma.travel_quests.findUnique({
      where: { id: quest.id },
      include: {
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
                city: { select: { name: true, country: true } },
                neighborhood: { select: { name: true } },
              },
            },
            added_by: {
              select: { id: true, username: true, display_name: true, avatar_url: true },
            },
          },
          orderBy: { sort_order: "asc" },
        },
      },
    });

    return NextResponse.json({
      quest: {
        id: completeQuest!.id,
        name: completeQuest!.name,
        description: completeQuest!.description,
        status: completeQuest!.status,
        startDate: completeQuest!.start_date,
        endDate: completeQuest!.end_date,
        createdAt: completeQuest!.created_at,
        cities: completeQuest!.cities.map((qc) => ({
          id: qc.city.id,
          name: qc.city.name,
          country: qc.city.country,
        })),
        neighborhoods: completeQuest!.neighborhoods.map((qn) => ({
          id: qn.neighborhood.id,
          name: qn.neighborhood.name,
        })),
        items: completeQuest!.items.map((item) => ({
          id: item.id,
          completed: item.completed,
          sortOrder: item.sort_order,
          location: {
            id: item.location.id,
            name: item.location.name,
            type: item.location.type,
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
        })),
        itemCount: completeQuest!.items.length,
      },
      autoPopulated: autoPopulate,
      itemsCreated,
      partyCreated,
      invitedCount: partyCreated ? inviteUserIds.length : 0,
    });
  } catch (error) {
    console.error("Error creating quest:", error);
    return Errors.database("Failed to create quest");
  }
});

// GET /api/quests - List user's quests
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, questsQuerySchema);
  if (params instanceof NextResponse) return params;

  const { status, limit, offset } = params;

  try {
    const where: {
      user_id: string;
      status?: "PLANNING" | "ACTIVE" | "COMPLETED" | "ARCHIVED";
    } = { user_id: user.id };

    if (status) {
      where.status = status;
    }

    const [quests, total] = await Promise.all([
      prisma.travel_quests.findMany({
        where,
        include: {
          cities: {
            include: { city: { select: { id: true, name: true, country: true } } },
            orderBy: { sort_order: "asc" },
          },
          neighborhoods: {
            include: { neighborhood: { select: { id: true, name: true } } },
          },
          items: {
            select: { id: true, completed: true },
          },
          party: {
            include: {
              members: {
                where: { status: "ACCEPTED" },
                include: {
                  user: {
                    select: { id: true, username: true, display_name: true, avatar_url: true },
                  },
                },
                take: 5,
              },
            },
          },
        },
        orderBy: { updated_at: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.travel_quests.count({ where }),
    ]);

    return NextResponse.json({
      quests: quests.map((quest) => ({
        id: quest.id,
        name: quest.name,
        description: quest.description,
        status: quest.status,
        startDate: quest.start_date,
        endDate: quest.end_date,
        createdAt: quest.created_at,
        updatedAt: quest.updated_at,
        cities: quest.cities.map((qc) => ({
          id: qc.city.id,
          name: qc.city.name,
          country: qc.city.country,
        })),
        neighborhoods: quest.neighborhoods.map((qn) => ({
          id: qn.neighborhood.id,
          name: qn.neighborhood.name,
        })),
        completionStats: {
          total: quest.items.length,
          completed: quest.items.filter((i) => i.completed).length,
          percentage:
            quest.items.length > 0
              ? Math.round(
                  (quest.items.filter((i) => i.completed).length / quest.items.length) * 100
                )
              : 0,
        },
        party: quest.party
          ? {
              memberCount: quest.party.members.length,
              members: quest.party.members.map((m) => ({
                id: m.user.id,
                username: m.user.username,
                displayName: m.user.display_name,
                avatarUrl: m.user.avatar_url,
              })),
            }
          : null,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + quests.length < total,
      },
    });
  } catch (error) {
    console.error("Error fetching quests:", error);
    return NextResponse.json({
      quests: [],
      pagination: { total: 0, limit: 50, offset: 0, hasMore: false },
    });
  }
});
