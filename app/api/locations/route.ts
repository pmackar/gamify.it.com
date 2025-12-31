import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { addXP, updateStreak, updateUserStats, calculateLocationXP } from "@/lib/gamification";
import { checkAchievements } from "@/lib/achievements";
import { LocationType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");
  const type = searchParams.get("type") as LocationType | null;
  const noNeighborhood = searchParams.get("noNeighborhood") === "true";
  const visited = searchParams.get("visited");
  const hotlist = searchParams.get("hotlist");

  // Build where clause for locations (global - no userId filter)
  const where: {
    cityId?: string;
    type?: LocationType;
    neighborhoodId?: null;
  } = {};

  if (cityId) where.cityId = cityId;
  if (type) where.type = type;
  if (noNeighborhood) where.neighborhoodId = null;

  // Get locations with user's data
  const locations = await prisma.location.findMany({
    where,
    include: {
      city: { select: { name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
      _count: { select: { visits: true, photos: true, reviews: true } },
      userData: {
        where: { userId: session.user.id },
        select: {
          hotlist: true,
          visited: true,
          personalRating: true,
          visitCount: true,
          firstVisitedAt: true,
          lastVisitedAt: true,
        },
      },
    },
    orderBy: { updatedAt: "desc" },
  });

  // Transform to include user data at top level for easier access
  const transformedLocations = locations.map((location) => {
    const userLocationData = location.userData[0] || null;
    return {
      ...location,
      // User-specific data (from UserLocationData or legacy fields)
      userVisited: userLocationData?.visited ?? location.visited ?? false,
      userHotlist: userLocationData?.hotlist ?? location.hotlist ?? false,
      userRating: userLocationData?.personalRating ?? null,
      userVisitCount: userLocationData?.visitCount ?? 0,
      // Remove the userData array from response
      userData: undefined,
    };
  });

  // Filter by user's visited/hotlist status if requested
  let filteredLocations = transformedLocations;
  if (visited === "true") {
    filteredLocations = filteredLocations.filter((l) => l.userVisited);
  } else if (visited === "false") {
    filteredLocations = filteredLocations.filter((l) => !l.userVisited);
  }
  if (hotlist === "true") {
    filteredLocations = filteredLocations.filter((l) => l.userHotlist);
  }

  return NextResponse.json(filteredLocations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Validate required fields
  if (!body.name || !body.type || !body.cityId || body.latitude === undefined || body.longitude === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: name, type, cityId, latitude, longitude" },
      { status: 400 }
    );
  }

  // Create global location with createdById (not userId ownership)
  const location = await prisma.location.create({
    data: {
      createdById: session.user.id,
      cityId: body.cityId,
      neighborhoodId: body.neighborhoodId,
      name: body.name,
      type: body.type,
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      blurb: body.blurb,
      description: body.description,
      website: body.website,
      phone: body.phone,
      hours: body.hours,
      priceLevel: body.priceLevel,
      cuisine: body.cuisine,
      tags: body.tags || [],
    },
    include: {
      city: { select: { name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
  });

  // Optionally create UserLocationData if hotlist or visited is set
  if (body.hotlist || body.visited) {
    await prisma.userLocationData.create({
      data: {
        userId: session.user.id,
        locationId: location.id,
        hotlist: body.hotlist ?? false,
        visited: body.visited ?? false,
      },
    });
  }

  // Update city location count
  await prisma.city.update({
    where: { id: body.cityId },
    data: { locationCount: { increment: 1 } },
  });

  // Calculate and award XP for creating a location
  const streak = await updateStreak(session.user.id);
  const xpGained = calculateLocationXP("new_location", body.type, streak);
  const xpResult = await addXP(session.user.id, xpGained);

  // Update user stats
  await updateUserStats(session.user.id);

  // Check for new achievements
  const newAchievements = await checkAchievements(session.user.id);

  return NextResponse.json({
    location,
    xpGained,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    newAchievements,
  });
}
