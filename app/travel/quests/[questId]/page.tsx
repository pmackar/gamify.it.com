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
            orderBy: { invited_at: "asc" },
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

  // Get party member IDs (including owner)
  const partyMemberIds = quest.party
    ? quest.party.members.filter((m) => m.status === "ACCEPTED").map((m) => m.user_id)
    : [];
  if (!partyMemberIds.includes(quest.user_id)) {
    partyMemberIds.push(quest.user_id);
  }

  // Get location IDs from quest items
  const locationIds = quest.items.map((item) => item.location_id);

  // Fetch hotlist data for all locations from party members
  const hotlistData = locationIds.length > 0
    ? await prisma.travel_user_location_data.findMany({
        where: {
          location_id: { in: locationIds },
          user_id: { in: partyMemberIds },
          hotlist: true,
        },
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
      })
    : [];

  // Create a map of location ID to hotlist users
  const hotlistByLocation = new Map<string, Array<{ id: string; username: string; displayName: string | null; avatarUrl: string | null }>>();
  for (const data of hotlistData) {
    if (!hotlistByLocation.has(data.location_id)) {
      hotlistByLocation.set(data.location_id, []);
    }
    hotlistByLocation.get(data.location_id)!.push({
      id: data.user.id,
      username: data.user.username,
      displayName: data.user.display_name,
      avatarUrl: data.user.avatar_url,
    });
  }

  // Build items with hotlist info and sort by hotlist count
  const itemsWithHotlist = quest.items.map((item) => ({
    item,
    hotlistedBy: hotlistByLocation.get(item.location_id) || [],
  }));

  // Sort: most hotlisted first, then by original sort order
  itemsWithHotlist.sort((a, b) => {
    if (b.hotlistedBy.length !== a.hotlistedBy.length) {
      return b.hotlistedBy.length - a.hotlistedBy.length;
    }
    return a.item.sort_order - b.item.sort_order;
  });

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
    items: itemsWithHotlist.map(({ item, hotlistedBy }) => ({
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
      hotlistedBy,
    })),
    party: quest.party
      ? {
          id: quest.party.id,
          memberCount: quest.party.members.filter((m) => m.status === "ACCEPTED").length,
          members: quest.party.members.map((m) => ({
            id: m.user.id,
            username: m.user.username,
            displayName: m.user.display_name,
            avatarUrl: m.user.avatar_url,
            status: m.status,
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
