import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import { getLeagueStandings, getUserLeagueStatus, getWeekBounds } from '@/lib/leagues';
import prisma from '@/lib/db';

/**
 * GET /api/leagues/leaderboard
 *
 * Get leaderboard for a specific league or user's current league
 */
export async function GET(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const leagueId = searchParams.get('leagueId');

    // If no league ID provided, get user's current league
    if (!leagueId) {
      const status = await getUserLeagueStatus(user.id);

      if (!status?.inLeague || !status.league) {
        return NextResponse.json({
          error: 'Not in a league',
          inLeague: false,
        }, { status: 404 });
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
  } catch (error) {
    console.error('Get leaderboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * GET /api/leagues/history
 *
 * Get user's league history
 */
export async function POST(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
  } catch (error) {
    console.error('Get league history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
