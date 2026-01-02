/**
 * Permission System for gamify.it.com
 *
 * Supports:
 * - Global roles (user, admin)
 * - Per-app subscription tiers (free, premium, coach, pro)
 * - Feature flags for granular control
 * - Stripe integration ready
 */

// ============================================
// Type Definitions
// ============================================

export type GlobalRole = 'USER' | 'ADMIN';
export type SubscriptionTier = 'FREE' | 'PREMIUM' | 'COACH' | 'PRO';
export type SubscriptionStatus = 'ACTIVE' | 'TRIAL' | 'CANCELLED' | 'EXPIRED' | 'PAUSED';
export type AppId = 'fitness' | 'today' | 'travel' | 'global';

export interface AppSubscription {
  tier: SubscriptionTier;
  status: SubscriptionStatus;
  features: string[];
  expiresAt: Date | null;
  trialEndsAt: Date | null;
}

export interface UserPermissions {
  userId: string;
  role: GlobalRole;
  subscriptions: Partial<Record<AppId, AppSubscription>>;
}

// Default permissions for new/unauthenticated users
export const DEFAULT_PERMISSIONS: Omit<UserPermissions, 'userId'> = {
  role: 'USER',
  subscriptions: {},
};

// Default subscription for an app
export const DEFAULT_SUBSCRIPTION: AppSubscription = {
  tier: 'FREE',
  status: 'ACTIVE',
  features: [],
  expiresAt: null,
  trialEndsAt: null,
};

// ============================================
// Tier Hierarchy
// ============================================

// Higher number = more access
const TIER_LEVELS: Record<SubscriptionTier, number> = {
  FREE: 0,
  PREMIUM: 1,
  COACH: 2,
  PRO: 3,
};

// ============================================
// Permission Check Functions
// ============================================

/**
 * Check if user has admin role
 */
export function isAdmin(permissions: UserPermissions | null): boolean {
  return permissions?.role === 'ADMIN';
}

/**
 * Get subscription for a specific app (returns default FREE if none)
 */
export function getSubscription(
  permissions: UserPermissions | null,
  app: AppId
): AppSubscription {
  if (!permissions) return DEFAULT_SUBSCRIPTION;
  return permissions.subscriptions[app] ?? DEFAULT_SUBSCRIPTION;
}

/**
 * Check if subscription is currently active (not expired/cancelled)
 */
export function isSubscriptionActive(subscription: AppSubscription): boolean {
  // Check status
  if (subscription.status === 'EXPIRED' || subscription.status === 'CANCELLED') {
    return false;
  }

  // Check expiration date
  if (subscription.expiresAt && new Date(subscription.expiresAt) < new Date()) {
    return false;
  }

  // Check trial expiration
  if (
    subscription.status === 'TRIAL' &&
    subscription.trialEndsAt &&
    new Date(subscription.trialEndsAt) < new Date()
  ) {
    return false;
  }

  return true;
}

/**
 * Check if user has at least the minimum tier for an app
 */
export function hasTier(
  permissions: UserPermissions | null,
  app: AppId,
  minTier: SubscriptionTier
): boolean {
  // Admins have access to everything
  if (isAdmin(permissions)) return true;

  const subscription = getSubscription(permissions, app);

  // Must be active subscription
  if (!isSubscriptionActive(subscription)) {
    return TIER_LEVELS.FREE >= TIER_LEVELS[minTier];
  }

  return TIER_LEVELS[subscription.tier] >= TIER_LEVELS[minTier];
}

/**
 * Check if user has a specific feature flag enabled
 */
export function hasFeature(
  permissions: UserPermissions | null,
  app: AppId,
  feature: string
): boolean {
  // Admins have all features
  if (isAdmin(permissions)) return true;

  const subscription = getSubscription(permissions, app);

  // Must be active subscription
  if (!isSubscriptionActive(subscription)) return false;

  return subscription.features.includes(feature);
}

/**
 * Check if user can access premium features (tier >= PREMIUM)
 */
export function isPremium(
  permissions: UserPermissions | null,
  app: AppId
): boolean {
  return hasTier(permissions, app, 'PREMIUM');
}

/**
 * Check if user is a coach (tier >= COACH)
 */
