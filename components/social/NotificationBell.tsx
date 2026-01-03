'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import NotificationItem, { Notification } from './NotificationItem';

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasNewNotification, setHasNewNotification] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/activity?limit=10');
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Fetch on mount and set up Supabase Realtime subscription
  useEffect(() => {
    fetchNotifications();

    // Set up Supabase Realtime subscription
    const supabase = createClient();

    // Get current user ID for filtering
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;

      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'activity_feed',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            // New notification received
            setUnreadCount((prev) => prev + 1);
            setHasNewNotification(true);

            // If dropdown is open, fetch fresh data
            if (isOpen) {
              fetchNotifications();
            }

            // Clear the "new" animation after a bit
            setTimeout(() => setHasNewNotification(false), 2000);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    });

    // Also poll every 2 minutes as fallback
    const interval = setInterval(fetchNotifications, 120000);
    return () => clearInterval(interval);
  }, [fetchNotifications, isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/activity/${id}`, { method: 'POST' });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) {
            fetchNotifications();
          }
        }}
        className={`relative p-2 transition-colors ${
          hasNewNotification ? 'animate-bounce' : ''
        }`}
        style={{ color: 'var(--rpg-muted)' }}
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 w-5 h-5 rounded-full text-[10px] flex items-center justify-center font-medium ${
              hasNewNotification ? 'animate-pulse' : ''
            }`}
            style={{ background: 'var(--rpg-purple)', color: '#fff' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-80 max-h-[70vh] rounded-lg overflow-hidden z-50"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          {/* Header */}
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderBottom: '1px solid var(--rpg-border)' }}
          >
            <h3 className="text-sm font-medium" style={{ color: 'var(--rpg-text)' }}>
              Notifications
            </h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs transition-colors hover:opacity-80"
                style={{ color: 'var(--rpg-purple)' }}
              >
                Mark all read
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-96">
            {isLoading && notifications.length === 0 ? (
              <div className="flex justify-center py-8">
                <div
                  className="w-6 h-6 border-2 rounded-full animate-spin"
                  style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
                />
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-2xl mb-2">🔔</div>
                <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
                  No notifications yet
                </p>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {notifications.map((notification) => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    onMarkRead={handleMarkRead}
                    onClose={() => setIsOpen(false)}
                    onUpdate={fetchNotifications}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div
              className="px-4 py-2"
              style={{ borderTop: '1px solid var(--rpg-border)' }}
            >
              <a
                href="/activity"
                onClick={() => setIsOpen(false)}
                className="block text-xs transition-colors w-full text-center hover:opacity-80"
                style={{ color: 'var(--rpg-muted)' }}
              >
                View all notifications
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
