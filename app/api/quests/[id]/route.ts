import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/quests/[id] - Get a single quest with items
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const quest = await prisma.quest.findUnique({
      where: { id },
      include: {
        items: {
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
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    // Only owner can view their quests
    if (quest.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Get user's location data for all items
    type QuestItemType = (typeof quest.items)[number];
    const locationIds = quest.items.map((item: QuestItemType) => item.locationId);
    const userLocationData = await prisma.userLocationData.findMany({
      where: {
        userId: user.id,
        locationId: { in: locationIds },
      },
    });

    type UserLocationDataType = (typeof userLocationData)[number];
    const userDataMap = new Map(userLocationData.map((ud: UserLocationDataType) => [ud.locationId, ud]));

    // Enrich items with user data
    const enrichedItems = quest.items.map((item: QuestItemType) => ({
      ...item,
      location: {
        ...item.location,
        userSpecific: userDataMap.get(item.locationId) || null,
      },
    }));

    // Calculate completion stats
    const totalItems = quest.items.length;
    const completedItems = quest.items.filter((item: QuestItemType) => item.completed).length;

    return NextResponse.json({
      data: {
        ...quest,
        items: enrichedItems,
        completionStats: {
          total: totalItems,
          completed: completedItems,
          percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        },
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching quest:', error);
    return NextResponse.json({ error: 'Failed to fetch quest' }, { status: 500 });
  }
}

// PUT /api/quests/[id] - Update a quest
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body = await request.json();

    // Check ownership
    const existing = await prisma.quest.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { title, description, city, neighborhood, centerLat, centerLng, radiusKm, status, startDate, endDate } = body;

    const quest = await prisma.quest.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(city !== undefined && { city }),
        ...(neighborhood !== undefined && { neighborhood }),
        ...(centerLat !== undefined && { centerLat }),
        ...(centerLng !== undefined && { centerLng }),
        ...(radiusKm !== undefined && { radiusKm }),
        ...(status !== undefined && { status }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(status === 'COMPLETED' && { completedAt: new Date() }),
      },
      include: {
        items: {
          include: {
            location: {
              select: {
                id: true,
                name: true,
                city: true,
                category: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return NextResponse.json({ data: quest });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating quest:', error);
    return NextResponse.json({ error: 'Failed to update quest' }, { status: 500 });
  }
}

// DELETE /api/quests/[id] - Delete a quest
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check ownership
    const existing = await prisma.quest.findUnique({
      where: { id },
      select: { userId: true },
    });

    if (!existing) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (existing.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete quest (cascade deletes items)
    await prisma.quest.delete({
      where: { id },
    });

    return NextResponse.json({ message: 'Quest deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting quest:', error);
    return NextResponse.json({ error: 'Failed to delete quest' }, { status: 500 });
  }
}
