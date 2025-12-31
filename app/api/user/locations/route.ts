import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/user/locations - Get current user's location data (hotlist, visited, etc.)
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;

    const filter = searchParams.get('filter'); // 'hotlist', 'visited', 'rated', or 'all'
    const limit = Math.min(parseInt(searchParams.get('limit') || '50'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Parameters<typeof prisma.userLocationData.findMany>[0]['where'] = {
      userId: user.id,
    };

    if (filter === 'hotlist') {
      where.hotlist = true;
    } else if (filter === 'visited') {
      where.visited = true;
    } else if (filter === 'rated') {
      where.rating = { not: null };
    }

    const [userLocations, total] = await Promise.all([
      prisma.userLocationData.findMany({
        where,
        include: {
          location: {
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
              isActive: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.userLocationData.count({ where }),
    ]);

    // Filter out inactive locations and transform data
    type UserLocationDataType = (typeof userLocations)[number];
    const locations = userLocations
      .filter((ul: UserLocationDataType) => ul.location.isActive)
      .map((ul: UserLocationDataType) => ({
        ...ul.location,
        userSpecific: {
          hotlist: ul.hotlist,
          visited: ul.visited,
          rating: ul.rating,
          notes: ul.notes,
          visitCount: ul.visitCount,
          firstVisitedAt: ul.firstVisitedAt,
          lastVisitedAt: ul.lastVisitedAt,
        },
      }));

    return NextResponse.json({
      data: locations,
      total,
      limit,
      offset,
      hasMore: offset + locations.length < total,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching user locations:', error);
    return NextResponse.json({ error: 'Failed to fetch locations' }, { status: 500 });
  }
}
