'use client';

import { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from 'react';

// Notification types and priorities
export type NotificationType = 'xp' | 'loot' | 'achievement' | 'level-up';

export interface XPNotificationData {
  amount: number;
  reason?: string;
  multiplier?: number;
  streakBonus?: boolean;
  app?: 'fitness' | 'travel' | 'today' | 'life' | 'global';
}

export interface LootNotificationData {
  itemName: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  icon?: string;
  instantXP?: number;
}

export interface AchievementNotificationData {
  name: string;
  description: string;
  icon?: string;
  tier: 1 | 2 | 3 | 4;
  xpReward: number;
}

export interface LevelUpNotificationData {
  newLevel: number;
  previousLevel: number;
}

export interface NotificationItem {
  id: string;
  type: NotificationType;
  priority: 1 | 2 | 3 | 4; // 1 = highest (level-up), 4 = lowest (XP)
  data: XPNotificationData | LootNotificationData | AchievementNotificationData | LevelUpNotificationData;
  timestamp: number;
  batchKey?: string;
}

interface BatchedXPNotification {
  totalAmount: number;
  items: XPNotificationData[];
  highestMultiplier: number;
  hasStreakBonus: boolean;
  reasons: string[];
  app?: string;
}

interface NotificationContextValue {
  // Queue XP notification (will be batched)
  queueXPNotification: (data: XPNotificationData) => void;
  // Show notification immediately (for level-ups, achievements)
  showImmediateNotification: (type: NotificationType, data: any) => void;
  // Flush pending XP notifications (call when activity completes)
  flushXPNotifications: (app?: string) => void;
  // Current batched XP (for display)
  pendingXP: Map<string, BatchedXPNotification>;
  // Visible notifications
  visibleNotifications: NotificationItem[];
  // Clear a notification
  clearNotification: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextValue | null>(null);

// Event names for global dispatch
export const NOTIFICATION_EVENTS = {
  XP_QUEUED: 'notification-xp-queued',
  XP_FLUSH: 'notification-xp-flush',
  SHOW_IMMEDIATE: 'notification-show-immediate',
};

// Dispatch functions for use outside React context
export function dispatchXPQueued(data: XPNotificationData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENTS.XP_QUEUED, { detail: data }));
  }
}

export function dispatchXPFlush(app?: string) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENTS.XP_FLUSH, { detail: { app } }));
  }
}

export function dispatchImmediateNotification(type: NotificationType, data: any) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(NOTIFICATION_EVENTS.SHOW_IMMEDIATE, { detail: { type, data } }));
  }
}

// Priority mapping
const PRIORITY_MAP: Record<NotificationType, 1 | 2 | 3 | 4> = {
  'level-up': 1,
  'achievement': 2,
  'loot': 3,
  'xp': 4,
};

