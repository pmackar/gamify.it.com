import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// GET /api/quests/[questId]/suggestions - Get locations for quest
// Query params:
//   scope: "hotlist" (default) | "neighborhood" | "city" | "all"
//   search: optional search string
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") || "hotlist";
  const search = searchParams.get("search") || "";

  // Get quest with cities, neighborhoods, items, and party
  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    include: {
      cities: {
        include: {
          city: { select: { id: true, name: true, country: true } },
        },
      },
      neighborhoods: {
        include: {
          neighborhood: { select: { id: true, name: true } },
        },
      },
      items: {
        select: { location_id: true },
      },
      party: {
        include: {
          members: {
            where: { status: "ACCEPTED" },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatar_url: true,
                },
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

  // Check if user has access (owner or accepted party member)
  const isOwner = quest.user_id === user.id;
  const isPartyMember = quest.party?.members.some((m) => m.user_id === user.id);

  if (!isOwner && !isPartyMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Get party member IDs (include owner)
  const partyMemberIds = quest.party
    ? quest.party.members.map((m) => m.user_id)
    : [quest.user_id];

  // Ensure owner is included
  if (!partyMemberIds.includes(quest.user_id)) {
    partyMemberIds.push(quest.user_id);
  }

  // Get city and neighborhood IDs
  const questCityIds = quest.cities.map((c) => c.city_id);
  const questNeighborhoodIds = quest.neighborhoods.map((n) => n.neighborhood_id);

  // Build location filter based on scope
  type LocationFilter = {
    city_id?: { in: string[] };
    neighborhood_id?: { in: string[] };
    OR?: Array<{
      name?: { contains: string; mode: "insensitive" };
      address?: { contains: string; mode: "insensitive" };
    }>;
  };

  const locationFilter: LocationFilter = {};

  // Apply geographic filter based on scope
  if (scope === "neighborhood" && questNeighborhoodIds.length > 0) {
    locationFilter.neighborhood_id = { in: questNeighborhoodIds };
  } else if (scope === "city" || (scope === "neighborhood" && questNeighborhoodIds.length === 0)) {
    if (questCityIds.length > 0) {
      locationFilter.city_id = { in: questCityIds };
    }
  } else if (scope === "hotlist") {
    // For hotlist, apply the most specific filter
    if (questNeighborhoodIds.length > 0) {
      locationFilter.neighborhood_id = { in: questNeighborhoodIds };
    } else if (questCityIds.length > 0) {
      locationFilter.city_id = { in: questCityIds };
    }
  }
  // scope === "all" means no geographic filter

  // Add search filter if provided
  if (search.trim()) {
    locationFilter.OR = [
      { name: { contains: search.trim(), mode: "insensitive" } },
      { address: { contains: search.trim(), mode: "insensitive" } },
    ];
  }

  // Get existing location IDs in quest
  const existingLocationIds = new Set(quest.items.map((i) => i.location_id));

  // For hotlist scope, only get party member hotlisted locations
  if (scope === "hotlist") {
    if (questCityIds.length === 0 && questNeighborhoodIds.length === 0) {
      return NextResponse.json({
        suggestions: [],
        partyMemberCount: partyMemberIds.length,
        scope,
        questCities: quest.cities.map((c) => ({ id: c.city.id, name: c.city.name, country: c.city.country })),
        questNeighborhoods: quest.neighborhoods.map((n) => ({ id: n.neighborhood.id, name: n.neighborhood.name })),
      });
    }

    const hotlistData = await prisma.travel_user_location_data.findMany({
      where: {
        user_id: { in: partyMemberIds },
        hotlist: true,
        location: locationFilter,
      },
      include: {
        location: {
          include: {
            city: { select: { id: true, name: true, country: true } },
            neighborhood: { select: { id: true, name: true } },
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });

    // Group hotlist items by location
    const locationMap = new Map<
      string,
      {
        location: (typeof hotlistData)[0]["location"];
        wantedBy: (typeof hotlistData)[0]["user"][];
      }
    >();

    for (const item of hotlistData) {
      const locationId = item.location_id;
      if (!locationMap.has(locationId)) {
        locationMap.set(locationId, {
          location: item.location,
          wantedBy: [],
        });
      }
      locationMap.get(locationId)!.wantedBy.push(item.user);
    }

    const suggestions = Array.from(locationMap.entries())
      .map(([locationId, data]) => ({
        location: {
          id: data.location.id,
          name: data.location.name,
          type: data.location.type,
          latitude: data.location.latitude,
          longitude: data.location.longitude,
          city: data.location.city
            ? {
                id: data.location.city.id,
                name: data.location.city.name,
                country: data.location.city.country,
              }
            : null,
          neighborhood: data.location.neighborhood
            ? {
                id: data.location.neighborhood.id,
                name: data.location.neighborhood.name,
              }
            : null,
        },
        wantedBy: data.wantedBy.map((u) => ({
          userId: u.id,
          username: u.username,
          displayName: u.display_name,
          avatarUrl: u.avatar_url,
        })),
        wantedCount: data.wantedBy.length,
        isInQuest: existingLocationIds.has(locationId),
      }))
      .sort((a, b) => {
        if (a.isInQuest !== b.isInQuest) {
          return a.isInQuest ? 1 : -1;
        }
        return b.wantedCount - a.wantedCount;
      });

    return NextResponse.json({
      suggestions,
      partyMemberCount: partyMemberIds.length,
      totalSuggestions: suggestions.filter((s) => !s.isInQuest).length,
      inQuestCount: suggestions.filter((s) => s.isInQuest).length,
      scope,
      questCities: quest.cities.map((c) => ({ id: c.city.id, name: c.city.name, country: c.city.country })),
      questNeighborhoods: quest.neighborhoods.map((n) => ({ id: n.neighborhood.id, name: n.neighborhood.name })),
    });
  }

  // For non-hotlist scopes, get all locations in the area
  const locations = await prisma.travel_locations.findMany({
    where: locationFilter,
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
    take: 100, // Limit results
    orderBy: { name: "asc" },
  });

  // Get hotlist data for these locations to show who wants them
  const locationIds = locations.map((l) => l.id);
  const hotlistData = locationIds.length > 0
    ? await prisma.travel_user_location_data.findMany({
        where: {
          location_id: { in: locationIds },
          user_id: { in: partyMemberIds },
          hotlist: true,
        },
        include: {
          user: {
            select: {
              id: true,
              username: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      })
    : [];

  // Build hotlist map
  const hotlistByLocation = new Map<string, Array<{ userId: string; username: string; displayName: string | null; avatarUrl: string | null }>>();
  for (const data of hotlistData) {
    if (!hotlistByLocation.has(data.location_id)) {
      hotlistByLocation.set(data.location_id, []);
    }
    hotlistByLocation.get(data.location_id)!.push({
      userId: data.user.id,
      username: data.user.username,
      displayName: data.user.display_name,
      avatarUrl: data.user.avatar_url,
    });
  }

  const suggestions = locations.map((location) => {
    const wantedBy = hotlistByLocation.get(location.id) || [];
    return {
      location: {
        id: location.id,
        name: location.name,
        type: location.type,
        latitude: location.latitude,
        longitude: location.longitude,
        city: location.city
          ? {
              id: location.city.id,
              name: location.city.name,
              country: location.city.country,
            }
          : null,
        neighborhood: location.neighborhood
          ? {
              id: location.neighborhood.id,
              name: location.neighborhood.name,
            }
          : null,
      },
      wantedBy,
      wantedCount: wantedBy.length,
      isInQuest: existingLocationIds.has(location.id),
    };
  }).sort((a, b) => {
    // Not in quest first
    if (a.isInQuest !== b.isInQuest) {
      return a.isInQuest ? 1 : -1;
    }
    // Then by wantedCount descending
    if (b.wantedCount !== a.wantedCount) {
      return b.wantedCount - a.wantedCount;
    }
    // Then alphabetically
    return a.location.name.localeCompare(b.location.name);
  });

  return NextResponse.json({
    suggestions,
    partyMemberCount: partyMemberIds.length,
    totalSuggestions: suggestions.filter((s) => !s.isInQuest).length,
    inQuestCount: suggestions.filter((s) => s.isInQuest).length,
    scope,
    questCities: quest.cities.map((c) => ({ id: c.city.id, name: c.city.name, country: c.city.country })),
    questNeighborhoods: quest.neighborhoods.map((n) => ({ id: n.neighborhood.id, name: n.neighborhood.name })),
  });
}
