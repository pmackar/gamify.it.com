/**
 * Coach Usage Tracking
 *
 * Manages monthly usage counters for coach tier limits.
 * Automatically creates new usage periods and tracks consumption.
 */

import prisma from '@/lib/db';
import { getUserSubscription } from '@/lib/permissions-server';
import { COACH_TIER_LIMITS, SubscriptionTier } from '@/lib/permissions';

// ============================================
// Types
// ============================================

export interface CoachUsage {
  periodStart: Date;
  periodEnd: Date;
  formChecksUsed: number;
  messagesSent: number;
  programsCreated: number;
  storageUsed: number; // bytes
  activeAthletes: number;
}

export interface UsageWithLimits extends CoachUsage {
  tier: SubscriptionTier;
  limits: {
    maxAthletes: number;
    formChecksPerMonth: number;
    programsLimit: number;
    storageGB: number;
  };
  percentages: {
    athletes: number;
    formChecks: number;
    programs: number;
    storage: number;
  };
}

// ============================================
// Helper Functions
// ============================================

/**
 * Get the current billing period (first to last of month)
 */
function getCurrentPeriod(): { start: Date; end: Date } {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return { start, end };
}

/**
 * Calculate percentage, handling unlimited (-1)
 */
function calcPercentage(used: number, limit: number): number {
  if (limit === -1) return 0; // Unlimited
  if (limit === 0) return used > 0 ? 100 : 0;
  return Math.round((used / limit) * 100);
}

// ============================================
// Core Functions
// ============================================

/**
 * Get or create the current month's usage record for a coach
 */
export async function getOrCreateCurrentUsage(coachId: string): Promise<CoachUsage> {
  const { start, end } = getCurrentPeriod();

  // Try to find existing usage record
  let usage = await prisma.coach_usage.findUnique({
    where: {
      coach_id_period_start: {
        coach_id: coachId,
        period_start: start,
      },
    },
  });

  if (!usage) {
    // Count current active athletes
    const activeAthletes = await prisma.coaching_relationships.count({
      where: {
        coach_id: coachId,
        status: 'ACTIVE',
      },
    });

    // Count current programs
    const programsCreated = await prisma.coaching_programs.count({
      where: { coach_id: coachId },
    });

    // Create new usage record
    usage = await prisma.coach_usage.create({
      data: {
        coach_id: coachId,
        period_start: start,
        period_end: end,
        active_athletes: activeAthletes,
        programs_created: programsCreated,
      },
    });
  }

  return {
    periodStart: usage.period_start,
    periodEnd: usage.period_end,
    formChecksUsed: usage.form_checks_used,
    messagesSent: usage.messages_sent,
    programsCreated: usage.programs_created,
    storageUsed: Number(usage.storage_bytes_used),
    activeAthletes: usage.active_athletes,
  };
}

/**
 * Get coach usage with tier limits and percentages
 */
export async function getCoachUsageWithLimits(
  userId: string,
  coachId: string
): Promise<UsageWithLimits> {
  const [usage, subscription] = await Promise.all([
    getOrCreateCurrentUsage(coachId),
    getUserSubscription(userId, 'fitness'),
  ]);

  const tier = subscription.tier;
  const limits = COACH_TIER_LIMITS[tier];

  return {
    ...usage,
    tier,
    limits: {
      maxAthletes: limits.maxAthletes,
      formChecksPerMonth: limits.formChecksPerMonth,
      programsLimit: limits.programsLimit,
      storageGB: limits.storageGB,
    },
    percentages: {
      athletes: calcPercentage(usage.activeAthletes, limits.maxAthletes),
      formChecks: calcPercentage(usage.formChecksUsed, limits.formChecksPerMonth),
      programs: calcPercentage(usage.programsCreated, limits.programsLimit),
      storage: calcPercentage(usage.storageUsed, limits.storageGB * 1024 * 1024 * 1024),
    },
  };
}

/**
 * Increment form check usage
 */
export async function incrementFormCheckUsage(coachId: string): Promise<void> {
  const { start, end } = getCurrentPeriod();

  await prisma.coach_usage.upsert({
    where: {
      coach_id_period_start: {
        coach_id: coachId,
        period_start: start,
      },
    },
    update: {
      form_checks_used: { increment: 1 },
      updated_at: new Date(),
    },
    create: {
      coach_id: coachId,
      period_start: start,
      period_end: end,
      form_checks_used: 1,
    },
  });
}

