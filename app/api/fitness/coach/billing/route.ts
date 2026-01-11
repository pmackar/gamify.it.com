import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";
import {
  createConnectAccount,
  createAccountLink,
  getAccountStatus,
  createDashboardLink,
} from "@/lib/stripe";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gamify.it.com";

// GET /api/fitness/coach/billing - Get billing account status
export const GET = withCoachAuth(async (_request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
    include: {
      stripe_account: true,
    },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  // No Stripe account yet
  if (!coach.stripe_account) {
    return NextResponse.json({
      hasStripeAccount: false,
      onboardingComplete: false,
      chargesEnabled: false,
      payoutsEnabled: false,
    });
  }

  // Get latest status from Stripe
  try {
    const status = await getAccountStatus(coach.stripe_account.stripe_account_id);

    // Update local record if status changed
    if (
      status.chargesEnabled !== coach.stripe_account.charges_enabled ||
      status.payoutsEnabled !== coach.stripe_account.payouts_enabled ||
      status.detailsSubmitted !== coach.stripe_account.details_submitted
    ) {
      await prisma.coach_stripe_accounts.update({
        where: { id: coach.stripe_account.id },
        data: {
          charges_enabled: status.chargesEnabled,
          payouts_enabled: status.payoutsEnabled,
          details_submitted: status.detailsSubmitted,
          onboarding_complete: status.chargesEnabled && status.payoutsEnabled,
          updated_at: new Date(),
        },
      });
    }

    return NextResponse.json({
      hasStripeAccount: true,
      stripeAccountId: coach.stripe_account.stripe_account_id,
      onboardingComplete: status.chargesEnabled && status.payoutsEnabled,
      chargesEnabled: status.chargesEnabled,
      payoutsEnabled: status.payoutsEnabled,
      detailsSubmitted: status.detailsSubmitted,
      requirements: status.requirements,
    });
  } catch (error) {
    console.error("Error fetching Stripe account status:", error);
    return NextResponse.json({
      hasStripeAccount: true,
      stripeAccountId: coach.stripe_account.stripe_account_id,
      onboardingComplete: coach.stripe_account.onboarding_complete,
      chargesEnabled: coach.stripe_account.charges_enabled,
      payoutsEnabled: coach.stripe_account.payouts_enabled,
      detailsSubmitted: coach.stripe_account.details_submitted,
      error: "Could not fetch latest status from Stripe",
    });
  }
});

// POST /api/fitness/coach/billing - Start Stripe Connect onboarding
export const POST = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
    include: {
      stripe_account: true,
      user: { select: { email: true, display_name: true } },
    },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const body = await request.json();
  const { action } = body;

  // Create new Stripe Connect account
  if (action === "create_account" || !coach.stripe_account) {
    if (coach.stripe_account) {
      // Already has account, just create new onboarding link
      const accountLink = await createAccountLink(
        coach.stripe_account.stripe_account_id,
        `${BASE_URL}/fitness/coach/billing?refresh=true`,
        `${BASE_URL}/fitness/coach/billing?success=true`
      );

      return NextResponse.json({
        success: true,
        onboardingUrl: accountLink.url,
      });
    }

    // Create new Connect account
    const account = await createConnectAccount(
      coach.user.email,
      coach.business_name || coach.user.display_name || undefined
    );

    // Save to database
    await prisma.coach_stripe_accounts.create({
      data: {
        coach_id: coach.id,
        stripe_account_id: account.id,
      },
    });

    // Create onboarding link
    const accountLink = await createAccountLink(
      account.id,
      `${BASE_URL}/fitness/coach/billing?refresh=true`,
      `${BASE_URL}/fitness/coach/billing?success=true`
    );

    return NextResponse.json({
      success: true,
      stripeAccountId: account.id,
      onboardingUrl: accountLink.url,
    });
  }

  // Get dashboard link for existing account
  if (action === "dashboard_link") {
    if (!coach.stripe_account) {
      return Errors.invalidInput("No Stripe account found");
    }

    const loginLink = await createDashboardLink(
      coach.stripe_account.stripe_account_id
    );

    return NextResponse.json({
      success: true,
      dashboardUrl: loginLink.url,
    });
  }

  // Resume onboarding
  if (action === "resume_onboarding") {
    if (!coach.stripe_account) {
      return Errors.invalidInput("No Stripe account found");
    }

    const accountLink = await createAccountLink(
      coach.stripe_account.stripe_account_id,
      `${BASE_URL}/fitness/coach/billing?refresh=true`,
      `${BASE_URL}/fitness/coach/billing?success=true`
    );

    return NextResponse.json({
      success: true,
      onboardingUrl: accountLink.url,
    });
  }

  return Errors.invalidInput("Invalid action");
});
