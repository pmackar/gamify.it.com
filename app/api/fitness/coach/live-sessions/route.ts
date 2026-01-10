import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";

// GET /api/fitness/coach/live-sessions - Get all active sessions for coach's athletes
export const GET = withCoachAuth(async (_request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  // Get active sessions for this coach's athletes
  const sessions = await prisma.coaching_live_sessions.findMany({
    where: {
      coach_id: coach.id,
      is_active: true,
    },
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
    orderBy: { last_activity: "desc" },
  });

  // Clean up stale sessions (no activity in last 30 minutes)
  const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
  const staleSessions = sessions.filter(
    (s) => new Date(s.last_activity) < thirtyMinutesAgo
  );

  if (staleSessions.length > 0) {
    await prisma.coaching_live_sessions.updateMany({
      where: {
        id: { in: staleSessions.map((s) => s.id) },
      },
      data: { is_active: false },
    });
  }

  // Return only active sessions
  const activeSessions = sessions.filter(
    (s) => new Date(s.last_activity) >= thirtyMinutesAgo
  );

  return NextResponse.json({
    sessions: activeSessions,
    count: activeSessions.length,
  });
});
