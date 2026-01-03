'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow, format } from 'date-fns';
import { RetroNavBar } from '@/components/RetroNavBar';
import PartyPanel from '@/components/quest/PartyPanel';

interface Location {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  photoUrl: string | null;
  city: { id: string; name: string; country: string } | null;
}

interface QuestItem {
  id: string;
  completed: boolean;
  completedAt: string | null;
  sortOrder: number;
  priority: number;
  notes: string | null;
  location: Location;
  addedBy: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
  completedBy: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null } | null;
}

interface PartyMember {
  id: string;
  userId: string;
  role: 'OWNER' | 'MEMBER';
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED';
  invitedAt: string;
  joinedAt: string | null;
  user: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  };
}

interface Party {
  id: string;
  questId: string;
  createdAt: string;
  members: PartyMember[];
}

interface Quest {
  id: string;
  name: string;
  description: string | null;
  status: 'PLANNING' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  updatedAt: string;
  owner: { id: string; username: string | null; displayName: string | null; avatarUrl: string | null };
  targetCity: { id: string; name: string; country: string } | null;
  targetNeighborhood: { id: string; name: string } | null;
  items: QuestItem[];
  party: Party | null;
  completionStats: { total: number; completed: number; percentage: number };
}

interface QuestData {
  quest: Quest;
  isOwner: boolean;
  isPartyMember: boolean;
  currentUserId: string;
}

const statusColors = {
  PLANNING: 'bg-gray-500/20 text-gray-400 border-gray-500/30',
  ACTIVE: 'bg-green-500/20 text-green-400 border-green-500/30',
  COMPLETED: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
  ARCHIVED: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
};

const statusLabels = {
  PLANNING: 'Planning',
  ACTIVE: 'Active',
  COMPLETED: 'Completed',
  ARCHIVED: 'Archived',
};

const locationTypeIcons: Record<string, string> = {
  RESTAURANT: '🍽️',
  BAR: '🍺',
  CAFE: '☕',
  ATTRACTION: '🎡',
  HOTEL: '🏨',
  SHOP: '🛍️',
  NATURE: '🌲',
  TRANSPORT: '🚇',
  MUSEUM: '🏛️',
  BEACH: '🏖️',
  NIGHTLIFE: '🌙',
  OTHER: '📍',
};

