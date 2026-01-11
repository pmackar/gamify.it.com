import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import prisma from '@/lib/db';

/**
 * POST /api/auth/merge-accounts
 *
 * Merges data from an old account (magic link) to a new account (Google OAuth)
 * when the user has duplicate accounts with the same email.
 *
 * Body: { oldUserId: string }
 *
 * This migrates:
 * - Profile data (XP, level, etc.)
 * - Fitness data (workouts, PRs, etc.)
 * - Travel data (locations, quests, etc.)
 * - Social data (friends, etc.)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { oldUserId } = await request.json();

    if (!oldUserId) {
      return NextResponse.json({ error: 'oldUserId is required' }, { status: 400 });
    }

    if (oldUserId === user.id) {
      return NextResponse.json({ error: 'Cannot merge account with itself' }, { status: 400 });
    }

    // Verify both accounts have the same email
    const [currentProfile, oldProfile] = await Promise.all([
      prisma.user.findUnique({ where: { id: user.id }, select: { email: true } }),
      prisma.user.findUnique({ where: { id: oldUserId }, select: { email: true } }),
    ]);

    if (!oldProfile) {
      return NextResponse.json({ error: 'Old account not found' }, { status: 404 });
    }

    if (currentProfile?.email?.toLowerCase() !== oldProfile.email?.toLowerCase()) {
      return NextResponse.json({
        error: 'Email mismatch - can only merge accounts with the same email'
      }, { status: 403 });
    }

    // Migrate data from old account to new account
    const migrations = await prisma.$transaction(async (tx) => {
      const results: Record<string, number> = {};

      // 1. Migrate fitness workouts
      const workouts = await tx.fitnessWorkout.updateMany({
        where: { userId: oldUserId },
        data: { userId: user.id },
      });
      results.workouts = workouts.count;

      // 2. Migrate fitness stats/PRs (if you have a separate table)
      // results.prs = ...

      // 3. Migrate travel data
      const locationUserData = await tx.locationUserData.updateMany({
        where: { userId: oldUserId },
        data: { userId: user.id },
      });
      results.locationData = locationUserData.count;

      // 4. Migrate quests
      const quests = await tx.quest.updateMany({
        where: { creatorId: oldUserId },
        data: { creatorId: user.id },
      });
      results.quests = quests.count;

      // 5. Migrate quest items (added by user)
      const questItems = await tx.questItem.updateMany({
        where: { addedById: oldUserId },
        data: { addedById: user.id },
      });
      results.questItems = questItems.count;

      // 6. Migrate friendships (both sides)
      const friendships1 = await tx.friendship.updateMany({
        where: { userId: oldUserId },
        data: { userId: user.id },
      });
      const friendships2 = await tx.friendship.updateMany({
        where: { friendId: oldUserId },
        data: { friendId: user.id },
      });
      results.friendships = friendships1.count + friendships2.count;

      // 7. Migrate activity feed
      const activities = await tx.activityFeedItem.updateMany({
        where: { userId: oldUserId },
        data: { userId: user.id },
      });
      results.activities = activities.count;

      // 8. Transfer XP and level from old profile to new (if higher)
      const oldUserProfile = await tx.user.findUnique({
        where: { id: oldUserId },
        select: { xp: true, level: true },
      });

      if (oldUserProfile && (oldUserProfile.xp || 0) > 0) {
        await tx.user.update({
          where: { id: user.id },
          data: {
            xp: { increment: oldUserProfile.xp || 0 },
          },
        });
        results.xpTransferred = oldUserProfile.xp || 0;
      }

      // 9. Migrate app profiles
      const appProfiles = await tx.appProfile.updateMany({
        where: { userId: oldUserId },
        data: { userId: user.id },
      });
      results.appProfiles = appProfiles.count;

      // 10. Migrate travel profile
      try {
        await tx.travelProfile.update({
          where: { userId: oldUserId },
          data: { userId: user.id },
        });
        results.travelProfile = 1;
      } catch {
        // Old account may not have travel profile
        results.travelProfile = 0;
      }

      // 11. Mark old account as merged (optional: delete it)
      await tx.user.update({
        where: { id: oldUserId },
        data: {
          username: `merged_${oldUserId.slice(0, 8)}`,
          // Set email to null to allow the new account to use it
          email: null,
        },
      });

      return results;
    });

    return NextResponse.json({
      success: true,
      message: 'Accounts merged successfully',
      migrations,
    });

  } catch (error) {
    console.error('Account merge error:', error);
    return NextResponse.json(
      { error: 'Failed to merge accounts', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/auth/merge-accounts
 *
 * Check if the current user has a duplicate account that can be merged
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get current user's email
    const currentEmail = user.email?.toLowerCase();
    if (!currentEmail) {
      return NextResponse.json({ duplicateAccount: null });
    }

    // Find other accounts with the same email
    const duplicateAccounts = await prisma.user.findMany({
      where: {
        email: { equals: currentEmail, mode: 'insensitive' },
        id: { not: user.id },
      },
      select: {
        id: true,
        email: true,
        username: true,
        xp: true,
        level: true,
        createdAt: true,
        _count: {
          select: {
            fitnessWorkouts: true,
          },
        },
      },
    });

    if (duplicateAccounts.length === 0) {
      return NextResponse.json({ duplicateAccount: null });
    }

    // Return the oldest account (likely the original one with data)
    const oldestAccount = duplicateAccounts.sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    )[0];

    return NextResponse.json({
      duplicateAccount: {
        id: oldestAccount.id,
        username: oldestAccount.username,
        xp: oldestAccount.xp,
        level: oldestAccount.level,
        workoutCount: oldestAccount._count.fitnessWorkouts,
        createdAt: oldestAccount.createdAt,
      },
    });

  } catch (error) {
    console.error('Check duplicate error:', error);
    return NextResponse.json(
      { error: 'Failed to check for duplicate accounts' },
      { status: 500 }
    );
  }
}
