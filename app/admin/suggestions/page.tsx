'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

type SuggestionStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

interface Suggestion {
  id: string;
  field: string;
  oldValue: string | null;
  newValue: string;
  status: SuggestionStatus;
  createdAt: string;
  moderatedAt: string | null;
  moderationNotes: string | null;
  location: {
    id: string;
    name: string;
    city: string | null;
    neighborhood: string | null;
  };
  suggestedBy: {
    id: string;
    username: string | null;
    email: string | null;
    avatarUrl: string | null;
  };
  moderatedBy: {
    id: string;
    username: string | null;
  } | null;
}

const STATUS_TABS: { value: SuggestionStatus | 'ALL'; label: string; color: string }[] = [
  { value: 'PENDING', label: 'Pending', color: 'text-yellow-400' },
  { value: 'APPROVED', label: 'Approved', color: 'text-green-400' },
  { value: 'REJECTED', label: 'Rejected', color: 'text-red-400' },
  { value: 'ALL', label: 'All', color: 'text-white' },
];

const FIELD_LABELS: Record<string, string> = {
  neighborhood: 'Neighborhood',
  hours: 'Hours',
  city: 'City',
  name: 'Name',
  address: 'Address',
  description: 'Description',
  website: 'Website',
  phone: 'Phone',
};

export default function AdminSuggestionsPage() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<SuggestionStatus | 'ALL'>('PENDING');
  const [processing, setProcessing] = useState<string | null>(null);
  const [moderationNotes, setModerationNotes] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSuggestions();
  }, [statusFilter]);

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/admin/suggestions?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403) throw new Error('Access denied');
        throw new Error('Failed to fetch suggestions');
      }

      const data = await res.json();
      setSuggestions(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  async function handleModerate(suggestionId: string, action: 'APPROVE' | 'REJECT') {
    setProcessing(suggestionId);

    try {
      const res = await fetch(`/api/admin/suggestions/${suggestionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          notes: moderationNotes[suggestionId] || null,
        }),
      });

      if (!res.ok) throw new Error('Failed to process suggestion');

      // Remove from list
      setSuggestions(suggestions.filter((s) => s.id !== suggestionId));
      setModerationNotes((prev) => {
        const newNotes = { ...prev };
        delete newNotes[suggestionId];
        return newNotes;
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process');
    } finally {
      setProcessing(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Location Edit Suggestions</h1>
        <button
          onClick={fetchSuggestions}
          className="px-4 py-2 text-sm bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Status tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? `bg-gray-700 ${tab.color} border border-gray-600`
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
          {error}
        </div>
      )}

      {/* Suggestions list */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-gray-800 rounded-lg animate-pulse" />
          ))}
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/50 border border-gray-700 rounded-lg">
          <p className="text-gray-400">No suggestions found with this status.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-gray-800 border border-gray-700 rounded-lg p-4"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {suggestion.suggestedBy.avatarUrl ? (
                    <Image
                      src={suggestion.suggestedBy.avatarUrl}
                      alt={suggestion.suggestedBy.username || 'User'}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-gray-700 rounded-full flex items-center justify-center">
                      <span className="text-gray-400">
                        {(suggestion.suggestedBy.username || 'U').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="font-medium text-white">
                      {suggestion.suggestedBy.username || 'Anonymous'}
                    </p>
                    <p className="text-sm text-gray-400">{suggestion.suggestedBy.email}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">
                  {formatDistanceToNow(new Date(suggestion.createdAt), { addSuffix: true })}
                </span>
              </div>

              {/* Location info */}
              <div className="mb-4">
                <Link
                  href={`/locations/${suggestion.location.id}`}
                  className="text-purple-400 hover:underline font-medium"
                >
                  {suggestion.location.name}
                </Link>
                {suggestion.location.city && (
                  <span className="text-gray-400">
                    {' '}
                    in {suggestion.location.neighborhood && `${suggestion.location.neighborhood}, `}
                    {suggestion.location.city}
                  </span>
                )}
              </div>

              {/* Change details */}
              <div className="bg-gray-900/50 rounded-lg p-3 mb-4">
                <p className="text-sm text-gray-400 mb-2">
                  Change to <span className="text-white font-medium">{FIELD_LABELS[suggestion.field] || suggestion.field}</span>:
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Current</p>
                    <p className="text-gray-300 bg-gray-800 rounded px-2 py-1 text-sm">
                      {suggestion.oldValue || <span className="text-gray-500 italic">Empty</span>}
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-xs text-gray-500 mb-1">Suggested</p>
                    <p className="text-green-400 bg-gray-800 rounded px-2 py-1 text-sm">
                      {suggestion.newValue}
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions for pending suggestions */}
              {suggestion.status === 'PENDING' && (
                <>
                  <div className="mb-4">
                    <label className="block text-sm text-gray-400 mb-1">
                      Moderation Notes (optional)
                    </label>
                    <input
                      type="text"
                      value={moderationNotes[suggestion.id] || ''}
                      onChange={(e) =>
                        setModerationNotes((prev) => ({
                          ...prev,
                          [suggestion.id]: e.target.value,
                        }))
                      }
                      placeholder="Add notes about this decision..."
                      className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleModerate(suggestion.id, 'APPROVE')}
                      disabled={processing === suggestion.id}
                      className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                    >
                      Approve & Apply
                    </button>
                    <button
                      onClick={() => handleModerate(suggestion.id, 'REJECT')}
                      disabled={processing === suggestion.id}
                      className="px-4 py-2 bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                </>
              )}

              {/* Show moderation info for processed suggestions */}
              {suggestion.status !== 'PENDING' && suggestion.moderatedBy && (
                <div className="text-sm text-gray-400">
                  <span className={suggestion.status === 'APPROVED' ? 'text-green-400' : 'text-red-400'}>
                    {suggestion.status}
                  </span>
                  {' by '}
                  {suggestion.moderatedBy.username || 'Admin'}
                  {suggestion.moderationNotes && (
                    <span className="ml-2 text-gray-500">- {suggestion.moderationNotes}</span>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
