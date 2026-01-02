'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

interface FriendRequest {
  friendshipId: string;
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  requestedAt: string;
}

interface FriendRequestCardProps {
  request: FriendRequest;
  type: 'incoming' | 'sent';
  onAccept?: (friendshipId: string) => void;
  onDecline?: (friendshipId: string) => void;
  onCancel?: (friendshipId: string) => void;
  isLoading?: boolean;
}

export default function FriendRequestCard({
  request,
  type,
  onAccept,
  onDecline,
  onCancel,
  isLoading,
}: FriendRequestCardProps) {
  const displayName = request.displayName || request.username || 'Player';

  return (
    <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 hover:border-amber-500/30 transition-all">
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Link href={`/users/${request.id}`} className="flex-shrink-0">
          {request.avatarUrl ? (
            <Image
              src={request.avatarUrl}
              alt={displayName}
              width={48}
              height={48}
              className="rounded-full border-2 border-gray-600 hover:border-purple-500/50 transition-colors"
            />
          ) : (
            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center border-2 border-gray-600">
              <span className="text-white font-semibold text-lg">
                {displayName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <Link href={`/users/${request.id}`} className="block">
            <h3 className="font-semibold text-white hover:text-purple-400 transition-colors truncate">
              {displayName}
            </h3>
          </Link>
          {request.username && request.displayName && (
            <p className="text-sm text-gray-400 truncate">@{request.username}</p>
          )}
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded-full border border-purple-500/30">
              LVL {request.level}
            </span>
            <span className="text-xs text-gray-500">
              {type === 'incoming' ? 'Requested' : 'Sent'}{' '}
              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {type === 'incoming' ? (
            <>
              <button
                onClick={() => onAccept?.(request.friendshipId)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50 border border-green-500/30"
              >
                Accept
              </button>
              <button
                onClick={() => onDecline?.(request.friendshipId)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
              >
                Decline
              </button>
            </>
          ) : (
            <button
              onClick={() => onCancel?.(request.friendshipId)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
