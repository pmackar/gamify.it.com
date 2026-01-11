/**
 * Stripe Integration
 *
 * Handles Stripe Connect for coach billing and payment processing.
 * Platform fee: 10% of coach revenue
 */

import Stripe from "stripe";

// Lazy initialization to avoid build-time errors
let stripeInstance: Stripe | null = null;

function getStripe(): Stripe {
  if (!stripeInstance) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY environment variable is required");
    }
    stripeInstance = new Stripe(key, {
      apiVersion: "2025-01-27.acacia",
    });
  }
  return stripeInstance;
}

// For backwards compatibility
const stripe = {
  get accounts() { return getStripe().accounts; },
  get products() { return getStripe().products; },
  get prices() { return getStripe().prices; },
  get customers() { return getStripe().customers; },
  get checkout() { return getStripe().checkout; },
  get subscriptions() { return getStripe().subscriptions; },
  get webhooks() { return getStripe().webhooks; },
};

// Platform fee percentage (10%)
export const PLATFORM_FEE_PERCENT = 10;

// ============================================
// Stripe Connect Account Management
// ============================================

/**
 * Create a Stripe Connect Express account for a coach
 */
export async function createConnectAccount(
  coachEmail: string,
  coachName?: string
): Promise<Stripe.Account> {
  const account = await stripe.accounts.create({
    type: "express",
    email: coachEmail,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_profile: {
      name: coachName,
      product_description: "Online fitness coaching services",
    },
    settings: {
      payouts: {
        schedule: {
          interval: "weekly",
          weekly_anchor: "friday",
        },
      },
    },
  });

  return account;
}

/**
 * Create an account onboarding link for a coach
 */
export async function createAccountLink(
  stripeAccountId: string,
  refreshUrl: string,
  returnUrl: string
): Promise<Stripe.AccountLink> {
  const accountLink = await stripe.accountLinks.create({
    account: stripeAccountId,
    refresh_url: refreshUrl,
    return_url: returnUrl,
    type: "account_onboarding",
  });

  return accountLink;
}

/**
 * Get the current status of a Connect account
 */
export async function getAccountStatus(stripeAccountId: string): Promise<{
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirements: Stripe.Account.Requirements | null;
}> {
  const account = await stripe.accounts.retrieve(stripeAccountId);

  return {
    chargesEnabled: account.charges_enabled ?? false,
    payoutsEnabled: account.payouts_enabled ?? false,
    detailsSubmitted: account.details_submitted ?? false,
    requirements: account.requirements ?? null,
  };
}

/**
 * Create a login link for the Express dashboard
 */
export async function createDashboardLink(
  stripeAccountId: string
): Promise<Stripe.LoginLink> {
  const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
  return loginLink;
}

// ============================================
// Products and Prices (for coach plans)
// ============================================

/**
 * Create a Stripe Product for a coach's pricing plan
 */
export async function createProduct(
  stripeAccountId: string,
  name: string,
  description?: string
): Promise<Stripe.Product> {
  const product = await stripe.products.create(
    {
      name,
      description,
    },
    { stripeAccount: stripeAccountId }
  );

  return product;
}

/**
 * Create a Stripe Price for a product
 */
export async function createPrice(
  stripeAccountId: string,
  productId: string,
  amountCents: number,
  currency: string = "usd",
  interval: "month" | "year" | "week" = "month",
  intervalCount: number = 1
): Promise<Stripe.Price> {
  const price = await stripe.prices.create(
    {
      product: productId,
      unit_amount: amountCents,
      currency,
      recurring: {
        interval,
        interval_count: intervalCount,
      },
    },
    { stripeAccount: stripeAccountId }
  );

  return price;
}

// ============================================
// Subscriptions (athlete paying coach)
// ============================================

/**
 * Create or get a Stripe Customer for an athlete
 */
export async function getOrCreateCustomer(
  stripeAccountId: string,
  email: string,
  name?: string,
  existingCustomerId?: string
): Promise<Stripe.Customer> {
  if (existingCustomerId) {
    try {
      const customer = await stripe.customers.retrieve(existingCustomerId, {
        stripeAccount: stripeAccountId,
      });
      if (!customer.deleted) {
        return customer as Stripe.Customer;
      }
    } catch {
      // Customer doesn't exist, create new one
    }
  }

  const customer = await stripe.customers.create(
    {
      email,
      name,
    },
    { stripeAccount: stripeAccountId }
  );

  return customer;
}

/**
 * Create a Checkout Session for an athlete to subscribe to a coach
 */
export async function createCheckoutSession(
  stripeAccountId: string,
  priceId: string,
  customerId: string,
  successUrl: string,
  cancelUrl: string,
  trialDays?: number,
  metadata?: Record<string, string>
): Promise<Stripe.Checkout.Session> {
  const session = await stripe.checkout.sessions.create(
    {
      mode: "subscription",
      customer: customerId,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: trialDays,
        application_fee_percent: PLATFORM_FEE_PERCENT,
        metadata,
      },
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
    },
    { stripeAccount: stripeAccountId }
  );

  return session;
}

/**
 * Cancel a subscription
 */
export async function cancelSubscription(
  stripeAccountId: string,
  subscriptionId: string,
  immediately: boolean = false
): Promise<Stripe.Subscription> {
  if (immediately) {
    return await stripe.subscriptions.cancel(subscriptionId, {
      stripeAccount: stripeAccountId,
    });
  }

  return await stripe.subscriptions.update(
    subscriptionId,
    { cancel_at_period_end: true },
    { stripeAccount: stripeAccountId }
  );
}

/**
 * Get subscription details
 */
export async function getSubscription(
  stripeAccountId: string,
  subscriptionId: string
): Promise<Stripe.Subscription> {
  return await stripe.subscriptions.retrieve(subscriptionId, {
    stripeAccount: stripeAccountId,
  });
}

// ============================================
// Webhooks
// ============================================

/**
 * Construct webhook event from request
 */
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string,
  webhookSecret: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(payload, signature, webhookSecret);
}

// Export stripe instance for advanced usage
export { stripe };
