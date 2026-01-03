'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';

interface FriendActivity {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  streak: number;
  xp: number;
  isActiveToday: boolean;
  isOnline: boolean;
  activityCount: number;
  lastActivity: string | null;
  activitySummary: string | null;
}

interface ActivityData {
  friends: FriendActivity[];
  totalActive: number;
  totalFriends: number;
}

export default function AccountabilityPartners() {
  const [data, setData] = useState<ActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/friends/activity');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch friend activity:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
    // Refresh every 5 minutes
    const interval = setInterval(fetchActivity, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return null; // Don't show loading state in sidebar
  }

  if (!data || data.totalFriends === 0) {
    return null; // Don't show if no friends
  }

  return (
    <div className="accountability-widget">
      <button
        className="accountability-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span className="accountability-icon">👥</span>
        <span className="accountability-title">Accountability</span>
        <span className="accountability-count">
          {data.totalActive}/{data.totalFriends} active
        </span>
        <span className={`accountability-chevron ${collapsed ? 'collapsed' : ''}`}>
          ▼
        </span>
      </button>

      {!collapsed && (
        <div className="accountability-list">
          {data.friends.slice(0, 5).map((friend) => (
            <Link
              key={friend.id}
              href={`/users/${friend.id}`}
              className="accountability-friend"
            >
              {/* Avatar with status indicator */}
              <div className="accountability-avatar-wrap">
                {friend.avatarUrl ? (
                  <Image
                    src={friend.avatarUrl}
                    alt=""
                    width={28}
                    height={28}
                    className="accountability-avatar"
                  />
                ) : (
                  <div className="accountability-avatar-placeholder">
                    {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                {friend.isOnline && <span className="accountability-online-dot" />}
              </div>

              {/* Info */}
              <div className="accountability-info">
                <span className="accountability-name">
                  {friend.displayName || friend.username}
                </span>
                <span className="accountability-meta">
                  {friend.isActiveToday ? (
                    <span className="accountability-active">
                      {friend.activitySummary || 'Active today'}
                    </span>
                  ) : (
                    <span className="accountability-idle">
                      🔥 {friend.streak} day streak
                    </span>
                  )}
                </span>
              </div>

              {/* Streak badge */}
              {friend.streak >= 7 && (
                <span className="accountability-streak-badge">
                  🔥{friend.streak}
                </span>
              )}
            </Link>
          ))}

          {data.friends.length > 5 && (
            <Link href="/friends" className="accountability-more">
              +{data.friends.length - 5} more friends
            </Link>
          )}

          {data.friends.length === 0 && (
            <div className="accountability-empty">
              No friends active yet today
            </div>
          )}
        </div>
      )}

      <style jsx>{`
        .accountability-widget {
          margin-bottom: 12px;
          background: var(--card);
          border: 2px solid var(--border);
          border-radius: 8px;
          overflow: hidden;
        }

        .accountability-header {
          display: flex;
          align-items: center;
          gap: 8px;
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          cursor: pointer;
          transition: background 0.15s;
        }

        .accountability-header:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .accountability-icon {
          font-size: 14px;
        }

        .accountability-title {
          flex: 1;
          text-align: left;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: var(--muted);
        }

        .accountability-count {
          font-size: 10px;
          color: var(--teal);
          background: rgba(95, 191, 138, 0.15);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .accountability-chevron {
          font-size: 8px;
          color: var(--muted);
          transition: transform 0.2s;
        }

        .accountability-chevron.collapsed {
          transform: rotate(-90deg);
        }

        .accountability-list {
          border-top: 1px solid var(--border);
        }

        .accountability-friend {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          text-decoration: none;
          transition: background 0.15s;
        }

        .accountability-friend:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .accountability-avatar-wrap {
          position: relative;
          flex-shrink: 0;
        }

        .accountability-avatar {
          width: 28px;
          height: 28px;
          border-radius: 50%;
        }

        .accountability-avatar-placeholder {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--teal) 0%, var(--teal-dark) 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--bg-dark);
        }

        .accountability-online-dot {
          position: absolute;
          bottom: 0;
          right: 0;
          width: 8px;
          height: 8px;
          background: #22c55e;
          border: 2px solid var(--card);
          border-radius: 50%;
        }

        .accountability-info {
          flex: 1;
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 2px;
        }

        .accountability-name {
          font-size: 12px;
          font-weight: 500;
          color: var(--text);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .accountability-meta {
          font-size: 10px;
        }

        .accountability-active {
          color: var(--teal);
        }

        .accountability-idle {
          color: var(--muted);
        }

        .accountability-streak-badge {
          flex-shrink: 0;
          font-size: 10px;
          background: rgba(255, 100, 50, 0.2);
          color: #ff6432;
          padding: 2px 6px;
          border-radius: 4px;
        }

        .accountability-more {
          display: block;
          padding: 8px 12px;
          text-align: center;
          font-size: 11px;
          color: var(--muted);
          text-decoration: none;
          border-top: 1px solid var(--border);
          transition: all 0.15s;
        }

        .accountability-more:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--text);
        }

        .accountability-empty {
          padding: 16px 12px;
          text-align: center;
          font-size: 11px;
          color: var(--muted);
        }
      `}</style>
    </div>
  );
}
