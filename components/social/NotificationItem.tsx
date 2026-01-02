'use client';

import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';

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
}

interface NotificationItemProps {
  notification: Notification;
  onMarkRead: (id: string) => void;
  onClose: () => void;
}

const typeConfig: Record<string, { icon: string; getMessage: (n: Notification) => string; getLink: (n: Notification) => string | null }> = {
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
      return questId ? `/quests/${questId}` : null;
    },
  },
  PARTY_MEMBER_JOINED: {
    icon: '✨',
    getMessage: (n) => {
      const questName = (n.metadata?.questName as string) || 'the quest';
      return `${n.actor?.displayName || n.actor?.username || 'Someone'} joined "${questName}"`;
    },
    getLink: (n) => {
      const questId = n.metadata?.questId as string;
      return questId ? `/quests/${questId}` : null;
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
      return questId ? `/quests/${questId}` : null;
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
      return questId ? `/quests/${questId}` : null;
    },
  },
};

const defaultConfig = {
  icon: '🔔',
  getMessage: () => 'You have a new notification',
  getLink: () => null,
};

export default function NotificationItem({ notification, onMarkRead, onClose }: NotificationItemProps) {
  const config = typeConfig[notification.type] || defaultConfig;
  const link = config.getLink(notification);

  const handleClick = () => {
    if (!notification.read) {
      onMarkRead(notification.id);
    }
    if (link) {
      onClose();
    }
  };

  const content = (
    <div
      className={`flex items-start gap-3 p-3 rounded-lg transition-colors cursor-pointer ${
        notification.read
          ? 'bg-gray-800/30 opacity-70 hover:opacity-100'
          : 'bg-gray-800/60 hover:bg-gray-800/80'
      }`}
      onClick={handleClick}
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
          <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-lg">
            {config.icon}
          </div>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm ${notification.read ? 'text-gray-400' : 'text-white'}`}>
          {config.getMessage(notification)}
        </p>
        <p className="text-xs text-gray-500 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
        </p>
      </div>

      {/* Unread indicator */}
      {!notification.read && (
        <div className="w-2 h-2 rounded-full bg-purple-500 flex-shrink-0 mt-2" />
      )}
    </div>
  );

  if (link) {
    return <Link href={link}>{content}</Link>;
  }

  return content;
}
