import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, getUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ neighborhoodId: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  // Use lightweight auth for read-only endpoint
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { neighborhoodId } = await params;

  const neighborhood = await prisma.travel_neighborhoods.findUnique({
    where: { id: neighborhoodId },
    include: {
      city: {
        select: { id: true, name: true, country: true },
      },
      locations: {
        select: {
          id: true,
          name: true,
          type: true,
          avg_rating: true,
          visited: true,
          hotlist: true,
        },
        orderBy: { name: 'asc' },
      },
    },
  });

  if (!neighborhood) {
    return NextResponse.json({ error: "Neighborhood not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: neighborhood.id,
    name: neighborhood.name,
    description: neighborhood.description,
    latitude: neighborhood.latitude,
    longitude: neighborhood.longitude,
    cityId: neighborhood.city_id,
    city: neighborhood.city,
    locations: neighborhood.locations.map(l => ({
      id: l.id,
      name: l.name,
      type: l.type,
      avgRating: l.avg_rating,
      visited: l.visited,
      hotlist: l.hotlist,
    })),
  });
}

export async function PATCH(
  req: NextRequest,
  { params }: RouteParams
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { neighborhoodId } = await params;
  const body = await req.json();
  const { name, description, latitude, longitude } = body;

  // Verify user owns this neighborhood
  const existing = await prisma.travel_neighborhoods.findFirst({
    where: { id: neighborhoodId, user_id: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Neighborhood not found" }, { status: 404 });
  }

  const neighborhood = await prisma.travel_neighborhoods.update({
    where: { id: neighborhoodId },
    data: {
      name: name ?? existing.name,
      description: description ?? existing.description,
      latitude: latitude ?? existing.latitude,
      longitude: longitude ?? existing.longitude,
    },
  });

  return NextResponse.json({
    id: neighborhood.id,
    name: neighborhood.name,
    description: neighborhood.description,
    latitude: neighborhood.latitude,
    longitude: neighborhood.longitude,
    cityId: neighborhood.city_id,
  });
}

export async function DELETE(
  req: NextRequest,
  { params }: RouteParams
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { neighborhoodId } = await params;

  // Verify user owns this neighborhood
  const existing = await prisma.travel_neighborhoods.findFirst({
    where: { id: neighborhoodId, user_id: user.id },
  });

  if (!existing) {
    return NextResponse.json({ error: "Neighborhood not found" }, { status: 404 });
  }

  await prisma.travel_neighborhoods.delete({
    where: { id: neighborhoodId },
  });

  return NextResponse.json({ success: true });
}
