import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/locations/[id]/user-data - Get user's data for this location
export async function GET(request: NextRequest, { params }: RouteParams) {
  // Use lightweight auth for read-only endpoint
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: locationId } = await params;

  const userLocationData = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
  });

  if (!userLocationData) {
    // Return default values if no record exists
    return NextResponse.json({
      hotlist: false,
      visited: false,
      personalRating: null,
      notes: null,
      visitCount: 0,
      firstVisitedAt: null,
      lastVisitedAt: null,
    });
  }

  return NextResponse.json({
    hotlist: userLocationData.hotlist,
    visited: userLocationData.visited,
    personalRating: userLocationData.personal_rating,
    notes: userLocationData.notes,
    visitCount: userLocationData.visit_count,
    firstVisitedAt: userLocationData.first_visited_at,
    lastVisitedAt: userLocationData.last_visited_at,
  });
}

// POST /api/locations/[id]/user-data - Update user's data for this location
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: locationId } = await params;
  const body = await request.json();

  // Verify location exists
  const location = await prisma.travel_locations.findUnique({
    where: { id: locationId },
    select: { id: true, type: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Get existing user data
  const existingData = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
  });

  const wasVisited = existingData?.visited ?? false;
  const newVisited = body.visited ?? wasVisited;
  const isFirstVisit = !wasVisited && newVisited;

  // Upsert user location data
  const userLocationData = await prisma.travel_user_location_data.upsert({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: locationId,
      },
    },
    update: {
      ...(body.hotlist !== undefined && { hotlist: body.hotlist }),
      ...(body.visited !== undefined && { visited: body.visited }),
      ...(body.personalRating !== undefined && { personal_rating: body.personalRating }),
      ...(body.notes !== undefined && { notes: body.notes }),
      // Update visit timestamps if marking as visited
      ...(isFirstVisit && {
        first_visited_at: new Date(),
        last_visited_at: new Date(),
        visit_count: { increment: 1 },
      }),
    },
    create: {
      user_id: user.id,
      location_id: locationId,
      hotlist: body.hotlist ?? false,
      visited: body.visited ?? false,
      personal_rating: body.personalRating ?? null,
      notes: body.notes ?? null,
      visit_count: body.visited ? 1 : 0,
      first_visited_at: body.visited ? new Date() : null,
      last_visited_at: body.visited ? new Date() : null,
    },
  });

  // Award XP for first visit
  let xpGained = 0;

  if (isFirstVisit) {
    // Update location's total visits count
    await prisma.travel_locations.update({
      where: { id: locationId },
      data: { total_visits: { increment: 1 } },
    });

    // Award XP based on location type
    const typeXpMap: Record<string, number> = {
      RESTAURANT: 50,
      BAR: 40,
      CAFE: 30,
      ATTRACTION: 60,
      MUSEUM: 55,
      PARK: 35,
      SHOP: 25,
      HOTEL: 45,
      OTHER: 30,
    };
    xpGained = typeXpMap[location.type] ?? 30;

    await prisma.app_profiles.upsert({
      where: {
        user_id_app_id: {
          user_id: user.id,
          app_id: 'travel',
        },
      },
      update: {
        xp: { increment: xpGained },
      },
      create: {
        user_id: user.id,
        app_id: 'travel',
        xp: xpGained,
        level: 1,
        xp_to_next: 100,
      },
    });
  }

  return NextResponse.json({
    hotlist: userLocationData.hotlist,
    visited: userLocationData.visited,
    personalRating: userLocationData.personal_rating,
    notes: userLocationData.notes,
    visitCount: userLocationData.visit_count,
    firstVisitedAt: userLocationData.first_visited_at,
    lastVisitedAt: userLocationData.last_visited_at,
    xpGained,
  });
}
