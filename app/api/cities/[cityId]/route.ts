import { NextResponse } from "next/server";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/cities/[cityId] - Get city details
export const GET = withAuthParams<{ cityId: string }>(
  async (_request, user, { cityId }) => {
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
        _count: { select: { locations: true } },
      },
    });

    if (!city) {
      return Errors.notFound("City not found");
    }

    // Get user's visited locations in this city
    const visitedLocations = await prisma.travel_user_location_data.findMany({
      where: {
        user_id: user.id,
        visited: true,
        location: { city_id: cityId },
      },
      select: { location_id: true },
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
);
