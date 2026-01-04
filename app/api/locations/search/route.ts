import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/locations/search - Search locations by name
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q")?.trim();
  const limit = Math.min(parseInt(searchParams.get("limit") || "10"), 50);

  if (!query || query.length < 2) {
    return NextResponse.json({ locations: [] });
  }

  // Search locations by name (case-insensitive)
  const locations = await prisma.travel_locations.findMany({
    where: {
      name: { contains: query, mode: "insensitive" },
    },
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
    orderBy: [
      { visited: "desc" }, // Show visited locations first
      { total_visits: "desc" },
      { name: "asc" },
    ],
    take: limit,
  });

  // Get user-specific data for these locations
  const locationIds = locations.map((l) => l.id);
  const userData = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: user.id,
      location_id: { in: locationIds },
    },
  });
  const userDataMap = new Map(userData.map((d) => [d.location_id, d]));

  return NextResponse.json({
    locations: locations.map((location) => {
      const ud = userDataMap.get(location.id);
      return {
        id: location.id,
        name: location.name,
        type: location.type,
        address: location.address,
        latitude: Number(location.latitude),
        longitude: Number(location.longitude),
        city: location.city,
        neighborhood: location.neighborhood,
        visited: ud?.visited ?? location.visited ?? false,
        hotlist: ud?.hotlist ?? location.hotlist ?? false,
        rating: ud?.personal_rating ? Number(ud.personal_rating) : null,
      };
    }),
  });
});
