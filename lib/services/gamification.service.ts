/**
 * Gamification Service
 *
 * Centralized XP awarding, level calculation, and achievement tracking.
 * Consolidates logic that was duplicated across multiple API routes.
 */

import prisma from "@/lib/db";
import { getMainLevelFromXP, getAppLevelFromXP, getAppLevelXPRequired } from "@/lib/levels";
import { XP_VALUES } from "@/lib/gamification";
import { checkAndAwardAchievements } from "@/lib/achievements";

// ============================================================================
// Types
// ============================================================================

export interface XPAwardResult {
  xpAwarded: number;
  boostApplied: boolean;
  boostMultiplier: number;
  newAppXP: number;
  newAppLevel: number;
  appLeveledUp: boolean;
  appXPToNext: number;
  newTotalXP: number;
  newMainLevel: number;
  mainLeveledUp: boolean;
}

export interface XPBoostStatus {
  active: boolean;
  multiplier: number;
  expiresAt: Date | null;
  remainingSeconds: number;
}

export interface StreakInfo {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: Date | null;
  streakMultiplier: number;
}

export interface AchievementAwardResult {
  awarded: Array<{
    id: string;
    code: string;
    name: string;
    xpReward: number;
  }>;
  totalBonusXP: number;
}

// ============================================================================
// XP Boost Management
// ============================================================================

/**
 * Get active XP boost status for a user
 */
export async function getXPBoostStatus(userId: string): Promise<XPBoostStatus> {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { xp_boost_multiplier: true, xp_boost_expires_at: true },
  });

  if (!profile?.xp_boost_expires_at || !profile.xp_boost_multiplier) {
    return { active: false, multiplier: 1.0, expiresAt: null, remainingSeconds: 0 };
  }

  const now = new Date();
  if (profile.xp_boost_expires_at > now) {
    const remainingSeconds = Math.max(
      0,
      Math.floor((profile.xp_boost_expires_at.getTime() - now.getTime()) / 1000)
    );
    return {
      active: true,
      multiplier: profile.xp_boost_multiplier,
      expiresAt: profile.xp_boost_expires_at,
      remainingSeconds,
    };
  }

  // Boost has expired, clear it
  await prisma.profiles.update({
    where: { id: userId },
    data: { xp_boost_multiplier: 1.0, xp_boost_expires_at: null },
  });

  return { active: false, multiplier: 1.0, expiresAt: null, remainingSeconds: 0 };
}

/**
 * Activate an XP boost for a user
 */
export async function activateXPBoost(
  userId: string,
  multiplier: number,
  durationMinutes: number
): Promise<XPBoostStatus> {
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  await prisma.profiles.update({
    where: { id: userId },
    data: {
      xp_boost_multiplier: multiplier,
      xp_boost_expires_at: expiresAt,
    },
  });

  return {
    active: true,
    multiplier,
    expiresAt,
    remainingSeconds: durationMinutes * 60,
  };
}

// ============================================================================
// Core XP Awarding
// ============================================================================

/**
 * Award XP to a user's app profile and global profile
 * This is the primary method for awarding XP from any source
 */
export async function awardXP(
  userId: string,
  appId: string,
  baseAmount: number,
  options: {
    applyBoost?: boolean;
    reason?: string;
    metadata?: Record<string, unknown>;
  } = {}
): Promise<XPAwardResult> {
  const { applyBoost = true, reason, metadata } = options;

  // Check for active boost
  let boostMultiplier = 1.0;
  let boostApplied = false;
  if (applyBoost) {
    const boost = await getXPBoostStatus(userId);
    if (boost.active) {
      boostMultiplier = boost.multiplier;
      boostApplied = true;
    }
  }

  const xpAwarded = Math.floor(baseAmount * boostMultiplier);

  // Update app profile
  const appResult = await updateAppProfile(userId, appId, xpAwarded);

  // Update global profile
  const globalResult = await updateGlobalProfile(userId, xpAwarded);

  // Log XP event (optional)
  if (reason) {
    await logXPEvent(userId, appId, xpAwarded, reason, metadata);
  }

  return {
    xpAwarded,
    boostApplied,
    boostMultiplier,
    newAppXP: appResult.newXP,
    newAppLevel: appResult.newLevel,
    appLeveledUp: appResult.leveledUp,
    appXPToNext: appResult.xpToNext,
    newTotalXP: globalResult.newTotalXP,
    newMainLevel: globalResult.newLevel,
    mainLeveledUp: globalResult.leveledUp,
  };
}

