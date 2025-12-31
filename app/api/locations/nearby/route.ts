import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { LocationCategory } from '@/types';

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
  try {
    const searchParams = request.nextUrl.searchParams;
    const lat = parseFloat(searchParams.get('lat') || '');
    const lng = parseFloat(searchParams.get('lng') || '');
    const radiusKm = parseFloat(searchParams.get('radius') || '5');
    const category = searchParams.get('category') as LocationCategory | null;
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);

    if (isNaN(lat) || isNaN(lng)) {
      return NextResponse.json({ error: 'lat and lng are required' }, { status: 400 });
    }

    if (radiusKm <= 0 || radiusKm > 100) {
      return NextResponse.json({ error: 'radius must be between 0 and 100 km' }, { status: 400 });
    }

    // Calculate bounding box for initial filtering (more efficient than checking all)
    // 1 degree of latitude ≈ 111 km
    // 1 degree of longitude varies by latitude, roughly 111 * cos(lat) km
    const latDelta = radiusKm / 111;
    const lngDelta = radiusKm / (111 * Math.cos(toRad(lat)));

    const minLat = lat - latDelta;
    const maxLat = lat + latDelta;
    const minLng = lng - lngDelta;
    const maxLng = lng + lngDelta;

    // Query locations within bounding box
    const where = {
      isActive: true as const,
      latitude: { gte: minLat, lte: maxLat },
      longitude: { gte: minLng, lte: maxLng },
      ...(category ? { category } : {}),
    };

    const locations = await prisma.location.findMany({
      where,
      select: {
        id: true,
        name: true,
        description: true,
        city: true,
        state: true,
        category: true,
        latitude: true,
        longitude: true,
        photoUrl: true,
        averageRating: true,
        totalVisits: true,
        totalReviews: true,
      },
    });

    // Calculate actual distance and filter by radius
    type LocationType = (typeof locations)[number];
    type LocationWithDistance = LocationType & { distanceKm: number };
    const locationsWithDistance = locations
      .map((loc: LocationType): LocationWithDistance => ({
        ...loc,
        distanceKm: calculateDistance(lat, lng, loc.latitude, loc.longitude),
      }))
      .filter((loc: LocationWithDistance) => loc.distanceKm <= radiusKm)
      .sort((a: LocationWithDistance, b: LocationWithDistance) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    // If user is authenticated, enrich with their personal data
    const user = await getCurrentUser();
    let enrichedLocations = locationsWithDistance;

    if (user) {
      const locationIds = locationsWithDistance.map((l: LocationWithDistance) => l.id);
      const userLocationData = await prisma.userLocationData.findMany({
        where: {
          userId: user.id,
          locationId: { in: locationIds },
        },
        select: {
          locationId: true,
          hotlist: true,
          visited: true,
          rating: true,
        },
      });

      type UserLocationDataType = (typeof userLocationData)[number];
      const userDataMap = new Map(userLocationData.map((ud: UserLocationDataType) => [ud.locationId, ud]));

      enrichedLocations = locationsWithDistance.map((loc: LocationWithDistance) => ({
        ...loc,
        userSpecific: userDataMap.get(loc.id) || null,
      }));
    }

    return NextResponse.json({
      data: enrichedLocations,
      center: { lat, lng },
      radiusKm,
      total: enrichedLocations.length,
    });
  } catch (error) {
    console.error('Error fetching nearby locations:', error);
    return NextResponse.json({ error: 'Failed to fetch nearby locations' }, { status: 500 });
  }
}
