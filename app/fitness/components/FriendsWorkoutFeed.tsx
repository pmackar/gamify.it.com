'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Dumbbell, Clock, Zap, Users } from 'lucide-react';

interface Activity {
  id: string;
  type: 'workout' | 'pr';
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  };
  workout?: {
    id: string;
    exercises: number;
    sets: number;
    duration: number;
    xp: number;
    topExercise: string | null;
  };
  pr?: {
    exerciseName: string;
    weight: number;
  };
  timestamp: string;
}

export default function FriendsWorkoutFeed() {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchActivity() {
      try {
        const res = await fetch('/api/fitness/friends-activity?limit=10');
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

  const formatDuration = (seconds: number) => {
    if (!seconds) return '';
    const mins = Math.floor(seconds / 60);
    if (mins < 60) return `${mins}m`;
    const hours = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hours}h ${remainingMins}m`;
  };

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
        <Users className="w-4 h-4" style={{ color: 'var(--rpg-purple)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
          Friends&apos; Workouts
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
                    background: 'linear-gradient(135deg, var(--rpg-purple) 0%, rgba(168, 85, 247, 0.7) 100%)',
                    color: 'white',
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
                <span style={{ color: 'var(--rpg-muted)' }}>completed a workout</span>
              </p>

              {/* Workout Details */}
              {activity.workout && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--rpg-muted)' }}>
                    <Dumbbell className="w-3 h-3" style={{ color: 'var(--rpg-purple)' }} />
                    {activity.workout.exercises} exercise{activity.workout.exercises !== 1 ? 's' : ''}, {activity.workout.sets} sets
                  </span>
                  {activity.workout.duration > 0 && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--rpg-muted)' }}>
                      <Clock className="w-3 h-3" style={{ color: 'var(--rpg-teal)' }} />
                      {formatDuration(activity.workout.duration)}
                    </span>
                  )}
                  {activity.workout.xp > 0 && (
                    <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--rpg-gold)' }}>
                      <Zap className="w-3 h-3" fill="currentColor" />
                      +{activity.workout.xp} XP
                    </span>
                  )}
                </div>
              )}

              {/* Top Exercise */}
              {activity.workout?.topExercise && (
                <p className="text-xs mt-1" style={{ color: 'var(--rpg-muted)' }}>
                  Top exercise: <span style={{ color: 'var(--rpg-text)' }}>{activity.workout.topExercise}</span>
                </p>
              )}

              {/* Timestamp */}
              <p className="text-xs mt-1" style={{ color: 'var(--rpg-muted)' }}>
                {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
              </p>
            </div>

            {/* Workout Icon */}
            <div
              className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center"
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
              }}
            >
              <Dumbbell className="w-4 h-4" style={{ color: 'var(--rpg-purple)' }} />
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
          href="/friends"
          className="text-xs hover:underline"
          style={{ color: 'var(--rpg-muted)' }}
        >
          View all friends
        </Link>
      </div>
    </div>
  );
}