export function isCoach(
  permissions: UserPermissions | null,
  app: AppId = 'fitness'
): boolean {
  return hasTier(permissions, app, 'COACH');
}

/**
 * Check if user has pro tier (tier >= PRO)
 */
export function isPro(
  permissions: UserPermissions | null,
  app: AppId
): boolean {
  return hasTier(permissions, app, 'PRO');
}

// ============================================
// Feature Definitions
// ============================================

// Define features and their required tiers per app
export const APP_FEATURES: Record<AppId, Record<string, { name: string; minTier: SubscriptionTier; description: string }>> = {
  fitness: {
    unlimited_templates: {
      name: 'Unlimited Templates',
      minTier: 'PREMIUM',
      description: 'Create unlimited workout templates',
    },
    advanced_analytics: {
      name: 'Advanced Analytics',
      minTier: 'PREMIUM',
      description: 'Detailed progress charts and insights',
    },
    export_data: {
      name: 'Export Data',
      minTier: 'PREMIUM',
      description: 'Export workout history to CSV/PDF',
    },
    client_management: {
      name: 'Client Management',
      minTier: 'COACH',
      description: 'Manage and track athlete progress',
    },
    program_creation: {
      name: 'Program Creation',
      minTier: 'COACH',
      description: 'Create and assign training programs',
    },
    branded_experience: {
      name: 'Branded Experience',
      minTier: 'COACH',
      description: 'Custom branding for client-facing features',
    },
  },
  today: {
    unlimited_projects: {
      name: 'Unlimited Projects',
      minTier: 'PREMIUM',
      description: 'Create unlimited projects and categories',
    },
    recurring_tasks: {
      name: 'Recurring Tasks',
      minTier: 'PREMIUM',
      description: 'Set up automatically repeating tasks',
    },
    integrations: {
      name: 'Integrations',
      minTier: 'PREMIUM',
      description: 'Connect with calendar and other apps',
    },
  },
  travel: {
    trip_planning: {
      name: 'Trip Planning',
      minTier: 'PREMIUM',
      description: 'Advanced trip planning tools',
    },
    recommendations: {
      name: 'Recommendations',
      minTier: 'PREMIUM',
      description: 'AI-powered location recommendations',
    },
    export_data: {
      name: 'Export Data',
      minTier: 'PREMIUM',
      description: 'Export travel history and maps',
    },
  },
  global: {
    early_access: {
      name: 'Early Access',
      minTier: 'PREMIUM',
      description: 'Access to beta features across all apps',
    },
    priority_support: {
      name: 'Priority Support',
      minTier: 'PREMIUM',
      description: 'Faster response times for support requests',
    },
  },
};

/**
 * Check if user has access to a defined feature (by feature definition)
 */
export function hasFeatureAccess(
  permissions: UserPermissions | null,
  app: AppId,
  featureKey: string
): boolean {
  // Admins have all features
  if (isAdmin(permissions)) return true;

  // Check explicit feature flag first
  if (hasFeature(permissions, app, featureKey)) return true;

  // Check tier-based access
  const featureDef = APP_FEATURES[app]?.[featureKey];
  if (!featureDef) return false;

  return hasTier(permissions, app, featureDef.minTier);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Get the display name for a tier
 */
export function getTierDisplayName(tier: SubscriptionTier): string {
  const names: Record<SubscriptionTier, string> = {
    FREE: 'Free',
    PREMIUM: 'Premium',
    COACH: 'Coach',
    PRO: 'Pro',
  };
  return names[tier];
}

/**
 * Get all features available for a tier in an app
 */
export function getFeaturesForTier(app: AppId, tier: SubscriptionTier): string[] {
  const features = APP_FEATURES[app];
  if (!features) return [];

  return Object.entries(features)
    .filter(([, def]) => TIER_LEVELS[def.minTier] <= TIER_LEVELS[tier])
    .map(([key]) => key);
}

/**
 * Get upgrade prompt info for a feature
 */
export function getUpgradeInfo(
  app: AppId,
  featureKey: string
): { requiredTier: SubscriptionTier; name: string; description: string } | null {
  const featureDef = APP_FEATURES[app]?.[featureKey];
  if (!featureDef) return null;

  return {
    requiredTier: featureDef.minTier,
    name: featureDef.name,
    description: featureDef.description,
  };
}
