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

  // Get initials (up to 2 characters)
  const initials = displayName
    .split(' ')
    .slice(0, 2)
    .map(n => n.charAt(0).toUpperCase())
    .join('');

  return (
    <div
      className="rounded-lg p-4 transition-all"
      style={{
        background: 'var(--rpg-card)',
        border: '1px solid var(--rpg-border)',
      }}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <Link href={`/users/${friend.id}`} className="flex-shrink-0">
          {friend.avatarUrl ? (
            <Image
              src={friend.avatarUrl}
              alt={displayName}
              width={48}
              height={48}
              className="rounded-full"
              style={{ border: '2px solid var(--rpg-border)' }}
            />
          ) : (
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center"
              style={{
                background: 'linear-gradient(135deg, var(--rpg-purple) 0%, var(--rpg-purple-dark, #6b21a8) 100%)',
                border: '2px solid var(--rpg-border)',
              }}
            >
              <span className="text-white font-semibold text-sm">
                {initials}
              </span>
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Link href={`/users/${friend.id}`} className="block">
            <h3
              className="font-semibold transition-colors truncate text-sm"
              style={{ color: 'var(--rpg-text)' }}
            >
              {displayName}
            </h3>
          </Link>
          {friend.username && friend.displayName && (
            <p className="text-xs truncate" style={{ color: 'var(--rpg-muted)' }}>
              @{friend.username}
            </p>
          )}
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
                color: 'var(--rpg-purple)',
                border: '1px solid rgba(168, 85, 247, 0.3)',
              }}
            >
              LVL {friend.level}
            </span>
            {friend.friendSince && (
              <span className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
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
            className="flex-shrink-0 px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50"
            style={{ color: 'var(--rpg-red, #ef4444)' }}
          >
            {isRemoving ? '...' : 'Remove'}
          </button>
        )}
      </div>
    </div>
  );
}
