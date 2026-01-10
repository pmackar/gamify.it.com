import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";

// GET /api/fitness/coach/groups - List all groups
export const GET = withCoachAuth(async (_request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const groups = await prisma.coaching_groups.findMany({
    where: { coach_id: coach.id },
    include: {
      members: {
        include: {
          athlete: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
              email: true,
            },
          },
        },
      },
      _count: {
        select: { members: true },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({ groups });
});

// POST /api/fitness/coach/groups - Create a new group
export const POST = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const body = await request.json();
  const { name, description, color, athleteIds } = body;

  if (!name?.trim()) {
    return Errors.invalidInput("Group name is required");
  }

  // Create group with optional initial members
  const group = await prisma.coaching_groups.create({
    data: {
      coach_id: coach.id,
      name: name.trim(),
      description: description?.trim() || null,
      color: color || null,
      members: athleteIds?.length
        ? {
            create: athleteIds.map((athleteId: string) => ({
              athlete_id: athleteId,
            })),
          }
        : undefined,
    },
    include: {
      members: {
        include: {
          athlete: {
            select: {
              id: true,
              display_name: true,
              avatar_url: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({ group });
});
