import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// GET /api/quests/[questId] - Get quest details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { questId } = await params;

  const quest = await prisma.travel_quests.findUnique({
    where: { id: questId },
    include: {
      user: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      target_city: {
        select: { id: true, name: true, country: true },
      },
      target_neighborhood: {
        select: { id: true, name: true },
      },
      items: {
        include: {
          location: {
            select: {
              id: true,
              name: true,
              type: true,
              latitude: true,
              longitude: true,
              city: {
                select: { id: true, name: true, country: true },
              },
            },
          },
          added_by: {
            select: { id: true, username: true, display_name: true, avatar_url: true },
          },
          completed_by: {
            select: { id: true, username: true, display_name: true, avatar_url: true },
          },
        },
        orderBy: [{ sort_order: "asc" }, { completed: "asc" }],
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
                  main_level: true,
                },
              },
            },
            orderBy: [{ role: "asc" }, { joined_at: "asc" }],
          },
        },
      },
    },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // Check if user has access to this quest
  const isOwner = quest.user_id === user.id;
  const isPartyMember = quest.party?.members.some(
    (m) => m.user_id === user.id && m.status === "ACCEPTED"
  );

  if (!isOwner && !isPartyMember) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  // Calculate completion stats
  const totalItems = quest.items.length;
  const completedItems = quest.items.filter((i) => i.completed).length;

  return NextResponse.json({
    quest: {
      id: quest.id,
      name: quest.name,
      description: quest.description,
      status: quest.status,
      startDate: quest.start_date,
      endDate: quest.end_date,
      createdAt: quest.created_at,
      updatedAt: quest.updated_at,
      owner: {
        id: quest.user.id,
        username: quest.user.username,
        displayName: quest.user.display_name,
        avatarUrl: quest.user.avatar_url,
      },
      targetCity: quest.target_city
        ? {
            id: quest.target_city.id,
            name: quest.target_city.name,
            country: quest.target_city.country,
          }
        : null,
      targetNeighborhood: quest.target_neighborhood
        ? {
            id: quest.target_neighborhood.id,
            name: quest.target_neighborhood.name,
          }
        : null,
      items: quest.items.map((item) => ({
        id: item.id,
        completed: item.completed,
        completedAt: item.completed_at,
        sortOrder: item.sort_order,
        priority: item.priority,
        notes: item.notes,
        location: {
          id: item.location.id,
          name: item.location.name,
          type: item.location.type,
          latitude: item.location.latitude,
          longitude: item.location.longitude,
          photoUrl: null,
          city: item.location.city
            ? {
                id: item.location.city.id,
                name: item.location.city.name,
                country: item.location.city.country,
              }
            : null,
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
            questId: quest.party.quest_id,
            createdAt: quest.party.created_at,
            members: quest.party.members.map((m) => ({
              id: m.id,
              userId: m.user_id,
              role: m.role,
              status: m.status,
              invitedAt: m.invited_at,
              joinedAt: m.joined_at,
              user: {
                id: m.user.id,
                username: m.user.username,
                displayName: m.user.display_name,
                avatarUrl: m.user.avatar_url,
                level: m.user.main_level || 1,
              },
            })),
          }
        : null,
      completionStats: {
        total: totalItems,
        completed: completedItems,
        percentage: totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0,
      },
    },
    isOwner,
    isPartyMember: isPartyMember || false,
    currentUserId: user.id,
  });
}
