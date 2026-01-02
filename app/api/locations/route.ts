import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { travel_location_type } from "@prisma/client";

export async function GET(req: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");
  const neighborhoodId = searchParams.get("neighborhoodId");
  const type = searchParams.get("type")?.toUpperCase() as travel_location_type | undefined;
  const noNeighborhood = searchParams.get("noNeighborhood") === "true";
  const visited = searchParams.get("visited");
  const hotlist = searchParams.get("hotlist");
  const search = searchParams.get("search");

  // Pagination params
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  // Build where clause with server-side filtering
  const where: {
    user_id: string;
    city_id?: string;
    neighborhood_id?: string | null;
    type?: travel_location_type;
    visited?: boolean;
    hotlist?: boolean;
    name?: { contains: string; mode: 'insensitive' };
  } = {
    user_id: user.id,
  };

  if (cityId) where.city_id = cityId;
  if (neighborhoodId) where.neighborhood_id = neighborhoodId;
  if (type) where.type = type;
  if (noNeighborhood) where.neighborhood_id = null;

  // Server-side filtering for visited/hotlist
  if (visited === "true") where.visited = true;
  else if (visited === "false") where.visited = false;
  if (hotlist === "true") where.hotlist = true;

  // Search by name
  if (search) where.name = { contains: search, mode: 'insensitive' };

  // Get total count for pagination
  const total = await prisma.travel_locations.count({ where });

  const locations = await prisma.travel_locations.findMany({
    where,
    include: {
      city: { select: { name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
      _count: { select: { visits: true, photos: true, reviews: true } },
    },
    orderBy: { updated_at: "desc" },
    take: limit,
    skip: offset,
  });

  return NextResponse.json({
    data: locations.map((location) => ({
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
      visited: location.visited,
      hotlist: location.hotlist,
      tags: location.tags,
      avgRating: location.avg_rating,
      ratingCount: location.rating_count,
      reviewCount: location.review_count,
      totalVisits: location.total_visits,
      city: location.city,
      neighborhood: location.neighborhood,
      _count: location._count,
      createdAt: location.created_at,
      updatedAt: location.updated_at,
    })),
    pagination: {
      total,
      limit,
      offset,
      hasMore: offset + locations.length < total,
    },
  });
}

export async function POST(req: NextRequest) {
  const user = await getUser();
  if (!user) {
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

  // Create location
  const location = await prisma.travel_locations.create({
    data: {
      user_id: user.id,
      city_id: body.cityId,
      neighborhood_id: body.neighborhoodId || null,
      name: body.name,
      type: body.type.toUpperCase() as travel_location_type,
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      blurb: body.blurb,
      description: body.description,
      website: body.website,
      phone: body.phone,
      hours: body.hours,
      price_level: body.priceLevel,
      cuisine: body.cuisine,
      tags: body.tags || [],
      hotlist: body.hotlist ?? false,
      visited: body.visited ?? false,
    },
    include: {
      city: { select: { name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
  });

  // Update city location count
  await prisma.travel_cities.update({
    where: { id: body.cityId },
    data: { location_count: { increment: 1 } },
  });

  // Award XP for creating location (simple version)
  const xpGained = 25;
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

  return NextResponse.json({
    location: {
      id: location.id,
      name: location.name,
      type: location.type,
      city: location.city,
      neighborhood: location.neighborhood,
    },
    xpGained,
  });
}
