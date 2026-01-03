'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Users, Target, Bell, Check, ChevronRight } from 'lucide-react';

interface Goal {
  id: string;
  type: string;
  title: string;
  target: number;
  currentUser: number;
  currentPartner: number;
  period: string;
}

interface Partnership {
  id: string;
  status: string;
  message?: string;
  startedAt?: string;
  createdAt: string;
  isRequester: boolean;
  isPending: boolean;
  partner: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  };
  goals: Goal[];
  streak: number;
  todayCheckedIn: boolean;
  partnerCheckedInToday: boolean;
}

interface AccountabilityPartnerCardProps {
  partnership: Partnership;
  onCheckin?: () => void;
  onNudge?: () => void;
  onRespond?: (accept: boolean) => void;
  compact?: boolean;
}

export default function AccountabilityPartnerCard({
  partnership,
  onCheckin,
  onNudge,
  onRespond,
  compact = false,
}: AccountabilityPartnerCardProps) {
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [checkinLoading, setCheckinLoading] = useState(false);
  const [responseLoading, setResponseLoading] = useState<'accept' | 'decline' | null>(null);

  const handleNudge = async () => {
    if (nudgeLoading) return;
    setNudgeLoading(true);
    try {
      const res = await fetch(`/api/accountability/${partnership.id}/nudge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Time to check in! 💪' }),
      });
      if (res.ok) {
        onNudge?.();
      }
    } catch (err) {
      console.error('Failed to send nudge:', err);
    } finally {
      setNudgeLoading(false);
    }
  };

  const handleCheckin = async () => {
    if (checkinLoading) return;
    setCheckinLoading(true);
    try {
      const res = await fetch(`/api/accountability/${partnership.id}/checkin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: true }),
      });
      if (res.ok) {
        onCheckin?.();
      }
    } catch (err) {
      console.error('Failed to check in:', err);
    } finally {
      setCheckinLoading(false);
    }
  };

  const handleRespond = async (accept: boolean) => {
    setResponseLoading(accept ? 'accept' : 'decline');
    try {
      const res = await fetch(`/api/accountability/${partnership.id}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: accept ? 'accept' : 'decline' }),
      });
      if (res.ok) {
        onRespond?.(accept);
      }
    } catch (err) {
      console.error('Failed to respond:', err);
    } finally {
      setResponseLoading(null);
    }
  };

  const partner = partnership.partner;

  if (compact) {
    return (
      <Link
        href={`/accountability/${partnership.id}`}
        className="flex items-center gap-3 p-3 rounded-lg transition-colors hover:bg-white/5"
        style={{ background: 'var(--rpg-card)', border: '1px solid var(--rpg-border)' }}
      >
        {partner.avatarUrl ? (
          <Image
            src={partner.avatarUrl}
            alt=""
            width={40}
            height={40}
            className="rounded-full"
          />
        ) : (
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold"
            style={{ background: 'var(--rpg-purple)', color: 'white' }}
          >
            {(partner.displayName || partner.username || '?').charAt(0).toUpperCase()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm truncate" style={{ color: 'var(--rpg-text)' }}>
            {partner.displayName || partner.username}
          </h4>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
              🔥 {partnership.streak} day streak
            </span>
            {partnership.partnerCheckedInToday && (
              <span className="text-xs" style={{ color: 'var(--rpg-teal)' }}>
                ✓ Active today
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="w-4 h-4" style={{ color: 'var(--rpg-muted)' }} />
      </Link>
    );
  }

  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}
    >
      {/* Header */}
      <div
        className="p-4"
        style={{
          background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.2), rgba(168, 85, 247, 0.05))',
        }}
      >
        <div className="flex items-center gap-3">
          {partner.avatarUrl ? (
            <Image
              src={partner.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="rounded-full"
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold"
              style={{ background: 'var(--rpg-purple)', color: 'white' }}
            >
              {(partner.displayName || partner.username || '?').charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <h3 className="font-bold text-lg" style={{ color: 'var(--rpg-text)' }}>
              {partner.displayName || partner.username}
            </h3>
            <div className="flex items-center gap-3 mt-1">
              <span className="flex items-center gap-1 text-sm" style={{ color: 'var(--rpg-gold)' }}>
                🔥 {partnership.streak} day streak
              </span>
              {partnership.partnerCheckedInToday && (
                <span
                  className="px-2 py-0.5 rounded-full text-xs"
                  style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
                >
                  Active today
                </span>
              )}
            </div>
          </div>
          {partnership.isPending && (
            <div
              className="px-2 py-1 rounded-full text-xs font-medium"
              style={{ background: 'var(--rpg-purple)', color: 'white' }}
            >
              PENDING
            </div>
          )}
        </div>
      </div>

      {/* Pending Response */}
      {partnership.isPending && (
        <div className="p-4">
          <p className="text-sm mb-3" style={{ color: 'var(--rpg-text)' }}>
            {partner.displayName || partner.username} wants to be your accountability partner
          </p>
          {partnership.message && (
            <p
              className="text-sm mb-3 p-2 rounded-lg italic"
              style={{ background: 'rgba(0, 0, 0, 0.2)', color: 'var(--rpg-muted)' }}
            >
              &ldquo;{partnership.message}&rdquo;
            </p>
          )}
          <div className="flex gap-2">
            <button
              onClick={() => handleRespond(true)}
              disabled={responseLoading !== null}
              className="flex-1 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
              style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
            >
              {responseLoading === 'accept' ? '...' : 'Accept'}
            </button>
            <button
              onClick={() => handleRespond(false)}
              disabled={responseLoading !== null}
              className="flex-1 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
              style={{ background: 'var(--rpg-border)', color: 'var(--rpg-text)' }}
            >
              {responseLoading === 'decline' ? '...' : 'Decline'}
            </button>
          </div>
        </div>
      )}

      {/* Active Partnership Content */}
      {partnership.status === 'ACTIVE' && (
        <>
          {/* Goals */}
          {partnership.goals.length > 0 && (
            <div className="p-4 pt-0">
              <h4 className="text-xs font-medium mb-2 flex items-center gap-1" style={{ color: 'var(--rpg-muted)' }}>
                <Target className="w-3 h-3" />
                SHARED GOALS
              </h4>
              <div className="space-y-2">
                {partnership.goals.slice(0, 2).map((goal) => {
                  const userProgress = (goal.currentUser / goal.target) * 100;
                  const partnerProgress = (goal.currentPartner / goal.target) * 100;

                  return (
                    <div
                      key={goal.id}
                      className="p-3 rounded-lg"
                      style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                    >
                      <p className="text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
                        {goal.title}
                      </p>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-12" style={{ color: 'var(--rpg-muted)' }}>You</span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--rpg-border)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, userProgress)}%`, background: 'var(--rpg-purple)' }}
                            />
                          </div>
                          <span className="text-xs w-16 text-right" style={{ color: 'var(--rpg-text)' }}>
                            {goal.currentUser}/{goal.target}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs w-12 truncate" style={{ color: 'var(--rpg-muted)' }}>
                            {partner.displayName?.split(' ')[0] || partner.username}
                          </span>
                          <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--rpg-border)' }}>
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${Math.min(100, partnerProgress)}%`, background: 'var(--rpg-teal)' }}
                            />
                          </div>
                          <span className="text-xs w-16 text-right" style={{ color: 'var(--rpg-text)' }}>
                            {goal.currentPartner}/{goal.target}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="p-4 flex gap-2">
            {!partnership.todayCheckedIn ? (
              <button
                onClick={handleCheckin}
                disabled={checkinLoading}
                className="flex-1 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--rpg-purple)', color: 'white' }}
              >
                <Check className="w-4 h-4" />
                {checkinLoading ? 'Checking in...' : 'Check In'}
              </button>
            ) : (
              <div
                className="flex-1 py-2 px-4 rounded-lg font-medium text-sm flex items-center justify-center gap-2"
                style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
              >
                <Check className="w-4 h-4" />
                Checked In Today
              </div>
            )}
            {!partnership.partnerCheckedInToday && (
              <button
                onClick={handleNudge}
                disabled={nudgeLoading}
                className="py-2 px-4 rounded-lg font-medium text-sm flex items-center gap-2 disabled:opacity-50"
                style={{ background: 'var(--rpg-border)', color: 'var(--rpg-text)' }}
                title="Send a friendly reminder"
              >
                <Bell className="w-4 h-4" />
                {nudgeLoading ? '...' : 'Nudge'}
              </button>
            )}
          </div>
        </>
      )}

      {/* Link to details */}
      {partnership.status === 'ACTIVE' && (
        <Link
          href={`/accountability/${partnership.id}`}
          className="block text-center py-2 text-sm font-medium transition-colors hover:bg-white/5"
          style={{ color: 'var(--rpg-purple)', borderTop: '1px solid var(--rpg-border)' }}
        >
          View Partnership Details →
        </Link>
      )}
    </div>
  );
}
