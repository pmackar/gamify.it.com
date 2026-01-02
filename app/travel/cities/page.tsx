import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import CitiesClient from "./CitiesClient";

async function getCities(userId: string) {
  const cities = await prisma.travel_cities.findMany({
    where: { user_id: userId },
    include: {
      locations: {
        select: { id: true },
      },
      neighborhoods: {
        select: { id: true, name: true },
      },
    },
    orderBy: { name: 'asc' },
  });

  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    country: city.country,
    region: city.region,
    countryCode: city.country_code,
    latitude: city.latitude,
    longitude: city.longitude,
    firstVisited: city.first_visited?.toISOString() || null,
    lastVisited: city.last_visited?.toISOString() || null,
    visitCount: city.visit_count,
    notes: city.notes,
    locationCount: city.locations.length,
    neighborhoods: city.neighborhoods.map((n) => ({
      id: n.id,
      name: n.name,
    })),
  }));
}

export default async function CitiesPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const cities = await getCities(user.id);

  return <CitiesClient cities={cities} />;
}
