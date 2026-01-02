/**
 * Server-side Permission Utilities
 *
 * These functions interact with the database and should only be used
 * in server components and API routes.
 */

import prisma from '@/lib/db';
import {
  UserPermissions,
  AppSubscription,
  GlobalRole,
  SubscriptionTier,
  SubscriptionStatus,
  AppId,
  DEFAULT_SUBSCRIPTION,
  hasTier as checkTier,
  hasFeature as checkFeature,
  hasFeatureAccess as checkFeatureAccess,
  isAdmin as checkIsAdmin,
} from '@/lib/permissions';

// ============================================
// Database Queries
// ============================================

/**
 * Get user's full permissions from database
 */
export async function getUserPermissions(userId: string): Promise<UserPermissions> {
  // Fetch role and subscriptions in parallel
  const [userRole, subscriptions] = await Promise.all([
    prisma.user_roles.findUnique({
      where: { user_id: userId },
    }),
    prisma.user_subscriptions.findMany({
      where: { user_id: userId },
    }),
  ]);

  // Build subscriptions map
  const subscriptionsMap: Partial<Record<AppId, AppSubscription>> = {};

  for (const sub of subscriptions) {
    subscriptionsMap[sub.app_id as AppId] = {
      tier: sub.tier as SubscriptionTier,
      status: sub.status as SubscriptionStatus,
      features: sub.features,
      expiresAt: sub.expires_at,
      trialEndsAt: sub.trial_ends_at,
    };
  }

  return {
    userId,
    role: (userRole?.role as GlobalRole) ?? 'USER',
    subscriptions: subscriptionsMap,
  };
}

/**
 * Get user's role (lightweight, just role)
 */
export async function getUserRole(userId: string): Promise<GlobalRole> {
  const userRole = await prisma.user_roles.findUnique({
    where: { user_id: userId },
  });

  return (userRole?.role as GlobalRole) ?? 'USER';
}

/**
 * Get user's subscription for a specific app
 */
export async function getUserSubscription(
  userId: string,
  app: AppId
): Promise<AppSubscription> {
  const subscription = await prisma.user_subscriptions.findUnique({
    where: {
      user_id_app_id: {
        user_id: userId,
        app_id: app,
      },
    },
  });

  if (!subscription) {
    return DEFAULT_SUBSCRIPTION;
  }

  return {
    tier: subscription.tier as SubscriptionTier,
    status: subscription.status as SubscriptionStatus,
    features: subscription.features,
    expiresAt: subscription.expires_at,
    trialEndsAt: subscription.trial_ends_at,
  };
}

// ============================================
// Server-side Permission Checks
// ============================================

/**
 * Check if user has minimum tier for an app (with DB lookup)
 */
export async function checkUserTier(
  userId: string,
  app: AppId,
  minTier: SubscriptionTier
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return checkTier(permissions, app, minTier);
}

/**
 * Check if user has a specific feature (with DB lookup)
 */
export async function checkUserFeature(
  userId: string,
  app: AppId,
  feature: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return checkFeature(permissions, app, feature);
}

/**
 * Check if user has access to a feature (by definition, with DB lookup)
 */
export async function checkUserFeatureAccess(
  userId: string,
  app: AppId,
  featureKey: string
): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return checkFeatureAccess(permissions, app, featureKey);
}

/**
 * Check if user is admin (with DB lookup)
 */
export async function checkUserIsAdmin(userId: string): Promise<boolean> {
  const permissions = await getUserPermissions(userId);
  return checkIsAdmin(permissions);
}

// ============================================
// Admin Functions
// ============================================

/**
 * Set user's global role (admin only)
 */
export async function setUserRole(
  userId: string,
  role: GlobalRole,
  grantedBy?: string
): Promise<void> {
  await prisma.user_roles.upsert({
    where: { user_id: userId },
    update: {
      role,
      granted_at: new Date(),
      granted_by: grantedBy,
    },
    create: {
      user_id: userId,
      role,
      granted_by: grantedBy,
    },
  });
}

/**
 * Set user's subscription tier for an app
 */
