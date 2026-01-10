import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// GET /api/fitness/coach/groups/[groupId] - Get group details
export const GET = withCoachAuthParams<{ groupId: string }>(
  async (_request, user, { groupId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const group = await prisma.coaching_groups.findFirst({
      where: { id: groupId, coach_id: coach.id },
      include: {
        members: {
          include: {
            athlete: {
              select: {
                id: true,
                display_name: true,
                username: true,
                avatar_url: true,
                email: true,
                main_level: true,
                total_xp: true,
              },
            },
          },
        },
      },
    });

    if (!group) {
      return Errors.notFound("Group not found");
    }

    return NextResponse.json({ group });
  }
);

// PUT /api/fitness/coach/groups/[groupId] - Update group
export const PUT = withCoachAuthParams<{ groupId: string }>(
  async (request, user, { groupId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const group = await prisma.coaching_groups.findFirst({
      where: { id: groupId, coach_id: coach.id },
    });

    if (!group) {
      return Errors.notFound("Group not found");
    }

    const body = await request.json();
    const { name, description, color } = body;

    const updated = await prisma.coaching_groups.update({
      where: { id: groupId },
      data: {
        name: name?.trim() || group.name,
        description: description !== undefined ? description?.trim() || null : group.description,
        color: color !== undefined ? color || null : group.color,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({ group: updated });
  }
);

// DELETE /api/fitness/coach/groups/[groupId] - Delete group
export const DELETE = withCoachAuthParams<{ groupId: string }>(
  async (_request, user, { groupId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const group = await prisma.coaching_groups.findFirst({
      where: { id: groupId, coach_id: coach.id },
    });

    if (!group) {
      return Errors.notFound("Group not found");
    }

    await prisma.coaching_groups.delete({
      where: { id: groupId },
    });

    return NextResponse.json({ success: true });
  }
);
