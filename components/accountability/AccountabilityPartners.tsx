'use client';

import { useState, useEffect } from 'react';
import { Users, UserPlus } from 'lucide-react';
import AccountabilityPartnerCard from './AccountabilityPartnerCard';

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

interface Friend {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface AccountabilityPartnersProps {
  friends?: Friend[];
  compact?: boolean;
  maxDisplay?: number;
}

export default function AccountabilityPartners({
  friends = [],
  compact = false,
  maxDisplay = 2,
}: AccountabilityPartnersProps) {
  const [partnerships, setPartnerships] = useState<Partnership[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddPartner, setShowAddPartner] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState('');
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);

  const fetchPartnerships = async () => {
    try {
      const res = await fetch('/api/accountability');
      if (res.ok) {
        const data = await res.json();
        setPartnerships(data.partnerships);
      }
    } catch (err) {
      console.error('Failed to fetch partnerships:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPartnerships();
  }, []);

  const handleRequestPartner = async () => {
    if (!selectedFriendId || requesting) return;
    setRequesting(true);

    try {
      const res = await fetch('/api/accountability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          partnerId: selectedFriendId,
          message,
        }),
      });

      if (res.ok) {
        setShowAddPartner(false);
        setSelectedFriendId('');
        setMessage('');
        fetchPartnerships();
      }
    } catch (err) {
      console.error('Failed to request partner:', err);
    } finally {
      setRequesting(false);
    }
  };

  // Filter out friends who already have partnerships
  const partnerIds = partnerships.map((p) => p.partner.id);
  const availableFriends = friends.filter((f) => !partnerIds.includes(f.id));

  if (loading) {
    return (
      <div className="p-4 text-center">
        <div
          className="w-6 h-6 border-2 rounded-full animate-spin mx-auto"
          style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  const displayPartnerships = partnerships.slice(0, maxDisplay);
  const hasMore = partnerships.length > maxDisplay;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5" style={{ color: 'var(--rpg-teal)' }} />
          <h3 className="font-bold" style={{ color: 'var(--rpg-text)' }}>
            Accountability Partners
          </h3>
          {partnerships.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
            >
              {partnerships.length}
            </span>
          )}
        </div>
        {availableFriends.length > 0 && (
          <button
            onClick={() => setShowAddPartner(true)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
            style={{ color: 'var(--rpg-teal)' }}
          >
            <UserPlus className="w-4 h-4" />
            Add
          </button>
        )}
      </div>

      {/* Partnership List */}
      {partnerships.length === 0 ? (
        <div
          className="p-6 rounded-xl text-center"
          style={{ background: 'var(--rpg-card)', border: '1px solid var(--rpg-border)' }}
        >
          <Users className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--rpg-muted)' }} />
          <p className="text-sm mb-1" style={{ color: 'var(--rpg-text)' }}>
            No accountability partners yet
          </p>
          <p className="text-xs mb-3" style={{ color: 'var(--rpg-muted)' }}>
            Partner up with a friend to stay motivated!
          </p>
          {availableFriends.length > 0 && (
            <button
              onClick={() => setShowAddPartner(true)}
              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
              style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
            >
              Find a Partner
            </button>
          )}
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-4'}>
          {displayPartnerships.map((partnership) => (
            <AccountabilityPartnerCard
              key={partnership.id}
              partnership={partnership}
              compact={compact}
              onCheckin={fetchPartnerships}
              onNudge={fetchPartnerships}
              onRespond={fetchPartnerships}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <a
          href="/accountability"
          className="block text-center text-sm font-medium py-2"
          style={{ color: 'var(--rpg-teal)' }}
        >
          View all {partnerships.length} partnerships →
        </a>
      )}

      {/* Add Partner Modal */}
      {showAddPartner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowAddPartner(false)} />
          <div
            className="relative w-full max-w-md rounded-xl p-4"
            style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}
          >
            <h2 className="text-lg font-bold mb-4" style={{ color: 'var(--rpg-text)' }}>
              Add Accountability Partner
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
                  Select a Friend
                </label>
                <div
                  className="max-h-48 overflow-y-auto space-y-1 p-2 rounded-lg"
                  style={{ background: 'rgba(0, 0, 0, 0.2)' }}
                >
                  {availableFriends.map((friend) => (
                    <button
                      key={friend.id}
                      onClick={() => setSelectedFriendId(friend.id)}
                      className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors"
                      style={{
                        background:
                          selectedFriendId === friend.id
                            ? 'rgba(45, 212, 191, 0.2)'
                            : 'transparent',
                      }}
                    >
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                        style={{ background: 'var(--rpg-purple)' }}
                      >
                        {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-left text-sm" style={{ color: 'var(--rpg-text)' }}>
                        {friend.displayName || friend.username}
                      </span>
                      {selectedFriendId === friend.id && (
                        <span style={{ color: 'var(--rpg-teal)' }}>✓</span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1" style={{ color: 'var(--rpg-text)' }}>
                  Add a message (optional)
                </label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Let's keep each other accountable!"
                  rows={2}
                  className="w-full px-3 py-2 rounded-lg text-sm resize-none"
                  style={{
                    background: 'rgba(0, 0, 0, 0.3)',
                    border: '1px solid var(--rpg-border)',
                    color: 'var(--rpg-text)',
                  }}
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setShowAddPartner(false)}
                  className="flex-1 py-2 rounded-lg font-medium text-sm"
                  style={{ background: 'var(--rpg-border)', color: 'var(--rpg-text)' }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleRequestPartner}
                  disabled={!selectedFriendId || requesting}
                  className="flex-1 py-2 rounded-lg font-medium text-sm disabled:opacity-50"
                  style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
                >
                  {requesting ? 'Sending...' : 'Send Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
