import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateBody, validateQuery, Errors } from "@/lib/api";

// Query params schema for GET
const neighborhoodsQuerySchema = z.object({
  cityId: z.string().uuid().optional(),
});

// Body schema for POST
const createNeighborhoodSchema = z.object({
  name: z.string().trim().min(1).max(100),
  cityId: z.string().uuid(),
  description: z.string().max(2000).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

// GET /api/neighborhoods
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, neighborhoodsQuerySchema);
  if (params instanceof NextResponse) return params;

  const { cityId } = params;

  const where: { user_id: string; city_id?: string } = { user_id: user.id };
  if (cityId) {
    where.city_id = cityId;
  }

  const neighborhoods = await prisma.travel_neighborhoods.findMany({
    where,
    include: {
      city: {
        select: { id: true, name: true, country: true },
      },
      locations: {
        select: { id: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    neighborhoods.map((n) => ({
      id: n.id,
      name: n.name,
      description: n.description,
      latitude: n.latitude,
      longitude: n.longitude,
      cityId: n.city_id,
      city: n.city,
      locationCount: n.locations.length,
    }))
  );
});

// POST /api/neighborhoods
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createNeighborhoodSchema);
  if (body instanceof NextResponse) return body;

  const { name, description, cityId, latitude, longitude } = body;

  // Verify user owns the city
  const city = await prisma.travel_cities.findFirst({
    where: { id: cityId, user_id: user.id },
  });

  if (!city) {
    return Errors.notFound("City");
  }

  // Check if neighborhood already exists
  const existing = await prisma.travel_neighborhoods.findFirst({
    where: {
      user_id: user.id,
      city_id: cityId,
      name,
    },
  });

  if (existing) {
    return Errors.conflict("Neighborhood already exists in this city");
  }

  try {
    const neighborhood = await prisma.travel_neighborhoods.create({
      data: {
        user_id: user.id,
        city_id: cityId,
        name,
        description,
        latitude,
        longitude,
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
  } catch (error) {
    console.error("Error creating neighborhood:", error);
    return Errors.database("Failed to create neighborhood");
  }
});
