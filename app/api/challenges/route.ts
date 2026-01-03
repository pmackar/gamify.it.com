import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/challenges - List challenges (user's + friends')
export async function GET(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // 'active', 'completed', 'all'
  const app = searchParams.get("app"); // 'fitness', 'travel', 'today'

  // Get user's friends
  const friendships = await prisma.friendships.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ requester_id: user.id }, { addressee_id: user.id }],
    },
    select: { requester_id: true, addressee_id: true },
  });

  const friendIds = friendships.map((f) =>
    f.requester_id === user.id ? f.addressee_id : f.requester_id
  );

  // Build where clause
  const where: Record<string, unknown> = {
    OR: [
      { creator_id: user.id },
      {
        participants: {
          some: { user_id: user.id },
        },
      },
      {
        creator_id: { in: friendIds },
        status: "ACTIVE",
      },
    ],
  };

  if (status === "active") {
    where.status = "ACTIVE";
  } else if (status === "completed") {
    where.status = "COMPLETED";
  }

  if (app) {
    where.app_id = app;
  }

  const challenges = await prisma.challenges.findMany({
    where,
    include: {
      creator: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
      participants: {
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
        orderBy: { score: "desc" },
      },
    },
    orderBy: [{ status: "asc" }, { end_date: "asc" }],
  });

  return NextResponse.json({
    challenges: challenges.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      type: c.type,
      appId: c.app_id,
      metric: c.metric,
      target: c.target,
      startDate: c.start_date.toISOString(),
      endDate: c.end_date.toISOString(),
      status: c.status,
      xpReward: c.xp_reward,
      icon: c.icon,
      isCreator: c.creator_id === user.id,
      creator: {
        id: c.creator.id,
        username: c.creator.username,
        displayName: c.creator.display_name,
        avatarUrl: c.creator.avatar_url,
      },
      participants: c.participants.map((p) => ({
        id: p.id,
        userId: p.user_id,
        status: p.status,
        score: p.score,
        rank: p.rank,
        joinedAt: p.joined_at?.toISOString(),
        user: {
          id: p.user.id,
          username: p.user.username,
          displayName: p.user.display_name,
          avatarUrl: p.user.avatar_url,
        },
      })),
      participantCount: c.participants.filter((p) => p.status === "JOINED").length,
      hasJoined: c.participants.some(
        (p) => p.user_id === user.id && p.status === "JOINED"
      ),
      isInvited: c.participants.some(
        (p) => p.user_id === user.id && p.status === "INVITED"
      ),
    })),
  });
}

// POST /api/challenges - Create a new challenge
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      title,
      description,
      type,
      appId,
      metric,
      target,
      startDate,
      endDate,
      xpReward,
      icon,
      inviteUserIds,
    } = body;

    if (!title || !type || !appId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return NextResponse.json(
        { error: "End date must be after start date" },
        { status: 400 }
      );
    }

    // Create challenge
    const challenge = await prisma.challenges.create({
      data: {
        creator_id: user.id,
        title,
        description,
        type,
        app_id: appId,
        metric: metric || type,
        target,
        start_date: start,
        end_date: end,
        status: start <= new Date() ? "ACTIVE" : "DRAFT",
        xp_reward: xpReward || 100,
        icon,
        participants: {
          create: {
            user_id: user.id,
            status: "JOINED",
            joined_at: new Date(),
          },
        },
      },
      include: {
        creator: {
          select: {
            id: true,
            username: true,
            display_name: true,
            avatar_url: true,
          },
        },
        participants: {
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
    });

    // Invite friends if specified
    if (inviteUserIds && Array.isArray(inviteUserIds) && inviteUserIds.length > 0) {
      await prisma.challenge_participants.createMany({
        data: inviteUserIds.map((userId: string) => ({
          challenge_id: challenge.id,
          user_id: userId,
          status: "INVITED",
        })),
        skipDuplicates: true,
      });

      // Create activity notifications for invites
      await prisma.activity_feed.createMany({
        data: inviteUserIds.map((userId: string) => ({
          user_id: userId,
          actor_id: user.id,
          type: "PARTY_INVITE_RECEIVED", // Reusing for challenge invites
          entity_type: "challenge",
          entity_id: challenge.id,
          metadata: {
            challengeTitle: title,
            challengeId: challenge.id,
          },
        })),
      });
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        appId: challenge.app_id,
        startDate: challenge.start_date.toISOString(),
        endDate: challenge.end_date.toISOString(),
        status: challenge.status,
        xpReward: challenge.xp_reward,
      },
    });
  } catch (error) {
    console.error("Error creating challenge:", error);
    return NextResponse.json(
      { error: "Failed to create challenge" },
      { status: 500 }
    );
  }
}
