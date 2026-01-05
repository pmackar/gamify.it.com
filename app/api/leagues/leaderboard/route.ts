import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import { getLeagueStandings, getUserLeagueStatus, getWeekBounds } from '@/lib/leagues';
import prisma from '@/lib/db';

/**
 * GET /api/leagues/leaderboard
 *
 * Get leaderboard for a specific league or user's current league
 */
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const leagueId = searchParams.get('leagueId');

  // If no league ID provided, get user's current league
  if (!leagueId) {
    const status = await getUserLeagueStatus(user.id);

    if (!status?.inLeague || !status.league) {
      return Errors.notFound('Not in a league');
    }

    const standings = await getLeagueStandings(status.league.id);

    return NextResponse.json({
      ...standings,
      currentUserId: user.id,
      userRank: status.userStats.rank,
      userZone: status.userStats.zone,
    });
  }

  // Get specific league standings
  const standings = await getLeagueStandings(leagueId);
  const userMember = standings.members.find(m => m.userId === user.id);

  return NextResponse.json({
    ...standings,
    currentUserId: user.id,
    userRank: userMember?.rank || null,
    userZone: userMember?.zone || null,
  });
});

/**
 * POST /api/leagues/leaderboard
 *
 * Get user's league history
 */
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { limit = 10 } = body;

  const history = await prisma.league_history.findMany({
    where: { user_id: user.id },
    orderBy: { week_start: 'desc' },
    take: Math.min(limit, 50),
  });

  return NextResponse.json({
    history: history.map(h => ({
      weekStart: h.week_start,
      weekEnd: h.week_end,
      tier: h.tier,
      finalRank: h.final_rank,
      weeklyXp: h.weekly_xp,
      promoted: h.promoted,
      demoted: h.demoted,
      badgeEarned: h.badge_earned,
    })),
  });
});
