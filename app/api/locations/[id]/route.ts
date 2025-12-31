import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getCurrentUser, requireAuth } from '@/lib/auth';
import { UpdateLocationInput } from '@/types';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/locations/[id] - Get a single location
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const location = await prisma.location.findUnique({
      where: { id, isActive: true },
      include: {
        createdBy: {
          select: { id: true, username: true, avatarUrl: true },
        },
        reviews: {
          where: { status: 'APPROVED' },
          orderBy: { createdAt: 'desc' },
          take: 10,
          include: {
            author: {
              select: { id: true, username: true, avatarUrl: true },
            },
          },
        },
      },
    });

    if (!location) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    // If user is authenticated, include their personal data
    const user = await getCurrentUser();
    let userSpecific = null;

    if (user) {
      userSpecific = await prisma.userLocationData.findUnique({
        where: {
          userId_locationId: {
            userId: user.id,
            locationId: id,
          },
        },
      });
    }

    return NextResponse.json({
      data: {
        ...location,
        userSpecific,
      },
    });
  } catch (error) {
    console.error('Error fetching location:', error);
    return NextResponse.json({ error: 'Failed to fetch location' }, { status: 500 });
  }
}

// PUT /api/locations/[id] - Update a location
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;
    const body: UpdateLocationInput = await request.json();

    // Check if location exists and user is the creator
    const existing = await prisma.location.findUnique({
      where: { id },
      select: { createdById: true, isActive: true },
    });

    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (existing.createdById !== user.id) {
      return NextResponse.json({ error: 'You can only edit locations you created' }, { status: 403 });
    }

    const location = await prisma.location.update({
      where: { id },
      data: {
        ...(body.name && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.address !== undefined && { address: body.address }),
        ...(body.city !== undefined && { city: body.city }),
        ...(body.state !== undefined && { state: body.state }),
        ...(body.country !== undefined && { country: body.country }),
        ...(body.postalCode !== undefined && { postalCode: body.postalCode }),
        ...(body.neighborhood !== undefined && { neighborhood: body.neighborhood }),
        ...(body.latitude !== undefined && { latitude: body.latitude }),
        ...(body.longitude !== undefined && { longitude: body.longitude }),
        ...(body.category && { category: body.category }),
        ...(body.tags && { tags: body.tags }),
        ...(body.photoUrl !== undefined && { photoUrl: body.photoUrl }),
        ...(body.website !== undefined && { website: body.website }),
        ...(body.phone !== undefined && { phone: body.phone }),
      },
      include: {
        createdBy: {
          select: { id: true, username: true, avatarUrl: true },
        },
      },
    });

    return NextResponse.json({ data: location });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error updating location:', error);
    return NextResponse.json({ error: 'Failed to update location' }, { status: 500 });
  }
}

// DELETE /api/locations/[id] - Soft delete a location
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    // Check if location exists and user is the creator
    const existing = await prisma.location.findUnique({
      where: { id },
      select: { createdById: true, isActive: true },
    });

    if (!existing || !existing.isActive) {
      return NextResponse.json({ error: 'Location not found' }, { status: 404 });
    }

    if (existing.createdById !== user.id) {
      return NextResponse.json({ error: 'You can only delete locations you created' }, { status: 403 });
    }

    // Soft delete
    await prisma.location.update({
      where: { id },
      data: { isActive: false },
    });

    return NextResponse.json({ message: 'Location deleted' });
  } catch (error) {
    if (error instanceof Error && error.message === 'Unauthorized') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.error('Error deleting location:', error);
    return NextResponse.json({ error: 'Failed to delete location' }, { status: 500 });
  }
}
