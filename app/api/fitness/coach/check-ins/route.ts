import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";

// GET /api/fitness/coach/check-ins - List all check-ins for coach
export const GET = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const { searchParams } = new URL(request.url);
  const athleteId = searchParams.get("athleteId");
  const pending = searchParams.get("pending") === "true";
  const limit = parseInt(searchParams.get("limit") || "20");

  const checkIns = await prisma.coaching_check_ins.findMany({
    where: {
      coach_id: coach.id,
      ...(athleteId ? { athlete_id: athleteId } : {}),
      ...(pending ? { reviewed_at: null } : {}),
    },
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
    orderBy: { created_at: "desc" },
    take: limit,
  });

  const pendingCount = await prisma.coaching_check_ins.count({
    where: { coach_id: coach.id, reviewed_at: null },
  });

  return NextResponse.json({ checkIns, pendingCount });
});
