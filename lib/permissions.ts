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
    form_checks: {
      name: 'Form Check Reviews',
      minTier: 'COACH',
      description: 'Receive and review athlete form check videos',
    },
    live_monitoring: {
      name: 'Live Workout Monitoring',
      minTier: 'COACH',
      description: 'See athletes training in real-time',
    },
    group_coaching: {
      name: 'Group Coaching',
      minTier: 'COACH',
      description: 'Create groups and manage multiple athletes together',
    },
    messaging: {
      name: 'In-App Messaging',
      minTier: 'COACH',
      description: 'Direct messaging with athletes',
    },
    check_ins: {
      name: 'Weekly Check-ins',
      minTier: 'COACH',
      description: 'Structured wellness check-ins from athletes',
    },
    unlimited_athletes: {
      name: 'Unlimited Athletes',
      minTier: 'PRO',
      description: 'No limit on number of coached athletes',
    },
    unlimited_form_checks: {
      name: 'Unlimited Form Checks',
      minTier: 'PRO',
      description: 'No monthly limit on form check reviews',
    },
    branded_experience: {
      name: 'Branded Experience',
      minTier: 'PRO',
      description: 'Custom branding for client-facing features',
    },
    priority_support: {
      name: 'Priority Support',
      minTier: 'PRO',
      description: 'Faster response times and dedicated support',
    },
    api_access: {
      name: 'API Access',
      minTier: 'PRO',
      description: 'Programmatic access to coaching data',
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

// ============================================
// Coach Tier Limits
// ============================================

export interface CoachTierLimits {
  maxAthletes: number;          // Max active athletes (-1 = unlimited)
  formChecksPerMonth: number;   // Monthly form check reviews (-1 = unlimited)
  programsLimit: number;        // Max programs (-1 = unlimited)
  groupsLimit: number;          // Max coaching groups (-1 = unlimited)
  storageGB: number;            // Storage for videos/files (-1 = unlimited)
  hasMessaging: boolean;
  hasGroupCoaching: boolean;
  hasLiveMonitoring: boolean;
  hasCheckIns: boolean;
  hasBranding: boolean;
  hasPrioritySupport: boolean;
  hasApiAccess: boolean;
  priceMonthly: number;         // Price in cents (0 = free)
  priceYearly: number;          // Annual price in cents
}

export const COACH_TIER_LIMITS: Record<SubscriptionTier, CoachTierLimits> = {
  FREE: {
    maxAthletes: 3,
    formChecksPerMonth: 5,
    programsLimit: 2,
    groupsLimit: 0,
    storageGB: 0,
    hasMessaging: false,
    hasGroupCoaching: false,
    hasLiveMonitoring: false,
    hasCheckIns: false,
    hasBranding: false,
    hasPrioritySupport: false,
    hasApiAccess: false,
    priceMonthly: 0,
    priceYearly: 0,
  },
  PREMIUM: {
    // PREMIUM is for regular users, not coaches - same limits as FREE for coaching
    maxAthletes: 3,
    formChecksPerMonth: 5,
    programsLimit: 2,
    groupsLimit: 0,
    storageGB: 0,
    hasMessaging: false,
    hasGroupCoaching: false,
    hasLiveMonitoring: false,
    hasCheckIns: false,
    hasBranding: false,
    hasPrioritySupport: false,
    hasApiAccess: false,
    priceMonthly: 0,
    priceYearly: 0,
  },
  COACH: {
    maxAthletes: 15,
    formChecksPerMonth: 50,
    programsLimit: 20,
    groupsLimit: 5,
    storageGB: 10,
    hasMessaging: true,
    hasGroupCoaching: true,
    hasLiveMonitoring: true,
    hasCheckIns: true,
    hasBranding: false,
    hasPrioritySupport: false,
    hasApiAccess: false,
    priceMonthly: 2900,   // $29/month
    priceYearly: 29000,   // $290/year (save ~$58)
  },
  PRO: {
    maxAthletes: -1,      // Unlimited
    formChecksPerMonth: -1,
    programsLimit: -1,
    groupsLimit: -1,
    storageGB: 100,
    hasMessaging: true,
    hasGroupCoaching: true,
    hasLiveMonitoring: true,
    hasCheckIns: true,
    hasBranding: true,
    hasPrioritySupport: true,
    hasApiAccess: true,
    priceMonthly: 7900,   // $79/month
    priceYearly: 79000,   // $790/year (save ~$158)
  },
};

/**
 * Get coach tier limits for a subscription tier
 */
export function getCoachLimits(tier: SubscriptionTier): CoachTierLimits {
  return COACH_TIER_LIMITS[tier];
}

/**
 * Check if coach is within athlete limit
 */
export function isWithinAthleteLimit(tier: SubscriptionTier, currentAthletes: number): boolean {
  const limits = COACH_TIER_LIMITS[tier];
  if (limits.maxAthletes === -1) return true;
  return currentAthletes < limits.maxAthletes;
}

/**
 * Check if coach is within form check limit for the month
 */
export function isWithinFormCheckLimit(tier: SubscriptionTier, usedThisMonth: number): boolean {
  const limits = COACH_TIER_LIMITS[tier];
  if (limits.formChecksPerMonth === -1) return true;
  return usedThisMonth < limits.formChecksPerMonth;
}

/**
 * Get upgrade recommendation based on current usage
 */
export function getUpgradeRecommendation(
  currentTier: SubscriptionTier,
  usage: { athletes: number; formChecks: number; programs: number }
): { shouldUpgrade: boolean; reason: string; recommendedTier: SubscriptionTier } | null {
  const limits = COACH_TIER_LIMITS[currentTier];

  // Already at highest tier
  if (currentTier === 'PRO') return null;

  const nextTier = currentTier === 'FREE' || currentTier === 'PREMIUM' ? 'COACH' : 'PRO';

  if (limits.maxAthletes !== -1 && usage.athletes >= limits.maxAthletes * 0.8) {
    return {
      shouldUpgrade: true,
      reason: `You're at ${usage.athletes}/${limits.maxAthletes} athletes`,
      recommendedTier: nextTier,
    };
  }

  if (limits.formChecksPerMonth !== -1 && usage.formChecks >= limits.formChecksPerMonth * 0.8) {
    return {
      shouldUpgrade: true,
      reason: `You've used ${usage.formChecks}/${limits.formChecksPerMonth} form checks this month`,
      recommendedTier: nextTier,
    };
  }

  return null;
}
