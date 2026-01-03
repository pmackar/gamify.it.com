'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, Dumbbell, Zap, Scale, Award } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  value: number;
  workouts: number;
  xp: number;
  volume: number;
  prs: number;
  isCurrentUser: boolean;
  rank: number;
}

type LeaderboardType = 'workouts' | 'xp' | 'volume' | 'prs';
type PeriodType = 'week' | 'month' | 'all';

export default function FitnessLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [type, setType] = useState<LeaderboardType>('workouts');
  const [period, setPeriod] = useState<PeriodType>('week');
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState(0);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/fitness/leaderboard?type=${type}&period=${period}`);
        if (res.ok) {
          const data = await res.json();
          setEntries(data.leaderboard);
          setCurrentUserRank(data.currentUserRank);
        }
      } catch (err) {
        console.error('Failed to fetch leaderboard:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLeaderboard();
  }, [type, period]);

  const tabs: { key: LeaderboardType; label: string; icon: React.ReactNode }[] = [
    { key: 'workouts', label: 'Workouts', icon: <Dumbbell className="w-3 h-3" /> },
    { key: 'xp', label: 'XP', icon: <Zap className="w-3 h-3" /> },
    { key: 'volume', label: 'Volume', icon: <Scale className="w-3 h-3" /> },
    { key: 'prs', label: 'PRs', icon: <Award className="w-3 h-3" /> },
  ];

  const periods: { key: PeriodType; label: string }[] = [
    { key: 'week', label: 'Week' },
    { key: 'month', label: 'Month' },
    { key: 'all', label: 'All Time' },
  ];

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { color: 'var(--rpg-gold)', bg: 'rgba(255, 215, 0, 0.15)' };
    if (rank === 2) return { color: '#c0c0c0', bg: 'rgba(192, 192, 192, 0.15)' };
    if (rank === 3) return { color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)' };
    return { color: 'var(--rpg-muted)', bg: 'transparent' };
  };

  const formatValue = (entry: LeaderboardEntry) => {
    switch (type) {
      case 'volume':
        // Format as lbs with K suffix for thousands
        if (entry.volume >= 1000000) {
          return `${(entry.volume / 1000000).toFixed(1)}M`;
        }
        if (entry.volume >= 1000) {
          return `${(entry.volume / 1000).toFixed(1)}K`;
        }
        return entry.volume.toLocaleString();
      case 'xp':
        if (entry.xp >= 1000) {
          return `${(entry.xp / 1000).toFixed(1)}K`;
        }
        return entry.xp.toLocaleString();
      case 'prs':
        return entry.prs;
      default:
        return entry.workouts;
    }
  };

  const getValueLabel = () => {
    switch (type) {
      case 'volume': return 'lbs';
      case 'xp': return 'XP';
      case 'prs': return 'PRs';
      default: return 'workouts';
    }
  };

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
        className="px-4 py-3 flex items-center justify-between"
        style={{ borderBottom: '1px solid var(--rpg-border)' }}
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4" style={{ color: 'var(--rpg-gold)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
            Fitness Leaderboard
          </h3>
        </div>

        {/* Period Selector */}
        <div className="flex gap-1">
          {periods.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className="px-2 py-1 text-[10px] rounded transition-colors"
              style={{
                color: period === p.key ? 'var(--rpg-purple)' : 'var(--rpg-muted)',
                background: period === p.key ? 'rgba(168, 85, 247, 0.15)' : 'transparent',
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type Tabs */}
      <div
        className="flex border-b"
        style={{ borderColor: 'var(--rpg-border)' }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setType(tab.key)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-xs transition-colors"
            style={{
              color: type === tab.key ? 'var(--rpg-purple)' : 'var(--rpg-muted)',
              borderBottom: type === tab.key ? '2px solid var(--rpg-purple)' : '2px solid transparent',
              background: type === tab.key ? 'rgba(168, 85, 247, 0.1)' : 'transparent',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div
            className="w-6 h-6 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
          />
        </div>
      ) : entries.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
            Add friends to see the leaderboard!
          </p>
        </div>
      ) : (
        <div className="divide-y" style={{ borderColor: 'var(--rpg-border)' }}>
          {entries.slice(0, 10).map((entry) => {
            const rankStyle = getRankStyle(entry.rank);
            return (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3"
                style={{
                  background: entry.isCurrentUser
                    ? 'rgba(168, 85, 247, 0.1)'
                    : rankStyle.bg,
                }}
              >
                {/* Rank */}
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                  style={{
                    background: entry.rank <= 3 ? rankStyle.bg : 'var(--rpg-border)',
                    color: rankStyle.color,
                    border: entry.rank <= 3 ? `1px solid ${rankStyle.color}` : 'none',
                  }}
                >
                  {entry.rank}
                </div>

                {/* Avatar */}
                <Link href={`/users/${entry.id}`} className="flex-shrink-0">
                  {entry.avatarUrl ? (
                    <Image
                      src={entry.avatarUrl}
                      alt=""
                      width={32}
                      height={32}
                      className="rounded-full"
                    />
                  ) : (
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                      style={{
                        background: 'linear-gradient(135deg, var(--rpg-purple) 0%, rgba(168, 85, 247, 0.7) 100%)',
                        color: 'white',
                      }}
                    >
                      {(entry.displayName || entry.username || '?').charAt(0).toUpperCase()}
                    </div>
                  )}
                </Link>

                {/* Name */}
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/users/${entry.id}`}
                    className="text-sm font-medium hover:underline truncate block"
                    style={{
                      color: entry.isCurrentUser ? 'var(--rpg-purple)' : 'var(--rpg-text)',
                    }}
                  >
                    {entry.displayName || entry.username}
                    {entry.isCurrentUser && ' (You)'}
                  </Link>
                  <span className="text-[10px]" style={{ color: 'var(--rpg-muted)' }}>
                    L{entry.level}
                  </span>
                </div>

                {/* Stats */}
                <div className="text-right flex-shrink-0">
                  <div
                    className="text-sm font-bold"
                    style={{ color: 'var(--rpg-purple)' }}
                  >
                    {formatValue(entry)}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--rpg-muted)' }}>
                    {getValueLabel()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Current User Rank (if not in top 10) */}
      {currentUserRank > 10 && (
        <div
          className="px-4 py-3 text-center"
          style={{ borderTop: '1px solid var(--rpg-border)' }}
        >
          <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
            Your rank: <span style={{ color: 'var(--rpg-purple)' }}>#{currentUserRank}</span>
          </p>
        </div>
      )}
    </div>
  );
}
