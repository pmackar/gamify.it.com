'use client';

import { useState, useEffect } from 'react';
import { useFitnessStore } from '@/lib/fitness/store';
import type { NarrativeSettings, RivalRelationship, EncounterFrequency, PhantomPersonality } from '@/lib/fitness/types';
import { getCharacterForPersonality, type RivalCharacter } from '@/lib/fitness/narrative/characters';

interface FriendSuggestion {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
}

interface RivalryRequest {
  id: string;
  friendId: string;
  friend: FriendSuggestion;
  victoryCondition: string;
  message: string | null;
  createdAt: string;
}

// Friend-specific victory conditions (metric-based)
type FriendVictoryCondition = 'rolling_average' | 'volume_growth' | 'consistency' | 'prs' | 'best_of_3';

const FRIEND_VICTORY_CONDITIONS: Record<FriendVictoryCondition, {
  icon: string;
  name: string;
  description: string;
  metric: string;
}> = {
  rolling_average: {
    icon: '📊',
    name: 'Beat Your Average',
    description: 'Both compete against your own 4-week rolling average',
    metric: 'Self-improvement focus',
  },
  volume_growth: {
    icon: '📈',
    name: 'Volume Growth',
    description: 'Who improved their total volume % more this week',
    metric: 'Weight × Reps improvement',
  },
  consistency: {
    icon: '🔥',
    name: 'Consistency',
    description: 'Who completed more workouts this week',
    metric: 'Workout count',
  },
  prs: {
    icon: '🏆',
    name: 'PR Race',
    description: 'Who hit more personal records this week',
    metric: 'New PRs',
  },
  best_of_3: {
    icon: '⚔️',
    name: 'Best of 3',
    description: 'Win 2 of 3: volume, workouts, or PRs',
    metric: 'All-around',
  },
};

// Personality descriptions for selection with victory conditions
const PERSONALITY_INFO: Record<PhantomPersonality, {
  icon: string;
  name: string;
  description: string;
  victoryCondition: string;
  strategy: string;
  tagline: string;
}> = {
  mirror: {
    icon: '🪞',
    name: 'Mirror',
    description: 'Matches your performance closely',
    victoryCondition: 'Beat your 4-week average',
    strategy: 'Stay consistent and keep improving',
    tagline: 'Can you beat who you were?',
  },
  rival: {
    icon: '⚔️',
    name: 'Rival',
    description: 'Slightly ahead, keeps you pushing',
    victoryCondition: 'Win 2 of 3 categories',
    strategy: 'Focus on winnable categories',
    tagline: 'Every category is a battle',
  },
  mentor: {
    icon: '🧘',
    name: 'Mentor',
    description: 'Stronger but encouraging',
    victoryCondition: 'Higher growth rate',
    strategy: 'Focus on improvement %, not raw numbers',
    tagline: 'Show me your growth',
  },
  nemesis: {
    icon: '💀',
    name: 'Nemesis',
    description: 'Volatile and intense rivalry',
    victoryCondition: 'Composite score (with chaos)',
    strategy: 'Stay consistent through wild swings',
    tagline: 'Fortune favors the bold',
  },
};

type AddRivalStep = 'choose-type' | 'choose-personality' | 'choose-friend-victory';

