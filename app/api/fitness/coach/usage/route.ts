import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";
import { getCoachUsageWithLimits } from "@/lib/coach-usage";
import { getUpgradeRecommendation } from "@/lib/permissions";

// GET /api/fitness/coach/usage - Get current usage and limits
export const GET = withCoachAuth(async (_request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const usage = await getCoachUsageWithLimits(user.id, coach.id);

  // Check if upgrade is recommended
  const upgradeRecommendation = getUpgradeRecommendation(usage.tier, {
    athletes: usage.activeAthletes,
    formChecks: usage.formChecksUsed,
    programs: usage.programsCreated,
  });

  return NextResponse.json({
    usage: {
      period: {
        start: usage.periodStart,
        end: usage.periodEnd,
      },
      current: {
        athletes: usage.activeAthletes,
        formChecks: usage.formChecksUsed,
        messages: usage.messagesSent,
        programs: usage.programsCreated,
        storageBytes: usage.storageUsed,
      },
      limits: usage.limits,
      percentages: usage.percentages,
    },
    tier: usage.tier,
    upgradeRecommendation,
  });
});