/**
 * Update app-specific profile with XP
 */
async function updateAppProfile(
  userId: string,
  appId: string,
  xpAmount: number
): Promise<{
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  xpToNext: number;
}> {
  // Get or create app profile
  let appProfile = await prisma.app_profiles.findUnique({
    where: {
      user_id_app_id: { user_id: userId, app_id: appId },
    },
  });

  if (!appProfile) {
    appProfile = await prisma.app_profiles.create({
      data: {
        user_id: userId,
        app_id: appId,
        xp: 0,
        level: 1,
        xp_to_next: 100,
        stats: {},
      },
    });
  }

  let newXP = (appProfile.xp || 0) + xpAmount;
  let newLevel = appProfile.level || 1;
  let xpToNext = appProfile.xp_to_next || 100;
  let leveledUp = false;

  // Level up loop (app uses 1.5x scaling)
  while (newXP >= xpToNext) {
    newXP -= xpToNext;
    newLevel++;
    xpToNext = getAppLevelXPRequired(newLevel);
    leveledUp = true;
  }

  await prisma.app_profiles.update({
    where: { id: appProfile.id },
    data: { xp: newXP, level: newLevel, xp_to_next: xpToNext },
  });

  return { newXP, newLevel, leveledUp, xpToNext };
}

/**
 * Update global profile with XP (main level uses 2x scaling from 250)
 */
async function updateGlobalProfile(
  userId: string,
  xpAmount: number
): Promise<{
  newTotalXP: number;
  newLevel: number;
  leveledUp: boolean;
}> {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { total_xp: true, main_level: true },
  });

  const oldTotalXP = profile?.total_xp || 0;
  const oldLevel = profile?.main_level || 1;
  const newTotalXP = oldTotalXP + xpAmount;

  const levelInfo = getMainLevelFromXP(newTotalXP);
  const leveledUp = levelInfo.level > oldLevel;

  await prisma.profiles.update({
    where: { id: userId },
    data: {
      total_xp: newTotalXP,
      main_level: levelInfo.level,
    },
  });

  return {
    newTotalXP,
    newLevel: levelInfo.level,
    leveledUp,
  };
}

/**
 * Log XP event for analytics/history
 */
async function logXPEvent(
  userId: string,
  appId: string,
  amount: number,
  reason: string,
  metadata?: Record<string, unknown>
): Promise<void> {
  try {
    await prisma.xp_events.create({
      data: {
        user_id: userId,
        app_id: appId,
        amount,
        reason,
        metadata: metadata ?? {},
      },
    });
  } catch {
    // Non-critical, don't fail the XP award
    console.error("Failed to log XP event");
  }
}

// ============================================================================
// Quest XP Calculations
// ============================================================================

/**
 * Calculate XP for completing a quest
 */
export function calculateQuestCompletionXP(
  itemCount: number,
  hasParty: boolean,
  partyMemberCount: number = 0
): number {
  const baseXP = XP_VALUES.quest_complete_base;
  const itemXP = XP_VALUES.quest_complete_per_item * itemCount;

  let total = baseXP + itemXP;

  if (hasParty && partyMemberCount > 0) {
    const partyBonus = XP_VALUES.party_member_bonus * partyMemberCount;
    total = (total + partyBonus) * XP_VALUES.party_bonus_multiplier;
  }

  return Math.floor(total);
}

/**
 * Award XP to all party members for quest completion
 */
export async function awardQuestCompletionXP(
  questId: string,
  completingUserId: string,
  itemCount: number
): Promise<Map<string, XPAwardResult>> {
  const results = new Map<string, XPAwardResult>();

  // Get party members
  const party = await prisma.quest_parties.findFirst({
    where: { quest_id: questId },
    include: {
      quest_party_members: {
        where: { status: "JOINED" },
        select: { user_id: true },
      },
    },
  });

  const memberIds = party?.quest_party_members.map((m) => m.user_id) ?? [completingUserId];
  const hasParty = memberIds.length > 1;
  const xpAmount = calculateQuestCompletionXP(itemCount, hasParty, memberIds.length);

  // Award XP to each member
  for (const userId of memberIds) {
    const result = await awardXP(userId, "travel", xpAmount, {
      reason: "quest_complete",
      metadata: { questId, itemCount, partySize: memberIds.length },
    });
    results.set(userId, result);
  }

  return results;
}

// ============================================================================
// Streak Management
// ============================================================================

/**
 * Get current streak info for a user
 */
