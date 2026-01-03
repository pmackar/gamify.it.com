'use client';

import { useState } from 'react';
import { X, Plus, Users } from 'lucide-react';

interface Friend {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

interface ChallengeCreatorProps {
  appId: string;
  friends: Friend[];
  onClose: () => void;
  onCreated: () => void;
}

const CHALLENGE_TYPES = {
  fitness: [
    { value: 'FITNESS_WORKOUTS', label: 'Most Workouts', icon: '💪', description: 'Who can complete the most workouts' },
    { value: 'FITNESS_VOLUME', label: 'Total Volume', icon: '🏋️', description: 'Who can lift the most total weight' },
    { value: 'FITNESS_XP', label: 'XP Earned', icon: '⭐', description: 'Who can earn the most XP' },
  ],
  travel: [
    { value: 'TRAVEL_LOCATIONS', label: 'Locations Visited', icon: '📍', description: 'Who can visit the most places' },
    { value: 'TRAVEL_CITIES', label: 'Cities Explored', icon: '🌆', description: 'Who can explore the most cities' },
  ],
  today: [
    { value: 'TODAY_HABITS', label: 'Habit Completions', icon: '✅', description: 'Who can complete the most habits' },
    { value: 'TODAY_STREAK', label: 'Longest Streak', icon: '🔥', description: 'Who can maintain the longest streak' },
  ],
};

const DURATION_OPTIONS = [
  { days: 7, label: '1 Week' },
  { days: 14, label: '2 Weeks' },
  { days: 30, label: '1 Month' },
  { days: 90, label: '3 Months' },
];

const ICONS = ['🏆', '💪', '🔥', '⭐', '🎯', '🚀', '💎', '👑', '🥇', '⚡'];

export default function ChallengeCreator({
  appId,
  friends,
  onClose,
  onCreated,
}: ChallengeCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('');
  const [duration, setDuration] = useState(7);
  const [icon, setIcon] = useState('🏆');
  const [xpReward, setXpReward] = useState(100);
  const [selectedFriends, setSelectedFriends] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const challengeTypes = CHALLENGE_TYPES[appId as keyof typeof CHALLENGE_TYPES] || [];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !type) {
      setError('Title and challenge type are required');
      return;
    }

    setSubmitting(true);
    setError('');

    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + duration);

    try {
      const res = await fetch('/api/challenges', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          type,
          appId,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          xpReward,
          icon,
          inviteUserIds: selectedFriends,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to create challenge');
      }

      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleFriend = (friendId: string) => {
    setSelectedFriends((prev) =>
      prev.includes(friendId)
        ? prev.filter((id) => id !== friendId)
        : [...prev, friendId]
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl"
        style={{ background: 'var(--rpg-card)', border: '2px solid var(--rpg-border)' }}
      >
        {/* Header */}
        <div
          className="sticky top-0 flex items-center justify-between p-4"
          style={{ background: 'var(--rpg-card)', borderBottom: '1px solid var(--rpg-border)' }}
        >
          <h2 className="text-lg font-bold" style={{ color: 'var(--rpg-text)' }}>
            Create Challenge
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" style={{ color: 'var(--rpg-muted)' }} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div
              className="p-3 rounded-lg text-sm"
              style={{ background: 'rgba(239, 68, 68, 0.2)', color: '#ef4444' }}
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--rpg-text)' }}>
              Challenge Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., January Workout Challenge"
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--rpg-border)',
                color: 'var(--rpg-text)',
              }}
              required
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--rpg-text)' }}>
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add details about the challenge..."
              rows={2}
              className="w-full px-3 py-2 rounded-lg text-sm resize-none"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--rpg-border)',
                color: 'var(--rpg-text)',
              }}
            />
          </div>

          {/* Challenge Type */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
              Challenge Type
            </label>
            <div className="grid grid-cols-1 gap-2">
              {challengeTypes.map((ct) => (
                <button
                  key={ct.value}
                  type="button"
                  onClick={() => setType(ct.value)}
                  className="flex items-center gap-3 p-3 rounded-lg text-left transition-colors"
                  style={{
                    background: type === ct.value ? 'rgba(168, 85, 247, 0.2)' : 'rgba(0, 0, 0, 0.2)',
                    border: `2px solid ${type === ct.value ? 'var(--rpg-purple)' : 'transparent'}`,
                  }}
                >
                  <span className="text-xl">{ct.icon}</span>
                  <div>
                    <p className="font-medium text-sm" style={{ color: 'var(--rpg-text)' }}>
                      {ct.label}
                    </p>
                    <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                      {ct.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
              Duration
            </label>
            <div className="flex gap-2 flex-wrap">
              {DURATION_OPTIONS.map((d) => (
                <button
                  key={d.days}
                  type="button"
                  onClick={() => setDuration(d.days)}
                  className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                  style={{
                    background: duration === d.days ? 'var(--rpg-purple)' : 'rgba(0, 0, 0, 0.2)',
                    color: duration === d.days ? 'white' : 'var(--rpg-text)',
                  }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Icon */}
          <div>
            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
              Icon
            </label>
            <div className="flex gap-2 flex-wrap">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className="w-10 h-10 rounded-lg text-xl flex items-center justify-center transition-colors"
                  style={{
                    background: icon === i ? 'var(--rpg-purple)' : 'rgba(0, 0, 0, 0.2)',
                    border: `2px solid ${icon === i ? 'var(--rpg-purple)' : 'transparent'}`,
                  }}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          {/* XP Reward */}
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--rpg-text)' }}>
              XP Reward for Winner
            </label>
            <input
              type="number"
              value={xpReward}
              onChange={(e) => setXpReward(parseInt(e.target.value) || 100)}
              min={10}
              max={1000}
              step={10}
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'rgba(0, 0, 0, 0.3)',
                border: '1px solid var(--rpg-border)',
                color: 'var(--rpg-text)',
              }}
            />
          </div>

          {/* Invite Friends */}
          {friends.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: 'var(--rpg-text)' }}>
                <Users className="w-4 h-4 inline mr-1" />
                Invite Friends
              </label>
              <div className="max-h-40 overflow-y-auto space-y-1 p-2 rounded-lg" style={{ background: 'rgba(0, 0, 0, 0.2)' }}>
                {friends.map((friend) => (
                  <button
                    key={friend.id}
                    type="button"
                    onClick={() => toggleFriend(friend.id)}
                    className="w-full flex items-center gap-2 p-2 rounded-lg transition-colors"
                    style={{
                      background: selectedFriends.includes(friend.id)
                        ? 'rgba(168, 85, 247, 0.2)'
                        : 'transparent',
                    }}
                  >
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-xs"
                      style={{ background: 'var(--rpg-purple)' }}
                    >
                      {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
                    </div>
                    <span className="flex-1 text-left text-sm" style={{ color: 'var(--rpg-text)' }}>
                      {friend.displayName || friend.username}
                    </span>
                    {selectedFriends.includes(friend.id) && (
                      <span style={{ color: 'var(--rpg-teal)' }}>✓</span>
                    )}
                  </button>
                ))}
              </div>
              {selectedFriends.length > 0 && (
                <p className="text-xs mt-1" style={{ color: 'var(--rpg-muted)' }}>
                  {selectedFriends.length} friend{selectedFriends.length !== 1 ? 's' : ''} will be invited
                </p>
              )}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || !title || !type}
            className="w-full py-3 rounded-lg font-bold text-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ background: 'var(--rpg-purple)', color: 'white' }}
          >
            <Plus className="w-4 h-4" />
            {submitting ? 'Creating...' : 'Create Challenge'}
          </button>
        </form>
      </div>
    </div>
  );
}
