import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/accountability - List user's accountability partnerships
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // 'pending', 'active', 'all'

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
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      partner: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
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
}

// POST /api/accountability - Request a new accountability partnership
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { partnerId, message } = body;

    if (!partnerId) {
      return NextResponse.json(
        { error: "Partner ID is required" },
        { status: 400 }
      );
    }

    if (partnerId === user.id) {
      return NextResponse.json(
        { error: "Cannot partner with yourself" },
        { status: 400 }
      );
    }

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
      return NextResponse.json(
        { error: "Partnership already exists" },
        { status: 400 }
      );
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
      return NextResponse.json(
        { error: "Must be friends to start a partnership" },
        { status: 400 }
      );
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
        type: "FRIEND_REQUEST_RECEIVED", // Reusing for partnership requests
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
    return NextResponse.json(
      { error: "Failed to create partnership" },
      { status: 500 }
    );
  }
}
