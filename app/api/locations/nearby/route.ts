import { z } from "zod";
import { NextResponse } from "next/server";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";
import { travel_location_type } from "@prisma/client";
import {
  calculateDistance,
  getUserLocationDataBatch,
} from "@/lib/services/location.service";
import { toLocationResponse } from "@/lib/services/response-transformers";

const QuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radius: z.coerce.number().min(0.1).max(100).default(5),
  type: z.string().toUpperCase().optional(),
  limit: z.coerce.number().min(1).max(100).default(50),
});

// GET /api/locations/nearby - Find locations near a point
export const GET = withAuth(async (request, user) => {
  const searchParams = request.nextUrl.searchParams;

  const parsed = QuerySchema.safeParse({
    lat: searchParams.get("lat"),
    lng: searchParams.get("lng"),
    radius: searchParams.get("radius") ?? undefined,
    type: searchParams.get("type") ?? undefined,
    limit: searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return Errors.invalidInput("lat and lng are required as valid coordinates");
  }

  const { lat, lng, radius: radiusKm, type, limit } = parsed.data;

  // Calculate bounding box for initial filtering
  const toRad = (deg: number) => deg * (Math.PI / 180);
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)));

  const where: {
    latitude: { gte: number; lte: number };
    longitude: { gte: number; lte: number };
    type?: travel_location_type;
  } = {
    latitude: { gte: lat - latDelta, lte: lat + latDelta },
    longitude: { gte: lng - lngDelta, lte: lng + lngDelta },
  };

  if (type && Object.values(travel_location_type).includes(type as travel_location_type)) {
    where.type = type as travel_location_type;
  }

  const locations = await prisma.travel_locations.findMany({
    where,
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
      _count: { select: { visits: true, reviews: true } },
    },
  });

  // Get user's location data for these locations
  const locationIds = locations.map((l) => l.id);
  const userDataMap = await getUserLocationDataBatch(user.id, locationIds);

  // Calculate actual distance and filter by radius
  const locationsWithDistance = locations
    .map((loc) => {
      const userData = userDataMap.get(loc.id);
      const distanceKm = calculateDistance(lat, lng, Number(loc.latitude), Number(loc.longitude));

      return {
        ...toLocationResponse(loc),
        avgRating: loc.avg_rating,
        totalVisits: loc.total_visits,
        blurb: loc.blurb,
        _count: loc._count,
        distanceKm: Math.round(distanceKm * 100) / 100,
        userData: userData ?? {
          isVisited: false,
          isHotlisted: false,
          rating: null,
          visitCount: 0,
          firstVisited: null,
          lastVisited: null,
        },
      };
    })
    .filter((loc) => loc.distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);

  return NextResponse.json({
    data: locationsWithDistance,
    center: { lat, lng },
    radiusKm,
    total: locationsWithDistance.length,
  });
});
