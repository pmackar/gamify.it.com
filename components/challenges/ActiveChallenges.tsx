'use client';

import { useState, useEffect } from 'react';
import { Plus, Trophy } from 'lucide-react';
import ChallengeCard from './ChallengeCard';
import ChallengeCreator from './ChallengeCreator';

interface Friend {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

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

interface ActiveChallengesProps {
  appId: 'fitness' | 'travel' | 'today';
  friends?: Friend[];
  compact?: boolean;
  maxDisplay?: number;
}

export default function ActiveChallenges({
  appId,
  friends = [],
  compact = false,
  maxDisplay = 3,
}: ActiveChallengesProps) {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreator, setShowCreator] = useState(false);

  const fetchChallenges = async () => {
    try {
      const res = await fetch(`/api/challenges?app=${appId}&status=active`);
      if (res.ok) {
        const data = await res.json();
        setChallenges(data.challenges);
      }
    } catch (err) {
      console.error('Failed to fetch challenges:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenges();
  }, [appId]);

  const handleRefresh = () => {
    setShowCreator(false);
    fetchChallenges();
  };

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

  const displayChallenges = challenges.slice(0, maxDisplay);
  const hasMore = challenges.length > maxDisplay;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5" style={{ color: 'var(--rpg-gold)' }} />
          <h3 className="font-bold" style={{ color: 'var(--rpg-text)' }}>
            Active Challenges
          </h3>
          {challenges.length > 0 && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{ background: 'var(--rpg-purple)', color: 'white' }}
            >
              {challenges.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowCreator(true)}
          className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors hover:bg-white/10"
          style={{ color: 'var(--rpg-purple)' }}
        >
          <Plus className="w-4 h-4" />
          New
        </button>
      </div>

      {/* Challenge List */}
      {challenges.length === 0 ? (
        <div
          className="p-6 rounded-xl text-center"
          style={{ background: 'var(--rpg-card)', border: '1px solid var(--rpg-border)' }}
        >
          <Trophy className="w-10 h-10 mx-auto mb-2" style={{ color: 'var(--rpg-muted)' }} />
          <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
            No active challenges
          </p>
          <button
            onClick={() => setShowCreator(true)}
            className="mt-3 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ background: 'var(--rpg-purple)', color: 'white' }}
          >
            Create a Challenge
          </button>
        </div>
      ) : (
        <div className={compact ? 'space-y-2' : 'space-y-4'}>
          {displayChallenges.map((challenge) => (
            <ChallengeCard
              key={challenge.id}
              challenge={challenge}
              compact={compact}
              onJoin={handleRefresh}
              onLeave={handleRefresh}
            />
          ))}
        </div>
      )}

      {hasMore && (
        <a
          href={`/${appId}/challenges`}
          className="block text-center text-sm font-medium py-2"
          style={{ color: 'var(--rpg-purple)' }}
        >
          View all {challenges.length} challenges →
        </a>
      )}

      {/* Creator Modal */}
      {showCreator && (
        <ChallengeCreator
          appId={appId}
          friends={friends}
          onClose={() => setShowCreator(false)}
          onCreated={handleRefresh}
        />
      )}
    </div>
  );
}
