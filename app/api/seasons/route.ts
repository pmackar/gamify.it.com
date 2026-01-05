import { NextResponse } from 'next/server';
import { withAuth, Errors } from '@/lib/api';
import { getUserSeasonProgress, claimTierReward, purchasePremiumPass } from '@/lib/seasons';

/**
 * GET /api/seasons
 *
 * Get current season info and user's progress
 */
export const GET = withAuth(async (_request, user) => {
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
});

/**
 * POST /api/seasons
 *
 * Claim tier reward or purchase premium
 */
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { action, tierNumber, isPremium } = body;

  switch (action) {
    case 'claim': {
      if (typeof tierNumber !== 'number') {
        return Errors.invalidInput('tierNumber required');
      }

      const result = await claimTierReward(user.id, tierNumber, isPremium ?? false);

      if (!result.success) {
        return Errors.invalidInput(result.error || 'Failed to claim reward');
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
        return Errors.invalidInput('No active season');
      }

      const progress = await getUserSeasonProgress(user.id);

      return NextResponse.json({
        success: true,
        message: 'Premium pass activated',
        progress,
      });
    }

    default:
      return Errors.invalidInput('Invalid action');
  }
});
