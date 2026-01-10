import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "@/lib/api";

// GET /api/fitness/athlete/groups - List groups athlete is a member of
export const GET = withAuth(async (_request, user) => {
  const memberships = await prisma.coaching_group_members.findMany({
    where: { athlete_id: user.id },
    include: {
      group: {
        include: {
          coach: {
            select: {
              user: {
                select: {
                  id: true,
                  display_name: true,
                  avatar_url: true,
                },
              },
            },
          },
          members: {
            select: { athlete_id: true },
          },
          messages: {
            orderBy: { created_at: "desc" },
            take: 1,
            select: {
              content: true,
              sender_id: true,
              created_at: true,
              sender: {
                select: {
                  display_name: true,
                },
              },
            },
          },
        },
      },
    },
    orderBy: { joined_at: "desc" },
  });

  // Get read statuses for unread counts
  const readStatuses = await prisma.coaching_group_read_status.findMany({
    where: {
      user_id: user.id,
      group_id: {
        in: memberships.map((m) => m.group_id),
      },
    },
  });

  const readStatusMap = new Map(readStatuses.map((rs) => [rs.group_id, rs.last_read_at]));

  // Get unread counts per group
  const unreadCounts = await Promise.all(
    memberships.map(async (m) => {
      const lastRead = readStatusMap.get(m.group_id);
      if (!lastRead) {
        // Never read - count all messages
        return prisma.coaching_group_messages.count({
          where: { group_id: m.group_id },
        });
      }
      return prisma.coaching_group_messages.count({
        where: {
          group_id: m.group_id,
          created_at: { gt: lastRead },
          sender_id: { not: user.id },
        },
      });
    })
  );

  const groups = memberships.map((m, i) => ({
    id: m.group.id,
    name: m.group.name,
    description: m.group.description,
    color: m.group.color,
    coach: m.group.coach.user,
    memberCount: m.group.members.length,
    lastMessage: m.group.messages[0] || null,
    unreadCount: unreadCounts[i],
    joinedAt: m.joined_at,
  }));

  return NextResponse.json({ groups });
});
