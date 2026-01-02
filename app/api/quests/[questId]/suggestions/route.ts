import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// GET /api/quests/[questId]/suggestions - Get party hotlist suggestions
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;

  // Get quest with cities, neighborhoods, items, and party
  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    include: {
      cities: {
        select: { city_id: true },
      },
      neighborhoods: {
        select: { neighborhood_id: true },
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

  // Build location filter
  type LocationFilter = {
    city_id?: { in: string[] };
    neighborhood_id?: { in: string[] };
  };

  const locationFilter: LocationFilter = {};

  if (questNeighborhoodIds.length > 0) {
    // Filter by neighborhoods if specified
    locationFilter.neighborhood_id = { in: questNeighborhoodIds };
  } else if (questCityIds.length > 0) {
    // Otherwise filter by cities
    locationFilter.city_id = { in: questCityIds };
  } else {
    // No cities or neighborhoods - return empty suggestions
    return NextResponse.json({
      suggestions: [],
      partyMemberCount: partyMemberIds.length,
    });
  }

  // Get all hotlisted locations from party members in quest area
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

  // Get existing location IDs in quest
  const existingLocationIds = new Set(quest.items.map((i) => i.location_id));

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

  // Convert to array and sort by wantedCount (most wanted first)
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
      // Sort by: not in quest first, then by wantedCount descending
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
  });
}
