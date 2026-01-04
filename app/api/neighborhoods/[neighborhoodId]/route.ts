import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const PatchSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
});

// GET /api/neighborhoods/[neighborhoodId] - Get neighborhood details
export const GET = withAuthParams<{ neighborhoodId: string }>(
  async (_request, _user, { neighborhoodId }) => {
    const neighborhood = await prisma.travel_neighborhoods.findUnique({
      where: { id: neighborhoodId },
      include: {
        city: { select: { id: true, name: true, country: true } },
        locations: {
          select: {
            id: true, name: true, type: true, avg_rating: true, visited: true, hotlist: true,
          },
          orderBy: { name: "asc" },
        },
      },
    });

    if (!neighborhood) {
      return Errors.notFound("Neighborhood not found");
    }

    return NextResponse.json({
      id: neighborhood.id,
      name: neighborhood.name,
      description: neighborhood.description,
      latitude: neighborhood.latitude,
      longitude: neighborhood.longitude,
      cityId: neighborhood.city_id,
      city: neighborhood.city,
      locations: neighborhood.locations.map((l) => ({
        id: l.id,
        name: l.name,
        type: l.type,
        avgRating: l.avg_rating,
        visited: l.visited,
        hotlist: l.hotlist,
      })),
    });
  }
);

// PATCH /api/neighborhoods/[neighborhoodId] - Update neighborhood
export const PATCH = withAuthParams<{ neighborhoodId: string }>(
  async (request, user, { neighborhoodId }) => {
    const body = await request.json();
    const parsed = PatchSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Invalid neighborhood data");
    }

    const { name, description, latitude, longitude } = parsed.data;

    // Verify user owns this neighborhood
    const existing = await prisma.travel_neighborhoods.findFirst({
      where: { id: neighborhoodId, user_id: user.id },
    });

    if (!existing) {
      return Errors.notFound("Neighborhood not found");
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
);

// DELETE /api/neighborhoods/[neighborhoodId] - Delete neighborhood
export const DELETE = withAuthParams<{ neighborhoodId: string }>(
  async (_request, user, { neighborhoodId }) => {
    const existing = await prisma.travel_neighborhoods.findFirst({
      where: { id: neighborhoodId, user_id: user.id },
    });

    if (!existing) {
      return Errors.notFound("Neighborhood not found");
    }

    await prisma.travel_neighborhoods.delete({ where: { id: neighborhoodId } });

    return NextResponse.json({ success: true });
  }
);
