import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getActiveXPBoost } from '@/lib/gamification';

/**
 * GET /api/xp-boost
 *
 * Get the current active XP boost status
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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
    console.error('XP boost status error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
