import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { CreateLocationInput, LocationCategory, LocationCategoryEnum } from '@/types';

// GET /api/locations - List locations with optional filters
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const city = searchParams.get('city');
    const state = searchParams.get('state');
    const category = searchParams.get('category') as LocationCategory | null;
    const query = searchParams.get('query');
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where = {
      isActive: true as const,
      ...(city ? { city: { contains: city, mode: 'insensitive' as const } } : {}),
      ...(state ? { state: { contains: state, mode: 'insensitive' as const } } : {}),
      ...(category ? { category } : {}),
      ...(query ? {
        OR: [
          { name: { contains: query, mode: 'insensitive' as const } },
          { description: { contains: query, mode: 'insensitive' as const } },
          { address: { contains: query, mode: 'insensitive' as const } },
        ]
      } : {}),
    };

    const [locations, total] = await Promise.all([
      prisma.location.findMany({
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
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.location.count({ where }),
    ]);

    // If user is authenticated, enrich with their personal data
    const user = await getCurrentUser();
    type LocationType = (typeof locations)[number];
    let enrichedLocations: (LocationType & { userSpecific?: unknown })[] = locations;

    if (user) {
      const locationIds = locations.map((l: LocationType) => l.id);
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

      enrichedLocations = locations.map((loc: LocationType) => ({
        ...loc,
        userSpecific: userDataMap.get(loc.id) || null,
      }));
    }

    return NextResponse.json({
      data: enrichedLocations,
      total,
      limit,
      offset,
      hasMore: offset + locations.length < total,
    });
  } catch (error) {
    console.error('Error fetching locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}

// POST /api/locations - Create a new location
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body: CreateLocationInput = await request.json();

    // Validate required fields
    if (!body.name || body.latitude === undefined || body.longitude === undefined || !body.category) {
      return NextResponse.json(
        { error: 'Missing required fields: name, latitude, longitude, category' },
        { status: 400 }
      );
    }

    // Validate category
    const validCategories = Object.values(LocationCategoryEnum);
    if (!validCategories.includes(body.category)) {
      return NextResponse.json({ error: 'Invalid category' }, { status: 400 });
    }

    // Check for duplicate Google Place ID
    if (body.googlePlaceId) {
      const existing = await prisma.location.findUnique({
        where: { googlePlaceId: body.googlePlaceId },
      });
      if (existing) {
        return NextResponse.json(
          { error: 'This place already exists', existingId: existing.id },
          { status: 409 }
        );
      }
    }

    const location = await prisma.location.create({
      data: {
        name: body.name,
        description: body.description,
        address: body.address,
        city: body.city,
        state: body.state,
        country: body.country || 'USA',
        postalCode: body.postalCode,
        neighborhood: body.neighborhood,
        latitude: body.latitude,
        longitude: body.longitude,
        category: body.category,
        tags: body.tags || [],
        googlePlaceId: body.googlePlaceId,
        photoUrl: body.photoUrl,
        website: body.website,
        phone: body.phone,
        createdById: user.id,
      },
      include: {
        createdBy: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ data: location }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating location:', error);
    return NextResponse.json({ error: 'Failed to create location' }, { status: 500 });
  }
}
