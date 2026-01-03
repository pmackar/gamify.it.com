import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/challenges/[id] - Get single challenge
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

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
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
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

// PUT /api/challenges/[id] - Update challenge (creator only)
export async function PUT(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const challenge = await prisma.challenges.findUnique({
    where: { id },
    select: { creator_id: true, status: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  if (challenge.creator_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const { title, description, endDate, status, xpReward, icon } = body;

    const updateData: Record<string, unknown> = {};

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (endDate) updateData.end_date = new Date(endDate);
    if (status) updateData.status = status;
    if (xpReward) updateData.xp_reward = xpReward;
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
  } catch (error) {
    console.error("Error updating challenge:", error);
    return NextResponse.json(
      { error: "Failed to update challenge" },
      { status: 500 }
    );
  }
}

// DELETE /api/challenges/[id] - Delete challenge (creator only)
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const challenge = await prisma.challenges.findUnique({
    where: { id },
    select: { creator_id: true },
  });

  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 });
  }

  if (challenge.creator_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  await prisma.challenges.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
