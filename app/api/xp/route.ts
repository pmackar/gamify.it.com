import { NextResponse } from 'next/server';
import { getSupabaseUser } from '@/lib/auth';
import prisma from '@/lib/db';

// XP required per level (each level needs 1.5x more)
function calculateXPForLevel(level: number): number {
  let xpNeeded = 100;
  for (let i = 1; i < level; i++) {
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return xpNeeded;
}

// Get streak multiplier
function getStreakMultiplier(streakDays: number): number {
  if (streakDays >= 30) return 2.0;
  if (streakDays >= 14) return 1.5;
  if (streakDays >= 7) return 1.25;
  if (streakDays >= 3) return 1.1;
  return 1.0;
}

// Calculate level from total XP
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

// DELETE - Revoke XP (for deleted workouts/uncompleted tasks)
export async function DELETE(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appId, xpAmount, reason } = body;

    if (!appId || !xpAmount || xpAmount <= 0) {
      return NextResponse.json({ error: 'Missing appId or valid xpAmount' }, { status: 400 });
    }

    // Get profile
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Get app profile
    const appProfile = await prisma.app_profiles.findUnique({
      where: {
        user_id_app_id: { user_id: user.id, app_id: appId },
      },
    });

    if (!appProfile) {
      return NextResponse.json({ error: 'App profile not found' }, { status: 404 });
    }

    // Calculate new global XP (don't go below 0)
    const newGlobalTotalXP = Math.max(0, (profile.total_xp || 0) - xpAmount);
    const globalLevelInfo = getLevelFromTotalXP(newGlobalTotalXP);

    // Calculate new app XP
    // First, calculate current total app XP
    let currentAppTotalXP = appProfile.xp || 0;
    let tempLevel = appProfile.level || 1;
    let tempXPNeeded = 100;
    for (let i = 1; i < tempLevel; i++) {
      currentAppTotalXP += tempXPNeeded;
      tempXPNeeded = Math.floor(tempXPNeeded * 1.5);
    }

    const newAppTotalXP = Math.max(0, currentAppTotalXP - xpAmount);
    const appLevelInfo = getLevelFromTotalXP(newAppTotalXP);

    // Update profile
    await prisma.profiles.update({
      where: { id: user.id },
      data: {
        total_xp: newGlobalTotalXP,
        main_level: globalLevelInfo.level,
        updated_at: new Date(),
      },
    });

    // Update app profile
    await prisma.app_profiles.update({
      where: { id: appProfile.id },
      data: {
        xp: appLevelInfo.xpInLevel,
        level: appLevelInfo.level,
        xp_to_next: appLevelInfo.xpToNext,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      xpRevoked: xpAmount,
      reason,
      globalXP: {
        level: globalLevelInfo.level,
        xp: globalLevelInfo.xpInLevel,
        xpToNext: globalLevelInfo.xpToNext,
        totalXP: newGlobalTotalXP,
      },
      appXP: {
        level: appLevelInfo.level,
        xp: appLevelInfo.xpInLevel,
        xpToNext: appLevelInfo.xpToNext,
      },
    });
  } catch (error) {
    console.error('XP revocation error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSupabaseUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { appId, action, xpAmount, metadata = {} } = body;

    if (!appId || !xpAmount) {
      return NextResponse.json({ error: 'Missing appId or xpAmount' }, { status: 400 });
    }

    // Get or create profile
    let profile = await prisma.profiles.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      profile = await prisma.profiles.create({
        data: {
          id: user.id,
          email: user.email!,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0],
          total_xp: 0,
          main_level: 1,
          current_streak: 0,
          longest_streak: 0,
        },
      });
    }

    // --- Update Streak ---
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStreak = 1;
    let streakShieldUsed = false;
    let streakShieldsRemaining = profile.streak_shields || 0;

    if (profile.last_activity_date) {
      const lastActive = new Date(profile.last_activity_date);
      lastActive.setHours(0, 0, 0, 0);
      const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays === 0) {
        // Same day - keep current streak
        newStreak = profile.current_streak || 1;
      } else if (diffDays === 1) {
        // Next day - increment streak
        newStreak = (profile.current_streak || 0) + 1;
      } else if (diffDays === 2 && streakShieldsRemaining > 0) {
        // Missed exactly 1 day - use streak shield if available
        streakShieldUsed = true;
        streakShieldsRemaining -= 1;
        newStreak = (profile.current_streak || 0) + 1; // Continue streak
      }
      // else: missed 2+ days without shield, streak resets to 1
    }

    // Apply streak multiplier to XP
    const streakMultiplier = getStreakMultiplier(newStreak);
    const finalXP = Math.floor(xpAmount * streakMultiplier);

    // --- Update Global XP & Level ---
    let globalXP = (profile.total_xp || 0) + finalXP;
    let globalLevel = profile.main_level || 1;
    let globalXPToNext = calculateXPForLevel(globalLevel);
    let leveledUp = false;

    // Level up loop
    while (globalXP >= globalXPToNext) {
      globalXP -= globalXPToNext;
      globalLevel++;
      globalXPToNext = calculateXPForLevel(globalLevel);
      leveledUp = true;
    }

    // Update profile
    await prisma.profiles.update({
      where: { id: user.id },
      data: {
        total_xp: globalXP + calculateTotalXPForLevel(globalLevel), // Store cumulative
        main_level: globalLevel,
        current_streak: newStreak,
        longest_streak: Math.max(newStreak, profile.longest_streak || 0),
        last_activity_date: today,
        streak_shields: streakShieldUsed ? streakShieldsRemaining : undefined,
        updated_at: new Date(),
      },
    });

    // --- Update App-specific XP ---
    let appProfile = await prisma.app_profiles.findUnique({
      where: {
        user_id_app_id: { user_id: user.id, app_id: appId },
      },
    });

    if (!appProfile) {
      appProfile = await prisma.app_profiles.create({
        data: {
          user_id: user.id,
          app_id: appId,
          xp: 0,
          level: 1,
          xp_to_next: 100,
          stats: {},
        },
      });
    }

    let appXP = (appProfile.xp || 0) + finalXP;
    let appLevel = appProfile.level || 1;
    let appXPToNext = appProfile.xp_to_next || 100;
    let appLeveledUp = false;

    while (appXP >= appXPToNext) {
      appXP -= appXPToNext;
      appLevel++;
      appXPToNext = Math.floor(appXPToNext * 1.5);
      appLeveledUp = true;
    }

    // Merge metadata with existing stats
    const existingStats = (appProfile.stats as Record<string, unknown>) || {};
    const newStats = { ...existingStats };

    // Increment stat counters from metadata
    if (metadata.workoutCount !== undefined) newStats.totalWorkouts = metadata.workoutCount;
    if (metadata.taskCount !== undefined) newStats.totalTasks = metadata.taskCount;
    if (metadata.totalVolume !== undefined) newStats.totalVolume = metadata.totalVolume;
    if (metadata.prsHit !== undefined) newStats.totalPRs = ((newStats.totalPRs as number) || 0) + metadata.prsHit;

    await prisma.app_profiles.update({
      where: { id: appProfile.id },
      data: {
        xp: appXP,
        level: appLevel,
        xp_to_next: appXPToNext,
        stats: newStats,
        updated_at: new Date(),
      },
    });

    // --- Check Achievements ---
    const newAchievements = await checkAndAwardAchievements(user.id, appId, {
      streak: newStreak,
      globalLevel,
      appLevel,
      stats: newStats,
      metadata,
    });

    // Award achievement XP (recursive call avoided by checking is_completed)
    let achievementXP = 0;
    for (const ach of newAchievements) {
      achievementXP += ach.xp_reward || 0;
    }

    if (achievementXP > 0) {
      // Add achievement XP to global total (without re-checking achievements)
      await prisma.profiles.update({
        where: { id: user.id },
        data: {
          total_xp: { increment: achievementXP },
        },
      });
    }

    return NextResponse.json({
      success: true,
      xpAwarded: finalXP,
      streakMultiplier,
      globalXP: {
        level: globalLevel,
        xp: globalXP,
        xpToNext: globalXPToNext,
        leveledUp,
      },
      appXP: {
        level: appLevel,
        xp: appXP,
        xpToNext: appXPToNext,
        leveledUp: appLeveledUp,
      },
      streak: {
        current: newStreak,
        longest: Math.max(newStreak, profile.longest_streak || 0),
        multiplier: streakMultiplier,
        shieldUsed: streakShieldUsed,
        shieldsRemaining: streakShieldsRemaining,
      },
      achievements: newAchievements.map(a => ({
        code: a.code,
        name: a.name,
        xpReward: a.xp_reward,
        tier: a.tier,
        icon: a.icon,
      })),
    });
  } catch (error) {
    console.error('XP API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper to calculate total XP earned up to a level
function calculateTotalXPForLevel(level: number): number {
  let total = 0;
  let xpNeeded = 100;
  for (let i = 1; i < level; i++) {
    total += xpNeeded;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return total;
}

// Achievement checking with app filtering
async function checkAndAwardAchievements(
  userId: string,
  appId: string,
  context: {
    streak: number;
    globalLevel: number;
    appLevel: number;
    stats: Record<string, unknown>;
    metadata: Record<string, unknown>;
  }
): Promise<Array<{
  code: string;
  name: string;
  xp_reward: number | null;
  tier: number | null;
  icon: string | null;
}>> {
  // Get achievements for this app + global achievements
  const achievements = await prisma.achievements.findMany({
    where: {
      app_id: { in: [appId, 'global'] },
    },
  });

  // Get user's completed achievements
  const userAchievements = await prisma.user_achievements.findMany({
    where: { user_id: userId },
    select: { achievement_id: true, is_completed: true },
  });

  const completedIds = new Set(
    userAchievements
      .filter(ua => ua.is_completed)
      .map(ua => ua.achievement_id)
  );

  const newlyUnlocked: typeof achievements = [];

  for (const achievement of achievements) {
    if (completedIds.has(achievement.id)) continue;

    const criteria = achievement.criteria as {
      type?: string;
      count?: number;
      stat?: string;
    };

    let unlocked = false;

    switch (criteria.type) {
      case 'streak_days':
        unlocked = context.streak >= (criteria.count || 0);
        break;
      case 'global_level':
        unlocked = context.globalLevel >= (criteria.count || 0);
        break;
      case 'app_level':
        unlocked = context.appLevel >= (criteria.count || 0);
        break;
      case 'stat':
        // Check app-specific stats
        if (criteria.stat) {
          const statValue = context.stats[criteria.stat] as number || 0;
          unlocked = statValue >= (criteria.count || 0);
        }
        break;
      case 'fitness_workouts':
        unlocked = (context.stats.totalWorkouts as number || 0) >= (criteria.count || 0);
        break;
      case 'today_tasks':
        unlocked = (context.stats.totalTasks as number || 0) >= (criteria.count || 0);
        break;
    }

    if (unlocked) {
      // Mark as completed
      await prisma.user_achievements.upsert({
        where: {
          user_id_achievement_id: {
            user_id: userId,
            achievement_id: achievement.id,
          },
        },
        update: {
          is_completed: true,
          completed_at: new Date(),
        },
        create: {
          user_id: userId,
          achievement_id: achievement.id,
          progress: 0,
          is_completed: true,
          completed_at: new Date(),
        },
      });

      newlyUnlocked.push(achievement);
    }
  }

  return newlyUnlocked;
}
