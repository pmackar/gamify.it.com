import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const KudosSchema = z.object({
  emoji: z.string().optional(),
});

// GET /api/activity/[id]/kudos - Get kudos for an activity
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
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
);

// POST /api/activity/[id]/kudos - Give kudos to an activity
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    // Get emoji from body (optional, defaults to fire)
    let emoji = "🔥";
    try {
      const body = await request.json();
      const parsed = KudosSchema.safeParse(body);
      if (parsed.success && parsed.data.emoji) {
        emoji = parsed.data.emoji;
      }
    } catch {
      // No body or invalid JSON, use default
    }

    // Verify activity exists
    const activity = await prisma.activity_feed.findUnique({
      where: { id },
    });

    if (!activity) {
      return Errors.notFound("Activity not found");
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
      return Errors.invalidInput("You have already given kudos to this activity");
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
);

// DELETE /api/activity/[id]/kudos - Remove kudos from an activity
export const DELETE = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
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
      return Errors.notFound("You have not given kudos to this activity");
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
);
