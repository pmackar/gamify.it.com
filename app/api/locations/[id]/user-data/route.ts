import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const UpdateSchema = z.object({
  hotlist: z.boolean().optional(),
  visited: z.boolean().optional(),
  personalRating: z.number().min(0).max(5).nullable().optional(),
  notes: z.string().nullable().optional(),
});

// GET /api/locations/[id]/user-data - Get user's data for this location
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id: locationId }) => {
    const userLocationData = await prisma.travel_user_location_data.findUnique({
      where: {
        user_id_location_id: {
          user_id: user.id,
          location_id: locationId,
        },
      },
    });

    if (!userLocationData) {
      // Return default values if no record exists
      return NextResponse.json({
        hotlist: false,
        visited: false,
        personalRating: null,
        notes: null,
        visitCount: 0,
        firstVisitedAt: null,
        lastVisitedAt: null,
      });
    }

    return NextResponse.json({
      hotlist: userLocationData.hotlist,
      visited: userLocationData.visited,
      personalRating: userLocationData.personal_rating,
      notes: userLocationData.notes,
      visitCount: userLocationData.visit_count,
      firstVisitedAt: userLocationData.first_visited_at,
      lastVisitedAt: userLocationData.last_visited_at,
    });
  }
);

// POST /api/locations/[id]/user-data - Update user's data for this location
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id: locationId }) => {
    const body = await request.json();
    const parsed = UpdateSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Invalid user data");
    }

    // Verify location exists
    const location = await prisma.travel_locations.findUnique({
      where: { id: locationId },
      select: { id: true, type: true },
    });

    if (!location) {
      return Errors.notFound("Location not found");
    }

    const data = parsed.data;

    // Get existing user data
    const existingData = await prisma.travel_user_location_data.findUnique({
      where: {
        user_id_location_id: {
          user_id: user.id,
          location_id: locationId,
        },
      },
    });

    const wasVisited = existingData?.visited ?? false;
    const newVisited = data.visited ?? wasVisited;
    const isFirstVisit = !wasVisited && newVisited;

    // Upsert user location data
    const userLocationData = await prisma.travel_user_location_data.upsert({
      where: {
        user_id_location_id: {
          user_id: user.id,
          location_id: locationId,
        },
      },
      update: {
        ...(data.hotlist !== undefined && { hotlist: data.hotlist }),
        ...(data.visited !== undefined && { visited: data.visited }),
        ...(data.personalRating !== undefined && { personal_rating: data.personalRating }),
        ...(data.notes !== undefined && { notes: data.notes }),
        // Update visit timestamps if marking as visited
        ...(isFirstVisit && {
          first_visited_at: new Date(),
          last_visited_at: new Date(),
          visit_count: { increment: 1 },
        }),
      },
      create: {
        user_id: user.id,
        location_id: locationId,
        hotlist: data.hotlist ?? false,
        visited: data.visited ?? false,
        personal_rating: data.personalRating ?? null,
        notes: data.notes ?? null,
        visit_count: data.visited ? 1 : 0,
        first_visited_at: data.visited ? new Date() : null,
        last_visited_at: data.visited ? new Date() : null,
      },
    });

    // Award XP for first visit
    let xpGained = 0;

    if (isFirstVisit) {
      // Update location's total visits count
      await prisma.travel_locations.update({
        where: { id: locationId },
        data: { total_visits: { increment: 1 } },
      });

      // Award XP based on location type
      const typeXpMap: Record<string, number> = {
        RESTAURANT: 50,
        BAR: 40,
        CAFE: 30,
        ATTRACTION: 60,
        MUSEUM: 55,
        PARK: 35,
        SHOP: 25,
        HOTEL: 45,
        OTHER: 30,
      };
      xpGained = typeXpMap[location.type] ?? 30;

      await prisma.app_profiles.upsert({
        where: {
          user_id_app_id: {
            user_id: user.id,
            app_id: "travel",
          },
        },
        update: {
          xp: { increment: xpGained },
        },
        create: {
          user_id: user.id,
          app_id: "travel",
          xp: xpGained,
          level: 1,
          xp_to_next: 100,
        },
      });
    }

    return NextResponse.json({
      hotlist: userLocationData.hotlist,
      visited: userLocationData.visited,
      personalRating: userLocationData.personal_rating,
      notes: userLocationData.notes,
      visitCount: userLocationData.visit_count,
      firstVisitedAt: userLocationData.first_visited_at,
      lastVisitedAt: userLocationData.last_visited_at,
      xpGained,
    });
  }
);
