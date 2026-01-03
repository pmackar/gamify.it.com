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
        <Link href={`/users/${request.id}`} className="flex-shrink-0">
          {request.avatarUrl ? (
            <Image
              src={request.avatarUrl}
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
                background: 'linear-gradient(135deg, var(--rpg-gold) 0%, #e6a000 100%)',
                border: '2px solid var(--rpg-border)',
              }}
            >
              <span style={{ color: '#1a1a1a' }} className="font-semibold text-sm">
                {initials}
              </span>
            </div>
          )}
        </Link>

        {/* Info */}
        <div className="flex-1 min-w-0 overflow-hidden">
          <Link href={`/users/${request.id}`} className="block">
            <h3
              className="font-semibold transition-colors truncate text-sm"
              style={{ color: 'var(--rpg-text)' }}
            >
              {displayName}
            </h3>
          </Link>
          {request.username && request.displayName && (
            <p className="text-xs truncate" style={{ color: 'var(--rpg-muted)' }}>
              @{request.username}
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
              LVL {request.level}
            </span>
            <span className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
              {type === 'incoming' ? 'Requested' : 'Sent'}{' '}
              {formatDistanceToNow(new Date(request.requestedAt), { addSuffix: true })}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {type === 'incoming' ? (
            <>
              <button
                onClick={() => onAccept?.(request.friendshipId)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50"
                style={{
                  background: 'rgba(34, 197, 94, 0.2)',
                  color: 'var(--rpg-teal)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                }}
              >
                Accept
              </button>
              <button
                onClick={() => onDecline?.(request.friendshipId)}
                disabled={isLoading}
                className="px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50"
                style={{ color: 'var(--rpg-muted)' }}
              >
                Decline
              </button>
            </>
          ) : (
            <button
              onClick={() => onCancel?.(request.friendshipId)}
              disabled={isLoading}
              className="px-3 py-1.5 text-xs rounded-lg transition-colors disabled:opacity-50"
              style={{ color: 'var(--rpg-muted)' }}
            >
              Cancel
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
