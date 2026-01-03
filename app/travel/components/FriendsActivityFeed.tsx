'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MapPin, Heart, Star, Users } from 'lucide-react';

interface Activity {
  id: string;
  type: 'visited' | 'hotlisted';
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  };
  location: {
    id: string;
    name: string;
    type: string;
    city: {
      id: string;
      name: string;
      country: string;
    } | null;
  };
  rating: number | null;
  timestamp: string;
}

export default function FriendsActivityFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/travel/friends-activity?limit=10');
        if (res.ok) {
          const data = await res.json();
          setActivities(data.activities);
        }
      } catch (err) {
        console.error('Failed to fetch friends activity:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchActivity();
  }, []);

  if (loading) {
    return (
      <div
        className="rounded-lg p-6"
        style={{
          background: 'var(--rpg-card)',
          border: '2px solid var(--rpg-border)',
          boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex justify-center py-8">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
          />
        </div>
      </div>
    );
  }

  if (activities.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg overflow-hidden"
      style={{
        background: 'var(--rpg-card)',
        border: '2px solid var(--rpg-border)',
        boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--rpg-border)' }}
      >
        <Users className="w-4 h-4" style={{ color: 'var(--rpg-teal)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
          Friends&apos; Recent Activity
        </h3>
      </div>

      {/* Activity List */}
      <div className="divide-y" style={{ borderColor: 'var(--rpg-border)' }}>
        {activities.map((activity) => (
          <div
            key={activity.id}
            className="p-4 flex items-start gap-3"
          >
            {/* User Avatar */}
            <Link href={`/users/${activity.user.id}`} className="flex-shrink-0">
              {activity.user.avatarUrl ? (
                <Image
                  src={activity.user.avatarUrl}
                  alt=""
                  width={40}
                  height={40}
                  className="rounded-full"
                />
              ) : (
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-teal-dark) 100%)',
                    color: 'var(--rpg-bg-dark)',
                  }}
                >
                  {(activity.user.displayName || activity.user.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </Link>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className="text-sm" style={{ color: 'var(--rpg-text)' }}>
                <Link
                  href={`/users/${activity.user.id}`}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--rpg-text)' }}
                >
                  {activity.user.displayName || activity.user.username}
                </Link>
                {' '}
                {activity.type === 'visited' ? (
                  <span style={{ color: 'var(--rpg-muted)' }}>visited</span>
                ) : (
                  <span style={{ color: 'var(--rpg-muted)' }}>wants to visit</span>
                )}
                {' '}
                <Link
                  href={`/travel/locations/${activity.location.id}`}
                  className="font-medium hover:underline"
                  style={{ color: 'var(--rpg-teal)' }}
                >
                  {activity.location.name}
                </Link>
              </p>

              {/* Location Details */}
              <div className="flex items-center gap-2 mt-1">
                {activity.type === 'visited' ? (
                  <MapPin className="w-3 h-3" style={{ color: 'var(--rpg-teal)' }} />
                ) : (
                  <Heart className="w-3 h-3" style={{ color: '#ef4444' }} />
                )}
                <span className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                  {activity.location.city?.name}, {activity.location.city?.country}
                </span>
                {activity.rating && (
                  <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--rpg-gold)' }}>
                    <Star className="w-3 h-3" fill="currentColor" />
                    {activity.rating}
                  </span>
                )}
              </div>

              {/* Timestamp */}
              <p className="text-xs mt-1" style={{ color: 'var(--rpg-muted)' }}>
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>

            {/* Type Icon */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: activity.type === 'visited'
                  ? 'rgba(95, 191, 138, 0.2)'
                  : 'rgba(239, 68, 68, 0.2)',
              }}
            >
              {activity.type === 'visited' ? (
                <MapPin className="w-4 h-4" style={{ color: 'var(--rpg-teal)' }} />
              ) : (
                <Heart className="w-4 h-4" style={{ color: '#ef4444' }} />
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div
        className="px-4 py-3 text-center"
        style={{ borderTop: '1px solid var(--rpg-border)' }}
      >
        <Link
          href="/travel/locations"
          className="text-xs hover:underline"
          style={{ color: 'var(--rpg-muted)' }}
        >
          Explore more locations
        </Link>
      </div>
    </div>
  );
}
