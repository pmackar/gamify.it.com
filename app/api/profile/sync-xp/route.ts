import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import prisma from '@/lib/db';

// Calculate level from cumulative XP (same formula used everywhere)
function getLevelFromTotalXP(totalXP: number): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 1;
  let xpNeeded = 100;
  let cumulativeXP = 0;

  while (cumulativeXP + xpNeeded <= totalXP) {
    cumulativeXP += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }

  return {
    level,
    xpInLevel: totalXP - cumulativeXP,
    xpToNext: xpNeeded,
  };
}

// POST /api/profile/sync-xp - Reconcile XP from app local data to unified profile
export async function POST(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { dryRun = false } = body;

    const results: {
      fitness: { localXP: number; dbXP: number; diff: number } | null;
      today: { localXP: number; dbXP: number; diff: number } | null;
      totalDiff: number;
      profile: {
        before: { totalXP: number; level: number };
        after: { totalXP: number; level: number };
      };
      synced: boolean;
    } = {
      fitness: null,
      today: null,
      totalDiff: 0,
      profile: {
        before: { totalXP: 0, level: 1 },
        after: { totalXP: 0, level: 1 },
      },
      synced: false,
    };

    // Get current profile
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    results.profile.before = {
      totalXP: profile.total_xp || 0,
      level: profile.main_level || 1,
    };

    // --- Sync Fitness XP ---
    const fitnessData = await prisma.gamify_fitness_data.findUnique({
      where: { user_id: user.id },
    });

    const fitnessAppProfile = await prisma.app_profiles.findUnique({
      where: {
        user_id_app_id: { user_id: user.id, app_id: 'fitness' },
      },
    });

    if (fitnessData?.data) {
      const data = fitnessData.data as { profile?: { xp?: number } };
      const localFitnessXP = data.profile?.xp || 0;

      // Calculate what DB thinks fitness XP is (cumulative)
      let dbFitnessCumulativeXP = 0;
      if (fitnessAppProfile) {
        // Reconstruct cumulative XP from level + current XP
        let xpNeeded = 100;
        for (let i = 1; i < (fitnessAppProfile.level || 1); i++) {
          dbFitnessCumulativeXP += xpNeeded;
          xpNeeded = Math.floor(xpNeeded * 1.5);
        }
        dbFitnessCumulativeXP += fitnessAppProfile.xp || 0;
      }

      const fitnessDiff = localFitnessXP - dbFitnessCumulativeXP;

      results.fitness = {
        localXP: localFitnessXP,
        dbXP: dbFitnessCumulativeXP,
        diff: fitnessDiff,
      };

      if (fitnessDiff > 0) {
        results.totalDiff += fitnessDiff;
      }
    }

    // --- Sync Today XP ---
    const todayData = await prisma.gamify_today_data.findUnique({
      where: { user_id: user.id },
    });

    const todayAppProfile = await prisma.app_profiles.findUnique({
      where: {
        user_id_app_id: { user_id: user.id, app_id: 'today' },
      },
    });

    if (todayData?.data) {
      const data = todayData.data as { profile?: { xp?: number } };
      const localTodayXP = data.profile?.xp || 0;

      // Calculate what DB thinks today XP is (cumulative)
      let dbTodayCumulativeXP = 0;
      if (todayAppProfile) {
        let xpNeeded = 100;
        for (let i = 1; i < (todayAppProfile.level || 1); i++) {
          dbTodayCumulativeXP += xpNeeded;
          xpNeeded = Math.floor(xpNeeded * 1.5);
        }
        dbTodayCumulativeXP += todayAppProfile.xp || 0;
      }

      const todayDiff = localTodayXP - dbTodayCumulativeXP;

      results.today = {
        localXP: localTodayXP,
        dbXP: dbTodayCumulativeXP,
        diff: todayDiff,
      };

      if (todayDiff > 0) {
        results.totalDiff += todayDiff;
      }
    }

    // Calculate new totals
    const newTotalXP = (profile.total_xp || 0) + results.totalDiff;
    const newLevelInfo = getLevelFromTotalXP(newTotalXP);

    results.profile.after = {
      totalXP: newTotalXP,
      level: newLevelInfo.level,
    };

    // Apply changes if not dry run and there's a difference
    if (!dryRun && results.totalDiff > 0) {
      // Update main profile
      await prisma.profiles.update({
        where: { id: user.id },
        data: {
          total_xp: newTotalXP,
          main_level: newLevelInfo.level,
          updated_at: new Date(),
        },
      });

      // Update fitness app_profile to match local state
      if (results.fitness && results.fitness.diff > 0) {
        const fitnessLevelInfo = getLevelFromTotalXP(results.fitness.localXP);
        await prisma.app_profiles.upsert({
          where: {
            user_id_app_id: { user_id: user.id, app_id: 'fitness' },
          },
          update: {
            xp: fitnessLevelInfo.xpInLevel,
            level: fitnessLevelInfo.level,
            xp_to_next: fitnessLevelInfo.xpToNext,
            updated_at: new Date(),
          },
          create: {
            user_id: user.id,
            app_id: 'fitness',
            xp: fitnessLevelInfo.xpInLevel,
            level: fitnessLevelInfo.level,
            xp_to_next: fitnessLevelInfo.xpToNext,
            stats: {},
          },
        });
      }

      // Update today app_profile to match local state
      if (results.today && results.today.diff > 0) {
        const todayLevelInfo = getLevelFromTotalXP(results.today.localXP);
        await prisma.app_profiles.upsert({
          where: {
            user_id_app_id: { user_id: user.id, app_id: 'today' },
          },
          update: {
            xp: todayLevelInfo.xpInLevel,
            level: todayLevelInfo.level,
            xp_to_next: todayLevelInfo.xpToNext,
            updated_at: new Date(),
          },
          create: {
            user_id: user.id,
            app_id: 'today',
            xp: todayLevelInfo.xpInLevel,
            level: todayLevelInfo.level,
            xp_to_next: todayLevelInfo.xpToNext,
            stats: {},
          },
        });
      }

      results.synced = true;
    }

    return NextResponse.json({
      success: true,
      dryRun,
      results,
      message: dryRun
        ? `Dry run: Would add ${results.totalDiff} XP (Level ${results.profile.before.level} → ${results.profile.after.level})`
        : results.totalDiff > 0
        ? `Synced ${results.totalDiff} XP! Level ${results.profile.before.level} → ${results.profile.after.level}`
        : 'Already in sync - no changes needed',
    });
  } catch (error) {
    console.error('XP sync error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// GET /api/profile/sync-xp - Check sync status (dry run)
export async function GET() {
  // Reuse POST with dryRun=true
  const request = new Request('http://localhost', {
    method: 'POST',
    body: JSON.stringify({ dryRun: true }),
  });
  return POST(request);
}
