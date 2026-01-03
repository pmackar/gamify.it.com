'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { Trophy, Users, Clock, ChevronRight } from 'lucide-react';

interface Participant {
  userId: string;
  status: string;
  score: number;
  rank?: number;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
}

interface Challenge {
  id: string;
  title: string;
  description?: string;
  type: string;
  appId: string;
  icon?: string;
  startDate: string;
  endDate: string;
  status: string;
  xpReward: number;
  isCreator: boolean;
  participantCount: number;
  hasJoined: boolean;
  isInvited: boolean;
  participants: Participant[];
}

interface ChallengeCardProps {
  challenge: Challenge;
  onJoin?: (id: string) => void;
  onLeave?: (id: string) => void;
  compact?: boolean;
}

export default function ChallengeCard({
  challenge,
  onJoin,
  onLeave,
  compact = false,
}: ChallengeCardProps) {
  const [loading, setLoading] = useState(false);

  const endDate = new Date(challenge.endDate);
  const now = new Date();
  const isActive = challenge.status === 'ACTIVE';
  const isCompleted = challenge.status === 'COMPLETED';
  const daysRemaining = Math.max(
    0,
    Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  const handleJoin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/join`, {
        method: 'POST',
      });
      if (res.ok) {
        onJoin?.(challenge.id);
      }
    } catch (err) {
      console.error('Failed to join challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleLeave = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/challenges/${challenge.id}/leave`, {
        method: 'POST',
      });
      if (res.ok) {
        onLeave?.(challenge.id);
      }
    } catch (err) {
      console.error('Failed to leave challenge:', err);
    } finally {
      setLoading(false);
    }
  };

  const topParticipants = challenge.participants
    .filter((p) => p.status === 'JOINED')
    .slice(0, 3);

  if (compact) {
    return (
      <Link
        href={`/challenges/${challenge.id}`}
        className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/5"
        style={{ background: 'var(--rpg-card)', border: '1px solid var(--rpg-border)' }}
      >
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
          style={{ background: 'rgba(168, 85, 247, 0.2)' }}
        >
          {challenge.icon || '🏆'}
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate" style={{ color: 'var(--rpg-text)' }}>
            {challenge.title}
          </h4>
          <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
            {daysRemaining} days left • {challenge.participantCount} competing
          </p>
        </div>
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
      </Link>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{
        background: 'var(--rpg-card)',
        border: '2px solid var(--rpg-border)',
      }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          background: isCompleted
            ? 'linear-gradient(135deg, rgba(34, 197, 94, 0.2), rgba(34, 197, 94, 0.05))'
            : 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))',
        }}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl"
            style={{ background: 'rgba(0, 0, 0, 0.3)' }}
          >
            {challenge.icon || '🏆'}
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-lg" style={{ color: 'var(--rpg-text)' }}>
              {challenge.title}
            </h3>
            {challenge.description && (
              <p className="text-sm mt-1" style={{ color: 'var(--rpg-muted)' }}>
                {challenge.description}
              </p>
            )}
          </div>
          {isActive && (
            <div
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--rpg-purple)', color: 'white' }}
            >
              ACTIVE
            </div>
          )}
          {isCompleted && (
            <div
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
            >
              COMPLETE
            </div>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="p-4 grid grid-cols-3 gap-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Users className="w-4 h-4" style={{ color: 'var(--rpg-purple)' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--rpg-text)' }}>
            {challenge.participantCount}
          </p>
          <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
            Competing
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Clock className="w-4 h-4" style={{ color: 'var(--rpg-teal)' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--rpg-text)' }}>
            {isCompleted ? 'Ended' : `${daysRemaining}d`}
          </p>
          <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
            {isCompleted ? formatDistanceToNow(endDate, { addSuffix: true }) : 'Remaining'}
          </p>
        </div>
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Trophy className="w-4 h-4" style={{ color: 'var(--rpg-gold)' }} />
          </div>
          <p className="text-lg font-bold" style={{ color: 'var(--rpg-text)' }}>
            {challenge.xpReward}
          </p>
          <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
            XP Reward
          </p>
        </div>
      </div>

      {/* Leaderboard Preview */}
      {topParticipants.length > 0 && (
        <div className="px-4 pb-4">
          <h4 className="text-xs font-medium mb-2" style={{ color: 'var(--rpg-muted)' }}>
            LEADERBOARD
          </h4>
          <div className="space-y-2">
            {topParticipants.map((p, index) => (
              <div
                key={p.userId}
                className="flex items-center gap-2 p-2 rounded-lg"
                style={{ background: 'rgba(0, 0, 0, 0.2)' }}
              >
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background:
                      index === 0
                        ? 'var(--rpg-gold)'
                        : index === 1
                          ? '#C0C0C0'
                          : '#CD7F32',
                    color: 'var(--rpg-bg-dark)',
                  }}
                >
                  {index + 1}
                </span>
                {p.user.avatarUrl ? (
                  <Image
                    src={p.user.avatarUrl}
                    alt=""
                    width={24}
                    height={24}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                    style={{ background: 'var(--rpg-purple)' }}
                  >
                    {(p.user.displayName || p.user.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="flex-1 text-sm truncate" style={{ color: 'var(--rpg-text)' }}>
                  {p.user.displayName || p.user.username}
                </span>
                <span className="text-sm font-medium" style={{ color: 'var(--rpg-muted)' }}>
                  {p.score.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 pt-0 flex gap-2">
        {!challenge.hasJoined && !challenge.isCreator && isActive && (
          <button
            onClick={handleJoin}
            disabled={loading}
            className="flex-1 py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            style={{ background: 'var(--rpg-purple)', color: 'white' }}
          >
            {loading ? 'Joining...' : challenge.isInvited ? 'Accept Invite' : 'Join Challenge'}
          </button>
        )}
        {challenge.hasJoined && !challenge.isCreator && isActive && (
          <button
            onClick={handleLeave}
            disabled={loading}
            className="py-2 px-4 rounded-lg font-medium text-sm transition-colors disabled:opacity-50"
            style={{ background: 'var(--rpg-border)', color: 'var(--rpg-text)' }}
          >
            Leave
          </button>
        )}
        <Link
          href={`/challenges/${challenge.id}`}
          className="flex-1 py-2 px-4 rounded-lg font-medium text-sm text-center transition-colors"
          style={{
            background: challenge.hasJoined ? 'var(--rpg-purple)' : 'var(--rpg-border)',
            color: challenge.hasJoined ? 'white' : 'var(--rpg-text)',
          }}
        >
          View Details
        </Link>
      </div>
    </div>
  );
}
