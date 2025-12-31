import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET /api/users/[userId] - Get public user profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        totalXp: true,
        level: true,
        createdAt: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get user stats
    const [visitedCount, reviewCount, questCount] = await Promise.all([
      prisma.userLocationData.count({
        where: { userId, visited: true },
      }),
      prisma.review.count({
        where: { authorId: userId, status: 'APPROVED' },
      }),
      prisma.quest.count({
        where: { userId, status: 'COMPLETED' },
      }),
    ]);

    // Get user's visited locations (public)
    const visitedLocations = await prisma.userLocationData.findMany({
      where: {
        userId,
        visited: true,
        location: { isActive: true },
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            category: true,
            latitude: true,
            longitude: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { lastVisitedAt: 'desc' },
      take: 20,
    });

    return NextResponse.json({
      data: {
        user,
        stats: {
          visitedCount,
          reviewCount,
          questCount,
        },
        visitedLocations: visitedLocations.map((vl) => ({
          ...vl.location,
          visitedAt: vl.lastVisitedAt,
        })),
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}
