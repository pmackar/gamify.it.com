import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";

// Daily reward structure (7-day cycle)
const DAILY_REWARDS = [
  { day: 1, xp: 25, bonusItems: [] as string[] },
  { day: 2, xp: 50, bonusItems: [] as string[] },
  { day: 3, xp: 75, bonusItems: [] as string[], randomCosmeticChance: 0.2 },
  { day: 4, xp: 100, bonusItems: [] as string[] },
  { day: 5, xp: 150, bonusItems: ["streak_shield"] },
  { day: 6, xp: 200, bonusItems: [] as string[] },
  { day: 7, xp: 300, bonusItems: ["rare_loot_box"], guaranteedRareDrop: true },
];

// Get today's date at midnight UTC (for consistent comparison)
function getTodayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

// Get yesterday's date at midnight UTC
function getYesterdayUTC(): Date {
  const today = getTodayUTC();
  return new Date(today.getTime() - 24 * 60 * 60 * 1000);
}

// Check if a date is the same calendar day (UTC)
function isSameDay(date1: Date, date2: Date): boolean {
  return (
    date1.getUTCFullYear() === date2.getUTCFullYear() &&
    date1.getUTCMonth() === date2.getUTCMonth() &&
    date1.getUTCDate() === date2.getUTCDate()
  );
}

// GET - Check daily reward status
export const GET = withAuth(async (_request, user) => {
  try {
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
      select: {
        login_streak: true,
        last_login_claim: true,
        streak_shields: true,
      },
    });

    if (!profile) {
      return Errors.notFound("Profile");
    }

    const today = getTodayUTC();
    const yesterday = getYesterdayUTC();
    const lastClaim = profile.last_login_claim
      ? new Date(profile.last_login_claim)
      : null;

    // Check if already claimed today (compare UTC dates)
    let claimedToday = false;
    if (lastClaim) {
      claimedToday = isSameDay(lastClaim, today);
    }

    // Calculate current streak position
    let currentStreakDay = profile.login_streak || 0;

    // If claimed yesterday, they're continuing the streak
    // If not claimed yesterday, streak resets
    if (!claimedToday && lastClaim) {
      if (!isSameDay(lastClaim, yesterday) && lastClaim < yesterday) {
        // Missed a day, streak resets
        currentStreakDay = 0;
      }
    }

    // Next reward day is streak + 1 (capped at 7, then loops)
    const nextDay = claimedToday
      ? ((currentStreakDay % 7) || 7) // Show current day if claimed
      : ((currentStreakDay % 7) + 1) || 1; // Show next day if not claimed

    const nextReward = DAILY_REWARDS[nextDay - 1];

    // Build the week view (shows all 7 days with claimed status)
    const weekView = DAILY_REWARDS.map((reward, idx) => ({
      day: idx + 1,
      xp: reward.xp,
      bonusItems: reward.bonusItems,
      claimed: idx < (currentStreakDay % 7 || (claimedToday ? 7 : 0)),
      current: idx + 1 === nextDay,
    }));

    return NextResponse.json({
      claimedToday,
      loginStreak: currentStreakDay,
      streakShields: profile.streak_shields || 0,
      nextReward: claimedToday ? null : nextReward,
      weekView,
      lastClaimDate: lastClaim?.toISOString() || null,
    });
  } catch (error) {
    console.error("Daily rewards GET error:", error);
    return Errors.database("Failed to fetch daily rewards");
  }
});

// POST - Claim daily reward
export const POST = withAuth(async (_request, user) => {
  try {
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
    });

    if (!profile) {
      return Errors.notFound("Profile");
    }

    const today = getTodayUTC();
    const yesterday = getYesterdayUTC();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);
    const lastClaim = profile.last_login_claim
      ? new Date(profile.last_login_claim)
      : null;

    // Check if already claimed today using profile field
    if (lastClaim && isSameDay(lastClaim, today)) {
      return Errors.conflict("Already claimed today");
    }

    // Double-check against daily_login_claims table to prevent race conditions
    const existingClaim = await prisma.daily_login_claims.findFirst({
      where: {
        user_id: user.id,
        claim_date: {
          gte: today,
          lt: tomorrow,
        },
      },
    });

    if (existingClaim) {
      return Errors.conflict("Already claimed today");
    }

    // Calculate new streak
    let newStreak = 1;
    if (lastClaim) {
      if (isSameDay(lastClaim, yesterday)) {
        // Continuing streak
        newStreak = (profile.login_streak || 0) + 1;
      } else if (lastClaim < yesterday) {
        // Missed a day, streak resets
        newStreak = 1;
      }
    }

    // Get reward for this day (1-7 cycle)
    const rewardDay = ((newStreak - 1) % 7) + 1;
    const reward = DAILY_REWARDS[rewardDay - 1];

    // Calculate bonus items to award
    const awardedItems: string[] = [...reward.bonusItems];

    // Random cosmetic chance on day 3
    if ("randomCosmeticChance" in reward && reward.randomCosmeticChance && Math.random() < reward.randomCosmeticChance) {
      awardedItems.push("random_cosmetic");
    }

    // Update profile with new streak and claim date
    const newStreakShields = reward.bonusItems.includes("streak_shield")
      ? Math.min((profile.streak_shields || 0) + 1, 3) // Max 3 shields
      : profile.streak_shields || 0;

    await prisma.profiles.update({
      where: { id: user.id },
      data: {
        login_streak: newStreak,
        last_login_claim: today,
        streak_shields: newStreakShields,
        total_xp: { increment: reward.xp },
        updated_at: new Date(),
      },
    });

    // Record the claim
    await prisma.daily_login_claims.create({
      data: {
        user_id: user.id,
        claim_date: today,
        day_number: rewardDay,
        xp_earned: reward.xp,
        bonus_items: awardedItems,
      },
    });

    // Build week view for response
    const weekView = DAILY_REWARDS.map((r, idx) => ({
      day: idx + 1,
      xp: r.xp,
      bonusItems: r.bonusItems,
      claimed: idx < rewardDay,
      current: idx + 1 === rewardDay,
    }));

    return NextResponse.json({
      success: true,
      reward: {
        day: rewardDay,
        xp: reward.xp,
        bonusItems: awardedItems,
        isWeekComplete: rewardDay === 7,
      },
      loginStreak: newStreak,
      streakShields: newStreakShields,
      weekView,
      message:
        rewardDay === 7
          ? "🎉 Week complete! You earned a rare loot box!"
          : rewardDay === 5
          ? "🛡️ You earned a Streak Shield!"
          : `Day ${rewardDay} complete! +${reward.xp} XP`,
    });
  } catch (error) {
    console.error("Daily rewards POST error:", error);
    return Errors.database("Failed to claim daily reward");
  }
});
