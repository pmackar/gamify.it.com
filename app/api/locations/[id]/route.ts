import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const UpdateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  type: z.string().optional(),
  cuisine: z.string().nullable().optional(),
  address: z.string().nullable().optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  blurb: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  website: z.string().url().nullable().optional(),
  phone: z.string().nullable().optional(),
  hours: z.string().nullable().optional(),
  priceLevel: z.number().min(1).max(4).nullable().optional(),
  otherInfo: z.any().nullable().optional(),
  tags: z.array(z.string()).optional(),
  neighborhoodId: z.string().uuid().nullable().optional(),
});

// GET /api/locations/[id] - Get a single location with user data
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const location = await prisma.travel_locations.findUnique({
      where: { id },
      include: {
        city: { select: { id: true, name: true, country: true } },
        neighborhood: { select: { id: true, name: true } },
        visits: {
          where: { user_id: user.id },
          orderBy: { date: "desc" },
          take: 10,
        },
      },
    });

    if (!location) {
      return Errors.notFound("Location not found");
    }

    // Get user's personal data for this location
    const userLocationData = await prisma.travel_user_location_data.findUnique({
      where: {
        user_id_location_id: {
          user_id: user.id,
          location_id: id,
        },
      },
    });

    return NextResponse.json({
      id: location.id,
      name: location.name,
      type: location.type,
      cuisine: location.cuisine,
      address: location.address,
      latitude: location.latitude,
      longitude: location.longitude,
      blurb: location.blurb,
      description: location.description,
      website: location.website,
      phone: location.phone,
      hours: location.hours,
      priceLevel: location.price_level,
      otherInfo: location.other_info,
      tags: location.tags,
      avgRating: location.avg_rating,
      ratingCount: location.rating_count,
      totalVisits: location.total_visits,
      city: location.city,
      neighborhood: location.neighborhood?.name || null,
      visits: location.visits.map((v) => ({
        id: v.id,
        date: v.date,
        overallRating: v.overall_rating,
        notes: v.notes,
      })),
      // User-specific data
      visited: userLocationData?.visited ?? location.visited ?? false,
      hotlist: userLocationData?.hotlist ?? location.hotlist ?? false,
      userRating: userLocationData?.personal_rating ?? null,
      userVisitCount: userLocationData?.visit_count ?? 0,
      userNotes: userLocationData?.notes ?? null,
    });
  }
);

// PUT /api/locations/[id] - Update a location
export const PUT = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Invalid location data");
    }

    // Check if location exists
    const existing = await prisma.travel_locations.findUnique({
      where: { id },
      select: { user_id: true },
    });

    if (!existing) {
      return Errors.notFound("Location not found");
    }

    // Only allow creator to edit (or anyone if no creator set)
    if (existing.user_id && existing.user_id !== user.id) {
      return Errors.forbidden("You can only edit locations you created");
    }

    const data = parsed.data;
    const location = await prisma.travel_locations.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.type && { type: data.type }),
        ...(data.cuisine !== undefined && { cuisine: data.cuisine }),
        ...(data.address !== undefined && { address: data.address }),
        ...(data.latitude !== undefined && { latitude: data.latitude }),
        ...(data.longitude !== undefined && { longitude: data.longitude }),
        ...(data.blurb !== undefined && { blurb: data.blurb }),
        ...(data.description !== undefined && { description: data.description }),
        ...(data.website !== undefined && { website: data.website }),
        ...(data.phone !== undefined && { phone: data.phone }),
        ...(data.hours !== undefined && { hours: data.hours }),
        ...(data.priceLevel !== undefined && { price_level: data.priceLevel }),
        ...(data.otherInfo !== undefined && { other_info: data.otherInfo }),
        ...(data.tags && { tags: data.tags }),
        ...(data.neighborhoodId !== undefined && { neighborhood_id: data.neighborhoodId }),
      },
      include: {
        city: { select: { id: true, name: true, country: true } },
        neighborhood: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json({
      id: location.id,
      name: location.name,
      type: location.type,
      city: location.city,
      neighborhood: location.neighborhood,
    });
  }
);

// DELETE /api/locations/[id] - Delete a location
export const DELETE = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    // Check if location exists
    const existing = await prisma.travel_locations.findUnique({
      where: { id },
      select: { user_id: true, city_id: true },
    });

    if (!existing) {
      return Errors.notFound("Location not found");
    }

    // Only allow creator to delete (or anyone if no creator set)
    if (existing.user_id && existing.user_id !== user.id) {
      return Errors.forbidden("You can only delete locations you created");
    }

    // Delete the location (cascade will handle related records)
    await prisma.travel_locations.delete({
      where: { id },
    });

    // Update city location count
    await prisma.travel_cities.update({
      where: { id: existing.city_id },
      data: { location_count: { decrement: 1 } },
    });

    return NextResponse.json({ message: "Location deleted" });
  }
);
