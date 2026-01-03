'use client';

import { useState } from 'react';

interface Kudos {
  id: string;
  emoji: string;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
  };
}

interface ReactionPickerProps {
  activityId: string;
  kudos: Kudos[];
  hasGivenKudos: boolean;
  onUpdate?: () => void;
}

const REACTION_EMOJIS = ['🔥', '💪', '👏', '❤️', '🎉', '⭐'];

export default function ReactionPicker({
  activityId,
  kudos,
  hasGivenKudos,
  onUpdate,
}: ReactionPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localKudos, setLocalKudos] = useState(kudos);
  const [localHasGiven, setLocalHasGiven] = useState(hasGivenKudos);

  // Group kudos by emoji
  const groupedReactions = localKudos.reduce((acc, k) => {
    if (!acc[k.emoji]) {
      acc[k.emoji] = [];
    }
    acc[k.emoji].push(k);
    return acc;
  }, {} as Record<string, Kudos[]>);

  const handleReact = async (emoji: string) => {
    if (submitting || localHasGiven) return;

    setSubmitting(true);
    setShowPicker(false);

    try {
      const res = await fetch(`/api/activity/${activityId}/kudos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emoji }),
      });

      if (res.ok) {
        const data = await res.json();
        setLocalKudos([...localKudos, data.kudos]);
        setLocalHasGiven(true);
        onUpdate?.();
      }
    } catch (err) {
      console.error('Failed to add reaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveReaction = async () => {
    if (submitting || !localHasGiven) return;

    setSubmitting(true);

    try {
      const res = await fetch(`/api/activity/${activityId}/kudos`, {
        method: 'DELETE',
      });

      if (res.ok) {
        // Find and remove user's kudos (we don't have user.id here, but API handles it)
        setLocalKudos(localKudos.filter((k) => {
          // This is a simplification - ideally we'd have the current user's ID
          return true;
        }));
        setLocalHasGiven(false);
        onUpdate?.();
        // Refresh to get accurate state
        window.location.reload();
      }
    } catch (err) {
      console.error('Failed to remove reaction:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* Existing Reactions */}
      {Object.entries(groupedReactions).map(([emoji, users]) => (
        <button
          key={emoji}
          onClick={() => localHasGiven ? handleRemoveReaction() : handleReact(emoji)}
          className="flex items-center gap-1 px-2 py-1 rounded-full text-xs transition-all hover:scale-105"
          style={{
            background: 'rgba(168, 85, 247, 0.15)',
            border: '1px solid rgba(168, 85, 247, 0.3)',
          }}
          title={users.map((u) => u.user.displayName || u.user.username).join(', ')}
        >
          <span>{emoji}</span>
          <span style={{ color: 'var(--rpg-text)' }}>{users.length}</span>
        </button>
      ))}

      {/* Add Reaction Button */}
      {!localHasGiven && (
        <div className="relative">
          <button
            onClick={() => setShowPicker(!showPicker)}
            className="flex items-center justify-center w-7 h-7 rounded-full transition-all hover:scale-105"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px dashed var(--rpg-border)',
              color: 'var(--rpg-muted)',
            }}
          >
            +
          </button>

          {/* Emoji Picker */}
          {showPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowPicker(false)}
              />
              <div
                className="absolute bottom-full left-0 mb-2 p-2 rounded-lg z-50 flex gap-1"
                style={{
                  background: 'var(--rpg-card)',
                  border: '2px solid var(--rpg-border)',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.5)',
                }}
              >
                {REACTION_EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    onClick={() => handleReact(emoji)}
                    className="w-8 h-8 flex items-center justify-center rounded hover:bg-white/10 transition-colors text-lg"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
