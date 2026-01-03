'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { useState } from 'react';

export interface Notification {
  id: string;
  type: string;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown>;
  read: boolean;
  createdAt: string;
  actor: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
  } | null;
  kudosCount?: number;
  hasGivenKudos?: boolean;
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
  onUpdate?: () => void;
}

interface TypeConfigItem {
  icon: string;
  getMessage: (n: Notification) => string;
  getLink: (n: Notification) => string | null;
  hasActions?: boolean;
}

const typeConfig: Record<string, TypeConfigItem> = {
  FRIEND_REQUEST_RECEIVED: {
    icon: '👋',
    getMessage: (n) => `${n.actor?.displayName || n.actor?.username || 'Someone'} sent you a friend request`,
    getLink: () => '/friends?tab=requests',
  },
  FRIEND_REQUEST_ACCEPTED: {
    icon: '🤝',
    getMessage: (n) => `${n.actor?.displayName || n.actor?.username || 'Someone'} accepted your friend request`,
    getLink: (n) => n.actor?.id ? `/users/${n.actor.id}` : null,
  },
  PARTY_INVITE_RECEIVED: {
    icon: '🎉',
    getMessage: (n) => {
      const questName = (n.metadata?.questName as string) || 'a quest';
      return `${n.actor?.displayName || n.actor?.username || 'Someone'} invited you to join "${questName}"`;
    },
    getLink: (n) => {
      const questId = n.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
    hasActions: true,
  },
  PARTY_MEMBER_JOINED: {
    icon: '✨',
    getMessage: (n) => {
      const questName = (n.metadata?.questName as string) || 'the quest';
      return `${n.actor?.displayName || n.actor?.username || 'Someone'} joined "${questName}"`;
    },
    getLink: (n) => {
      const questId = n.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
  },
  QUEST_ITEM_COMPLETED: {
    icon: '✅',
    getMessage: (n) => {
      const questName = (n.metadata?.questName as string) || 'a quest';
      return `${n.actor?.displayName || n.actor?.username || 'Someone'} completed an item in "${questName}"`;
    },
    getLink: (n) => {
      const questId = n.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
  },
  QUEST_COMPLETED: {
    icon: '🏆',
    getMessage: (n) => {
      const questName = (n.metadata?.questName as string) || 'a quest';
      return `"${questName}" has been completed!`;
    },
    getLink: (n) => {
      const questId = n.metadata?.questId as string;
      return questId ? `/travel/quests/${questId}` : null;
    },
  },
};

const defaultConfig: TypeConfigItem = {
  icon: '🔔',
  getMessage: () => 'You have a new notification',
  getLink: () => null,
};

export default function NotificationItem({ notification, onMarkRead, onClose, onUpdate }: NotificationItemProps) {
  const config = typeConfig[notification.type] || defaultConfig;
  const link = config.getLink(notification);
  const [actionLoading, setActionLoading] = useState<'accept' | 'decline' | null>(null);
  const [actionTaken, setActionTaken] = useState<'accepted' | 'declined' | null>(null);
  const [kudosCount, setKudosCount] = useState(notification.kudosCount || 0);
  const [hasGivenKudos, setHasGivenKudos] = useState(notification.hasGivenKudos || false);
  const [kudosLoading, setKudosLoading] = useState(false);

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (link && !config.hasActions) {
      onClose();
    }
  };

  const handlePartyInviteAction = async (action: 'accept' | 'decline', e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    const memberId = notification.metadata?.memberId as string;
    if (!memberId) return;

    setActionLoading(action);
    try {
      const res = await fetch(`/api/party-invites/${memberId}/respond`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      if (res.ok) {
        setActionTaken(action === 'accept' ? 'accepted' : 'declined');
        onMarkRead(notification.id);
        onUpdate?.();
      }
    } catch (err) {
      console.error('Failed to respond to party invite:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleKudos = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();

    setKudosLoading(true);
    try {
      if (hasGivenKudos) {
        // Remove kudos
        const res = await fetch(`/api/activity/${notification.id}/kudos`, {
          method: 'DELETE',
        });
        if (res.ok) {
          const data = await res.json();
          setKudosCount(data.count);
          setHasGivenKudos(false);
        }
      } else {
        // Give kudos
        const res = await fetch(`/api/activity/${notification.id}/kudos`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ emoji: '🔥' }),
        });
        if (res.ok) {
          const data = await res.json();
          setKudosCount(data.count);
          setHasGivenKudos(true);
        }
      }
    } catch (err) {
      console.error('Failed to toggle kudos:', err);
    } finally {
      setKudosLoading(false);
    }
  };

  const isPartyInvite = notification.type === 'PARTY_INVITE_RECEIVED';
  const showActions = isPartyInvite && !notification.read && !actionTaken;
  // Show kudos button for completed activities (achievements, quest completions, etc.)
  const showKudos = ['QUEST_ITEM_COMPLETED', 'QUEST_COMPLETED', 'PARTY_MEMBER_JOINED'].includes(notification.type);

  const content = (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors ${
        showActions ? '' : 'cursor-pointer'
      } ${notification.read || actionTaken ? 'opacity-70 hover:opacity-100' : ''}`}
      style={{
        background: notification.read || actionTaken
          ? 'rgba(0, 0, 0, 0.2)'
          : 'rgba(0, 0, 0, 0.4)',
      }}
      onClick={showActions ? undefined : handleClick}
    >
      {/* Actor Avatar or Icon */}
      <div className="flex-shrink-0">
        {notification.actor?.avatarUrl ? (
          <Image
            src={notification.actor.avatarUrl}
            alt=""
            width={36}
            height={36}
            className="rounded-full"
          />
        ) : (
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
            style={{ background: 'var(--rpg-border)' }}
          >
            {config.icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          className="text-sm"
          style={{ color: notification.read || actionTaken ? 'var(--rpg-muted)' : 'var(--rpg-text)' }}
        >
          {config.getMessage(notification)}
        </p>
        <div className="flex items-center gap-3 mt-1">
          <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
            {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
          </p>

          {/* Kudos button */}
          {showKudos && (
            <button
              onClick={handleKudos}
              disabled={kudosLoading}
              className="flex items-center gap-1 text-xs transition-all disabled:opacity-50"
              style={{ color: hasGivenKudos ? '#ff6432' : 'var(--rpg-muted)' }}
              title={hasGivenKudos ? 'Remove kudos' : 'Give kudos'}
            >
              <span className={`transition-transform ${hasGivenKudos ? 'scale-110' : ''}`}>
                🔥
              </span>
              {kudosCount > 0 && <span>{kudosCount}</span>}
            </button>
          )}
        </div>

        {/* Party invite action buttons */}
        {showActions && (
          <div className="flex gap-2 mt-2">
            <button
              onClick={(e) => handlePartyInviteAction('accept', e)}
              disabled={actionLoading !== null}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              style={{ background: 'var(--rpg-teal)', color: 'var(--rpg-bg-dark)' }}
            >
              {actionLoading === 'accept' ? '...' : 'Accept'}
            </button>
            <button
              onClick={(e) => handlePartyInviteAction('decline', e)}
              disabled={actionLoading !== null}
              className="px-3 py-1 text-xs font-medium rounded-md transition-colors disabled:opacity-50"
              style={{ background: 'var(--rpg-border)', color: 'var(--rpg-text)' }}
            >
              {actionLoading === 'decline' ? '...' : 'Decline'}
            </button>
          </div>
        )}

        {/* Action result */}
        {actionTaken && (
          <p
            className="text-xs mt-2"
            style={{ color: actionTaken === 'accepted' ? 'var(--rpg-teal)' : 'var(--rpg-muted)' }}
          >
            {actionTaken === 'accepted' ? 'Joined party!' : 'Invite declined'}
          </p>
        )}
      </div>

      {/* Unread indicator */}
      {!notification.read && !actionTaken && (
        <div
          className="w-2 h-2 rounded-full flex-shrink-0 mt-2"
          style={{ background: 'var(--rpg-purple)' }}
        />
      )}
    </div>
  );

  // Don't wrap in Link if has inline actions
  if (link && !showActions) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
