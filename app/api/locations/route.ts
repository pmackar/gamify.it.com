import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { travel_location_type } from "@prisma/client";
import { withAuth, validateBody, validateQuery, Errors } from "@/lib/api";

// Query params schema for GET
const locationsQuerySchema = z.object({
  cityId: z.string().uuid().optional(),
  neighborhoodId: z.string().uuid().optional(),
  type: z.string().optional(),
  noNeighborhood: z.enum(["true", "false"]).optional(),
  visited: z.enum(["true", "false"]).optional(),
  hotlist: z.enum(["true", "false"]).optional(),
  search: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(50),
  offset: z.coerce.number().int().min(0).default(0),
});

// Body schema for POST
const createLocationSchema = z.object({
  name: z.string().trim().min(1).max(200),
  type: z.string().min(1),
  cityId: z.string().uuid(),
  latitude: z.number(),
  longitude: z.number(),
  neighborhoodId: z.string().uuid().optional().nullable(),
  address: z.string().optional().nullable(),
  blurb: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  website: z.string().url().optional().nullable(),
  phone: z.string().optional().nullable(),
  hours: z.string().optional().nullable(),
  priceLevel: z.number().int().min(1).max(4).optional().nullable(),
  cuisine: z.string().optional().nullable(),
  tags: z.array(z.string()).optional(),
  markVisited: z.boolean().optional(),
  visited: z.boolean().optional(),
  addToHotlist: z.boolean().optional(),
  hotlist: z.boolean().optional(),
  initialRating: z.number().min(0).max(5).optional().nullable(),
});

// GET /api/locations
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, locationsQuerySchema);
  if (params instanceof NextResponse) return params;

  const { cityId, neighborhoodId, type, noNeighborhood, visited, hotlist, search, limit, offset } = params;

  // Build where clause
  const where: {
    city_id?: string;
    neighborhood_id?: string | null;
    type?: travel_location_type;
    visited?: boolean;
    hotlist?: boolean;
    name?: { contains: string; mode: 'insensitive' };
  } = {};

  if (cityId) where.city_id = cityId;
  if (neighborhoodId) where.neighborhood_id = neighborhoodId;
  if (type) where.type = type.toUpperCase() as travel_location_type;
  if (noNeighborhood === "true") where.neighborhood_id = null;
  if (visited === "true") where.visited = true;
  else if (visited === "false") where.visited = false;
  if (hotlist === "true") where.hotlist = true;
  if (search) where.name = { contains: search, mode: 'insensitive' };

  const [locations, total] = await Promise.all([
    prisma.travel_locations.findMany({
      where,
      include: {
        city: { select: { name: true, country: true } },
        neighborhood: { select: { id: true, name: true } },
        _count: { select: { visits: true, photos: true, reviews: true } },
      },
      orderBy: { updated_at: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.travel_locations.count({ where }),
  ]);

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
});

// POST /api/locations
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createLocationSchema);
  if (body instanceof NextResponse) return body;

  // Handle status options (support both old and new parameter names)
  const markVisited = body.markVisited ?? body.visited ?? false;
  const addToHotlist = body.addToHotlist ?? body.hotlist ?? false;
  const initialRating = body.initialRating;

  try {
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
        hotlist: addToHotlist,
        visited: markVisited,
        avg_rating: initialRating || null,
        rating_count: initialRating ? 1 : 0,
        total_visits: markVisited ? 1 : 0,
      },
      include: {
        city: { select: { name: true, country: true } },
        neighborhood: { select: { id: true, name: true } },
      },
    });

    // Create user-specific location data
    await prisma.travel_user_location_data.create({
      data: {
        user_id: user.id,
        location_id: location.id,
        visited: markVisited,
        hotlist: addToHotlist,
        personal_rating: initialRating || null,
        visit_count: markVisited ? 1 : 0,
      },
    });

    // If visited, create initial visit record
    if (markVisited) {
      await prisma.travel_visits.create({
        data: {
          user_id: user.id,
          location_id: location.id,
          date: new Date(),
          overall_rating: initialRating || null,
          notes: body.description || null,
        },
      });
    }

    // Update city location count
    await prisma.travel_cities.update({
      where: { id: body.cityId },
      data: { location_count: { increment: 1 } },
    });

    // Award XP
    const baseXP = 25;
    const visitXP = markVisited ? 15 : 0;
    const xpGained = baseXP + visitXP;

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
        visited: markVisited,
        hotlist: addToHotlist,
        rating: initialRating,
      },
      xpGained,
      leveledUp: false,
    });
  } catch (error) {
    console.error("Error creating location:", error);
    return Errors.database("Failed to create location");
  }
});