export async function getStreakInfo(userId: string): Promise<StreakInfo> {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { current_streak: true, longest_streak: true, last_activity_date: true },
  });

  const currentStreak = profile?.current_streak ?? 0;

  return {
    currentStreak,
    longestStreak: profile?.longest_streak ?? 0,
    lastActivityDate: profile?.last_activity_date ?? null,
    streakMultiplier: getStreakMultiplier(currentStreak),
  };
}

/**
 * Update streak based on activity
 */
export async function updateStreak(userId: string): Promise<StreakInfo> {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { current_streak: true, longest_streak: true, last_activity_date: true },
  });

  if (!profile) {
    return { currentStreak: 0, longestStreak: 0, lastActivityDate: null, streakMultiplier: 1.0 };
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newStreak = 1;

  if (profile.last_activity_date) {
    const lastActive = new Date(profile.last_activity_date);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no change
      return {
        currentStreak: profile.current_streak ?? 1,
        longestStreak: profile.longest_streak ?? 1,
        lastActivityDate: profile.last_activity_date,
        streakMultiplier: getStreakMultiplier(profile.current_streak ?? 1),
      };
    } else if (diffDays === 1) {
      // Consecutive day
      newStreak = (profile.current_streak ?? 0) + 1;
    }
    // Otherwise streak resets to 1
  }

  const newLongest = Math.max(newStreak, profile.longest_streak ?? 0);

  await prisma.profiles.update({
    where: { id: userId },
    data: {
      current_streak: newStreak,
      longest_streak: newLongest,
      last_activity_date: today,
    },
  });

  return {
    currentStreak: newStreak,
    longestStreak: newLongest,
    lastActivityDate: today,
    streakMultiplier: getStreakMultiplier(newStreak),
  };
}

/**
 * Get streak multiplier based on consecutive days
 */
export function getStreakMultiplier(streakDays: number): number {
  const thresholds = Object.keys(XP_VALUES.streak_multipliers)
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    if (streakDays >= threshold) {
      return XP_VALUES.streak_multipliers[threshold];
    }
  }

  return 1.0;
}

// ============================================================================
// Achievements
// ============================================================================

/**
 * Check and award achievements for a user
 */
export async function checkAchievements(
  userId: string,
  appId: string,
  context: Record<string, unknown> = {}
): Promise<AchievementAwardResult> {
  try {
    const newAchievements = await checkAndAwardAchievements(userId, appId, context);

    const awarded = newAchievements.map((a) => ({
      id: a.id,
      code: a.code,
      name: a.name,
      xpReward: a.xpReward,
    }));

    const totalBonusXP = awarded.reduce((sum, a) => sum + a.xpReward, 0);

    // Award bonus XP for achievements
    if (totalBonusXP > 0) {
      await awardXP(userId, appId, totalBonusXP, {
        applyBoost: false, // Achievement XP doesn't get boosted
        reason: "achievements",
        metadata: { achievementCodes: awarded.map((a) => a.code) },
      });
    }

    return { awarded, totalBonusXP };
  } catch (error) {
    console.error("Achievement check failed:", error);
    return { awarded: [], totalBonusXP: 0 };
  }
}

// ============================================================================
// League/Season Tracking
// ============================================================================

/**
 * Track weekly XP for league standings
 */
export async function trackWeeklyXP(userId: string, xpAmount: number): Promise<void> {
  try {
    // Get current week's league membership
    const membership = await prisma.league_memberships.findFirst({
      where: {
        user_id: userId,
        league: {
          status: "ACTIVE",
        },
      },
    });

    if (membership) {
      await prisma.league_memberships.update({
        where: { id: membership.id },
        data: {
          weekly_xp: { increment: xpAmount },
        },
      });
    }
  } catch {
    // Non-critical
    console.error("Failed to track weekly XP");
  }
}

/**
 * Track season XP
 */
export async function trackSeasonXP(userId: string, xpAmount: number): Promise<void> {
  try {
    const activeSeason = await prisma.seasons.findFirst({
      where: { status: "ACTIVE" },
    });

    if (activeSeason) {
      await prisma.season_progress.upsert({
        where: {
          user_id_season_id: {
            user_id: userId,
            season_id: activeSeason.id,
          },
        },
        update: {
          total_xp: { increment: xpAmount },
        },
        create: {
          user_id: userId,
          season_id: activeSeason.id,
          total_xp: xpAmount,
          current_tier: 1,
        },
      });
    }
  } catch {
    // Non-critical
    console.error("Failed to track season XP");
  }
}
