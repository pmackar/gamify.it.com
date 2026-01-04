import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import { getUserSeasonProgress, claimTierReward, purchasePremiumPass } from '@/lib/seasons';

/**
 * GET /api/seasons
 *
 * Get current season info and user's progress
 */
export async function GET() {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const progress = await getUserSeasonProgress(user.id);

    if (!progress) {
      return NextResponse.json({
        active: false,
        message: 'No active season',
      });
    }

    return NextResponse.json({
      active: true,
      ...progress,
    });
  } catch (error) {
    console.error('Get season error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/seasons
 *
 * Claim tier reward or purchase premium
 */
export async function POST(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { action, tierNumber, isPremium } = body;

    switch (action) {
      case 'claim': {
        if (typeof tierNumber !== 'number') {
          return NextResponse.json({ error: 'tierNumber required' }, { status: 400 });
        }

        const result = await claimTierReward(user.id, tierNumber, isPremium ?? false);

        if (!result.success) {
          return NextResponse.json({ error: result.error }, { status: 400 });
        }

        // Get updated progress
        const progress = await getUserSeasonProgress(user.id);

        return NextResponse.json({
          success: true,
          reward: result.reward,
          progress,
        });
      }

      case 'purchase_premium': {
        const success = await purchasePremiumPass(user.id);

        if (!success) {
          return NextResponse.json({ error: 'No active season' }, { status: 400 });
        }

        const progress = await getUserSeasonProgress(user.id);

        return NextResponse.json({
          success: true,
          message: 'Premium pass activated',
          progress,
        });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Season action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
