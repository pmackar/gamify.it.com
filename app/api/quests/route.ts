import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/quests - Create a new quest
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const {
    name,
    description,
    cityIds,
    neighborhoodIds,
    startDate,
    endDate,
    autoPopulate = true,
  } = body;

  // Validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json(
      { error: "Quest name is required" },
      { status: 400 }
    );
  }

  if (!cityIds || !Array.isArray(cityIds) || cityIds.length === 0) {
    return NextResponse.json(
      { error: "At least one city is required" },
      { status: 400 }
    );
  }

  // Verify cities exist and belong to user
  const cities = await prisma.travel_cities.findMany({
    where: {
      id: { in: cityIds },
      user_id: user.id,
    },
  });

  if (cities.length !== cityIds.length) {
    return NextResponse.json(
      { error: "One or more cities not found or not owned by user" },
      { status: 400 }
    );
  }

  // Verify neighborhoods if provided
  if (neighborhoodIds && neighborhoodIds.length > 0) {
    const neighborhoods = await prisma.travel_neighborhoods.findMany({
      where: {
        id: { in: neighborhoodIds },
        user_id: user.id,
        city_id: { in: cityIds }, // Must belong to selected cities
      },
    });

    if (neighborhoods.length !== neighborhoodIds.length) {
      return NextResponse.json(
        { error: "One or more neighborhoods not found or not in selected cities" },
        { status: 400 }
      );
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
      // Legacy fields - use first city/neighborhood for backward compatibility
      target_city_id: cityIds[0],
      target_neighborhood_id: neighborhoodIds?.[0] || null,
      // Multi-city/neighborhood via junction tables
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

  // Auto-populate from hotlist if requested
  let itemsCreated = 0;
  if (autoPopulate) {
    // Build location filter
    const locationFilter: {
      city_id?: { in: string[] };
      neighborhood_id?: { in: string[] };
    } = {};

    // If neighborhoods specified, filter by neighborhoods only
    if (neighborhoodIds && neighborhoodIds.length > 0) {
      locationFilter.neighborhood_id = { in: neighborhoodIds };
    } else {
      // Otherwise filter by cities
      locationFilter.city_id = { in: cityIds };
    }

    // Get user's hotlisted locations in target area
    const hotlistItems = await prisma.travel_user_location_data.findMany({
      where: {
        user_id: user.id,
        hotlist: true,
        location: locationFilter,
      },
      include: {
        location: {
          select: { id: true, name: true, type: true },
        },
      },
      orderBy: { updated_at: "desc" },
    });

    if (hotlistItems.length > 0) {
      await prisma.travel_quest_items.createMany({
        data: hotlistItems.map((item, index) => ({
          quest_id: quest.id,
          location_id: item.location_id,
          added_by_id: user.id,
          sort_order: index,
        })),
      });
      itemsCreated = hotlistItems.length;
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
  });
}

// GET /api/quests - List user's quests
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const limit = parseInt(searchParams.get("limit") || "50");
  const offset = parseInt(searchParams.get("offset") || "0");

  // Build where clause
  const where: {
    user_id: string;
    status?: string;
  } = { user_id: user.id };

  if (status && ["PLANNING", "ACTIVE", "COMPLETED", "ARCHIVED"].includes(status)) {
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
}
