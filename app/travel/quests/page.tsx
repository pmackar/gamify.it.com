import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";
import QuestsClient from "./QuestsClient";

async function getQuests(userId: string) {
  const quests = await prisma.travel_quests.findMany({
    where: { user_id: userId },
    include: {
      cities: {
        include: {
          city: {
            select: { id: true, name: true, country: true },
          },
        },
        orderBy: { sort_order: "asc" },
      },
      neighborhoods: {
        include: {
          neighborhood: {
            select: { id: true, name: true },
          },
        },
      },
      items: {
        select: { id: true, completed: true },
      },
      party: {
        include: {
          members: {
            where: { status: "ACCEPTED" },
            include: {
              user: {
                select: {
                  id: true,
                  username: true,
                  display_name: true,
                  avatar_url: true,
                },
              },
            },
            take: 5,
          },
        },
      },
    },
    orderBy: { updated_at: "desc" },
  });

  return quests.map((quest) => ({
    id: quest.id,
    name: quest.name,
    description: quest.description,
    status: quest.status,
    startDate: quest.start_date?.toISOString() || null,
    endDate: quest.end_date?.toISOString() || null,
    createdAt: quest.created_at.toISOString(),
    updatedAt: quest.updated_at.toISOString(),
    cities: quest.cities.map((qc) => ({
      id: qc.city.id,
      name: qc.city.name,
      country: qc.city.country,
    })),
    neighborhoods: quest.neighborhoods.map((qn) => ({
      id: qn.neighborhood.id,
      name: qn.neighborhood.name,
    })),
    completionStats: {
      total: quest.items.length,
      completed: quest.items.filter((i) => i.completed).length,
      percentage:
        quest.items.length > 0
          ? Math.round(
              (quest.items.filter((i) => i.completed).length /
                quest.items.length) *
                100
            )
          : 0,
    },
    party: quest.party
      ? {
          memberCount: quest.party.members.length,
          members: quest.party.members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.display_name,
            avatarUrl: m.user.avatar_url,
          })),
        }
      : null,
  }));
}

export default async function QuestsPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const quests = await getQuests(user.id);

  return <QuestsClient quests={quests} />;
}
