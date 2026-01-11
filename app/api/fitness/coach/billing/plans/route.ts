import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";
import { createProduct, createPrice } from "@/lib/stripe";

// GET /api/fitness/coach/billing/plans - List coach's pricing plans
export const GET = withCoachAuth(async (_request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
    include: {
      stripe_account: {
        include: {
          pricing_plans: {
            orderBy: { price_cents: "asc" },
          },
        },
      },
    },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  if (!coach.stripe_account) {
    return NextResponse.json({
      plans: [],
      stripeConnected: false,
    });
  }

  // Get subscriber counts for each plan
  const planIds = coach.stripe_account.pricing_plans.map((p) => p.id);
  const subscriberCounts = await prisma.athlete_coaching_subscriptions.groupBy({
    by: ["plan_id"],
    where: {
      plan_id: { in: planIds },
      status: { in: ["ACTIVE", "TRIALING"] },
    },
    _count: { id: true },
  });

  const countMap = new Map(
    subscriberCounts.map((s) => [s.plan_id, s._count.id])
  );

  const plans = coach.stripe_account.pricing_plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceCents: plan.price_cents,
    currency: plan.currency,
    interval: plan.interval,
    intervalCount: plan.interval_count,
    trialDays: plan.trial_days,
    features: plan.features,
    isActive: plan.is_active,
    maxAthletes: plan.max_athletes,
    activeSubscribers: countMap.get(plan.id) || 0,
    createdAt: plan.created_at,
  }));

  return NextResponse.json({
    plans,
    stripeConnected: true,
  });
});

// POST /api/fitness/coach/billing/plans - Create a new pricing plan
export const POST = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
    include: {
      stripe_account: true,
    },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  if (!coach.stripe_account) {
    return Errors.invalidInput(
      "Complete Stripe onboarding before creating pricing plans"
    );
  }

  if (!coach.stripe_account.onboarding_complete) {
    return Errors.invalidInput(
      "Complete Stripe onboarding before creating pricing plans"
    );
  }

  const body = await request.json();
  const {
    name,
    description,
    priceCents,
    currency = "usd",
    interval = "month",
    intervalCount = 1,
    trialDays,
    features = [],
    maxAthletes,
  } = body;

  // Validation
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return Errors.invalidInput("Plan name is required");
  }

  if (!priceCents || typeof priceCents !== "number" || priceCents < 100) {
    return Errors.invalidInput("Price must be at least $1.00");
  }

  if (!["month", "year", "week"].includes(interval)) {
    return Errors.invalidInput("Invalid billing interval");
  }

  try {
    // Create Stripe Product
    const product = await createProduct(
      coach.stripe_account.stripe_account_id,
      name.trim(),
      description?.trim()
    );

    // Create Stripe Price
    const price = await createPrice(
      coach.stripe_account.stripe_account_id,
      product.id,
      priceCents,
      currency,
      interval as "month" | "year" | "week",
      intervalCount
    );

    // Save to database
    const plan = await prisma.coach_pricing_plans.create({
      data: {
        coach_id: coach.stripe_account.coach_id,
        name: name.trim(),
        description: description?.trim() || null,
        price_cents: priceCents,
        currency,
        interval,
        interval_count: intervalCount,
        trial_days: trialDays || null,
        stripe_product_id: product.id,
        stripe_price_id: price.id,
        features,
        max_athletes: maxAthletes || null,
      },
    });

    return NextResponse.json(
      {
        success: true,
        plan: {
          id: plan.id,
          name: plan.name,
          priceCents: plan.price_cents,
          stripePriceId: plan.stripe_price_id,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating pricing plan:", error);
    return Errors.internal("Failed to create pricing plan");
  }
});