// Batch window in milliseconds
const BATCH_WINDOW_MS = 2000;
// Max visible notifications
const MAX_VISIBLE = 3;

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [pendingXP, setPendingXP] = useState<Map<string, BatchedXPNotification>>(new Map());
  const [visibleNotifications, setVisibleNotifications] = useState<NotificationItem[]>([]);
  const [nextId, setNextId] = useState(0);
  const batchTimersRef = useRef<Map<string, NodeJS.Timeout>>(new Map());

  // Generate unique ID
  const generateId = useCallback(() => {
    setNextId(prev => prev + 1);
    return `notification-${Date.now()}-${nextId}`;
  }, [nextId]);

  // Queue XP notification for batching
  const queueXPNotification = useCallback((data: XPNotificationData) => {
    const batchKey = data.app || 'global';

    setPendingXP(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(batchKey);

      if (existing) {
        // Add to existing batch
        newMap.set(batchKey, {
          totalAmount: existing.totalAmount + data.amount,
          items: [...existing.items, data],
          highestMultiplier: Math.max(existing.highestMultiplier, data.multiplier || 1),
          hasStreakBonus: existing.hasStreakBonus || !!data.streakBonus,
          reasons: data.reason && !existing.reasons.includes(data.reason)
            ? [...existing.reasons, data.reason]
            : existing.reasons,
          app: batchKey,
        });
      } else {
        // Create new batch
        newMap.set(batchKey, {
          totalAmount: data.amount,
          items: [data],
          highestMultiplier: data.multiplier || 1,
          hasStreakBonus: !!data.streakBonus,
          reasons: data.reason ? [data.reason] : [],
          app: batchKey,
        });
      }

      return newMap;
    });

    // Reset/set batch timer
    const existingTimer = batchTimersRef.current.get(batchKey);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    // Auto-flush after batch window
    const timer = setTimeout(() => {
      flushXPNotifications(batchKey);
    }, BATCH_WINDOW_MS);

    batchTimersRef.current.set(batchKey, timer);
  }, []);

  // Flush pending XP notifications and show toast
  const flushXPNotifications = useCallback((app?: string) => {
    const batchKey = app || 'global';

    setPendingXP(prev => {
      const batch = prev.get(batchKey);
      if (!batch || batch.totalAmount === 0) {
        return prev;
      }

      // Create consolidated notification
      const notification: NotificationItem = {
        id: generateId(),
        type: 'xp',
        priority: PRIORITY_MAP.xp,
        data: {
          amount: batch.totalAmount,
          reason: batch.items.length > 1
            ? `${batch.items.length} actions`
            : batch.reasons[0],
          multiplier: batch.highestMultiplier > 1 ? batch.highestMultiplier : undefined,
          streakBonus: batch.hasStreakBonus,
          app: batch.app,
        } as XPNotificationData,
        timestamp: Date.now(),
        batchKey,
      };

      // Add to visible notifications (respecting max)
      setVisibleNotifications(current => {
        const updated = [...current, notification];
        // Sort by priority, then timestamp
        updated.sort((a, b) => {
          if (a.priority !== b.priority) return a.priority - b.priority;
          return a.timestamp - b.timestamp;
        });
        // Limit to MAX_VISIBLE
        return updated.slice(0, MAX_VISIBLE);
      });

      // Clear the batch
      const newMap = new Map(prev);
      newMap.delete(batchKey);
      return newMap;
    });

    // Clear timer
    const timer = batchTimersRef.current.get(batchKey);
    if (timer) {
      clearTimeout(timer);
      batchTimersRef.current.delete(batchKey);
    }
  }, [generateId]);

  // Show immediate notification (level-up, achievement, loot)
  const showImmediateNotification = useCallback((type: NotificationType, data: any) => {
    const notification: NotificationItem = {
      id: generateId(),
      type,
      priority: PRIORITY_MAP[type],
      data,
      timestamp: Date.now(),
    };

    setVisibleNotifications(current => {
      const updated = [...current, notification];
      updated.sort((a, b) => {
        if (a.priority !== b.priority) return a.priority - b.priority;
        return a.timestamp - b.timestamp;
      });
      return updated.slice(0, MAX_VISIBLE);
    });
  }, [generateId]);

  // Clear a notification
  const clearNotification = useCallback((id: string) => {
    setVisibleNotifications(current => current.filter(n => n.id !== id));
  }, []);

  // Listen for global events
  useEffect(() => {
    const handleXPQueued = (e: CustomEvent<XPNotificationData>) => {
      queueXPNotification(e.detail);
    };

    const handleXPFlush = (e: CustomEvent<{ app?: string }>) => {
      flushXPNotifications(e.detail.app);
    };

    const handleImmediate = (e: CustomEvent<{ type: NotificationType; data: any }>) => {
      showImmediateNotification(e.detail.type, e.detail.data);
    };

    window.addEventListener(NOTIFICATION_EVENTS.XP_QUEUED, handleXPQueued as EventListener);
    window.addEventListener(NOTIFICATION_EVENTS.XP_FLUSH, handleXPFlush as EventListener);
    window.addEventListener(NOTIFICATION_EVENTS.SHOW_IMMEDIATE, handleImmediate as EventListener);

    return () => {
      window.removeEventListener(NOTIFICATION_EVENTS.XP_QUEUED, handleXPQueued as EventListener);
      window.removeEventListener(NOTIFICATION_EVENTS.XP_FLUSH, handleXPFlush as EventListener);
      window.removeEventListener(NOTIFICATION_EVENTS.SHOW_IMMEDIATE, handleImmediate as EventListener);
    };
  }, [queueXPNotification, flushXPNotifications, showImmediateNotification]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      batchTimersRef.current.forEach(timer => clearTimeout(timer));
    };
  }, []);

  return (
    <NotificationContext.Provider
      value={{
        queueXPNotification,
        showImmediateNotification,
        flushXPNotifications,
        pendingXP,
        visibleNotifications,
        clearNotification,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider');
  }
  return context;
}

// Hook for getting pending XP for a specific app (for inline display)
export function usePendingXP(app: string) {
  const { pendingXP } = useNotifications();
  return pendingXP.get(app);
}
