import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { constructWebhookEvent } from "@/lib/stripe";
import Stripe from "stripe";

const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET!;
const CONNECT_WEBHOOK_SECRET = process.env.STRIPE_CONNECT_WEBHOOK_SECRET!;

export async function POST(request: NextRequest) {
  const payload = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "No signature" }, { status: 400 });
  }

  let event: Stripe.Event;

  // Try Connect webhook secret first, then regular webhook secret
  try {
    event = constructWebhookEvent(payload, signature, CONNECT_WEBHOOK_SECRET);
  } catch {
    try {
      event = constructWebhookEvent(payload, signature, WEBHOOK_SECRET);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }
  }

  // Handle Connect account events
  if (event.account) {
    return handleConnectEvent(event);
  }

  // Handle platform events
  return handlePlatformEvent(event);
}

async function handleConnectEvent(event: Stripe.Event): Promise<NextResponse> {
  const stripeAccountId = event.account!;

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;

      await prisma.coach_stripe_accounts.updateMany({
        where: { stripe_account_id: stripeAccountId },
        data: {
          charges_enabled: account.charges_enabled ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
          details_submitted: account.details_submitted ?? false,
          onboarding_complete:
            (account.charges_enabled ?? false) &&
            (account.payouts_enabled ?? false),
          updated_at: new Date(),
        },
      });
      break;
    }

    case "customer.subscription.created":
    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      await updateSubscriptionFromStripe(stripeAccountId, subscription);
      break;
    }

    case "customer.subscription.deleted": {
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.athlete_coaching_subscriptions.updateMany({
        where: { stripe_subscription_id: subscription.id },
        data: {
          status: "CANCELLED",
          cancelled_at: new Date(),
          updated_at: new Date(),
        },
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        // Update subscription status on successful payment
        await prisma.athlete_coaching_subscriptions.updateMany({
          where: { stripe_subscription_id: invoice.subscription as string },
          data: {
            status: "ACTIVE",
            updated_at: new Date(),
          },
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      if (invoice.subscription) {
        await prisma.athlete_coaching_subscriptions.updateMany({
          where: { stripe_subscription_id: invoice.subscription as string },
          data: {
            status: "PAST_DUE",
            updated_at: new Date(),
          },
        });
      }
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      if (session.mode === "subscription" && session.subscription) {
        const athleteId = session.metadata?.athlete_id;
        const planId = session.metadata?.plan_id;

        if (athleteId && planId) {
          // Update the pending subscription with Stripe subscription ID
          await prisma.athlete_coaching_subscriptions.updateMany({
            where: {
              athlete_id: athleteId,
              plan_id: planId,
              stripe_subscription_id: null,
            },
            data: {
              stripe_subscription_id: session.subscription as string,
              status: "ACTIVE",
              updated_at: new Date(),
            },
          });
        }
      }
      break;
    }

    case "payout.created":
    case "payout.updated": {
      const payout = event.data.object as Stripe.Payout;
      const stripeAccount = await prisma.coach_stripe_accounts.findUnique({
        where: { stripe_account_id: stripeAccountId },
      });

      if (stripeAccount) {
        await prisma.coach_payouts.upsert({
          where: {
            stripe_account_id_stripe_payout_id: {
              stripe_account_id: stripeAccount.id,
              stripe_payout_id: payout.id,
            },
          } as any,
          update: {
            amount_cents: payout.amount,
            currency: payout.currency,
            status: mapPayoutStatus(payout.status),
            arrival_date: payout.arrival_date
              ? new Date(payout.arrival_date * 1000)
              : null,
            failure_message: payout.failure_message,
          },
          create: {
            stripe_account_id: stripeAccount.id,
            stripe_payout_id: payout.id,
            amount_cents: payout.amount,
            currency: payout.currency,
            status: mapPayoutStatus(payout.status),
            arrival_date: payout.arrival_date
              ? new Date(payout.arrival_date * 1000)
              : null,
            failure_message: payout.failure_message,
          },
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function handlePlatformEvent(event: Stripe.Event): Promise<NextResponse> {
  // Handle platform-level events (not Connect)
  switch (event.type) {
    case "customer.subscription.updated": {
      // Platform subscriptions (coaches paying us)
      const subscription = event.data.object as Stripe.Subscription;
      await prisma.user_subscriptions.updateMany({
        where: { stripe_subscription_id: subscription.id },
        data: {
          status: mapSubscriptionStatus(subscription.status),
          expires_at: subscription.current_period_end
            ? new Date(subscription.current_period_end * 1000)
            : null,
          updated_at: new Date(),
        },
      });
      break;
    }
  }

  return NextResponse.json({ received: true });
}

async function updateSubscriptionFromStripe(
  stripeAccountId: string,
  subscription: Stripe.Subscription
): Promise<void> {
  const status = mapAthleteSubscriptionStatus(subscription.status);

  await prisma.athlete_coaching_subscriptions.updateMany({
    where: { stripe_subscription_id: subscription.id },
    data: {
      status,
      current_period_start: new Date(subscription.current_period_start * 1000),
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
      trial_end: subscription.trial_end
        ? new Date(subscription.trial_end * 1000)
        : null,
      updated_at: new Date(),
    },
  });
}

function mapAthleteSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): "ACTIVE" | "PAST_DUE" | "CANCELLED" | "PAUSED" | "TRIALING" {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "past_due":
      return "PAST_DUE";
    case "canceled":
      return "CANCELLED";
    case "paused":
      return "PAUSED";
    case "trialing":
      return "TRIALING";
    default:
      return "ACTIVE";
  }
}

function mapSubscriptionStatus(
  stripeStatus: Stripe.Subscription.Status
): "ACTIVE" | "TRIAL" | "CANCELLED" | "EXPIRED" | "PAUSED" {
  switch (stripeStatus) {
    case "active":
      return "ACTIVE";
    case "trialing":
      return "TRIAL";
    case "canceled":
    case "incomplete_expired":
      return "CANCELLED";
    case "past_due":
    case "unpaid":
      return "EXPIRED";
    case "paused":
      return "PAUSED";
    default:
      return "ACTIVE";
  }
}

function mapPayoutStatus(
  stripeStatus: string
): "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED" {
  switch (stripeStatus) {
    case "pending":
      return "PENDING";
    case "in_transit":
      return "PROCESSING";
    case "paid":
      return "COMPLETED";
    case "failed":
    case "canceled":
      return "FAILED";
    default:
      return "PENDING";
  }
}
