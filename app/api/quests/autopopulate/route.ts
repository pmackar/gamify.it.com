import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
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

// POST /api/quests/autopopulate - Get suggested locations for a quest
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const {
      city,
      neighborhood,
      centerLat,
      centerLng,
      radiusKm = 5,
      category,
      includeVisited = false,
      limit = 20,
    } = body;

    // Must have either city OR center coordinates
    if (!city && (centerLat === undefined || centerLng === undefined)) {
      return NextResponse.json(
        { error: 'Either city or centerLat/centerLng is required' },
        { status: 400 }
      );
    }

    // Get user's hotlisted locations
    const userLocationWhere: Parameters<typeof prisma.userLocationData.findMany>[0]['where'] = {
      userId: user.id,
      hotlist: true,
    };

    if (!includeVisited) {
      userLocationWhere.visited = false;
    }

    const hotlistedData = await prisma.userLocationData.findMany({
      where: userLocationWhere,
      select: { locationId: true },
    });

    type HotlistedDataType = (typeof hotlistedData)[number];
    const hotlistedIds = hotlistedData.map((h: HotlistedDataType) => h.locationId);

    if (hotlistedIds.length === 0) {
      return NextResponse.json({
        data: [],
        message: 'No hotlisted locations found. Add locations to your hotlist first!',
      });
    }

    // Build location query
    const locationWhere: Parameters<typeof prisma.location.findMany>[0]['where'] = {
      id: { in: hotlistedIds },
      isActive: true,
    };

    // Filter by city/neighborhood if provided
    if (city) {
      locationWhere.city = { contains: city, mode: 'insensitive' };
    }

    if (neighborhood) {
      locationWhere.neighborhood = { contains: neighborhood, mode: 'insensitive' };
    }

    if (category) {
      locationWhere.category = category as LocationCategory;
    }

    // If using radius, we need lat/lng filtering
    if (centerLat !== undefined && centerLng !== undefined && radiusKm > 0) {
      // Calculate bounding box
      const latDelta = radiusKm / 111;
      const lngDelta = radiusKm / (111 * Math.cos(toRad(centerLat)));

      locationWhere.latitude = {
        gte: centerLat - latDelta,
        lte: centerLat + latDelta,
      };
      locationWhere.longitude = {
        gte: centerLng - lngDelta,
        lte: centerLng + lngDelta,
      };
    }

    const locations = await prisma.location.findMany({
      where: locationWhere,
      select: {
        id: true,
        name: true,
        description: true,
        city: true,
        state: true,
        neighborhood: true,
        category: true,
        latitude: true,
        longitude: true,
        photoUrl: true,
        averageRating: true,
        totalVisits: true,
      },
    });

    // If using radius, filter by actual distance and add distance info
    type LocationType = (typeof locations)[number];
    type LocationWithDistance = LocationType & { distanceKm?: number };

    let filteredLocations: LocationWithDistance[] = locations;

    if (centerLat !== undefined && centerLng !== undefined) {
      filteredLocations = locations
        .map((loc: LocationType): LocationWithDistance => ({
          ...loc,
          distanceKm: calculateDistance(centerLat, centerLng, loc.latitude, loc.longitude),
        }))
        .filter((loc: LocationWithDistance) => !radiusKm || (loc.distanceKm && loc.distanceKm <= radiusKm))
        .sort((a: LocationWithDistance, b: LocationWithDistance) => (a.distanceKm || 0) - (b.distanceKm || 0));
    }

    // Limit results
    const limitedLocations = filteredLocations.slice(0, limit);

    // Get user data for these locations
    const locationIds = limitedLocations.map((l) => l.id);
    const userData = await prisma.userLocationData.findMany({
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

    type UserDataType = (typeof userData)[number];
    const userDataMap = new Map(userData.map((ud: UserDataType) => [ud.locationId, ud]));

    const enrichedLocations = limitedLocations.map((loc) => ({
      ...loc,
      userSpecific: userDataMap.get(loc.id) || null,
    }));

    return NextResponse.json({
      data: enrichedLocations,
      total: enrichedLocations.length,
      criteria: {
        city,
        neighborhood,
        centerLat,
        centerLng,
        radiusKm: centerLat !== undefined ? radiusKm : null,
        category,
        includeVisited,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error autopopulating quest:', error);
    return NextResponse.json({ error: 'Failed to autopopulate' }, { status: 500 });
  }
}
