import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const UpdateChallengeSchema = z.object({
  title: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  endDate: z.string().datetime().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "COMPLETED", "CANCELLED"]).optional(),
  xpReward: z.number().int().min(0).optional(),
  icon: z.string().optional(),
});

// GET /api/challenges/[id] - Get single challenge
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const challenge = await prisma.challenges.findUnique({
      where: { id },
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
    });

    if (!challenge) {
      return Errors.notFound("Challenge not found");
    }

    return NextResponse.json({
      challenge: {
        id: challenge.id,
        title: challenge.title,
        description: challenge.description,
        type: challenge.type,
        appId: challenge.app_id,
        metric: challenge.metric,
        target: challenge.target,
        startDate: challenge.start_date.toISOString(),
        endDate: challenge.end_date.toISOString(),
        status: challenge.status,
        xpReward: challenge.xp_reward,
        icon: challenge.icon,
        isCreator: challenge.creator_id === user.id,
        creator: {
          id: challenge.creator.id,
          username: challenge.creator.username,
          displayName: challenge.creator.display_name,
          avatarUrl: challenge.creator.avatar_url,
        },
        participants: challenge.participants.map((p, index) => ({
          id: p.id,
          userId: p.user_id,
          status: p.status,
          score: p.score,
          rank: p.status === "JOINED" ? index + 1 : null,
          joinedAt: p.joined_at?.toISOString(),
          user: {
            id: p.user.id,
            username: p.user.username,
            displayName: p.user.display_name,
            avatarUrl: p.user.avatar_url,
          },
        })),
        hasJoined: challenge.participants.some(
          (p) => p.user_id === user.id && p.status === "JOINED"
        ),
        isInvited: challenge.participants.some(
          (p) => p.user_id === user.id && p.status === "INVITED"
        ),
      },
    });
  }
);

// PUT /api/challenges/[id] - Update challenge (creator only)
export const PUT = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const challenge = await prisma.challenges.findUnique({
      where: { id },
      select: { creator_id: true, status: true },
    });

    if (!challenge) {
      return Errors.notFound("Challenge not found");
    }

    if (challenge.creator_id !== user.id) {
      return Errors.forbidden("Not authorized");
    }

    const body = await request.json();
    const parsed = UpdateChallengeSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Invalid update data");
    }

    const { title, description, endDate, status, xpReward, icon } = parsed.data;

    const updateData: Record<string, unknown> = {};

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (endDate) updateData.end_date = new Date(endDate);
    if (status) updateData.status = status;
    if (xpReward !== undefined) updateData.xp_reward = xpReward;
    if (icon !== undefined) updateData.icon = icon;

    const updated = await prisma.challenges.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      challenge: {
        id: updated.id,
        title: updated.title,
        status: updated.status,
      },
    });
  }
);

// DELETE /api/challenges/[id] - Delete challenge (creator only)
export const DELETE = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const challenge = await prisma.challenges.findUnique({
      where: { id },
      select: { creator_id: true },
    });

    if (!challenge) {
      return Errors.notFound("Challenge not found");
    }

    if (challenge.creator_id !== user.id) {
      return Errors.forbidden("Not authorized");
    }

    await prisma.challenges.delete({ where: { id } });

    return NextResponse.json({ success: true });
  }
);
