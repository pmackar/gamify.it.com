'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import QuestCard from '@/components/quest/QuestCard';

type QuestStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';

interface QuestItem {
  id: string;
  completed: boolean;
  location: {
    id: string;
    name: string;
    city: string;
    category: string;
    photoUrl: string | null;
  };
}

interface Quest {
  id: string;
  title: string;
  description: string | null;
  city: string | null;
  neighborhood: string | null;
  status: QuestStatus;
  createdAt: string;
  updatedAt: string;
  startDate: string | null;
  endDate: string | null;
  items: QuestItem[];
  completionStats: {
    total: number;
    completed: number;
    percentage: number;
  };
}

const statusTabs: { value: QuestStatus | 'ALL'; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'ACTIVE', label: 'Active' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'DRAFT', label: 'Drafts' },
];

export default function QuestsPage() {
  const [quests, setQuests] = useState<Quest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<QuestStatus | 'ALL'>('ALL');

  useEffect(() => {
    fetchQuests();
  }, [statusFilter]);

  async function fetchQuests() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'ALL') {
        params.set('status', statusFilter);
      }

      const res = await fetch(`/api/quests?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Please sign in to view your quests');
        }
        throw new Error('Failed to fetch quests');
      }

      const data = await res.json();
      setQuests(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }

  const filteredQuests = quests;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-white mb-2">My Quests</h1>
          <p className="text-gray-400">
            Plan your adventures with curated location collections
          </p>
        </div>
        <Link
          href="/quests/new"
          className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all shadow-lg shadow-purple-500/25"
        >
          + New Quest
        </Link>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 border-b border-gray-700 pb-4">
        {statusTabs.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              statusFilter === tab.value
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 animate-pulse"
            >
              <div className="h-6 bg-gray-700 rounded w-1/3 mb-3" />
              <div className="h-4 bg-gray-700 rounded w-2/3 mb-4" />
              <div className="h-2 bg-gray-700 rounded w-full" />
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchQuests}
            className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors"
          >
            Try Again
          </button>
        </div>
      ) : filteredQuests.length === 0 ? (
        <div className="text-center py-12 bg-gray-800/30 border border-gray-700 rounded-lg">
          <div className="text-5xl mb-4">⚔️</div>
          <h2 className="text-xl font-semibold text-white mb-2">No Quests Yet</h2>
          <p className="text-gray-400 mb-6 max-w-md mx-auto">
            {statusFilter === 'ALL'
              ? 'Start your first adventure! Create a quest to plan which locations you want to visit.'
              : `You don't have any ${statusFilter.toLowerCase()} quests.`}
          </p>
          <Link
            href="/quests/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg font-medium hover:from-purple-600 hover:to-pink-600 transition-all"
          >
            Create Your First Quest
          </Link>

          <div className="mt-8 pt-8 border-t border-gray-700">
            <h3 className="text-lg font-medium text-white mb-4">How Quests Work</h3>
            <div className="grid md:grid-cols-3 gap-4 text-left max-w-2xl mx-auto">
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="text-2xl mb-2">📍</div>
                <h4 className="font-medium text-purple-400 mb-1">Auto-Populate</h4>
                <p className="text-sm text-gray-400">
                  Choose a city or area and we'll suggest locations from your hotlist
                </p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="text-2xl mb-2">✅</div>
                <h4 className="font-medium text-purple-400 mb-1">Track Progress</h4>
                <p className="text-sm text-gray-400">
                  Check off locations as you visit them throughout your trip
                </p>
              </div>
              <div className="p-4 bg-gray-800/50 rounded-lg">
                <div className="text-2xl mb-2">🏆</div>
                <h4 className="font-medium text-purple-400 mb-1">Earn XP</h4>
                <p className="text-sm text-gray-400">
                  Complete quests to earn experience points and achievements
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-4">
          {filteredQuests.map((quest) => (
            <QuestCard key={quest.id} quest={quest} />
          ))}
        </div>
      )}
    </div>
  );
}
