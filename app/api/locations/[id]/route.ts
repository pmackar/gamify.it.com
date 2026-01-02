import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/locations/[id] - Get a single location with user data
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const location = await prisma.travel_locations.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
      visits: {
        where: { user_id: user.id },
        orderBy: { date: "desc" },
        take: 10,
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Get user's personal data for this location
  const userLocationData = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: user.id,
        location_id: id,
      },
    },
  });

  return NextResponse.json({
    id: location.id,
    name: location.name,
    type: location.type,
    cuisine: location.cuisine,
    address: location.address,
    latitude: location.latitude,
    longitude: location.longitude,
    blurb: location.blurb,
    description: location.description,
    website: location.website,
    phone: location.phone,
    hours: location.hours,
    priceLevel: location.price_level,
    otherInfo: location.other_info,
    tags: location.tags,
    avgRating: location.avg_rating,
    ratingCount: location.rating_count,
    totalVisits: location.total_visits,
    city: location.city,
    neighborhood: location.neighborhood?.name || null,
    visits: location.visits.map(v => ({
      id: v.id,
      date: v.date,
      overallRating: v.overall_rating,
      notes: v.notes,
    })),
    // User-specific data
    visited: userLocationData?.visited ?? location.visited ?? false,
    hotlist: userLocationData?.hotlist ?? location.hotlist ?? false,
    userRating: userLocationData?.personal_rating ?? null,
    userVisitCount: userLocationData?.visit_count ?? 0,
    userNotes: userLocationData?.notes ?? null,
  });
}

// PUT /api/locations/[id] - Update a location
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Check if location exists
  const existing = await prisma.travel_locations.findUnique({
    where: { id },
    select: { user_id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Only allow creator to edit (or anyone if no creator set)
  if (existing.user_id && existing.user_id !== user.id) {
    return NextResponse.json(
      { error: "You can only edit locations you created" },
      { status: 403 }
    );
  }

  const location = await prisma.travel_locations.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.type && { type: body.type }),
      ...(body.cuisine !== undefined && { cuisine: body.cuisine }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.latitude !== undefined && { latitude: body.latitude }),
      ...(body.longitude !== undefined && { longitude: body.longitude }),
      ...(body.blurb !== undefined && { blurb: body.blurb }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.hours !== undefined && { hours: body.hours }),
      ...(body.priceLevel !== undefined && { price_level: body.priceLevel }),
      ...(body.otherInfo !== undefined && { other_info: body.otherInfo }),
      ...(body.tags && { tags: body.tags }),
      ...(body.neighborhoodId !== undefined && { neighborhood_id: body.neighborhoodId }),
    },
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({
    id: location.id,
    name: location.name,
    type: location.type,
    city: location.city,
    neighborhood: location.neighborhood,
  });
}

// DELETE /api/locations/[id] - Delete a location
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if location exists
  const existing = await prisma.travel_locations.findUnique({
    where: { id },
    select: { user_id: true, city_id: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Only allow creator to delete (or anyone if no creator set)
  if (existing.user_id && existing.user_id !== user.id) {
    return NextResponse.json(
      { error: "You can only delete locations you created" },
      { status: 403 }
    );
  }

  // Delete the location (cascade will handle related records)
  await prisma.travel_locations.delete({
    where: { id },
  });

  // Update city location count
  await prisma.travel_cities.update({
    where: { id: existing.city_id },
    data: { location_count: { decrement: 1 } },
  });

  return NextResponse.json({ message: "Location deleted" });
}
