import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import NewQuestClient from "./NewQuestClient";

async function getCities(userId: string) {
  const cities = await prisma.travel_cities.findMany({
    where: { user_id: userId },
    include: {
      neighborhoods: {
        select: { id: true, name: true },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { name: "asc" },
  });

  return cities.map((city) => ({
    id: city.id,
    name: city.name,
    country: city.country,
    neighborhoods: city.neighborhoods.map((n) => ({
      id: n.id,
      name: n.name,
    })),
  }));
}

export default async function NewQuestPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const cities = await getCities(user.id);

  return <NewQuestClient cities={cities} />;
}
