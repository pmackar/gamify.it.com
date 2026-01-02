'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface Friend {
  friendshipId: string;
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  friendSince: string | null;
}

interface FriendCardProps {
  friend: Friend;
  onRemove?: (friendshipId: string) => void;
  isRemoving?: boolean;
}

export default function FriendCard({ friend, onRemove, isRemoving }: FriendCardProps) {
  const displayName = friend.displayName || friend.username || 'Player';

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-purple-500/30 transition-all">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Link href={`/users/${friend.id}`} className="flex-shrink-0">
          {friend.avatarUrl ? (
            <Image
              src={friend.avatarUrl}
              alt={displayName}
              width={48}
              height={48}
              className="rounded-full border-2 border-gray-600 hover:border-purple-500/50 transition-colors"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-gray-600">
              <span className="text-white font-semibold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/users/${friend.id}`} className="block">
            <h3 className="font-semibold text-white hover:text-purple-400 transition-colors truncate">
              {displayName}
            </h3>
          </Link>
          {friend.username && friend.displayName && (
            <p className="text-sm text-gray-400 truncate">@{friend.username}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
              LVL {friend.level}
            </span>
            {friend.friendSince && (
              <span className="text-xs text-gray-500">
                Friends {formatDistanceToNow(new Date(friend.friendSince), { addSuffix: true })}
              </span>
            )}
          </div>
        </div>

        {/* Actions */}
        {onRemove && (
          <button
            onClick={() => onRemove(friend.friendshipId)}
            disabled={isRemoving}
            className="px-3 py-1.5 text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
          >
            {isRemoving ? 'Removing...' : 'Remove'}
          </button>
        )}
      </div>
    </div>
  );
}
