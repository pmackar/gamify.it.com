import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const BodySchema = z.object({
  locationIds: z.array(z.string().uuid()),
});

// POST /api/locations/hotlist-stats - Get hotlist friend counts for multiple locations
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const parsed = BodySchema.safeParse(body);

  if (!parsed.success || parsed.data.locationIds.length === 0) {
    return NextResponse.json({ stats: {} });
  }

  const { locationIds } = parsed.data;

  // Get user's friends
  const friendships = await prisma.friendships.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requester_id: user.id }, { addressee_id: user.id }],
    },
    select: { requester_id: true, addressee_id: true },
  });

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  if (friendIds.length === 0) {
    return NextResponse.json({ stats: {} });
  }

  // Get hotlist counts for each location
  const hotlistData = await prisma.travel_user_location_data.groupBy({
    by: ["location_id"],
    where: {
      location_id: { in: locationIds },
      user_id: { in: friendIds },
      hotlist: true,
    },
    _count: { user_id: true },
  });

  // Get first 3 friend names for each location
  const hotlistDetails = await prisma.travel_user_location_data.findMany({
    where: {
      location_id: { in: locationIds },
      user_id: { in: friendIds },
      hotlist: true,
    },
    include: {
      user: { select: { id: true, display_name: true, username: true } },
    },
    orderBy: { created_at: "desc" },
  });

  // Build stats map
  const stats: Record<string, { count: number; friendNames: string[] }> = {};

  for (const item of hotlistData) {
    const locationDetails = hotlistDetails.filter(
      (d) => d.location_id === item.location_id
    );
    const friendNames = locationDetails
      .slice(0, 3)
      .map((d) => d.user.display_name || d.user.username || "Friend");

    stats[item.location_id] = {
      count: item._count.user_id,
      friendNames,
    };
  }

  return NextResponse.json({ stats });
});
