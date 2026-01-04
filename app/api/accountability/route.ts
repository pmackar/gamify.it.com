import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateBody, validateQuery, Errors, SelectFields } from "@/lib/api";

// Query schema for GET
const accountabilityQuerySchema = z.object({
  status: z.enum(["pending", "active", "all"]).optional(),
});

// Body schema for POST
const createPartnershipSchema = z.object({
  partnerId: z.string().uuid(),
  message: z.string().max(500).optional().nullable(),
});

// GET /api/accountability - List user's accountability partnerships
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, accountabilityQuerySchema);
  if (params instanceof NextResponse) return params;

  const { status } = params;

  const where: Record<string, unknown> = {
    OR: [{ requester_id: user.id }, { partner_id: user.id }],
  };

  if (status === "pending") {
    where.status = "PENDING";
  } else if (status === "active") {
    where.status = "ACTIVE";
  } else if (status !== "all") {
    where.status = { in: ["PENDING", "ACTIVE"] };
  }

  const partnerships = await prisma.accountability_partnerships.findMany({
    where,
    include: {
      requester: {
        select: SelectFields.userPublic,
      },
      partner: {
        select: SelectFields.userPublic,
      },
      goals: {
        where: { active: true },
        orderBy: { created_at: "desc" },
      },
      checkins: {
        orderBy: { date: "desc" },
        take: 7,
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    partnerships: partnerships.map((p) => {
      const isRequester = p.requester_id === user.id;
      const partner = isRequester ? p.partner : p.requester;

      // Calculate streak (consecutive days both checked in)
      let streak = 0;
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      for (let i = 0; i < 30; i++) {
        const checkDate = new Date(today);
        checkDate.setDate(checkDate.getDate() - i);
        const dateStr = checkDate.toISOString().split("T")[0];

        const user1Checkin = p.checkins.find(
          (c) =>
            c.user_id === p.requester_id &&
            c.date.toISOString().split("T")[0] === dateStr
        );
        const user2Checkin = p.checkins.find(
          (c) =>
            c.user_id === p.partner_id &&
            c.date.toISOString().split("T")[0] === dateStr
        );

        if (user1Checkin && user2Checkin) {
          streak++;
        } else {
          break;
        }
      }

      return {
        id: p.id,
        status: p.status,
        message: p.message,
        startedAt: p.started_at?.toISOString(),
        createdAt: p.created_at.toISOString(),
        isRequester,
        isPending: p.status === "PENDING" && !isRequester,
        partner: {
          id: partner.id,
          username: partner.username,
          displayName: partner.display_name,
          avatarUrl: partner.avatar_url,
        },
        goals: p.goals.map((g) => ({
          id: g.id,
          type: g.type,
          title: g.title,
          description: g.description,
          target: g.target,
          currentUser: isRequester ? g.current_user1 : g.current_user2,
          currentPartner: isRequester ? g.current_user2 : g.current_user1,
          period: g.period,
          deadline: g.deadline?.toISOString(),
        })),
        streak,
        todayCheckedIn: p.checkins.some(
          (c) =>
            c.user_id === user.id &&
            c.date.toISOString().split("T")[0] ===
              new Date().toISOString().split("T")[0]
        ),
        partnerCheckedInToday: p.checkins.some(
          (c) =>
            c.user_id !== user.id &&
            c.date.toISOString().split("T")[0] ===
              new Date().toISOString().split("T")[0]
        ),
      };
    }),
  });
});

// POST /api/accountability - Request a new accountability partnership
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createPartnershipSchema);
  if (body instanceof NextResponse) return body;

  const { partnerId, message } = body;

  if (partnerId === user.id) {
    return Errors.invalidInput("Cannot partner with yourself");
  }

  try {
    // Check if already have a partnership
    const existing = await prisma.accountability_partnerships.findFirst({
      where: {
        OR: [
          { requester_id: user.id, partner_id: partnerId },
          { requester_id: partnerId, partner_id: user.id },
        ],
        status: { in: ["PENDING", "ACTIVE"] },
      },
    });

    if (existing) {
      return Errors.conflict("Partnership already exists");
    }

    // Check if users are friends
    const friendship = await prisma.friendships.findFirst({
      where: {
        status: "ACCEPTED",
        OR: [
          { requester_id: user.id, addressee_id: partnerId },
          { requester_id: partnerId, addressee_id: user.id },
        ],
      },
    });

    if (!friendship) {
      return Errors.invalidInput("Must be friends to start a partnership");
    }

    // Create partnership
    const partnership = await prisma.accountability_partnerships.create({
      data: {
        requester_id: user.id,
        partner_id: partnerId,
        message,
        status: "PENDING",
      },
      include: {
        partner: {
          select: {
            id: true,
            username: true,
            display_name: true,
          },
        },
      },
    });

    // Notify partner
    await prisma.activity_feed.create({
      data: {
        user_id: partnerId,
        actor_id: user.id,
        type: "FRIEND_REQUEST_RECEIVED",
        entity_type: "accountability_partnership",
        entity_id: partnership.id,
        metadata: {
          message,
          partnershipId: partnership.id,
        },
      },
    });

    return NextResponse.json({
      partnership: {
        id: partnership.id,
        status: partnership.status,
        partner: {
          id: partnership.partner.id,
          username: partnership.partner.username,
          displayName: partnership.partner.display_name,
        },
      },
    });
  } catch (error) {
    console.error("Error creating partnership:", error);
    return Errors.database("Failed to create partnership");
  }
});
