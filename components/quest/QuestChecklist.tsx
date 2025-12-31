'use client';

import { useState, useTransition } from 'react';
import Image from 'next/image';
import Link from 'next/link';

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

interface QuestChecklistProps {
  questId: string;
  items: QuestItem[];
  editable?: boolean;
  onItemUpdate?: (itemId: string, data: { completed?: boolean; notes?: string }) => Promise<void>;
  onItemRemove?: (itemId: string) => Promise<void>;
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    RESTAURANT: '🍽️',
    BAR: '🍺',
    CAFE: '☕',
    MUSEUM: '🏛️',
    PARK: '🌳',
    LANDMARK: '🏛️',
    SHOP: '🛍️',
    ENTERTAINMENT: '🎭',
    NATURE: '🌲',
    BEACH: '🏖️',
    HOTEL: '🏨',
    TRANSIT: '🚇',
    OTHER: '📍',
  };
  return icons[category] || '📍';
}

export default function QuestChecklist({
  questId,
  items,
  editable = true,
  onItemUpdate,
  onItemRemove,
}: QuestChecklistProps) {
  const [expandedItem, setExpandedItem] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);

  const handleToggleComplete = async (item: QuestItem) => {
    if (!editable || !onItemUpdate) return;

    setLoadingItem(item.id);
    try {
      await onItemUpdate(item.id, { completed: !item.completed });
    } finally {
      setLoadingItem(null);
    }
  };

  const handleRemove = async (itemId: string) => {
    if (!editable || !onItemRemove) return;

    if (!confirm('Remove this location from the quest?')) return;

    setLoadingItem(itemId);
    try {
      await onItemRemove(itemId);
    } finally {
      setLoadingItem(null);
    }
  };

  const completedCount = items.filter((i) => i.completed).length;
  const totalCount = items.length;

  return (
    <div className="space-y-4">
      {/* Summary header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">
          Quest Locations
          <span className="ml-2 text-sm font-normal text-gray-400">
            ({completedCount}/{totalCount} completed)
          </span>
        </h3>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500"
          style={{ width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` }}
        />
      </div>

      {/* Items list */}
      {items.length === 0 ? (
        <div className="text-center py-8 text-gray-400">
          <p>No locations in this quest yet.</p>
          <p className="text-sm mt-1">Add locations from your hotlist to get started!</p>
        </div>
      ) : (
        <ul className="space-y-2">
          {items.map((item, index) => {
            const isExpanded = expandedItem === item.id;
            const isLoading = loadingItem === item.id;

            return (
              <li
                key={item.id}
                className={`bg-gray-800/50 border rounded-lg overflow-hidden transition-all ${
                  item.completed
                    ? 'border-green-500/30 bg-green-900/10'
                    : 'border-gray-700 hover:border-gray-600'
                }`}
              >
                <div className="flex items-center gap-3 p-3">
                  {/* Order number / checkbox */}
                  <button
                    onClick={() => handleToggleComplete(item)}
                    disabled={!editable || isLoading}
                    className={`flex-shrink-0 w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all ${
                      item.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-500 text-gray-400 hover:border-purple-500 hover:text-purple-400'
                    } ${!editable ? 'cursor-default' : 'cursor-pointer'} ${isLoading ? 'opacity-50' : ''}`}
                  >
                    {item.completed ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M5 13l4 4L19 7"
                        />
                      </svg>
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </button>

                  {/* Location photo */}
                  <div className="relative w-12 h-12 rounded overflow-hidden flex-shrink-0">
                    {item.location.photoUrl ? (
                      <Image
                        src={item.location.photoUrl}
                        alt={item.location.name}
                        fill
                        className={`object-cover ${item.completed ? 'opacity-60' : ''}`}
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-700 flex items-center justify-center text-xl">
                        {getCategoryIcon(item.location.category)}
                      </div>
                    )}
                  </div>

                  {/* Location info */}
                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/locations/${item.location.id}`}
                      className={`font-medium hover:text-purple-400 transition-colors ${
                        item.completed ? 'text-gray-400 line-through' : 'text-white'
                      }`}
                    >
                      {item.location.name}
                    </Link>
                    <p className="text-sm text-gray-400 truncate">
                      {getCategoryIcon(item.location.category)} {item.location.city}
                      {item.location.averageRating && (
                        <span className="ml-2">⭐ {item.location.averageRating.toFixed(1)}</span>
                      )}
                    </p>
                  </div>

                  {/* User badges */}
                  <div className="flex items-center gap-1">
                    {item.location.userSpecific?.visited && (
                      <span className="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                        Visited
                      </span>
                    )}
                    {item.location.userSpecific?.hotlist && (
                      <span className="text-red-400">❤️</span>
                    )}
                  </div>

                  {/* Expand/actions */}
                  <button
                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <svg
                      className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                </div>

                {/* Expanded content */}
                {isExpanded && (
                  <div className="px-3 pb-3 pt-0 border-t border-gray-700/50">
                    {item.location.description && (
                      <p className="text-sm text-gray-400 mt-2 mb-3">{item.location.description}</p>
                    )}

                    <div className="flex items-center gap-2 text-sm">
                      <Link
                        href={`/locations/${item.location.id}`}
                        className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded hover:bg-purple-500/30 transition-colors"
                      >
                        View Details
                      </Link>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${item.location.latitude},${item.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                      >
                        Directions
                      </a>
                      {editable && (
                        <button
                          onClick={() => handleRemove(item.id)}
                          disabled={isLoading}
                          className="px-3 py-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors ml-auto"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    {item.notes && (
                      <div className="mt-2 p-2 bg-gray-700/30 rounded text-sm text-gray-300">
                        <span className="text-gray-500">Notes: </span>
                        {item.notes}
                      </div>
                    )}

                    {item.completed && item.completedAt && (
                      <p className="text-xs text-green-400 mt-2">
                        ✓ Completed on {new Date(item.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
