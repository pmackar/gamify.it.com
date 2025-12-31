import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/quests/[id]/items - Add item(s) to quest
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: questId } = await params;
    const body = await request.json();

    // Check quest ownership
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      select: { userId: true, _count: { select: { items: true } } },
    });

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (quest.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { locationIds } = body;

    if (!locationIds || !Array.isArray(locationIds) || locationIds.length === 0) {
      return NextResponse.json({ error: 'locationIds array is required' }, { status: 400 });
    }

    // Verify all locations exist
    const locations = await prisma.location.findMany({
      where: { id: { in: locationIds }, isActive: true },
      select: { id: true },
    });

    type LocationType = (typeof locations)[number];
    const validIds = new Set(locations.map((l: LocationType) => l.id));
    const invalidIds = locationIds.filter((id: string) => !validIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { error: 'Some locations not found', invalidIds },
        { status: 400 }
      );
    }

    // Check for duplicates
    const existingItems = await prisma.questItem.findMany({
      where: { questId, locationId: { in: locationIds } },
      select: { locationId: true },
    });

    type ExistingItemType = (typeof existingItems)[number];
    const existingIds = new Set(existingItems.map((i: ExistingItemType) => i.locationId));
    const newLocationIds = locationIds.filter((id: string) => !existingIds.has(id));

    if (newLocationIds.length === 0) {
      return NextResponse.json(
        { error: 'All locations already in quest' },
        { status: 409 }
      );
    }

    // Create items with proper ordering
    const startOrder = quest._count.items;
    const items = await prisma.$transaction(
      newLocationIds.map((locationId: string, index: number) =>
        prisma.questItem.create({
          data: {
            questId,
            locationId,
            order: startOrder + index,
          },
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
        })
      )
    );

    return NextResponse.json({ data: items }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error adding quest items:', error);
    return NextResponse.json({ error: 'Failed to add items' }, { status: 500 });
  }
}

// DELETE /api/quests/[id]/items - Remove item from quest
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: questId } = await params;
    const searchParams = request.nextUrl.searchParams;
    const itemId = searchParams.get('itemId');

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    // Check quest ownership
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      select: { userId: true },
    });

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (quest.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    // Delete the item
    const item = await prisma.questItem.findFirst({
      where: { id: itemId, questId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    await prisma.questItem.delete({ where: { id: itemId } });

    // Reorder remaining items
    await prisma.questItem.updateMany({
      where: { questId, order: { gt: item.order } },
      data: { order: { decrement: 1 } },
    });

    return NextResponse.json({ message: 'Item removed' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error removing quest item:', error);
    return NextResponse.json({ error: 'Failed to remove item' }, { status: 500 });
  }
}

// PATCH /api/quests/[id]/items - Update item (complete/uncomplete, reorder)
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id: questId } = await params;
    const body = await request.json();

    // Check quest ownership
    const quest = await prisma.quest.findUnique({
      where: { id: questId },
      select: { userId: true },
    });

    if (!quest) {
      return NextResponse.json({ error: 'Quest not found' }, { status: 404 });
    }

    if (quest.userId !== user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    const { itemId, completed, order, notes } = body;

    if (!itemId) {
      return NextResponse.json({ error: 'itemId is required' }, { status: 400 });
    }

    const item = await prisma.questItem.findFirst({
      where: { id: itemId, questId },
    });

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    const updateData: Parameters<typeof prisma.questItem.update>[0]['data'] = {};

    if (completed !== undefined) {
      updateData.completed = completed;
      updateData.completedAt = completed ? new Date() : null;
    }

    if (notes !== undefined) {
      updateData.notes = notes;
    }

    if (order !== undefined && order !== item.order) {
      // Reorder items
      const allItems = await prisma.questItem.findMany({
        where: { questId },
        orderBy: { order: 'asc' },
      });

      const newOrder = Math.max(0, Math.min(order, allItems.length - 1));
      const oldOrder = item.order;

      if (newOrder !== oldOrder) {
        // Update orders for affected items
        if (newOrder < oldOrder) {
          await prisma.questItem.updateMany({
            where: { questId, order: { gte: newOrder, lt: oldOrder } },
            data: { order: { increment: 1 } },
          });
        } else {
          await prisma.questItem.updateMany({
            where: { questId, order: { gt: oldOrder, lte: newOrder } },
            data: { order: { decrement: 1 } },
          });
        }
        updateData.order = newOrder;
      }
    }

    const updated = await prisma.questItem.update({
      where: { id: itemId },
      data: updateData,
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
    });

    return NextResponse.json({ data: updated });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating quest item:', error);
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 });
  }
}
