import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect, notFound } from "next/navigation";
import QuestDetailClient from "./QuestDetailClient";

interface PageProps {
  params: Promise<{ questId: string }>;
}

async function getQuest(questId: string, userId: string) {
  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
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
        include: {
          location: {
            select: {
              id: true,
              name: true,
              type: true,
              address: true,
              city: { select: { name: true, country: true } },
              neighborhood: { select: { name: true } },
            },
          },
          added_by: {
            select: { id: true, username: true, display_name: true, avatar_url: true },
          },
          completed_by: {
            select: { id: true, username: true, display_name: true, avatar_url: true },
          },
        },
        orderBy: { sort_order: "asc" },
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
          },
        },
      },
    },
  });

  if (!quest) return null;

  // Check access
  const isOwner = quest.user_id === userId;
  const isPartyMember = quest.party?.members.some((m) => m.user_id === userId);

  if (!isOwner && !isPartyMember) return null;

  return {
    id: quest.id,
    name: quest.name,
    description: quest.description,
    status: quest.status,
    startDate: quest.start_date?.toISOString() || null,
    endDate: quest.end_date?.toISOString() || null,
    createdAt: quest.created_at.toISOString(),
    updatedAt: quest.updated_at.toISOString(),
    isOwner,
    cities: quest.cities.map((qc) => ({
      id: qc.city.id,
      name: qc.city.name,
      country: qc.city.country,
    })),
    neighborhoods: quest.neighborhoods.map((qn) => ({
      id: qn.neighborhood.id,
      name: qn.neighborhood.name,
    })),
    items: quest.items.map((item) => ({
      id: item.id,
      completed: item.completed,
      completedAt: item.completed_at?.toISOString() || null,
      sortOrder: item.sort_order,
      location: {
        id: item.location.id,
        name: item.location.name,
        type: item.location.type,
        address: item.location.address,
        city: item.location.city,
        neighborhood: item.location.neighborhood,
      },
      addedBy: item.added_by
        ? {
            id: item.added_by.id,
            username: item.added_by.username,
            displayName: item.added_by.display_name,
            avatarUrl: item.added_by.avatar_url,
          }
        : null,
      completedBy: item.completed_by
        ? {
            id: item.completed_by.id,
            username: item.completed_by.username,
            displayName: item.completed_by.display_name,
            avatarUrl: item.completed_by.avatar_url,
          }
        : null,
    })),
    party: quest.party
      ? {
          id: quest.party.id,
          memberCount: quest.party.members.length,
          members: quest.party.members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.display_name,
            avatarUrl: m.user.avatar_url,
          })),
        }
      : null,
  };
}

export default async function QuestDetailPage({ params }: PageProps) {
  const { questId } = await params;
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  const quest = await getQuest(questId, user.id);

  if (!quest) {
    notFound();
  }

  return <QuestDetailClient quest={quest} userId={user.id} />;
}
