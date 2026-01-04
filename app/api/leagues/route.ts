import { NextResponse } from "next/server";
import { withAuth, Errors } from "@/lib/api";
import { getUserLeagueStatus, joinLeague, getLeagueStandings, LEAGUE_TIERS } from "@/lib/leagues";

/**
 * GET /api/leagues
 *
 * Get user's current league status and standings
 */
export const GET = withAuth(async (_request, user) => {
  try {
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
    console.error("Get leagues error:", error);
    return Errors.database("Failed to fetch league status");
  }
});

/**
 * POST /api/leagues
 *
 * Join or re-join a league for the current week
 */
export const POST = withAuth(async (_request, user) => {
  try {
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
    console.error("Join league error:", error);
    return Errors.database("Failed to join league");
  }
});
