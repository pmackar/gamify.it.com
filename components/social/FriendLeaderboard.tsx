'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Flame, Star, Crown, Medal, Award } from 'lucide-react';

interface LeaderboardEntry {
  rank: number;
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  isCurrentUser: boolean;
}

interface LeaderboardData {
  leaderboard: LeaderboardEntry[];
  currentUserRank: number;
  type: string;
  totalFriends: number;
}

type LeaderboardType = 'xp' | 'streak' | 'level';

const typeConfig: Record<LeaderboardType, { icon: React.ReactNode; label: string; getValue: (e: LeaderboardEntry) => string }> = {
  xp: {
    icon: <Star className="w-4 h-4" />,
    label: 'XP',
    getValue: (e) => `${e.xp.toLocaleString()} XP`,
  },
  streak: {
    icon: <Flame className="w-4 h-4" />,
    label: 'Streak',
    getValue: (e) => `${e.currentStreak} day${e.currentStreak !== 1 ? 's' : ''}`,
  },
  level: {
    icon: <Trophy className="w-4 h-4" />,
    label: 'Level',
    getValue: (e) => `Level ${e.level}`,
  },
};

function getRankIcon(rank: number) {
  switch (rank) {
    case 1:
      return <Crown className="w-5 h-5" style={{ color: '#FFD700' }} />;
    case 2:
      return <Medal className="w-5 h-5" style={{ color: '#C0C0C0' }} />;
    case 3:
      return <Award className="w-5 h-5" style={{ color: '#CD7F32' }} />;
    default:
      return <span className="w-5 h-5 flex items-center justify-center text-sm font-bold" style={{ color: 'var(--rpg-muted)' }}>{rank}</span>;
  }
}

export default function FriendLeaderboard() {
  const [type, setType] = useState<LeaderboardType>('xp');
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/friends/leaderboard?type=${type}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [type]);

  const config = typeConfig[type];

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--rpg-card)',
        border: '2px solid var(--rpg-border)',
        boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3
          className="text-base font-medium flex items-center gap-2"
          style={{ color: 'var(--rpg-text)' }}
        >
          <Trophy className="w-5 h-5" style={{ color: 'var(--rpg-gold)' }} />
          Friend Leaderboard
        </h3>
      </div>

      {/* Type Tabs */}
      <div className="flex gap-2 mb-4">
        {(Object.keys(typeConfig) as LeaderboardType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={{
              background: type === t ? 'var(--rpg-purple)' : 'rgba(0, 0, 0, 0.3)',
              border: `1px solid ${type === t ? 'var(--rpg-purple)' : 'var(--rpg-border)'}`,
              color: type === t ? '#fff' : 'var(--rpg-muted)',
            }}
          >
            {typeConfig[t].icon}
            {typeConfig[t].label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="py-8 text-center">
          <div
            className="inline-block w-6 h-6 border-2 rounded-full animate-spin"
            style={{
              borderColor: 'var(--rpg-purple)',
              borderTopColor: 'transparent',
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {!loading && (!data || data.leaderboard.length === 0) && (
        <div className="py-8 text-center">
          <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
            Add friends to see the leaderboard!
          </p>
          <Link
            href="/friends"
            className="inline-block mt-3 px-4 py-2 rounded text-xs font-medium transition-colors"
            style={{
              background: 'var(--rpg-purple)',
              color: '#fff',
            }}
          >
            Find Friends
          </Link>
        </div>
      )}

      {/* Leaderboard List */}
      {!loading && data && data.leaderboard.length > 0 && (
        <div className="space-y-2">
          {data.leaderboard.map((entry) => (
            <Link
              key={entry.id}
              href={`/users/${entry.id}`}
              className="flex items-center gap-3 p-3 rounded-lg transition-all hover:scale-[1.02]"
              style={{
                background: entry.isCurrentUser
                  ? 'rgba(168, 85, 247, 0.15)'
                  : 'rgba(0, 0, 0, 0.3)',
                border: `1px solid ${entry.isCurrentUser ? 'var(--rpg-purple)' : 'var(--rpg-border)'}`,
              }}
            >
              {/* Rank */}
              <div className="flex-shrink-0 w-8 flex justify-center">
                {getRankIcon(entry.rank)}
              </div>

              {/* Avatar */}
              <div className="flex-shrink-0">
                {entry.avatarUrl ? (
                  <Image
                    src={entry.avatarUrl}
                    alt=""
                    width={36}
                    height={36}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-medium"
                    style={{
                      background: 'linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-teal-dark) 100%)',
                      color: 'var(--rpg-bg-dark)',
                    }}
                  >
                    {(entry.displayName || entry.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
              </div>

              {/* Name & Level */}
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-medium truncate"
                  style={{ color: entry.isCurrentUser ? 'var(--rpg-purple)' : 'var(--rpg-text)' }}
                >
                  {entry.displayName || entry.username}
                  {entry.isCurrentUser && (
                    <span className="ml-2 text-xs" style={{ color: 'var(--rpg-muted)' }}>
                      (You)
                    </span>
                  )}
                </p>
                <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                  Level {entry.level}
                </p>
              </div>

              {/* Value */}
              <div
                className="flex-shrink-0 text-right"
                style={{ color: 'var(--rpg-gold)' }}
              >
                <p className="text-sm font-bold">{config.getValue(entry)}</p>
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Footer Stats */}
      {!loading && data && data.totalFriends > 0 && (
        <p
          className="text-xs mt-4 text-center"
          style={{ color: 'var(--rpg-muted)' }}
        >
          Competing with {data.totalFriends} friend{data.totalFriends !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
