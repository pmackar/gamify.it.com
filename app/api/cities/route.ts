import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateBody, Errors } from "@/lib/api";

// Body schema for POST
const createCitySchema = z.object({
  name: z.string().trim().min(1).max(100),
  country: z.string().trim().min(1).max(100),
  region: z.string().trim().max(100).optional().nullable(),
  countryCode: z.string().length(2).optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

// GET /api/cities
export const GET = withAuth(async (_request, user) => {
  const cities = await prisma.travel_cities.findMany({
    where: { user_id: user.id },
    include: {
      locations: {
        select: { id: true },
      },
      neighborhoods: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(
    cities.map((city) => ({
      id: city.id,
      name: city.name,
      country: city.country,
      region: city.region,
      countryCode: city.country_code,
      latitude: city.latitude,
      longitude: city.longitude,
      firstVisited: city.first_visited,
      lastVisited: city.last_visited,
      visitCount: city.visit_count,
      notes: city.notes,
      locationCount: city.locations.length,
      neighborhoods: city.neighborhoods.map((n) => ({
        id: n.id,
        name: n.name,
      })),
    }))
  );
});

// POST /api/cities
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createCitySchema);
  if (body instanceof NextResponse) return body;

  const { name, country, region, countryCode, latitude, longitude, notes } = body;

  // Check if city already exists for this user
  const existing = await prisma.travel_cities.findFirst({
    where: {
      user_id: user.id,
      name,
      country,
    },
  });

  if (existing) {
    return Errors.conflict("City already exists");
  }

  try {
    const city = await prisma.travel_cities.create({
      data: {
        user_id: user.id,
        name,
        country,
        region,
        country_code: countryCode,
        latitude,
        longitude,
        notes,
        first_visited: new Date(),
      },
    });

    return NextResponse.json({
      id: city.id,
      name: city.name,
      country: city.country,
      region: city.region,
      countryCode: city.country_code,
      latitude: city.latitude,
      longitude: city.longitude,
      notes: city.notes,
    });
  } catch (error) {
    console.error("Error creating city:", error);
    return Errors.database("Failed to create city");
  }
});
