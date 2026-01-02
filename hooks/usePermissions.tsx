'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import {
  UserPermissions,
  AppId,
  SubscriptionTier,
  DEFAULT_PERMISSIONS,
  hasTier,
  hasFeature,
  hasFeatureAccess,
  isAdmin,
  isPremium,
  isCoach,
  getSubscription,
  getUpgradeInfo,
} from '@/lib/permissions';

// ============================================
// Context
// ============================================

interface PermissionsContextValue {
  permissions: UserPermissions | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;

  // Convenience methods
  isAdmin: () => boolean;
  hasTier: (app: AppId, minTier: SubscriptionTier) => boolean;
  hasFeature: (app: AppId, feature: string) => boolean;
  hasFeatureAccess: (app: AppId, featureKey: string) => boolean;
  isPremium: (app: AppId) => boolean;
  isCoach: (app?: AppId) => boolean;
  getSubscription: (app: AppId) => ReturnType<typeof getSubscription>;
  getUpgradeInfo: (app: AppId, featureKey: string) => ReturnType<typeof getUpgradeInfo>;
}

const PermissionsContext = createContext<PermissionsContextValue | null>(null);

// ============================================
// Provider
// ============================================

interface PermissionsProviderProps {
  children: ReactNode;
}

export function PermissionsProvider({ children }: PermissionsProviderProps) {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPermissions = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/permissions');

      if (response.status === 401) {
        // Not authenticated - use default permissions
        setPermissions(null);
        return;
      }

      if (!response.ok) {
        throw new Error('Failed to fetch permissions');
      }

      const data = await response.json();
      setPermissions(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setPermissions(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const value: PermissionsContextValue = {
    permissions,
    loading,
    error,
    refresh: fetchPermissions,

    // Convenience methods bound to current permissions
    isAdmin: () => isAdmin(permissions),
    hasTier: (app, minTier) => hasTier(permissions, app, minTier),
    hasFeature: (app, feature) => hasFeature(permissions, app, feature),
    hasFeatureAccess: (app, featureKey) => hasFeatureAccess(permissions, app, featureKey),
    isPremium: (app) => isPremium(permissions, app),
    isCoach: (app = 'fitness') => isCoach(permissions, app),
    getSubscription: (app) => getSubscription(permissions, app),
    getUpgradeInfo: (app, featureKey) => getUpgradeInfo(app, featureKey),
  };

  return (
    <PermissionsContext.Provider value={value}>
      {children}
    </PermissionsContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function usePermissions(): PermissionsContextValue {
  const context = useContext(PermissionsContext);

  if (!context) {
    throw new Error('usePermissions must be used within a PermissionsProvider');
  }

  return context;
}

// ============================================
// Standalone Hook (without context)
// ============================================

/**
 * Standalone hook that fetches permissions without requiring a provider.
 * Useful for components that need permissions but aren't wrapped in provider.
 */
export function usePermissionsStandalone() {
  const [permissions, setPermissions] = useState<UserPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPermissions() {
      try {
        setLoading(true);
        const response = await fetch('/api/permissions');

        if (response.status === 401) {
          setPermissions(null);
          return;
        }

        if (!response.ok) {
          throw new Error('Failed to fetch permissions');
        }

        const data = await response.json();
        setPermissions(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    }

    fetchPermissions();
  }, []);

  return {
    permissions,
    loading,
    error,
    isAdmin: () => isAdmin(permissions),
    hasTier: (app: AppId, minTier: SubscriptionTier) => hasTier(permissions, app, minTier),
    hasFeature: (app: AppId, feature: string) => hasFeature(permissions, app, feature),
    hasFeatureAccess: (app: AppId, featureKey: string) => hasFeatureAccess(permissions, app, featureKey),
    isPremium: (app: AppId) => isPremium(permissions, app),
    isCoach: (app: AppId = 'fitness') => isCoach(permissions, app),
  };
}

export default usePermissions;
