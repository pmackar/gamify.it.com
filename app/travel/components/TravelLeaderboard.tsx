'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Trophy, MapPin, Globe, Building2 } from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  value: number;
  places: number;
  cities: number;
  countries: number;
  isCurrentUser: boolean;
  rank: number;
}

type LeaderboardType = 'places' | 'cities' | 'countries';

export default function TravelLeaderboard() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [type, setType] = useState<LeaderboardType>('places');
  const [loading, setLoading] = useState(true);
  const [currentUserRank, setCurrentUserRank] = useState(0);

  useEffect(() => {
    async function fetchLeaderboard() {
      setLoading(true);
      try {
        const res = await fetch(`/api/travel/leaderboard?type=${type}`);
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
  }, [type]);

  const tabs: { key: LeaderboardType; label: string; icon: React.ReactNode }[] = [
    { key: 'places', label: 'Places', icon: <MapPin className="w-3 h-3" /> },
    { key: 'cities', label: 'Cities', icon: <Building2 className="w-3 h-3" /> },
    { key: 'countries', label: 'Countries', icon: <Globe className="w-3 h-3" /> },
  ];

  const getRankStyle = (rank: number) => {
    if (rank === 1) return { color: 'var(--rpg-gold)', bg: 'rgba(255, 215, 0, 0.15)' };
    if (rank === 2) return { color: '#c0c0c0', bg: 'rgba(192, 192, 192, 0.15)' };
    if (rank === 3) return { color: '#cd7f32', bg: 'rgba(205, 127, 50, 0.15)' };
    return { color: 'var(--rpg-muted)', bg: 'transparent' };
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
        className="px-4 py-3 flex items-center gap-2"
        style={{ borderBottom: '1px solid var(--rpg-border)' }}
      >
        <Trophy className="w-4 h-4" style={{ color: 'var(--rpg-gold)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
          Travel Leaderboard
        </h3>
      </div>

      {/* Tabs */}
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
              color: type === tab.key ? 'var(--rpg-teal)' : 'var(--rpg-muted)',
              borderBottom: type === tab.key ? '2px solid var(--rpg-teal)' : '2px solid transparent',
              background: type === tab.key ? 'rgba(95, 191, 138, 0.1)' : 'transparent',
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
                        background: 'linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-teal-dark) 100%)',
                        color: 'var(--rpg-bg-dark)',
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
                    style={{ color: 'var(--rpg-teal)' }}
                  >
                    {entry.value}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--rpg-muted)' }}>
                    {type === 'places' && 'places'}
                    {type === 'cities' && 'cities'}
                    {type === 'countries' && 'countries'}
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
