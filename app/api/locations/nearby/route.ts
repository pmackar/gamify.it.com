import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { LocationType } from "@prisma/client";

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
  const type = searchParams.get("type") as LocationType | null;
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
    type?: LocationType;
  } = {
    latitude: { gte: minLat, lte: maxLat },
    longitude: { gte: minLng, lte: maxLng },
  };

  if (type) {
    where.type = type;
  }

  const locations = await prisma.location.findMany({
    where,
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
      userData: {
        where: { userId: user.id },
        select: {
          hotlist: true,
          visited: true,
          personalRating: true,
        },
      },
      _count: { select: { visits: true, reviews: true } },
    },
  });

  // Calculate actual distance and filter by radius
  const locationsWithDistance = locations
    .map((loc) => {
      const userLocationData = loc.userData[0] || null;
      return {
        ...loc,
        distanceKm: calculateDistance(lat, lng, loc.latitude, loc.longitude),
        userVisited: userLocationData?.visited ?? loc.visited ?? false,
        userHotlist: userLocationData?.hotlist ?? loc.hotlist ?? false,
        userRating: userLocationData?.personalRating ?? null,
        userData: undefined,
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
