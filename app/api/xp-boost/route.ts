import { NextResponse } from "next/server";
import { withAuth, Errors } from "@/lib/api";
import { getActiveXPBoost } from "@/lib/gamification";

/**
 * GET /api/xp-boost
 *
 * Get the current active XP boost status
 */
export const GET = withAuth(async (_request, user) => {
  try {
    const boost = await getActiveXPBoost(user.id);

    return NextResponse.json({
      active: boost.active,
      multiplier: boost.multiplier,
      expiresAt: boost.expiresAt?.toISOString() || null,
      remainingSeconds: boost.expiresAt
        ? Math.max(0, Math.floor((boost.expiresAt.getTime() - Date.now()) / 1000))
        : 0,
    });
  } catch (error) {
    console.error("XP boost status error:", error);
    return Errors.database("Failed to fetch XP boost status");
  }
});
