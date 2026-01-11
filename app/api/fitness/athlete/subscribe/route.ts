import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";
import {
  getOrCreateCustomer,
  createCheckoutSession,
  cancelSubscription,
} from "@/lib/stripe";

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://gamify.it.com";

// GET /api/fitness/athlete/subscribe - Get athlete's coaching subscriptions
export const GET = withAuth(async (_request, user) => {
  const subscriptions = await prisma.athlete_coaching_subscriptions.findMany({
    where: { athlete_id: user.id },
    include: {
      plan: {
        include: {
          stripe_account: {
            include: {
              coach: {
                include: {
                  user: {
                    select: {
                      display_name: true,
                      email: true,
                      avatar_url: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: { created_at: "desc" },
  });

  return NextResponse.json({
    subscriptions: subscriptions.map((sub) => ({
      id: sub.id,
      status: sub.status,
      currentPeriodStart: sub.current_period_start,
      currentPeriodEnd: sub.current_period_end,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      trialEnd: sub.trial_end,
      plan: {
        id: sub.plan.id,
        name: sub.plan.name,
        priceCents: sub.plan.price_cents,
        currency: sub.plan.currency,
        interval: sub.plan.interval,
        features: sub.plan.features,
      },
      coach: {
        id: sub.plan.stripe_account.coach.id,
        name:
          sub.plan.stripe_account.coach.business_name ||
          sub.plan.stripe_account.coach.user.display_name ||
          sub.plan.stripe_account.coach.user.email,
        avatar: sub.plan.stripe_account.coach.user.avatar_url,
      },
    })),
  });
});

// POST /api/fitness/athlete/subscribe - Subscribe to a coach's plan
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { planId, action } = body;

  // Cancel subscription
  if (action === "cancel") {
    const { subscriptionId, immediately = false } = body;

    if (!subscriptionId) {
      return Errors.invalidInput("Subscription ID required");
    }

    const subscription = await prisma.athlete_coaching_subscriptions.findFirst({
      where: { id: subscriptionId, athlete_id: user.id },
      include: {
        plan: {
          include: {
            stripe_account: true,
          },
        },
      },
    });

    if (!subscription) {
      return Errors.notFound("Subscription not found");
    }

    if (subscription.stripe_subscription_id) {
      await cancelSubscription(
        subscription.plan.stripe_account.stripe_account_id,
        subscription.stripe_subscription_id,
        immediately
      );
    }

    await prisma.athlete_coaching_subscriptions.update({
      where: { id: subscriptionId },
      data: {
        status: immediately ? "CANCELLED" : subscription.status,
        cancel_at_period_end: !immediately,
        cancelled_at: immediately ? new Date() : null,
        updated_at: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: immediately
        ? "Subscription cancelled"
        : "Subscription will cancel at end of billing period",
    });
  }

  // Subscribe to a plan
  if (!planId) {
    return Errors.invalidInput("Plan ID required");
  }

  // Get the plan with coach info
  const plan = await prisma.coach_pricing_plans.findUnique({
    where: { id: planId },
    include: {
      stripe_account: {
        include: {
          coach: {
            include: {
              user: { select: { display_name: true } },
            },
          },
        },
      },
    },
  });

  if (!plan) {
    return Errors.notFound("Plan not found");
  }

  if (!plan.is_active) {
    return Errors.invalidInput("This plan is no longer available");
  }

  if (!plan.stripe_price_id) {
    return Errors.internal("Plan not configured for payments");
  }

  // Check if already subscribed
  const existingSubscription =
    await prisma.athlete_coaching_subscriptions.findFirst({
      where: {
        athlete_id: user.id,
        plan_id: planId,
        status: { in: ["ACTIVE", "TRIALING", "PAST_DUE"] },
      },
    });

  if (existingSubscription) {
    return Errors.invalidInput("Already subscribed to this plan");
  }

  // Check plan capacity
  if (plan.max_athletes) {
    const activeSubscribers = await prisma.athlete_coaching_subscriptions.count(
      {
        where: {
          plan_id: planId,
          status: { in: ["ACTIVE", "TRIALING"] },
        },
      }
    );

    if (activeSubscribers >= plan.max_athletes) {
      return Errors.invalidInput("This plan has reached its capacity");
    }
  }

  // Get user info for customer creation
  const userProfile = await prisma.profiles.findUnique({
    where: { id: user.id },
    select: { email: true, display_name: true },
  });

  if (!userProfile) {
    return Errors.notFound("User not found");
  }

  try {
    // Create or get Stripe customer on coach's connected account
    const customer = await getOrCreateCustomer(
      plan.stripe_account.stripe_account_id,
      userProfile.email,
      userProfile.display_name || undefined
    );

    // Create checkout session
    const session = await createCheckoutSession(
      plan.stripe_account.stripe_account_id,
      plan.stripe_price_id,
      customer.id,
      `${BASE_URL}/fitness/coach/subscription/success?session_id={CHECKOUT_SESSION_ID}`,
      `${BASE_URL}/fitness/coach/subscription/cancel`,
      plan.trial_days || undefined,
      {
        athlete_id: user.id,
        plan_id: planId,
        coach_id: plan.stripe_account.coach_id,
      }
    );

    // Create pending subscription record
    await prisma.athlete_coaching_subscriptions.create({
      data: {
        athlete_id: user.id,
        plan_id: planId,
        stripe_customer_id: customer.id,
        status: "TRIALING", // Will be updated by webhook
      },
    });

    return NextResponse.json({
      success: true,
      checkoutUrl: session.url,
    });
  } catch (error) {
    console.error("Error creating checkout session:", error);
    return Errors.internal("Failed to create checkout session");
  }
});
