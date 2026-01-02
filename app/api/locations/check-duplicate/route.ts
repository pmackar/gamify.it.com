import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// Check if a location already exists based on coordinates or name
export async function POST(req: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { latitude, longitude, name, cityId } = body;

  if (!latitude || !longitude) {
    return NextResponse.json(
      { error: "Coordinates are required" },
      { status: 400 }
    );
  }

  // Search radius in degrees (approximately 100 meters)
  // 1 degree latitude ≈ 111km, so 0.001 ≈ 111m
  const coordRadius = 0.0009; // ~100m

  // Build where clause for coordinate proximity
  const whereClause: {
    latitude?: { gte: number; lte: number };
    longitude?: { gte: number; lte: number };
    city_id?: string;
  } = {
    latitude: {
      gte: latitude - coordRadius,
      lte: latitude + coordRadius,
    },
    longitude: {
      gte: longitude - coordRadius,
      lte: longitude + coordRadius,
    },
  };

  // Optionally filter by city
  if (cityId) {
    whereClause.city_id = cityId;
  }

  // Check for existing location within radius
  const existingByCoords = await prisma.travel_locations.findFirst({
    where: whereClause,
    include: {
      city: { select: { name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
  });

  if (existingByCoords) {
    // Get user-specific data for this location
    const userData = await prisma.travel_user_location_data.findUnique({
      where: {
        user_id_location_id: {
          user_id: user.id,
          location_id: existingByCoords.id,
        },
      },
    });

    return NextResponse.json({
      isDuplicate: true,
      matchType: "coordinates",
      location: {
        id: existingByCoords.id,
        name: existingByCoords.name,
        type: existingByCoords.type,
        address: existingByCoords.address,
        latitude: existingByCoords.latitude,
        longitude: existingByCoords.longitude,
        city: existingByCoords.city,
        neighborhood: existingByCoords.neighborhood,
        visited: userData?.visited ?? existingByCoords.visited,
        hotlist: userData?.hotlist ?? existingByCoords.hotlist,
        rating: userData?.personal_rating ?? existingByCoords.avg_rating,
      },
    });
  }

  // If no coordinate match and name provided, try fuzzy name match within same city
  if (name && cityId) {
    const existingByName = await prisma.travel_locations.findFirst({
      where: {
        city_id: cityId,
        name: {
          equals: name,
          mode: "insensitive",
        },
      },
      include: {
        city: { select: { name: true, country: true } },
        neighborhood: { select: { id: true, name: true } },
      },
    });

    if (existingByName) {
      const userData = await prisma.travel_user_location_data.findUnique({
        where: {
          user_id_location_id: {
            user_id: user.id,
            location_id: existingByName.id,
          },
        },
      });

      return NextResponse.json({
        isDuplicate: true,
        matchType: "name",
        location: {
          id: existingByName.id,
          name: existingByName.name,
          type: existingByName.type,
          address: existingByName.address,
          latitude: existingByName.latitude,
          longitude: existingByName.longitude,
          city: existingByName.city,
          neighborhood: existingByName.neighborhood,
          visited: userData?.visited ?? existingByName.visited,
          hotlist: userData?.hotlist ?? existingByName.hotlist,
          rating: userData?.personal_rating ?? existingByName.avg_rating,
        },
      });
    }
  }

  return NextResponse.json({
    isDuplicate: false,
    location: null,
  });
}
