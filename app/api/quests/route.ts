import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

// GET /api/quests - List user's quests
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth();
    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status'); // 'DRAFT', 'ACTIVE', 'COMPLETED', 'ABANDONED'
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = parseInt(searchParams.get('offset') || '0');

    const where: Parameters<typeof prisma.quest.findMany>[0]['where'] = {
      userId: user.id,
    };

    if (status) {
      where.status = status as 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
    }

    const [quests, total] = await Promise.all([
      prisma.quest.findMany({
        where,
        include: {
          items: {
            include: {
              location: {
                select: {
                  id: true,
                  name: true,
                  city: true,
                  category: true,
                  photoUrl: true,
                },
              },
            },
            orderBy: { order: 'asc' },
          },
          _count: {
            select: { items: true },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.quest.count({ where }),
    ]);

    // Calculate completion stats for each quest
    type QuestType = (typeof quests)[number];
    type QuestItemType = QuestType['items'][number];
    const questsWithStats = quests.map((quest: QuestType) => {
      const totalItems = quest.items.length;
      const completedItems = quest.items.filter((item: QuestItemType) => item.completed).length;
      return {
        ...quest,
        completionStats: {
          total: totalItems,
          completed: completedItems,
          percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
        },
      };
    });

    return NextResponse.json({
      data: questsWithStats,
      total,
      limit,
      offset,
      hasMore: offset + quests.length < total,
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching quests:', error);
    return NextResponse.json({ error: 'Failed to fetch quests' }, { status: 500 });
  }
}

// POST /api/quests - Create a new quest
export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await request.json();

    const { title, description, city, neighborhood, centerLat, centerLng, radiusKm, startDate, endDate } = body;

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    const quest = await prisma.quest.create({
      data: {
        userId: user.id,
        title,
        description,
        city,
        neighborhood,
        centerLat,
        centerLng,
        radiusKm,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status: 'ACTIVE',
      },
      include: {
        items: true,
      },
    });

    return NextResponse.json({ data: quest }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error creating quest:', error);
    return NextResponse.json({ error: 'Failed to create quest' }, { status: 500 });
  }
}
