import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { travel_location_type } from "@prisma/client";

// Haversine formula to calculate distance between two coordinates
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

// GET /api/locations/nearby - Find locations near a point
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const lat = parseFloat(searchParams.get("lat") || "");
  const lng = parseFloat(searchParams.get("lng") || "");
  const radiusKm = parseFloat(searchParams.get("radius") || "5");
  const type = searchParams.get("type")?.toUpperCase() as travel_location_type | null;
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  if (radiusKm <= 0 || radiusKm > 100) {
    return NextResponse.json({ error: "radius must be between 0 and 100 km" }, { status: 400 });
  }

  // Calculate bounding box for initial filtering
  const latDelta = radiusKm / 111;
  const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)));

  const minLat = lat - latDelta;
  const maxLat = lat + latDelta;
  const minLng = lng - lngDelta;
  const maxLng = lng + lngDelta;

  // Query locations within bounding box
  const where: {
    latitude: { gte: number; lte: number };
    longitude: { gte: number; lte: number };
    type?: travel_location_type;
  } = {
    latitude: { gte: minLat, lte: maxLat },
    longitude: { gte: minLng, lte: maxLng },
  };

  if (type) {
    where.type = type;
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
  const userLocationData = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: user.id,
      location_id: { in: locationIds },
    },
    select: {
      location_id: true,
      hotlist: true,
      visited: true,
      personal_rating: true,
    },
  });

  const userDataMap = new Map(
    userLocationData.map((uld) => [uld.location_id, uld])
  );

  // Calculate actual distance and filter by radius
  const locationsWithDistance = locations
    .map((loc) => {
      const userData = userDataMap.get(loc.id);
      return {
        id: loc.id,
        name: loc.name,
        type: loc.type,
        latitude: loc.latitude,
        longitude: loc.longitude,
        address: loc.address,
        blurb: loc.blurb,
        city: loc.city,
        neighborhood: loc.neighborhood,
        avgRating: loc.avg_rating,
        totalVisits: loc.total_visits,
        _count: loc._count,
        distanceKm: calculateDistance(lat, lng, loc.latitude, loc.longitude),
        userVisited: userData?.visited ?? loc.visited ?? false,
        userHotlist: userData?.hotlist ?? loc.hotlist ?? false,
        userRating: userData?.personal_rating ?? null,
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
}
