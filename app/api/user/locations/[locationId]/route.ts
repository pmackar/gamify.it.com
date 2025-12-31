import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ locationId: string }>;
}

// GET /api/user/locations/[locationId] - Get user's data for a specific location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { locationId } = await params;

    const userLocationData = await prisma.userLocationData.findUnique({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId,
        },
      },
    });

    return NextResponse.json({
      data: userLocationData || {
        hotlist: false,
        visited: false,
        rating: null,
        notes: null,
        priceLevel: null,
        visitCount: 0,
        firstVisitedAt: null,
        lastVisitedAt: null,
      },
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error fetching user location data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

// PATCH /api/user/locations/[locationId] - Update user's data for a specific location
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { locationId } = await params;
    const body = await request.json();

    // Validate location exists
    const location = await prisma.location.findUnique({
      where: { id: locationId, isActive: true },
      select: { id: true },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // Extract allowed fields
    const { hotlist, visited, rating, notes, priceLevel } = body;

    // Validate rating if provided
    if (rating !== undefined && rating !== null) {
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be an integer between 1 and 5' },
          { status: 400 }
        );
      }
    }

    // Validate priceLevel if provided
    if (priceLevel !== undefined && priceLevel !== null) {
      if (!Number.isInteger(priceLevel) || priceLevel < 1 || priceLevel > 4) {
        return NextResponse.json(
          { error: 'Price level must be an integer between 1 and 4' },
          { status: 400 }
        );
      }
    }

    // Build update data
    const updateData: {
      hotlist?: boolean;
      visited?: boolean;
      rating?: number | null;
      notes?: string | null;
      priceLevel?: number | null;
      firstVisitedAt?: Date;
      lastVisitedAt?: Date;
      visitCount?: { increment: number };
    } = {};

    if (typeof hotlist === 'boolean') updateData.hotlist = hotlist;
    if (typeof visited === 'boolean') {
      updateData.visited = visited;
      if (visited) {
        updateData.lastVisitedAt = new Date();
      }
    }
    if (rating !== undefined) updateData.rating = rating;
    if (notes !== undefined) updateData.notes = notes;
    if (priceLevel !== undefined) updateData.priceLevel = priceLevel;

    // Upsert user location data
    const userLocationData = await prisma.userLocationData.upsert({
      where: {
        userId_locationId: {
          userId: user.id,
          locationId,
        },
      },
      create: {
        userId: user.id,
        locationId,
        hotlist: hotlist ?? false,
        visited: visited ?? false,
        rating: rating ?? null,
        notes: notes ?? null,
        priceLevel: priceLevel ?? null,
        firstVisitedAt: visited ? new Date() : null,
        lastVisitedAt: visited ? new Date() : null,
        visitCount: visited ? 1 : 0,
      },
      update: updateData,
    });

    // If marking as visited for the first time, set firstVisitedAt
    if (visited && !userLocationData.firstVisitedAt) {
      await prisma.userLocationData.update({
        where: { id: userLocationData.id },
        data: { firstVisitedAt: new Date() },
      });
    }

    return NextResponse.json({
      data: {
        hotlist: userLocationData.hotlist,
        visited: userLocationData.visited,
        rating: userLocationData.rating,
        notes: userLocationData.notes,
        priceLevel: userLocationData.priceLevel,
        visitCount: userLocationData.visitCount,
        firstVisitedAt: userLocationData.firstVisitedAt,
        lastVisitedAt: userLocationData.lastVisitedAt,
      },
      message: 'Location data updated successfully',
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating user location data:', error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
