'use client';

import Link from 'next/link';
import Image from 'next/image';
import { formatDistanceToNow } from 'date-fns';

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
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ABANDONED';
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

interface QuestCardProps {
  quest: Quest;
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

export default function QuestCard({ quest }: QuestCardProps) {
  const { completionStats } = quest;
  const previewItems = quest.items.slice(0, 3);

  return (
    <Link
      href={`/quests/${quest.id}`}
      className="block bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-purple-500/50 hover:bg-gray-800/70 transition-all group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white group-hover:text-purple-400 transition-colors truncate">
            {quest.title}
          </h3>
          {quest.city && (
            <p className="text-sm text-gray-400 mt-0.5">
              {quest.neighborhood ? `${quest.neighborhood}, ` : ''}
              {quest.city}
            </p>
          )}
        </div>
        <span
          className={`ml-2 px-2 py-0.5 text-xs font-medium rounded border ${statusColors[quest.status]}`}
        >
          {statusLabels[quest.status]}
        </span>
      </div>

      {quest.description && (
        <p className="text-sm text-gray-400 mb-3 line-clamp-2">{quest.description}</p>
      )}

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-400">Progress</span>
          <span className="text-gray-300">
            {completionStats.completed}/{completionStats.total} locations
          </span>
        </div>
        <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
            style={{ width: `${completionStats.percentage}%` }}
          />
        </div>
      </div>

      {/* Preview items */}
      {previewItems.length > 0 && (
        <div className="flex items-center gap-1.5 mb-3">
          {previewItems.map((item) => (
            <div
              key={item.id}
              className={`relative w-10 h-10 rounded overflow-hidden border ${
                item.completed ? 'border-green-500/50' : 'border-gray-600'
              }`}
            >
              {item.location.photoUrl ? (
                <Image
                  src={item.location.photoUrl}
                  alt={item.location.name}
                  fill
                  className={`object-cover ${item.completed ? 'opacity-50' : ''}`}
                />
              ) : (
                <div className="w-full h-full bg-gray-700 flex items-center justify-center">
                  <span className="text-xs text-gray-400">
                    {item.location.name.charAt(0)}
                  </span>
                </div>
              )}
              {item.completed && (
                <div className="absolute inset-0 flex items-center justify-center bg-green-500/30">
                  <svg
                    className="w-5 h-5 text-green-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                </div>
              )}
            </div>
          ))}
          {quest.items.length > 3 && (
            <div className="w-10 h-10 rounded bg-gray-700 border border-gray-600 flex items-center justify-center">
              <span className="text-xs text-gray-400">+{quest.items.length - 3}</span>
            </div>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>Updated {formatDistanceToNow(new Date(quest.updatedAt), { addSuffix: true })}</span>
        {quest.endDate && (
          <span className="text-amber-400">
            Due {formatDistanceToNow(new Date(quest.endDate), { addSuffix: true })}
          </span>
        )}
      </div>
    </Link>
  );
}