export function RivalSettingsPanel() {
  const store = useFitnessStore();
  const narrativeEngine = store.narrativeEngine;
  const [loading, setLoading] = useState(false);
  const [suggestedFriends, setSuggestedFriends] = useState<FriendSuggestion[]>([]);
  const [showAddRival, setShowAddRival] = useState(false);
  const [pendingReceived, setPendingReceived] = useState<RivalryRequest[]>([]);
  const [pendingSent, setPendingSent] = useState<RivalryRequest[]>([]);

  // Multi-step selection
  const [addRivalStep, setAddRivalStep] = useState<AddRivalStep>('choose-type');
  const [selectedPersonality, setSelectedPersonality] = useState<PhantomPersonality | null>(null);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);

  // Confirmation dialog for removing rivals
  const [rivalToRemove, setRivalToRemove] = useState<RivalRelationship | null>(null);

  // Fetch rivals data including pending requests
  const fetchRivalsData = async () => {
    try {
      const res = await fetch('/api/fitness/narrative/rivals');
      if (res.ok) {
        const data = await res.json();
        setSuggestedFriends(data.suggestedFriends || []);
        setPendingReceived(data.pendingRequests?.received || []);
        setPendingSent(data.pendingRequests?.sent || []);
      }
    } catch (error) {
      console.error('Failed to fetch rivals data:', error);
    }
  };

  // Fetch on mount and when panel opens
  useEffect(() => {
    fetchRivalsData();
  }, []);

  useEffect(() => {
    if (showAddRival) {
      fetchRivalsData();
    }
  }, [showAddRival]);

  if (!narrativeEngine) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading narrative settings...
      </div>
    );
  }

  const { settings, rivals } = narrativeEngine;

  const handleToggleEnabled = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fitness/narrative/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: !settings.enabled }),
      });
      if (res.ok) {
        store.updateNarrativeSettings({ enabled: !settings.enabled });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
    setLoading(false);
  };

  const handleFrequencyChange = async (frequency: EncounterFrequency) => {
    setLoading(true);
    try {
      const res = await fetch('/api/fitness/narrative/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ encounterFrequency: frequency }),
      });
      if (res.ok) {
        store.updateNarrativeSettings({ encounterFrequency: frequency });
      }
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
    setLoading(false);
  };

  const handleNotificationToggle = async (key: 'encounterPopups' | 'weeklyShowdowns') => {
    const currentValue = settings.notificationPreferences[key];
    const newValue = !currentValue;

    // Optimistic update
    store.updateNarrativeSettings({
      notificationPreferences: {
        ...settings.notificationPreferences,
        [key]: newValue,
      },
    });

    try {
      const res = await fetch('/api/fitness/narrative/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          notificationPreferences: { [key]: newValue },
        }),
      });
      if (!res.ok) {
        // Revert on failure
        store.updateNarrativeSettings({
          notificationPreferences: {
            ...settings.notificationPreferences,
            [key]: currentValue,
          },
        });
      }
    } catch (error) {
      console.error('Failed to update notification preferences:', error);
      // Revert on error
      store.updateNarrativeSettings({
        notificationPreferences: {
          ...settings.notificationPreferences,
          [key]: currentValue,
        },
      });
    }
  };

  const handleAddPhantom = async (character: RivalCharacter) => {
    setLoading(true);
    try {
      const res = await fetch('/api/fitness/narrative/rivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rivalType: 'AI_PHANTOM',
          phantomConfig: {
            personality: character.personality,
            name: character.name,
            archetype: character.id,
          },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.type === 'rival_created' && data.rival) {
          store.addRival(data.rival);
        }
        closeAddRivalModal();
      }
    } catch (error) {
      console.error('Failed to add phantom rival:', error);
    }
    setLoading(false);
  };

  const closeAddRivalModal = () => {
    setShowAddRival(false);
    setAddRivalStep('choose-type');
    setSelectedPersonality(null);
    setSelectedFriendId(null);
  };

  const handleSelectPersonality = async (personality: PhantomPersonality) => {
    // Auto-assign the single character for this personality type
    const character = getCharacterForPersonality(personality);
    await handleAddPhantom(character);
  };

  const handleBackToType = () => {
    setAddRivalStep('choose-type');
    setSelectedFriendId(null);
    setSelectedPersonality(null);
  };

  // Step 1: Select a friend, then go to victory condition selection
  const handleSelectFriend = (friendId: string) => {
    setSelectedFriendId(friendId);
    setAddRivalStep('choose-friend-victory');
  };

  // Step 2: Select victory condition and send friend rivalry request
  const handleAddFriendWithVictory = async (victoryCondition: FriendVictoryCondition) => {
    if (!selectedFriendId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/fitness/narrative/rivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          rivalType: 'FRIEND',
          friendId: selectedFriendId,
          phantomConfig: { victoryCondition },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.type === 'request_sent') {
          // Add to pending sent requests
          setPendingSent((prev) => [...prev, data.request]);
        }
        closeAddRivalModal();
        // Remove from suggestions
        setSuggestedFriends((prev) => prev.filter((f) => f.id !== selectedFriendId));
      }
    } catch (error) {
      console.error('Failed to send rivalry request:', error);
    }
    setLoading(false);
  };

  // Accept or decline a rivalry request
  const handleRespondToRequest = async (requestId: string, action: 'accept' | 'decline') => {
    setLoading(true);
    try {
      const res = await fetch('/api/fitness/narrative/rivals/requests/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action }),
      });
      if (res.ok) {
        const data = await res.json();
        // Remove from pending received
        setPendingReceived((prev) => prev.filter((r) => r.id !== requestId));
        if (data.type === 'accepted') {
          // Add the new rivalry to store
          store.addRival(data.rivalry);
        }
        // Refresh data
        fetchRivalsData();
      }
    } catch (error) {
      console.error('Failed to respond to rivalry request:', error);
    }
    setLoading(false);
  };

  const handleRemoveRival = async (rivalId: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/fitness/narrative/rivals/${rivalId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        store.removeRival(rivalId);
      }
    } catch (error) {
      console.error('Failed to remove rival:', error);
    }
    setLoading(false);
    setRivalToRemove(null);
  };

  const getRivalName = (rival: RivalRelationship): string => {
    if (rival.rivalType === 'ai_phantom' && rival.phantomConfig) {
      return rival.phantomConfig.name || 'Shadow Self';
    }
    // For friend rivals, show their display name or username
    if (rival.friend) {
      return rival.friend.displayName || rival.friend.username || 'Friend Rival';
    }
    return 'Friend Rival';
  };

  const getRivalAvatar = (rival: RivalRelationship): string => {
    if (rival.rivalType === 'ai_phantom' && rival.phantomConfig?.avatar) {
      return rival.phantomConfig.avatar;
    }
    return '👤';
  };

  const getRivalColor = (rival: RivalRelationship): string => {
    if (rival.rivalType === 'ai_phantom' && rival.phantomConfig?.color) {
      return rival.phantomConfig.color;
    }
    return '#6366f1';
  };

  const getRivalTagline = (rival: RivalRelationship): string | null => {
    if (rival.rivalType === 'ai_phantom' && rival.phantomConfig?.tagline) {
      return rival.phantomConfig.tagline;
    }
    return null;
  };

  const getRivalVictoryCondition = (rival: RivalRelationship): { condition: string; tagline: string } | null => {
    // AI phantoms use personality-based conditions
    if (rival.rivalType === 'ai_phantom' && rival.phantomConfig?.personality) {
      const personality = rival.phantomConfig.personality as PhantomPersonality;
      const info = PERSONALITY_INFO[personality];
      if (info) {
        return { condition: info.victoryCondition, tagline: info.tagline };
      }
    }
    // Friend rivals use metric-based victory conditions
    if (rival.rivalType === 'friend') {
      const victoryCondition = rival.phantomConfig?.victoryCondition as FriendVictoryCondition | undefined;
      if (victoryCondition && FRIEND_VICTORY_CONDITIONS[victoryCondition]) {
        const info = FRIEND_VICTORY_CONDITIONS[victoryCondition];
        return { condition: info.name, tagline: info.metric };
      }
      // Fallback for old friend rivals
      return { condition: 'Best of 3', tagline: 'All-around' };
    }
    return null;
  };

  return (
    <div className="space-y-5 p-5">
      {/* Enable Toggle */}
      <div className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl">
        <span className="text-sm font-medium text-gray-200">Enable Rivals</span>
        <button
          onClick={handleToggleEnabled}
          disabled={loading}
          className={`w-14 h-7 rounded-full transition-colors ${
            settings.enabled ? 'bg-green-500' : 'bg-gray-600'
          }`}
        >
          <div
            className={`w-6 h-6 bg-white rounded-full transform transition-transform ${
              settings.enabled ? 'translate-x-7' : 'translate-x-0.5'
            }`}
          />
        </button>
      </div>

      {settings.enabled && (
        <>
          {/* Frequency Setting */}
          <div className="space-y-3">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block">
              Encounter Frequency
            </label>
            <div className="grid grid-cols-2 gap-3">
              {(['every_workout', 'daily', 'weekly'] as EncounterFrequency[]).map((freq) => (
                <button
                  key={freq}
                  onClick={() => handleFrequencyChange(freq)}
                  className={`p-3 text-sm font-medium rounded-xl transition-colors ${
                    settings.encounterFrequency === freq
                      ? 'bg-yellow-500/20 border-2 border-yellow-500 text-yellow-400'
                      : 'bg-gray-800/50 border border-gray-700 text-gray-400 hover:border-gray-500'
                  }`}
                >
                  {freq.replace('_', ' ').charAt(0).toUpperCase() + freq.replace('_', ' ').slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Pending Rivalry Requests (Received) */}
          {pendingReceived.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-yellow-400 uppercase tracking-wide block">
                ⚔️ Rivalry Challenges ({pendingReceived.length})
              </label>
              <div className="space-y-3">
                {pendingReceived.map((request) => (
                  <div
                    key={request.id}
                    className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center text-sm font-bold text-yellow-400">
                        {request.friend.displayName?.[0] || request.friend.username?.[0] || '?'}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-white">
                          {request.friend.displayName || request.friend.username} challenges you!
                        </div>
                        <div className="text-xs text-gray-400">
                          {FRIEND_VICTORY_CONDITIONS[request.victoryCondition as FriendVictoryCondition]?.name || 'Best of 3'} • Level {request.friend.level}
                        </div>
                      </div>
                    </div>
                    {request.message && (
                      <p className="text-xs text-gray-400 italic mb-3">"{request.message}"</p>
                    )}
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespondToRequest(request.id, 'accept')}
                        disabled={loading}
                        className="flex-1 py-2 text-sm font-medium rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 disabled:opacity-50"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondToRequest(request.id, 'decline')}
                        disabled={loading}
                        className="flex-1 py-2 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pending Sent Requests */}
          {pendingSent.length > 0 && (
            <div className="space-y-3">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block">
                Awaiting Response ({pendingSent.length})
              </label>
              <div className="space-y-2">
                {pendingSent.map((request) => (
                  <div
                    key={request.id}
                    className="p-3 bg-gray-800/30 border border-gray-700 rounded-xl flex items-center gap-3"
                  >
                    <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-xs font-medium">
                      {request.friend.displayName?.[0] || request.friend.username?.[0] || '?'}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm text-gray-300">
                        {request.friend.displayName || request.friend.username}
                      </div>
                      <div className="text-xs text-gray-500">Waiting for response...</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active Rivals */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-gray-400 uppercase tracking-wide">
                Active Rivals ({rivals.length}/{settings.maxActiveRivals})
              </label>
              {rivals.length < settings.maxActiveRivals && (
                <button
                  onClick={() => setShowAddRival(true)}
                  className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
                >
                  + Add Rival
                </button>
              )}
            </div>

            {rivals.length === 0 && pendingReceived.length === 0 && pendingSent.length === 0 ? (
              <div className="text-center p-6 bg-gray-800/30 rounded-xl">
                <p className="text-sm text-gray-500 mb-3">No rivals yet</p>
                <button
                  onClick={() => setShowAddRival(true)}
                  className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
                >
                  Add your first rival
                </button>
              </div>
            ) : rivals.length === 0 ? null : (
              <div className="space-y-3">
                {rivals.map((rival) => {
                  const victoryInfo = getRivalVictoryCondition(rival);
                  return (
                    <div
                      key={rival.id}
                      className="p-4 bg-gray-800/50 rounded-xl"
                      style={{ borderLeft: `4px solid ${getRivalColor(rival)}` }}
                    >
                      <div className="flex items-center gap-4">
                        {/* Avatar */}
                        {rival.rivalType === 'friend' && rival.friend?.avatarUrl ? (
                          <img
                            src={rival.friend.avatarUrl}
                            alt={getRivalName(rival)}
                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                          />
                        ) : rival.rivalType === 'friend' && rival.friend ? (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 bg-indigo-500/20 text-indigo-400"
                          >
                            {(rival.friend.displayName?.[0] || rival.friend.username?.[0] || '?').toUpperCase()}
                          </div>
                        ) : (
                          <div
                            className="w-12 h-12 rounded-full flex items-center justify-center text-2xl flex-shrink-0"
                            style={{ backgroundColor: `${getRivalColor(rival)}20` }}
                          >
                            {getRivalAvatar(rival)}
                          </div>
                        )}

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-white mb-0.5">
                            {getRivalName(rival)}
                          </div>
                          {getRivalTagline(rival) && (
                            <div className="text-xs italic text-gray-400 mb-1 truncate">
                              "{getRivalTagline(rival)}"
                            </div>
                          )}
                          <div className="text-xs text-gray-500">
                            {rival.rivalType === 'ai_phantom' ? 'AI Phantom' : 'Friend'} •{' '}
                            {rival.headToHead.userWins}W / {rival.headToHead.rivalWins}L
                          </div>
                        </div>

                        {/* Stats & Actions */}
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <div className="text-center">
                            <div className="text-base font-bold text-yellow-400">
                              Lv.{rival.respectLevel}
                            </div>
                            <div className="text-xs text-gray-500">Respect</div>
                          </div>
                          <button
                            onClick={() => setRivalToRemove(rival)}
                            className="text-lg text-red-400 hover:text-red-300 p-2"
                          >
                            ✕
                          </button>
                        </div>
                      </div>

                      {/* Victory Condition */}
                      {victoryInfo && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="text-gray-500">To win:</span>
                            <span className="text-yellow-400 font-medium">{victoryInfo.condition}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Add Rival Modal - Full screen on mobile, centered dialog on desktop */}
          {showAddRival && (
            <div
              className="fixed inset-0 bg-black/80 flex items-end sm:items-center justify-center z-50 sm:p-4"
              onClick={closeAddRivalModal}
            >
              <div
                className="bg-gray-900 border-t sm:border border-gray-700 rounded-t-2xl sm:rounded-2xl p-5 w-full sm:max-w-sm max-h-[90vh] sm:max-h-[85vh] overflow-y-auto"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between mb-5">
                  <div className="flex items-center gap-3">
                    {(addRivalStep === 'choose-personality' || addRivalStep === 'choose-friend-victory') && (
                      <button
                        onClick={handleBackToType}
                        className="text-gray-400 hover:text-white"
                      >
                        ←
                      </button>
                    )}
                    <h3 className="text-base font-bold text-yellow-400">
                      {addRivalStep === 'choose-type' && 'Add Rival'}
                      {addRivalStep === 'choose-personality' && 'Choose Style'}
                      {addRivalStep === 'choose-friend-victory' && 'Victory Condition'}
                    </h3>
                  </div>
                  <button
                    onClick={closeAddRivalModal}
                    className="text-gray-500 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* Step 1: Choose Type */}
                {addRivalStep === 'choose-type' && (
                  <>
                    <button
                      onClick={() => setAddRivalStep('choose-personality')}
                      disabled={loading}
                      className="w-full p-4 mb-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-yellow-500/50 transition-colors text-left"
                    >
                      <div className="text-sm font-medium text-white mb-1">🤖 AI Phantom</div>
                      <div className="text-xs text-gray-500">
                        A virtual rival that adapts to your level
                      </div>
                    </button>

                    {suggestedFriends.length > 0 && (
                      <div className="space-y-3">
                        <div className="text-xs text-gray-400 mb-3">
                          Or challenge a friend:
                        </div>
                        {suggestedFriends.map((friend) => (
                          <button
                            key={friend.id}
                            onClick={() => handleSelectFriend(friend.id)}
                            disabled={loading}
                            className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-green-500/50 transition-colors flex items-center gap-4"
                          >
                            <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                              {friend.displayName?.[0] || friend.username?.[0] || '?'}
                            </div>
                            <div className="text-left flex-1">
                              <div className="text-sm font-medium text-white">
                                {friend.displayName || friend.username}
                              </div>
                              <div className="text-xs text-gray-500">
                                Level {friend.level}
                              </div>
                            </div>
                            <div className="text-gray-500 text-lg">›</div>
                          </button>
                        ))}
                      </div>
                    )}

                    {suggestedFriends.length === 0 && (
                      <div className="text-center text-sm text-gray-500 p-4">
                        Add friends to challenge them as rivals
                      </div>
                    )}
                  </>
                )}

                {/* Step 2: Choose Personality */}
                {addRivalStep === 'choose-personality' && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 mb-4">
                      Each style has different victory conditions:
                    </p>
                    {(Object.keys(PERSONALITY_INFO) as PhantomPersonality[]).map((personality) => {
                      const info = PERSONALITY_INFO[personality];
                      const character = getCharacterForPersonality(personality);
                      return (
                        <button
                          key={personality}
                          onClick={() => handleSelectPersonality(personality)}
                          disabled={loading}
                          className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-yellow-500/50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div
                              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
                              style={{ backgroundColor: `${character.color}20` }}
                            >
                              {character.avatar}
                            </div>
                            <div>
                              <div className="text-sm font-medium text-white">{character.name}</div>
                              <div className="text-xs text-gray-500">{info.name} type</div>
                            </div>
                          </div>
                          <div className="ml-13 space-y-1">
                            <div className="text-xs text-yellow-400 font-medium">
                              🎯 {info.victoryCondition}
                            </div>
                            <div className="text-xs text-gray-500 italic">
                              "{character.tagline}"
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                {/* Step: Choose Victory Condition for Friend */}
                {addRivalStep === 'choose-friend-victory' && selectedFriendId && (
                  <div className="space-y-3">
                    <p className="text-xs text-gray-400 mb-4">
                      How do you want to compete with{' '}
                      <span className="text-white font-medium">
                        {suggestedFriends.find((f) => f.id === selectedFriendId)?.displayName ||
                          suggestedFriends.find((f) => f.id === selectedFriendId)?.username ||
                          'your friend'}
                      </span>
                      ?
                    </p>
                    {(Object.keys(FRIEND_VICTORY_CONDITIONS) as FriendVictoryCondition[]).map((condition) => {
                      const info = FRIEND_VICTORY_CONDITIONS[condition];
                      return (
                        <button
                          key={condition}
                          onClick={() => handleAddFriendWithVictory(condition)}
                          disabled={loading}
                          className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-green-500/50 transition-colors text-left"
                        >
                          <div className="flex items-center gap-3 mb-1">
                            <div className="text-2xl">{info.icon}</div>
                            <div className="text-sm font-medium text-white">{info.name}</div>
                          </div>
                          <div className="ml-9 space-y-1">
                            <div className="text-xs text-gray-400">
                              {info.description}
                            </div>
                            <div className="text-xs text-green-400 font-medium">
                              {info.metric}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Remove Rival Confirmation Dialog */}
          {rivalToRemove && (
            <div
              className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
              onClick={() => setRivalToRemove(null)}
            >
              <div
                className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-xs"
                onClick={(e) => e.stopPropagation()}
              >
                <h3 className="text-base font-bold text-white mb-3">Remove Rival?</h3>
                <p className="text-sm text-gray-400 mb-5">
                  Are you sure you want to end your rivalry with{' '}
                  <span className="text-white font-medium">{getRivalName(rivalToRemove)}</span>?
                  {rivalToRemove.rivalType === 'friend' && (
                    <span className="block mt-2 text-xs text-gray-500">
                      Your win/loss record will be lost.
                    </span>
                  )}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setRivalToRemove(null)}
                    className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => handleRemoveRival(rivalToRemove.id)}
                    disabled={loading}
                    className="flex-1 py-2.5 text-sm font-medium rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Notification Preferences */}
          <div className="space-y-3 pt-5 border-t border-gray-700">
            <label className="text-xs font-medium text-gray-400 uppercase tracking-wide block mb-3">
              Notifications
            </label>
            <div className="space-y-3">
              {[
                { key: 'encounterPopups' as const, label: 'Encounter Popups' },
                { key: 'weeklyShowdowns' as const, label: 'Weekly Showdowns' },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleNotificationToggle(key)}
                  className="w-full flex items-center justify-between p-4 bg-gray-800/30 rounded-xl hover:bg-gray-800/50 transition-colors"
                >
                  <span className="text-sm text-gray-300">{label}</span>
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      settings.notificationPreferences[key]
                        ? 'bg-yellow-500 border-yellow-500'
                        : 'border-gray-600'
                    }`}
                  >
                    {settings.notificationPreferences[key] && (
                      <span className="text-black text-xs font-bold">✓</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
