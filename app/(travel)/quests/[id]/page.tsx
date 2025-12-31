'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import QuestChecklist from '@/components/quest/QuestChecklist';

type QuestStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

interface QuestItem {
  id: string;
  order: number;
  completed: boolean;
  completedAt: string | null;
  notes: string | null;
  location: {
    id: string;
    name: string;
    description: string | null;
    city: string;
    state: string;
    category: string;
    latitude: number;
    longitude: number;
    photoUrl: string | null;
    averageRating: number | null;
    totalVisits: number;
    userSpecific: {
      hotlist: boolean;
      visited: boolean;
      rating: number | null;
    } | null;
  };
}

interface Quest {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  neighborhood: string | null;
  centerLat: number | null;
  centerLng: number | null;
  radiusKm: number | null;
  status: QuestStatus;
  createdAt: string;
  updatedAt: string;
  startDate: string | null;
  endDate: string | null;
  completedAt: string | null;
  items: QuestItem[];
  completionStats: {
    total: number;
    completed: number;
    percentage: number;
  };
}

const statusColors = {
  DRAFT: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  COMPLETED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ABANDONED: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusLabels = {
  DRAFT: 'Draft',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ABANDONED: 'Abandoned',
};

export default function QuestDetailPage() {
  const router = useRouter();
  const params = useParams();
  const questId = params.id as string;

  const [quest, setQuest] = useState<Quest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchQuest = useCallback(async () => {
    try {
      const res = await fetch(`/api/quests/${questId}`);
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Quest not found');
        }
        if (res.status === 401) {
          throw new Error('Please sign in to view this quest');
        }
        throw new Error('Failed to fetch quest');
      }

      const data = await res.json();
      setQuest(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    fetchQuest();
  }, [fetchQuest]);

  const handleStatusChange = async (newStatus: QuestStatus) => {
    if (!quest) return;

    setUpdating(true);
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        throw new Error('Failed to update quest');
      }

      const data = await res.json();
      setQuest(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async () => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/quests/${questId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to delete quest');
      }

      router.push('/quests');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
      setUpdating(false);
    }
  };

  const handleItemUpdate = async (itemId: string, data: { completed?: boolean; notes?: string }) => {
    try {
      const res = await fetch(`/api/quests/${questId}/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId, ...data }),
      });

      if (!res.ok) {
        throw new Error('Failed to update item');
      }

      // Refresh quest data
      await fetchQuest();
    } catch (err) {
      console.error('Error updating item:', err);
    }
  };

  const handleItemRemove = async (itemId: string) => {
    try {
      const res = await fetch(`/api/quests/${questId}/items?itemId=${itemId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        throw new Error('Failed to remove item');
      }

      // Refresh quest data
      await fetchQuest();
    } catch (err) {
      console.error('Error removing item:', err);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded w-1/3 mb-4" />
          <div className="h-4 bg-gray-700 rounded w-2/3 mb-8" />
          <div className="h-2 bg-gray-700 rounded w-full mb-8" />
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-800 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !quest) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error || 'Quest not found'}</p>
          <Link
            href="/quests"
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Back to Quests
          </Link>
        </div>
      </div>
    );
  }

  const { completionStats } = quest;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/quests"
          className="inline-flex items-center text-gray-400 hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Quests
        </Link>

        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-white">{quest.title}</h1>
              <span
                className={`px-2 py-0.5 text-xs font-medium rounded border ${statusColors[quest.status]}`}
              >
                {statusLabels[quest.status]}
              </span>
            </div>
            {quest.city && (
              <p className="text-gray-400">
                {quest.neighborhood ? `${quest.neighborhood}, ` : ''}
                {quest.city}
              </p>
            )}
            {quest.description && (
              <p className="text-gray-400 mt-2">{quest.description}</p>
            )}
          </div>

          {/* Actions dropdown */}
          <div className="relative group">
            <button className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              {quest.status === 'ACTIVE' && (
                <button
                  onClick={() => handleStatusChange('COMPLETED')}
                  disabled={updating}
                  className="w-full px-4 py-2 text-left text-sm text-green-400 hover:bg-gray-700 rounded-t-lg"
                >
                  Mark as Completed
                </button>
              )}
              {quest.status === 'COMPLETED' && (
                <button
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={updating}
                  className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-700 rounded-t-lg"
                >
                  Reopen Quest
                </button>
              )}
              {quest.status !== 'ABANDONED' && (
                <button
                  onClick={() => handleStatusChange('ABANDONED')}
                  disabled={updating}
                  className="w-full px-4 py-2 text-left text-sm text-yellow-400 hover:bg-gray-700"
                >
                  Abandon Quest
                </button>
              )}
              {quest.status === 'ABANDONED' && (
                <button
                  onClick={() => handleStatusChange('ACTIVE')}
                  disabled={updating}
                  className="w-full px-4 py-2 text-left text-sm text-blue-400 hover:bg-gray-700 rounded-t-lg"
                >
                  Restart Quest
                </button>
              )}
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 rounded-b-lg border-t border-gray-700"
              >
                Delete Quest
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-white">{completionStats.total}</div>
          <div className="text-sm text-gray-400">Locations</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-400">{completionStats.completed}</div>
          <div className="text-sm text-gray-400">Completed</div>
        </div>
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-purple-400">{completionStats.percentage}%</div>
          <div className="text-sm text-gray-400">Progress</div>
        </div>
      </div>

      {/* Dates */}
      {(quest.startDate || quest.endDate) && (
        <div className="flex gap-4 mb-8 text-sm">
          {quest.startDate && (
            <div className="text-gray-400">
              Start: <span className="text-white">{new Date(quest.startDate).toLocaleDateString()}</span>
            </div>
          )}
          {quest.endDate && (
            <div className="text-gray-400">
              End: <span className="text-white">{new Date(quest.endDate).toLocaleDateString()}</span>
            </div>
          )}
        </div>
      )}

      {/* Checklist */}
      <QuestChecklist
        questId={questId}
        items={quest.items}
        editable={quest.status !== 'COMPLETED'}
        onItemUpdate={handleItemUpdate}
        onItemRemove={handleItemRemove}
      />

      {/* Add more locations */}
      {quest.status === 'ACTIVE' && (
        <div className="mt-6 text-center">
          <Link
            href={`/explore`}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add More Locations
          </Link>
        </div>
      )}

      {/* Delete confirmation modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-semibold text-white mb-2">Delete Quest?</h3>
            <p className="text-gray-400 mb-6">
              This will permanently delete "{quest.title}" and all its items. This action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={updating}
                className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
              >
                {updating ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