export async function setUserSubscription(
  userId: string,
  app: AppId,
  tier: SubscriptionTier,
  options?: {
    status?: SubscriptionStatus;
    features?: string[];
    expiresAt?: Date;
    trialEndsAt?: Date;
    stripeSubscriptionId?: string;
    stripeCustomerId?: string;
  }
): Promise<void> {
  await prisma.user_subscriptions.upsert({
    where: {
      user_id_app_id: {
        user_id: userId,
        app_id: app,
      },
    },
    update: {
      tier,
      status: options?.status ?? 'ACTIVE',
      features: options?.features ?? [],
      expires_at: options?.expiresAt,
      trial_ends_at: options?.trialEndsAt,
      stripe_subscription_id: options?.stripeSubscriptionId,
      stripe_customer_id: options?.stripeCustomerId,
      updated_at: new Date(),
    },
    create: {
      user_id: userId,
      app_id: app,
      tier,
      status: options?.status ?? 'ACTIVE',
      features: options?.features ?? [],
      expires_at: options?.expiresAt,
      trial_ends_at: options?.trialEndsAt,
      stripe_subscription_id: options?.stripeSubscriptionId,
      stripe_customer_id: options?.stripeCustomerId,
    },
  });
}

/**
 * Add a feature flag to user's subscription
 */
export async function addUserFeature(
  userId: string,
  app: AppId,
  feature: string
): Promise<void> {
  const subscription = await prisma.user_subscriptions.findUnique({
    where: {
      user_id_app_id: {
        user_id: userId,
        app_id: app,
      },
    },
  });

  const currentFeatures = subscription?.features ?? [];

  if (!currentFeatures.includes(feature)) {
    await prisma.user_subscriptions.upsert({
      where: {
        user_id_app_id: {
          user_id: userId,
          app_id: app,
        },
      },
      update: {
        features: [...currentFeatures, feature],
        updated_at: new Date(),
      },
      create: {
        user_id: userId,
        app_id: app,
        tier: 'FREE',
        features: [feature],
      },
    });
  }
}

/**
 * Remove a feature flag from user's subscription
 */
export async function removeUserFeature(
  userId: string,
  app: AppId,
  feature: string
): Promise<void> {
  const subscription = await prisma.user_subscriptions.findUnique({
    where: {
      user_id_app_id: {
        user_id: userId,
        app_id: app,
      },
    },
  });

  if (subscription) {
    const updatedFeatures = subscription.features.filter((f) => f !== feature);

    await prisma.user_subscriptions.update({
      where: {
        user_id_app_id: {
          user_id: userId,
          app_id: app,
        },
      },
      data: {
        features: updatedFeatures,
        updated_at: new Date(),
      },
    });
  }
}

/**
 * Cancel user's subscription
 */
export async function cancelUserSubscription(
  userId: string,
  app: AppId
): Promise<void> {
  await prisma.user_subscriptions.update({
    where: {
      user_id_app_id: {
        user_id: userId,
        app_id: app,
      },
    },
    data: {
      status: 'CANCELLED',
      cancelled_at: new Date(),
      updated_at: new Date(),
    },
  });
}

// ============================================
// Require Permission (throws on failure)
// ============================================

/**
 * Require user to have minimum tier (throws if not)
 */
export async function requireTier(
  userId: string,
  app: AppId,
  minTier: SubscriptionTier
): Promise<void> {
  const hasAccess = await checkUserTier(userId, app, minTier);
  if (!hasAccess) {
    throw new Error(`Requires ${minTier} tier for ${app}`);
  }
}

/**
 * Require user to have feature access (throws if not)
 */
export async function requireFeature(
  userId: string,
  app: AppId,
  featureKey: string
): Promise<void> {
  const hasAccess = await checkUserFeatureAccess(userId, app, featureKey);
  if (!hasAccess) {
    throw new Error(`Requires access to feature: ${featureKey}`);
  }
}

/**
 * Require user to be admin (throws if not)
 */
export async function requireAdmin(userId: string): Promise<void> {
  const isAdmin = await checkUserIsAdmin(userId);
  if (!isAdmin) {
    throw new Error('Admin access required');
  }
}
