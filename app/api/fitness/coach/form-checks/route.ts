import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";

// GET /api/fitness/coach/form-checks - List form checks for coach
export const GET = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending, reviewed, approved, needs_work
  const athleteId = searchParams.get("athleteId");
  const limit = parseInt(searchParams.get("limit") || "50");

  const formChecks = await prisma.coaching_form_checks.findMany({
    where: {
      coach_id: coach.id,
      ...(status ? { status: status.toUpperCase() as any } : {}),
      ...(athleteId ? { athlete_id: athleteId } : {}),
    },
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      athlete: {
        select: {
          id: true,
          display_name: true,
          email: true,
          avatar_url: true,
        },
      },
    },
  });

  // Get counts by status
  const counts = await prisma.coaching_form_checks.groupBy({
    by: ["status"],
    where: { coach_id: coach.id },
    _count: { id: true },
  });

  const statusCounts = {
    pending: 0,
    reviewed: 0,
    approved: 0,
    needs_work: 0,
  };

  for (const c of counts) {
    statusCounts[c.status.toLowerCase() as keyof typeof statusCounts] = c._count.id;
  }

  return NextResponse.json({
    formChecks,
    counts: statusCounts,
    total: Object.values(statusCounts).reduce((a, b) => a + b, 0),
  });
});