/**
 * Increment message usage
 */
export async function incrementMessageUsage(coachId: string): Promise<void> {
  const { start, end } = getCurrentPeriod();

  await prisma.coach_usage.upsert({
    where: {
      coach_id_period_start: {
        coach_id: coachId,
        period_start: start,
      },
    },
    update: {
      messages_sent: { increment: 1 },
      updated_at: new Date(),
    },
    create: {
      coach_id: coachId,
      period_start: start,
      period_end: end,
      messages_sent: 1,
    },
  });
}

/**
 * Update athlete count
 */
export async function updateAthleteCount(coachId: string): Promise<void> {
  const { start, end } = getCurrentPeriod();

  const activeAthletes = await prisma.coaching_relationships.count({
    where: {
      coach_id: coachId,
      status: 'ACTIVE',
    },
  });

  await prisma.coach_usage.upsert({
    where: {
      coach_id_period_start: {
        coach_id: coachId,
        period_start: start,
      },
    },
    update: {
      active_athletes: activeAthletes,
      updated_at: new Date(),
    },
    create: {
      coach_id: coachId,
      period_start: start,
      period_end: end,
      active_athletes: activeAthletes,
    },
  });
}

/**
 * Update program count
 */
export async function updateProgramCount(coachId: string): Promise<void> {
  const { start, end } = getCurrentPeriod();

  const programsCreated = await prisma.coaching_programs.count({
    where: { coach_id: coachId },
  });

  await prisma.coach_usage.upsert({
    where: {
      coach_id_period_start: {
        coach_id: coachId,
        period_start: start,
      },
    },
    update: {
      programs_created: programsCreated,
      updated_at: new Date(),
    },
    create: {
      coach_id: coachId,
      period_start: start,
      period_end: end,
      programs_created: programsCreated,
    },
  });
}

// ============================================
// Limit Checking
// ============================================

/**
 * Check if coach can add another athlete
 */
export async function canAddAthlete(userId: string, coachId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}> {
  const usageWithLimits = await getCoachUsageWithLimits(userId, coachId);
  const { limits, activeAthletes } = usageWithLimits;

  if (limits.maxAthletes === -1) {
    return { allowed: true, currentCount: activeAthletes, limit: -1 };
  }

  if (activeAthletes >= limits.maxAthletes) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.maxAthletes} athletes on your ${usageWithLimits.tier} plan`,
      currentCount: activeAthletes,
      limit: limits.maxAthletes,
    };
  }

  return { allowed: true, currentCount: activeAthletes, limit: limits.maxAthletes };
}

/**
 * Check if coach can review another form check this month
 */
export async function canReviewFormCheck(userId: string, coachId: string): Promise<{
  allowed: boolean;
  reason?: string;
  usedThisMonth: number;
  limit: number;
}> {
  const usageWithLimits = await getCoachUsageWithLimits(userId, coachId);
  const { limits, formChecksUsed } = usageWithLimits;

  if (limits.formChecksPerMonth === -1) {
    return { allowed: true, usedThisMonth: formChecksUsed, limit: -1 };
  }

  if (formChecksUsed >= limits.formChecksPerMonth) {
    return {
      allowed: false,
      reason: `You've used all ${limits.formChecksPerMonth} form check reviews this month`,
      usedThisMonth: formChecksUsed,
      limit: limits.formChecksPerMonth,
    };
  }

  return { allowed: true, usedThisMonth: formChecksUsed, limit: limits.formChecksPerMonth };
}

/**
 * Check if coach can create another program
 */
export async function canCreateProgram(userId: string, coachId: string): Promise<{
  allowed: boolean;
  reason?: string;
  currentCount: number;
  limit: number;
}> {
  const usageWithLimits = await getCoachUsageWithLimits(userId, coachId);
  const { limits, programsCreated } = usageWithLimits;

  if (limits.programsLimit === -1) {
    return { allowed: true, currentCount: programsCreated, limit: -1 };
  }

  if (programsCreated >= limits.programsLimit) {
    return {
      allowed: false,
      reason: `You've reached the maximum of ${limits.programsLimit} programs on your ${usageWithLimits.tier} plan`,
      currentCount: programsCreated,
      limit: limits.programsLimit,
    };
  }

  return { allowed: true, currentCount: programsCreated, limit: limits.programsLimit };
}
