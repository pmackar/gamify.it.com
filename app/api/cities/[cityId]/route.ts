import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ cityId: string }>;
}

export async function GET(
  req: NextRequest,
  { params }: RouteParams
) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { cityId } = await params;

  // Get the city
  const city = await prisma.travel_cities.findUnique({
    where: { id: cityId },
    include: {
      neighborhoods: {
        select: {
          id: true,
          name: true,
          _count: { select: { locations: true } },
        },
      },
      _count: {
        select: { locations: true },
      },
    },
  });

  if (!city) {
    return NextResponse.json({ error: "City not found" }, { status: 404 });
  }

  // Get user's visited locations in this city
  const visitedLocations = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: user.id,
      visited: true,
      location: {
        city_id: cityId,
      },
    },
    select: {
      location_id: true,
    },
  });

  return NextResponse.json({
    id: city.id,
    name: city.name,
    country: city.country,
    region: city.region,
    latitude: city.latitude,
    longitude: city.longitude,
    firstVisited: city.first_visited,
    lastVisited: city.last_visited,
    visitCount: city.visit_count,
    locationCount: city.location_count || city._count.locations,
    notes: city.notes,
    neighborhoods: city.neighborhoods.map((n) => ({
      id: n.id,
      name: n.name,
      locationCount: n._count.locations,
    })),
    visitedLocationCount: visitedLocations.length,
  });
}
