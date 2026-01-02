import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import HotlistClient from "./HotlistClient";

async function getHotlistItems(userId: string) {
  const hotlistData = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: userId,
      hotlist: true,
    },
    include: {
      location: {
        include: {
          city: {
            select: { id: true, name: true, country: true },
          },
          neighborhood: {
            select: { id: true, name: true },
          },
        },
      },
    },
    orderBy: { updated_at: "desc" },
  });

  return hotlistData.map((item) => ({
    id: item.id,
    locationId: item.location_id,
    location: {
      id: item.location.id,
      name: item.location.name,
      type: item.location.type,
      address: item.location.address,
      city: item.location.city
        ? {
            id: item.location.city.id,
            name: item.location.city.name,
            country: item.location.city.country,
          }
        : null,
      neighborhood: item.location.neighborhood
        ? {
            id: item.location.neighborhood.id,
            name: item.location.neighborhood.name,
          }
        : null,
    },
    visited: item.visited,
    rating: item.rating,
    addedAt: item.created_at.toISOString(),
  }));
}

export default async function HotlistPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const items = await getHotlistItems(user.id);

  return <HotlistClient items={items} />;
}