export default function QuestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const questId = params.questId as string;
  const [data, setData] = useState<QuestData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [togglingItemId, setTogglingItemId] = useState<string | null>(null);

  const fetchQuest = useCallback(async () => {
    try {
      const res = await fetch(`/api/quests/${questId}`);
      if (!res.ok) {
        if (res.status === 404) {
          setError('Quest not found');
        } else if (res.status === 403) {
          setError('You do not have access to this quest');
        } else {
          setError('Failed to load quest');
        }
        return;
      }
      const questData = await res.json();
      setData(questData);
    } catch (err) {
      console.error('Error fetching quest:', err);
      setError('Failed to load quest');
    } finally {
      setIsLoading(false);
    }
  }, [questId]);

  useEffect(() => {
    if (questId) {
      fetchQuest();
    }
  }, [questId, fetchQuest]);

  const handleToggleItem = async (itemId: string, completed: boolean) => {
    if (!data) return;
    setTogglingItemId(itemId);

    // Optimistic update
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        quest: {
          ...prev.quest,
          items: prev.quest.items.map((item) =>
            item.id === itemId ? { ...item, completed: !completed } : item
          ),
        },
      };
    });

    try {
      const res = await fetch(`/api/quests/${questId}/items/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !completed }),
      });

      if (!res.ok) {
        // Revert on error
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            quest: {
              ...prev.quest,
              items: prev.quest.items.map((item) =>
                item.id === itemId ? { ...item, completed } : item
              ),
            },
          };
        });
      } else {
        // Refresh for accurate stats
        fetchQuest();
      }
    } catch (err) {
      console.error('Error toggling item:', err);
      // Revert on error
      setData((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          quest: {
            ...prev.quest,
            items: prev.quest.items.map((item) =>
              item.id === itemId ? { ...item, completed } : item
            ),
          },
        };
      });
    } finally {
      setTogglingItemId(null);
    }
  };

  if (isLoading) {
    return (
      <>
        <RetroNavBar />
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black navbar-offset flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <RetroNavBar />
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black navbar-offset">
          <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <div className="text-4xl mb-4">🗺️</div>
            <h1 className="text-xl font-bold text-white mb-2">{error || 'Something went wrong'}</h1>
            <button
              onClick={() => router.back()}
              className="text-purple-400 hover:text-purple-300"
            >
              Go back
            </button>
          </div>
        </div>
      </>
    );
  }

  const { quest, isOwner, currentUserId } = data;
  const incompleteItems = quest.items.filter((i) => !i.completed);
  const completedItems = quest.items.filter((i) => i.completed);

  return (
    <>
      <RetroNavBar />
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black navbar-offset pb-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="flex flex-col lg:flex-row gap-6">
            {/* Main Content */}
            <div className="flex-1">
              {/* Header */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <h1 className="text-2xl font-bold text-white truncate">{quest.name}</h1>
                      <span className={`px-2.5 py-1 text-xs font-medium rounded border ${statusColors[quest.status]}`}>
                        {statusLabels[quest.status]}
                      </span>
                    </div>
                    {quest.targetCity && (
                      <p className="text-gray-400">
                        {quest.targetNeighborhood && `${quest.targetNeighborhood.name}, `}
                        {quest.targetCity.name}, {quest.targetCity.country}
                      </p>
                    )}
                  </div>
                </div>

                {quest.description && (
                  <p className="text-gray-300 mb-4">{quest.description}</p>
                )}

                {/* Progress */}
                <div className="mb-4">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-gray-400">Progress</span>
                    <span className="text-gray-300">
                      {quest.completionStats.completed}/{quest.completionStats.total} locations
                    </span>
                  </div>
                  <div className="h-3 bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
                      style={{ width: `${quest.completionStats.percentage}%` }}
                    />
                  </div>
                </div>

                {/* Meta info */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  {quest.startDate && (
                    <span>Starts {format(new Date(quest.startDate), 'MMM d, yyyy')}</span>
                  )}
                  {quest.endDate && (
                    <span className="text-amber-400">Due {format(new Date(quest.endDate), 'MMM d, yyyy')}</span>
                  )}
                  <span>Updated {formatDistanceToNow(new Date(quest.updatedAt), { addSuffix: true })}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
                <h2 className="text-sm font-medium text-gray-400 mb-4">
                  Locations ({quest.items.length})
                </h2>

                {quest.items.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No locations added yet</p>
                ) : (
                  <div className="space-y-2">
                    {/* Incomplete items first */}
                    {incompleteItems.map((item) => (
                      <QuestItemRow
                        key={item.id}
                        item={item}
                        onToggle={handleToggleItem}
                        isToggling={togglingItemId === item.id}
                        isCompleted={quest.status === 'COMPLETED'}
                      />
                    ))}

                    {/* Completed items */}
                    {completedItems.length > 0 && incompleteItems.length > 0 && (
                      <div className="border-t border-gray-700 my-4 pt-2">
                        <p className="text-xs text-gray-500 mb-2">Completed ({completedItems.length})</p>
                      </div>
                    )}
                    {completedItems.map((item) => (
                      <QuestItemRow
                        key={item.id}
                        item={item}
                        onToggle={handleToggleItem}
                        isToggling={togglingItemId === item.id}
                        isCompleted={quest.status === 'COMPLETED'}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar - Party Panel */}
            <div className="w-full lg:w-72 flex-shrink-0">
              <PartyPanel
                questId={quest.id}
                party={quest.party}
                isQuestOwner={isOwner}
                currentUserId={currentUserId}
                questStatus={quest.status}
                onPartyUpdate={fetchQuest}
              />

              {/* Quest Owner */}
              <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5 mt-4">
                <h3 className="text-sm font-medium text-gray-400 mb-3">Quest Owner</h3>
                <Link
                  href={`/users/${quest.owner.id}`}
                  className="flex items-center gap-3 hover:opacity-80 transition-opacity"
                >
                  {quest.owner.avatarUrl ? (
                    <Image
                      src={quest.owner.avatarUrl}
                      alt={quest.owner.displayName || quest.owner.username || ''}
                      width={36}
                      height={36}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {(quest.owner.displayName || quest.owner.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div>
                    <p className="text-sm text-white">
                      {quest.owner.displayName || quest.owner.username || 'Player'}
                    </p>
                    {isOwner && <p className="text-xs text-purple-400">You</p>}
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function QuestItemRow({
  item,
  onToggle,
  isToggling,
  isCompleted: questCompleted,
}: {
  item: QuestItem;
  onToggle: (id: string, completed: boolean) => void;
  isToggling: boolean;
  isCompleted: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
        item.completed ? 'bg-gray-900/30 opacity-60' : 'bg-gray-900/50 hover:bg-gray-900/70'
      }`}
    >
      <button
        onClick={() => onToggle(item.id, item.completed)}
        disabled={isToggling || questCompleted}
        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
          item.completed
            ? 'bg-green-500/20 border-green-500 text-green-400'
            : 'border-gray-600 hover:border-purple-500'
        } disabled:opacity-50 disabled:cursor-not-allowed`}
      >
        {isToggling ? (
          <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        ) : item.completed ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : null}
      </button>

      <span className="text-xl">{locationTypeIcons[item.location.type] || '📍'}</span>

      <div className="flex-1 min-w-0">
        <Link
          href={`/travel/locations/${item.location.id}`}
          className={`text-sm font-medium transition-colors ${
            item.completed ? 'text-gray-400 line-through' : 'text-white hover:text-purple-400'
          }`}
        >
          {item.location.name}
        </Link>
        {item.location.city && (
          <p className="text-xs text-gray-500 truncate">
            {item.location.city.name}, {item.location.city.country}
          </p>
        )}
      </div>

      {item.completedBy && (
        <div className="flex items-center gap-1 text-xs text-gray-500">
          {item.completedBy.avatarUrl ? (
            <Image
              src={item.completedBy.avatarUrl}
              alt=""
              width={16}
              height={16}
              className="rounded-full"
            />
          ) : (
            <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center">
              <span className="text-[10px] text-gray-400">
                {(item.completedBy.displayName || item.completedBy.username || '?').charAt(0)}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
