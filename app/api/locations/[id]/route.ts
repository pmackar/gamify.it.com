import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/locations/[id] - Get a single location with user data
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const location = await prisma.location.findUnique({
    where: { id },
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
      createdBy: {
        select: { id: true, name: true, image: true },
      },
      reviews: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          author: {
            select: { id: true, name: true, image: true },
          },
        },
      },
      visits: {
        where: { userId: session.user.id },
        orderBy: { date: "desc" },
        take: 10,
      },
      photos: {
        orderBy: { createdAt: "desc" },
        take: 20,
      },
      _count: {
        select: { visits: true, photos: true, reviews: true },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Get user's personal data for this location
  const userLocationData = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: session.user.id,
        locationId: id,
      },
    },
  });

  return NextResponse.json({
    ...location,
    // User-specific data (from UserLocationData or legacy fields as fallback)
    userVisited: userLocationData?.visited ?? location.visited ?? false,
    userHotlist: userLocationData?.hotlist ?? location.hotlist ?? false,
    userRating: userLocationData?.personalRating ?? null,
    userVisitCount: userLocationData?.visitCount ?? 0,
    userNotes: userLocationData?.notes ?? null,
  });
}

// PUT /api/locations/[id] - Update a location (creator only)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  // Check if location exists and user is the creator
  const existing = await prisma.location.findUnique({
    where: { id },
    select: { createdById: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (existing.createdById !== session.user.id) {
    return NextResponse.json(
      { error: "You can only edit locations you created" },
      { status: 403 }
    );
  }

  const location = await prisma.location.update({
    where: { id },
    data: {
      ...(body.name && { name: body.name }),
      ...(body.type && { type: body.type }),
      ...(body.cuisine !== undefined && { cuisine: body.cuisine }),
      ...(body.address !== undefined && { address: body.address }),
      ...(body.latitude !== undefined && { latitude: body.latitude }),
      ...(body.longitude !== undefined && { longitude: body.longitude }),
      ...(body.blurb !== undefined && { blurb: body.blurb }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.website !== undefined && { website: body.website }),
      ...(body.phone !== undefined && { phone: body.phone }),
      ...(body.hours !== undefined && { hours: body.hours }),
      ...(body.priceLevel !== undefined && { priceLevel: body.priceLevel }),
      ...(body.otherInfo !== undefined && { otherInfo: body.otherInfo }),
      ...(body.tags && { tags: body.tags }),
      ...(body.neighborhoodId !== undefined && { neighborhoodId: body.neighborhoodId }),
    },
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json(location);
}

// DELETE /api/locations/[id] - Delete a location (creator only)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Check if location exists and user is the creator
  const existing = await prisma.location.findUnique({
    where: { id },
    select: { createdById: true, cityId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  if (existing.createdById !== session.user.id) {
    return NextResponse.json(
      { error: "You can only delete locations you created" },
      { status: 403 }
    );
  }

  // Delete the location (cascade will handle related records)
  await prisma.location.delete({
    where: { id },
  });

  // Update city location count
  await prisma.city.update({
    where: { id: existing.cityId },
    data: { locationCount: { decrement: 1 } },
  });

  return NextResponse.json({ message: "Location deleted" });
}
