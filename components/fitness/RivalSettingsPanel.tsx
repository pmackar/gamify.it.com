'use client';

import { useState, useEffect } from 'react';
import { useFitnessStore } from '@/lib/fitness/store';
import type { NarrativeSettings, RivalRelationship, EncounterFrequency } from '@/lib/fitness/types';

interface FriendSuggestion {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
}

export function RivalSettingsPanel() {
  const store = useFitnessStore();
  const narrativeEngine = store.narrativeEngine;
  const [loading, setLoading] = useState(false);
  const [suggestedFriends, setSuggestedFriends] = useState<FriendSuggestion[]>([]);
  const [showAddRival, setShowAddRival] = useState(false);

  // Fetch suggested friends when panel opens
  useEffect(() => {
    const fetchSuggestions = async () => {
      try {
        const res = await fetch('/api/fitness/narrative/rivals');
        if (res.ok) {
          const data = await res.json();
          setSuggestedFriends(data.suggestedFriends || []);
        }
      } catch (error) {
        console.error('Failed to fetch friend suggestions:', error);
      }
    };

    if (showAddRival) {
      fetchSuggestions();
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

  const handleAddPhantom = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/fitness/narrative/rivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rivalType: 'AI_PHANTOM' }),
      });
      if (res.ok) {
        const newRival = await res.json();
        store.addRival(newRival);
        setShowAddRival(false);
      }
    } catch (error) {
      console.error('Failed to add phantom rival:', error);
    }
    setLoading(false);
  };

  const handleAddFriend = async (friendId: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/fitness/narrative/rivals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rivalType: 'FRIEND', friendId }),
      });
      if (res.ok) {
        const newRival = await res.json();
        store.addRival(newRival);
        setShowAddRival(false);
        // Remove from suggestions
        setSuggestedFriends((prev) => prev.filter((f) => f.id !== friendId));
      }
    } catch (error) {
      console.error('Failed to add friend rival:', error);
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
  };

  const getRivalName = (rival: RivalRelationship): string => {
    if (rival.rivalType === 'ai_phantom' && rival.phantomConfig) {
      return rival.phantomConfig.name || 'Shadow Self';
    }
    return 'Friend Rival';
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

            {rivals.length === 0 ? (
              <div className="text-center p-6 bg-gray-800/30 rounded-xl">
                <p className="text-sm text-gray-500 mb-3">No rivals yet</p>
                <button
                  onClick={() => setShowAddRival(true)}
                  className="text-sm font-medium text-yellow-400 hover:text-yellow-300"
                >
                  Add your first rival
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {rivals.map((rival) => (
                  <div
                    key={rival.id}
                    className="flex items-center justify-between p-4 bg-gray-800/50 rounded-xl"
                  >
                    <div>
                      <div className="text-sm font-medium text-white mb-1">
                        {getRivalName(rival)}
                      </div>
                      <div className="text-xs text-gray-500">
                        {rival.rivalType === 'ai_phantom' ? 'AI Phantom' : 'Friend'} •{' '}
                        {rival.headToHead.userWins}W / {rival.headToHead.rivalWins}L
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="text-base font-bold text-yellow-400">
                          Lv.{rival.respectLevel}
                        </div>
                        <div className="text-xs text-gray-500">Respect</div>
                      </div>
                      <button
                        onClick={() => handleRemoveRival(rival.id)}
                        className="text-lg text-red-400 hover:text-red-300 p-2"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Add Rival Modal */}
          {showAddRival && (
            <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
              <div className="bg-gray-900 border border-gray-700 rounded-2xl p-5 w-full max-w-sm">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-bold text-yellow-400">Add Rival</h3>
                  <button
                    onClick={() => setShowAddRival(false)}
                    className="text-gray-500 hover:text-white text-xl"
                  >
                    ✕
                  </button>
                </div>

                {/* AI Phantom Option */}
                <button
                  onClick={handleAddPhantom}
                  disabled={loading}
                  className="w-full p-4 mb-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-yellow-500/50 transition-colors text-left"
                >
                  <div className="text-sm font-medium text-white mb-1">🤖 AI Phantom</div>
                  <div className="text-xs text-gray-500">
                    A virtual rival that adapts to your level
                  </div>
                </button>

                {/* Friend Options */}
                {suggestedFriends.length > 0 && (
                  <div className="space-y-3">
                    <div className="text-xs text-gray-400 mb-3">
                      Or challenge a friend:
                    </div>
                    {suggestedFriends.map((friend) => (
                      <button
                        key={friend.id}
                        onClick={() => handleAddFriend(friend.id)}
                        disabled={loading}
                        className="w-full p-4 bg-gray-800/50 border border-gray-700 rounded-xl hover:border-green-500/50 transition-colors flex items-center gap-4"
                      >
                        <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center text-sm font-medium">
                          {friend.displayName?.[0] || friend.username?.[0] || '?'}
                        </div>
                        <div className="text-left">
                          <div className="text-sm font-medium text-white">
                            {friend.displayName || friend.username}
                          </div>
                          <div className="text-xs text-gray-500">
                            Level {friend.level}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {suggestedFriends.length === 0 && (
                  <div className="text-center text-sm text-gray-500 p-4">
                    Add friends to challenge them as rivals
                  </div>
                )}
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
                { key: 'encounterPopups', label: 'Encounter Popups' },
                { key: 'weeklyShowdowns', label: 'Weekly Showdowns' },
              ].map(({ key, label }) => (
                <div
                  key={key}
                  className="flex items-center justify-between p-4 bg-gray-800/30 rounded-xl"
                >
                  <span className="text-sm text-gray-300">{label}</span>
                  <div
                    className={`w-6 h-6 rounded-md border-2 flex items-center justify-center ${
                      settings.notificationPreferences[key as keyof typeof settings.notificationPreferences]
                        ? 'bg-yellow-500 border-yellow-500'
                        : 'border-gray-600'
                    }`}
                  >
                    {settings.notificationPreferences[key as keyof typeof settings.notificationPreferences] && (
                      <span className="text-black text-xs font-bold">✓</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
