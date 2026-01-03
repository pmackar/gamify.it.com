'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { RetroNavBar } from '@/components/RetroNavBar';
import { formatDistanceToNow } from 'date-fns';
import { ArrowLeft, Bell, CheckCheck, Loader2 } from 'lucide-react';

interface Actor {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface Activity {
  id: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  actor: Actor | null;
  kudosCount: number;
  hasGivenKudos: boolean;
}

interface ActivityResponse {
  data: Activity[];
  nextCursor: string | null;
  unreadCount: number;
}

const typeConfig: Record<string, { icon: string; getMessage: (a: Activity) => string; getLink: (a: Activity) => string | null }> = {
  FRIEND_REQUEST_RECEIVED: {
    icon: '👋',
    getMessage: (a) => `${a.actor?.displayName || a.actor?.username || 'Someone'} sent you a friend request`,
    getLink: () => '/friends?tab=requests',
  },
  FRIEND_REQUEST_ACCEPTED: {
    icon: '🤝',
    getMessage: (a) => `${a.actor?.displayName || a.actor?.username || 'Someone'} accepted your friend request`,
    getLink: (a) => a.actor?.id ? `/users/${a.actor.id}` : null,
  },
  PARTY_INVITE_RECEIVED: {
    icon: '🎉',
    getMessage: (a) => {
      const questName = (a.metadata?.questName as string) || 'a quest';
      return `${a.actor?.displayName || a.actor?.username || 'Someone'} invited you to join "${questName}"`;
    },
    getLink: (a) => {
      const questId = a.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
  },
  PARTY_MEMBER_JOINED: {
    icon: '✨',
    getMessage: (a) => {
      const questName = (a.metadata?.questName as string) || 'the quest';
      return `${a.actor?.displayName || a.actor?.username || 'Someone'} joined "${questName}"`;
    },
    getLink: (a) => {
      const questId = a.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
  },
  QUEST_ITEM_COMPLETED: {
    icon: '✅',
    getMessage: (a) => {
      const questName = (a.metadata?.questName as string) || 'a quest';
      const itemName = (a.metadata?.itemName as string) || 'an item';
      return `${a.actor?.displayName || a.actor?.username || 'Someone'} completed "${itemName}" in "${questName}"`;
    },
    getLink: (a) => {
      const questId = a.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
  },
  QUEST_COMPLETED: {
    icon: '🏆',
    getMessage: (a) => {
      const questName = (a.metadata?.questName as string) || 'a quest';
      const xp = a.metadata?.xpAwarded as number;
      return `"${questName}" has been completed!${xp ? ` +${xp} XP` : ''}`;
    },
    getLink: (a) => {
      const questId = a.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
  },
};

const defaultConfig = {
  icon: '🔔',
  getMessage: () => 'You have a new notification',
  getLink: () => null,
};

export default function ActivityPage() {
  const router = useRouter();
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const fetchActivities = useCallback(async (cursor?: string, reset?: boolean) => {
    if (reset) {
      setLoading(true);
    } else if (cursor) {
      setLoadingMore(true);
    }

    try {
      const params = new URLSearchParams();
      params.set('limit', '20');
      if (cursor) params.set('cursor', cursor);
      if (filter === 'unread') params.set('unread', 'true');

      const res = await fetch(`/api/activity?${params}`);
      if (res.ok) {
        const data: ActivityResponse = await res.json();
        if (reset || !cursor) {
          setActivities(data.data);
        } else {
          setActivities((prev) => [...prev, ...data.data]);
        }
        setNextCursor(data.nextCursor);
        setUnreadCount(data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to fetch activities:', err);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [filter]);

  useEffect(() => {
    fetchActivities(undefined, true);
  }, [fetchActivities]);

  const handleMarkAllRead = async () => {
    try {
      await fetch('/api/activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'read-all' }),
      });
      setActivities((prev) => prev.map((a) => ({ ...a, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all read:', err);
    }
  };

  const handleMarkRead = async (id: string) => {
    try {
      await fetch(`/api/activity/${id}`, { method: 'POST' });
      setActivities((prev) =>
        prev.map((a) => (a.id === id ? { ...a, read: true } : a))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error('Failed to mark read:', err);
    }
  };

  const handleKudos = async (activityId: string, hasGiven: boolean) => {
    try {
      if (hasGiven) {
        const res = await fetch(`/api/activity/${activityId}/kudos`, { method: 'DELETE' });
        if (res.ok) {
          const data = await res.json();
          setActivities((prev) =>
            prev.map((a) =>
              a.id === activityId
                ? { ...a, kudosCount: data.count, hasGivenKudos: false }
                : a
            )
          );
        }
      } else {
        const res = await fetch(`/api/activity/${activityId}/kudos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji: '🔥' }),
        });
        if (res.ok) {
          const data = await res.json();
          setActivities((prev) =>
            prev.map((a) =>
              a.id === activityId
                ? { ...a, kudosCount: data.count, hasGivenKudos: true }
                : a
            )
          );
        }
      }
    } catch (err) {
      console.error('Failed to toggle kudos:', err);
    }
  };

  const getConfig = (type: string) => typeConfig[type] || defaultConfig;
  const showKudos = (type: string) =>
    ['QUEST_ITEM_COMPLETED', 'QUEST_COMPLETED', 'PARTY_MEMBER_JOINED'].includes(type);

  return (
    <>
      <RetroNavBar />
      <div className="min-h-screen pb-8" style={{ background: 'var(--rpg-bg-dark)', paddingTop: 'var(--content-top)' }}>
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="p-2 rounded-lg transition-colors hover:opacity-80"
                style={{ color: 'var(--rpg-muted)' }}
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h1 className="text-xl font-bold flex items-center gap-2" style={{ color: 'var(--rpg-text)' }}>
                  <Bell className="w-5 h-5" style={{ color: 'var(--rpg-purple)' }} />
                  Activity
                </h1>
                {unreadCount > 0 && (
                  <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                    {unreadCount} unread
                  </p>
                )}
              </div>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={{
                  background: 'rgba(168, 85, 247, 0.2)',
                  color: 'var(--rpg-purple)',
                  border: '1px solid var(--rpg-purple)',
                }}
              >
                <CheckCheck className="w-4 h-4" />
                Mark all read
              </button>
            )}
          </div>

          {/* Filter Tabs */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setFilter('all')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: filter === 'all' ? 'var(--rpg-purple)' : 'rgba(0, 0, 0, 0.3)',
                color: filter === 'all' ? '#fff' : 'var(--rpg-muted)',
                border: `1px solid ${filter === 'all' ? 'var(--rpg-purple)' : 'var(--rpg-border)'}`,
              }}
            >
              All
            </button>
            <button
              onClick={() => setFilter('unread')}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{
                background: filter === 'unread' ? 'var(--rpg-purple)' : 'rgba(0, 0, 0, 0.3)',
                color: filter === 'unread' ? '#fff' : 'var(--rpg-muted)',
                border: `1px solid ${filter === 'unread' ? 'var(--rpg-purple)' : 'var(--rpg-border)'}`,
              }}
            >
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex justify-center py-12">
              <div
                className="w-8 h-8 border-2 rounded-full animate-spin"
                style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
              />
            </div>
          )}

          {/* Empty State */}
          {!loading && activities.length === 0 && (
            <div
              className="rounded-lg p-12 text-center"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <div className="text-4xl mb-4">🔔</div>
              <p className="text-lg mb-2" style={{ color: 'var(--rpg-text)' }}>
                {filter === 'unread' ? 'All caught up!' : 'No activity yet'}
              </p>
              <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
                {filter === 'unread'
                  ? 'You have no unread notifications'
                  : 'Connect with friends to see activity here'}
              </p>
            </div>
          )}

          {/* Activity List */}
          {!loading && activities.length > 0 && (
            <div
              className="rounded-lg overflow-hidden"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              {activities.map((activity, index) => {
                const config = getConfig(activity.type);
                const link = config.getLink(activity);

                const content = (
                  <div
                    className={`flex items-start gap-3 p-4 transition-colors ${
                      !activity.read ? 'cursor-pointer' : ''
                    }`}
                    style={{
                      borderBottom: index < activities.length - 1 ? '1px solid var(--rpg-border)' : 'none',
                      background: activity.read ? 'transparent' : 'rgba(168, 85, 247, 0.05)',
                    }}
                    onClick={() => {
                      if (!activity.read) handleMarkRead(activity.id);
                    }}
                  >
                    {/* Avatar */}
                    <div className="flex-shrink-0">
                      {activity.actor?.avatarUrl ? (
                        <Image
                          src={activity.actor.avatarUrl}
                          alt=""
                          width={44}
                          height={44}
                          className="rounded-full"
                        />
                      ) : (
                        <div
                          className="w-11 h-11 rounded-full flex items-center justify-center text-xl"
                          style={{ background: 'var(--rpg-border)' }}
                        >
                          {config.icon}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm"
                        style={{ color: activity.read ? 'var(--rpg-muted)' : 'var(--rpg-text)' }}
                      >
                        {config.getMessage(activity)}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                          {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                        </p>

                        {/* Kudos */}
                        {showKudos(activity.type) && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              e.preventDefault();
                              handleKudos(activity.id, activity.hasGivenKudos);
                            }}
                            className="flex items-center gap-1 text-xs transition-all"
                            style={{ color: activity.hasGivenKudos ? '#ff6432' : 'var(--rpg-muted)' }}
                          >
                            <span className={activity.hasGivenKudos ? 'scale-110' : ''}>🔥</span>
                            {activity.kudosCount > 0 && <span>{activity.kudosCount}</span>}
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Unread Indicator */}
                    {!activity.read && (
                      <div
                        className="w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5"
                        style={{ background: 'var(--rpg-purple)' }}
                      />
                    )}
                  </div>
                );

                if (link) {
                  return (
                    <Link key={activity.id} href={link} className="block hover:opacity-90">
                      {content}
                    </Link>
                  );
                }

                return <div key={activity.id}>{content}</div>;
              })}
            </div>
          )}

          {/* Load More */}
          {nextCursor && !loading && (
            <div className="mt-6 text-center">
              <button
                onClick={() => fetchActivities(nextCursor)}
                disabled={loadingMore}
                className="px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                style={{
                  background: 'var(--rpg-border)',
                  color: 'var(--rpg-text)',
                }}
              >
                {loadingMore ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading...
                  </span>
                ) : (
                  'Load More'
                )}
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
