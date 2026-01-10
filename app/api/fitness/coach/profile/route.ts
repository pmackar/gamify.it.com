import { NextResponse } from "next/server";
import { withCoachAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/fitness/coach/profile - Get current user's coach profile
export const GET = withCoachAuth(async (_request, user) => {
  const coachProfile = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          display_name: true,
          username: true,
          avatar_url: true,
          main_level: true,
          total_xp: true,
        },
      },
      athletes: {
        where: { status: "ACTIVE" },
        select: { id: true },
      },
    },
  });

  if (!coachProfile) {
    return Errors.notFound("Not registered as a coach");
  }

  return NextResponse.json({
    coach: {
      ...coachProfile,
      athlete_count: coachProfile.athletes.length,
    },
  });
});

// PUT /api/fitness/coach/profile - Update coach profile
export const PUT = withCoachAuth(async (request, user) => {
  const coachProfile = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coachProfile) {
    return Errors.notFound("Not registered as a coach");
  }

  const body = await request.json();
  const { business_name, specializations, bio, max_athletes } = body;

  const updated = await prisma.coach_profiles.update({
    where: { id: coachProfile.id },
    data: {
      ...(business_name !== undefined && { business_name }),
      ...(specializations !== undefined && { specializations }),
      ...(bio !== undefined && { bio }),
      ...(max_athletes !== undefined && { max_athletes }),
      updated_at: new Date(),
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          display_name: true,
          username: true,
          avatar_url: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    coach: updated,
  });
});
