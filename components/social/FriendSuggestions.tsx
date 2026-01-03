'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { UserPlus, Loader2, Users, Sparkles } from 'lucide-react';

interface Suggestion {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  mutualFriends: number;
  mutualFriendNames: string[];
  reason: string;
}

interface SuggestionsResponse {
  suggestions: Suggestion[];
  type: 'mutual' | 'popular';
}

interface FriendSuggestionsProps {
  onSendRequest: (userId: string) => Promise<void>;
}

export default function FriendSuggestions({ onSendRequest }: FriendSuggestionsProps) {
  const [data, setData] = useState<SuggestionsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendingTo, setSendingTo] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function fetchSuggestions() {
      try {
        const res = await fetch('/api/friends/suggestions');
        if (res.ok) {
          const json = await res.json();
          setData(json);
        }
      } catch (err) {
        console.error('Failed to fetch suggestions:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchSuggestions();
  }, []);

  const handleSendRequest = async (userId: string) => {
    setSendingTo(userId);
    try {
      await onSendRequest(userId);
      setSentTo((prev) => new Set([...prev, userId]));
    } catch (err) {
      console.error('Failed to send request:', err);
    } finally {
      setSendingTo(null);
    }
  };

  if (loading) {
    return (
      <div
        className="rounded-lg p-6"
        style={{
          background: 'var(--rpg-card)',
          border: '2px solid var(--rpg-border)',
          boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex justify-center py-4">
          <Loader2
            className="w-6 h-6 animate-spin"
            style={{ color: 'var(--rpg-purple)' }}
          />
        </div>
      </div>
    );
  }

  if (!data || data.suggestions.length === 0) {
    return null;
  }

  const filteredSuggestions = data.suggestions.filter((s) => !sentTo.has(s.id));

  if (filteredSuggestions.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg p-5"
      style={{
        background: 'var(--rpg-card)',
        border: '2px solid var(--rpg-border)',
        boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        {data.type === 'mutual' ? (
          <Users className="w-5 h-5" style={{ color: 'var(--rpg-teal)' }} />
        ) : (
          <Sparkles className="w-5 h-5" style={{ color: 'var(--rpg-gold)' }} />
        )}
        <h3 className="text-sm font-semibold" style={{ color: 'var(--rpg-text)' }}>
          {data.type === 'mutual' ? 'People You May Know' : 'Suggested Players'}
        </h3>
      </div>

      {/* Suggestions Grid */}
      <div className="grid gap-3">
        {filteredSuggestions.map((suggestion) => (
          <div
            key={suggestion.id}
            className="flex items-center gap-3 p-3 rounded-lg transition-colors"
            style={{ background: 'rgba(0, 0, 0, 0.3)' }}
          >
            {/* Avatar */}
            <Link href={`/users/${suggestion.id}`} className="flex-shrink-0">
              {suggestion.avatarUrl ? (
                <Image
                  src={suggestion.avatarUrl}
                  alt=""
                  width={44}
                  height={44}
                  className="rounded-full"
                />
              ) : (
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center text-base font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-teal-dark) 100%)',
                    color: 'var(--rpg-bg-dark)',
                  }}
                >
                  {(suggestion.displayName || suggestion.username || '?').charAt(0).toUpperCase()}
                </div>
              )}
            </Link>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <Link
                href={`/users/${suggestion.id}`}
                className="block font-medium text-sm truncate hover:underline"
                style={{ color: 'var(--rpg-text)' }}
              >
                {suggestion.displayName || suggestion.username || 'Unknown'}
              </Link>
              <p className="text-xs truncate" style={{ color: 'var(--rpg-muted)' }}>
                {suggestion.reason}
              </p>
              <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                Level {suggestion.level}
              </p>
            </div>

            {/* Add Button */}
            <button
              onClick={() => handleSendRequest(suggestion.id)}
              disabled={sendingTo === suggestion.id}
              className="flex-shrink-0 p-2 rounded-lg transition-colors disabled:opacity-50"
              style={{
                background: 'var(--rpg-purple)',
                color: '#fff',
              }}
              title="Add Friend"
            >
              {sendingTo === suggestion.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <UserPlus className="w-4 h-4" />
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      {data.type === 'mutual' && filteredSuggestions.length > 0 && (
        <p
          className="text-xs text-center mt-4"
          style={{ color: 'var(--rpg-muted)' }}
        >
          Based on your mutual connections
        </p>
      )}
    </div>
  );
}
