import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db";
import { withAuth, validateBody, validateQuery, Errors, SelectFields } from "@/lib/api";

// Query schema for GET
const challengesQuerySchema = z.object({
  status: z.enum(["active", "completed", "all"]).optional(),
  app: z.enum(["fitness", "travel", "today"]).optional(),
});

// Challenge types matching the Prisma enum
const challengeTypes = [
  "FITNESS_WORKOUTS",
  "FITNESS_VOLUME",
  "FITNESS_XP",
  "TRAVEL_LOCATIONS",
  "TRAVEL_CITIES",
  "TODAY_HABITS",
  "TODAY_STREAK",
  "CUSTOM",
] as const;

// Body schema for POST
const createChallengeSchema = z.object({
  title: z.string().trim().min(1).max(100),
  description: z.string().max(500).optional().nullable(),
  type: z.enum(challengeTypes),
  appId: z.enum(["fitness", "travel", "today"]),
  metric: z.string().optional().nullable(),
  target: z.number().int().positive().optional().nullable(),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  xpReward: z.number().int().min(0).max(1000).default(100),
  icon: z.string().optional().nullable(),
  inviteUserIds: z.array(z.string().uuid()).optional(),
});

// GET /api/challenges - List challenges (user's + friends')
export const GET = withAuth(async (request, user) => {
  const params = validateQuery(request, challengesQuerySchema);
  if (params instanceof NextResponse) return params;

  const { status, app } = params;

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
        select: SelectFields.userPublic,
      },
      participants: {
        include: {
          user: {
            select: SelectFields.userPublic,
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
});

// POST /api/challenges - Create a new challenge
export const POST = withAuth(async (request, user) => {
  const body = await validateBody(request, createChallengeSchema);
  if (body instanceof NextResponse) return body;

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

  try {
    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end <= start) {
      return Errors.invalidInput("End date must be after start date");
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
        xp_reward: xpReward,
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
          select: SelectFields.userPublic,
        },
        participants: {
          include: {
            user: {
              select: SelectFields.userPublic,
            },
          },
        },
      },
    });

    // Invite friends if specified
    if (inviteUserIds && inviteUserIds.length > 0) {
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
          type: "PARTY_INVITE_RECEIVED",
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
    return Errors.database("Failed to create challenge");
  }
});
