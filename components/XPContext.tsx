'use client';

import { createContext, useContext, useState, useEffect, useCallback, useRef, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dispatchLevelUp } from './LevelUpPopup';
import { dispatchXPGain } from './XPToast';

export interface XPState {
  level: number;
  xp: number;
  xpInCurrentLevel: number;
  xpToNextLevel: number;
}

interface XPContextValue {
  xp: XPState | null;
  isLoading: boolean;
  error: string | null;
  refetchXP: () => Promise<void>;
}

const XPContext = createContext<XPContextValue | null>(null);

// Custom event for XP updates from apps
export const XP_UPDATED_EVENT = 'xp-updated';

export function dispatchXPUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(XP_UPDATED_EVENT));
  }
}

export function XPProvider({ children }: { children: ReactNode }) {
  const [xp, setXP] = useState<XPState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const previousLevelRef = useRef<number | null>(null);
  const previousXPRef = useRef<number | null>(null);
  const isInitialLoadRef = useRef(true);

  const fetchXP = useCallback(async () => {
    try {
      setError(null);

      const res = await fetch('/api/profile');
      if (!res.ok) {
        if (res.status === 401) {
          // Not authenticated - clear XP
          setXP(null);
          setIsLoading(false);
          return;
        }
        throw new Error('Failed to fetch profile');
      }

      const data = await res.json();
      if (data?.character) {
        const newLevel = data.character.level;
        const newTotalXP = data.character.xp;
        const previousLevel = previousLevelRef.current;
        const previousXP = previousXPRef.current;

        // Only show notifications after initial load
        if (!isInitialLoadRef.current) {
          // Check for XP gain
          if (previousXP !== null && newTotalXP > previousXP) {
            const xpGained = newTotalXP - previousXP;
            // Dispatch XP gain toast
            dispatchXPGain(xpGained);
          }

          // Check for level up
          if (previousLevel !== null && newLevel > previousLevel) {
            // Trigger level-up celebration!
            dispatchLevelUp(newLevel, previousLevel);
          }
        }

        // Update the refs
        previousLevelRef.current = newLevel;
        previousXPRef.current = newTotalXP;
        isInitialLoadRef.current = false;

        setXP({
          level: newLevel,
          xp: newTotalXP,
          xpInCurrentLevel: data.character.xpInCurrentLevel,
          xpToNextLevel: data.character.xpToNextLevel,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('XP fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sync XP from local app data to unified profile (runs silently)
  const syncXP = useCallback(async () => {
    try {
      const res = await fetch('/api/profile/sync-xp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: false }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.results?.totalDiff > 0) {
          console.log(`XP synced: +${data.results.totalDiff} XP`);
          // Refetch to get updated values
          await fetchXP();
        }
      }
    } catch (err) {
      // Silent fail - sync is best-effort
      console.error('XP sync error:', err);
    }
  }, [fetchXP]);

  // Initialize auth listener and fetch XP when authenticated
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchXP().then(() => {
          // Auto-sync after initial fetch
          syncXP();
        });
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        fetchXP().then(() => {
          // Auto-sync on sign in
          syncXP();
        });
      } else if (event === 'SIGNED_OUT') {
        setXP(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchXP, syncXP]);

  // Listen for XP update events from apps
  useEffect(() => {
    const handleXPUpdate = () => {
      fetchXP();
    };

    window.addEventListener(XP_UPDATED_EVENT, handleXPUpdate);
    return () => window.removeEventListener(XP_UPDATED_EVENT, handleXPUpdate);
  }, [fetchXP]);

  return (
    <XPContext.Provider value={{ xp, isLoading, error, refetchXP: fetchXP }}>
      {children}
    </XPContext.Provider>
  );
}

export function useXP() {
  const context = useContext(XPContext);
  if (!context) {
    throw new Error('useXP must be used within XPProvider');
  }
  return context;
}
