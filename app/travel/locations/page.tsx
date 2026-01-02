import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import LocationsClient from "./LocationsClient";

async function getInitialLocations(userId: string) {
  const [locations, total] = await Promise.all([
    prisma.travel_locations.findMany({
      where: { user_id: userId },
      include: {
        city: { select: { name: true, country: true } },
        neighborhood: { select: { id: true, name: true } },
        _count: { select: { visits: true, photos: true, reviews: true } },
      },
      orderBy: { updated_at: "desc" },
      take: 50,
    }),
    prisma.travel_locations.count({
      where: { user_id: userId },
    }),
  ]);

  return {
    data: locations.map((location) => ({
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
      visited: location.visited,
      hotlist: location.hotlist,
      tags: location.tags,
      avgRating: location.avg_rating,
      ratingCount: location.rating_count,
      reviewCount: location.review_count,
      totalVisits: location.total_visits,
      city: location.city,
      neighborhood: location.neighborhood,
      _count: location._count,
      createdAt: location.created_at.toISOString(),
      updatedAt: location.updated_at.toISOString(),
    })),
    pagination: {
      total,
      limit: 50,
      offset: 0,
      hasMore: locations.length < total,
    },
  };
}

export default async function LocationsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const initialData = await getInitialLocations(user.id);

  return <LocationsClient initialData={initialData} />;
}
