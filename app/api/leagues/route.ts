import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import { getUserLeagueStatus, joinLeague, getLeagueStandings, LEAGUE_TIERS } from '@/lib/leagues';

/**
 * GET /api/leagues
 *
 * Get user's current league status and standings
 */
export async function GET() {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const status = await getUserLeagueStatus(user.id);

    if (!status) {
      return NextResponse.json({
        inLeague: false,
        tiers: LEAGUE_TIERS,
      });
    }

    // If in a league, get the full standings
    let standings = null;
    if (status.inLeague && status.league) {
      standings = await getLeagueStandings(status.league.id);
    }

    return NextResponse.json({
      ...status,
      standings,
      tiers: LEAGUE_TIERS,
    });
  } catch (error) {
    console.error('Get leagues error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/leagues
 *
 * Join or re-join a league for the current week
 */
export async function POST() {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await joinLeague(user.id);
    const status = await getUserLeagueStatus(user.id);
    const standings = await getLeagueStandings(result.leagueId);

    return NextResponse.json({
      success: true,
      joined: result.isNew,
      leagueId: result.leagueId,
      tier: result.tier,
      status,
      standings,
    });
  } catch (error) {
    console.error('Join league error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
