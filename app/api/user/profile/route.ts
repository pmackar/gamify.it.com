import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/user/profile - Get current user's profile with stats
export async function GET() {
  try {
    const user = await requireAuth();

    // Get user stats
    const [visitedCount, reviewCount, questCount, hotlistCount] = await Promise.all([
      prisma.userLocationData.count({
        where: { userId: user.id, visited: true },
      }),
      prisma.review.count({
        where: { authorId: user.id },
      }),
      prisma.quest.count({
        where: { userId: user.id },
      }),
      prisma.userLocationData.count({
        where: { userId: user.id, hotlist: true },
      }),
    ]);

    // Get recently visited locations
    const recentVisits = await prisma.userLocationData.findMany({
      where: {
        userId: user.id,
        visited: true,
      },
      include: {
        location: {
          select: {
            id: true,
            name: true,
            city: true,
            state: true,
            category: true,
            photoUrl: true,
          },
        },
      },
      orderBy: { lastVisitedAt: 'desc' },
      take: 5,
    });

    return NextResponse.json({
      data: {
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          avatarUrl: user.avatarUrl,
          bio: user.bio,
          totalXp: user.totalXp,
          level: user.level,
          createdAt: user.createdAt,
        },
        stats: {
          visitedCount,
          reviewCount,
          questCount,
          hotlistCount,
        },
        recentVisits: recentVisits
          .filter((rv) => rv.location)
          .map((rv) => ({
            ...rv.location,
            visitedAt: rv.lastVisitedAt,
            visitCount: rv.visitCount,
          })),
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching profile:', error);
    return NextResponse.json({ error: 'Failed to fetch profile' }, { status: 500 });
  }
}

// PUT /api/user/profile - Update current user's profile
export async function PUT(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { bio, username } = body;

    // Check username uniqueness if changing
    if (username && username !== user.username) {
      const existing = await prisma.user.findUnique({
        where: { username },
      });
      if (existing) {
        return NextResponse.json({ error: 'Username already taken' }, { status: 409 });
      }
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        ...(bio !== undefined && { bio }),
        ...(username !== undefined && { username }),
      },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        totalXp: true,
        level: true,
        createdAt: true,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating profile:', error);
    return NextResponse.json({ error: 'Failed to update profile' }, { status: 500 });
  }
}
