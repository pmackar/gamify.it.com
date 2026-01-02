import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/activity/[id]/kudos - Get kudos for an activity
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  const kudos = await prisma.activity_kudos.findMany({
    where: { activity_id: id },
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
    orderBy: { created_at: "desc" },
  });

  const hasGivenKudos = kudos.some((k) => k.user_id === user.id);

  return NextResponse.json({
    kudos: kudos.map((k) => ({
      id: k.id,
      emoji: k.emoji,
      createdAt: k.created_at,
      user: {
        id: k.user.id,
        username: k.user.username,
        displayName: k.user.display_name,
        avatarUrl: k.user.avatar_url,
      },
    })),
    count: kudos.length,
    hasGivenKudos,
  });
}

// POST /api/activity/[id]/kudos - Give kudos to an activity
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  // Get emoji from body (optional, defaults to fire)
  let emoji = "🔥";
  try {
    const body = await request.json();
    if (body.emoji) {
      emoji = body.emoji;
    }
  } catch {
    // No body or invalid JSON, use default
  }

  // Verify activity exists
  const activity = await prisma.activity_feed.findUnique({
    where: { id },
  });

  if (!activity) {
    return NextResponse.json({ error: "Activity not found" }, { status: 404 });
  }

  // Check if user has already given kudos
  const existing = await prisma.activity_kudos.findUnique({
    where: {
      activity_id_user_id: {
        activity_id: id,
        user_id: user.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already given kudos to this activity" },
      { status: 400 }
    );
  }

  // Create kudos
  const kudos = await prisma.activity_kudos.create({
    data: {
      activity_id: id,
      user_id: user.id,
      emoji,
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
  });

  // Get updated count
  const count = await prisma.activity_kudos.count({
    where: { activity_id: id },
  });

  return NextResponse.json({
    kudos: {
      id: kudos.id,
      emoji: kudos.emoji,
      createdAt: kudos.created_at,
      user: {
        id: kudos.user.id,
        username: kudos.user.username,
        displayName: kudos.user.display_name,
        avatarUrl: kudos.user.avatar_url,
      },
    },
    count,
  });
}

// DELETE /api/activity/[id]/kudos - Remove kudos from an activity
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  // Find and delete user's kudos
  const existing = await prisma.activity_kudos.findUnique({
    where: {
      activity_id_user_id: {
        activity_id: id,
        user_id: user.id,
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "You have not given kudos to this activity" },
      { status: 404 }
    );
  }

  await prisma.activity_kudos.delete({
    where: { id: existing.id },
  });

  // Get updated count
  const count = await prisma.activity_kudos.count({
    where: { activity_id: id },
  });

  return NextResponse.json({ success: true, count });
}
