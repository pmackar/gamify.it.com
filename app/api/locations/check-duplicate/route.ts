import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const BodySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  name: z.string().optional(),
  cityId: z.string().uuid().optional(),
});

// POST /api/locations/check-duplicate - Check if a location already exists
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success) {
    return Errors.invalidInput("Coordinates are required");
  }

  const { latitude, longitude, name, cityId } = parsed.data;

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
        latitude: Number(existingByCoords.latitude),
        longitude: Number(existingByCoords.longitude),
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
          latitude: Number(existingByName.latitude),
          longitude: Number(existingByName.longitude),
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
});
