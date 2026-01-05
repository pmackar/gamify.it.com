import { NextResponse } from "next/server";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// POST /api/fitness/coach/register - Register as a coach
export const POST = withAuth(async (request, user) => {
  // Check if already a coach
  const existingCoach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (existingCoach) {
    return Errors.invalidInput("Already registered as a coach");
  }

  const body = await request.json().catch(() => ({}));
  const { business_name, specializations, bio } = body;

  // Create coach profile
  const coachProfile = await prisma.coach_profiles.create({
    data: {
      user_id: user.id,
      business_name: business_name || null,
      specializations: specializations || [],
      bio: bio || null,
    },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });

  return NextResponse.json({
    success: true,
    coach: coachProfile,
  });
});
