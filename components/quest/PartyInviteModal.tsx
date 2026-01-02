'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface Friend {
  friendshipId: string;
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
}

interface PartyInviteModalProps {
  questId: string;
  existingMemberIds: string[];
  onClose: () => void;
  onInviteSent: () => void;
}

export default function PartyInviteModal({
  questId,
  existingMemberIds,
  onClose,
  onInviteSent,
}: PartyInviteModalProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [invitingId, setInvitingId] = useState<string | null>(null);
  const [invitedIds, setInvitedIds] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFriends = async () => {
      try {
        const res = await fetch('/api/friends');
        if (res.ok) {
          const data = await res.json();
          setFriends(data.data || []);
        }
      } catch (err) {
        console.error('Error fetching friends:', err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFriends();
  }, []);

  const handleInvite = async (userId: string) => {
    setInvitingId(userId);
    setError(null);
    try {
      const res = await fetch(`/api/quests/${questId}/party/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      if (res.ok) {
        setInvitedIds((prev) => new Set([...prev, userId]));
        onInviteSent();
      } else {
        const data = await res.json();
        setError(data.error || 'Failed to send invite');
      }
    } catch (err) {
      console.error('Error inviting:', err);
      setError('Failed to send invite');
    } finally {
      setInvitingId(null);
    }
  };

  // Filter out friends who are already members
  const availableFriends = friends.filter(
    (f) => !existingMemberIds.includes(f.id) && !invitedIds.has(f.id)
  );
  const alreadyInvited = friends.filter((f) => invitedIds.has(f.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-gray-900 border border-gray-700 rounded-xl w-full max-w-md max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">Invite to Party</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[60vh]">
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
              {error}
            </div>
          )}

          {isLoading ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : availableFriends.length === 0 && alreadyInvited.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-3">👥</div>
              <p className="text-gray-400">No friends available to invite</p>
              <p className="text-sm text-gray-500 mt-1">
                {friends.length === 0
                  ? 'Add some friends first!'
                  : 'All your friends are already in the party'}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {/* Already invited this session */}
              {alreadyInvited.length > 0 && (
                <>
                  {alreadyInvited.map((friend) => (
                    <div
                      key={friend.id}
                      className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg opacity-60"
                    >
                      {friend.avatarUrl ? (
                        <Image
                          src={friend.avatarUrl}
                          alt={friend.displayName || friend.username || ''}
                          width={40}
                          height={40}
                          className="rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-white truncate">
                          {friend.displayName || friend.username}
                        </p>
                        <p className="text-xs text-gray-500">LVL {friend.level}</p>
                      </div>
                      <span className="text-xs text-green-400">Invited</span>
                    </div>
                  ))}
                  {availableFriends.length > 0 && (
                    <div className="border-t border-gray-800 my-3" />
                  )}
                </>
              )}

              {/* Available to invite */}
              {availableFriends.map((friend) => (
                <div
                  key={friend.id}
                  className="flex items-center gap-3 p-3 bg-gray-800/50 rounded-lg"
                >
                  {friend.avatarUrl ? (
                    <Image
                      src={friend.avatarUrl}
                      alt={friend.displayName || friend.username || ''}
                      width={40}
                      height={40}
                      className="rounded-full"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span className="text-white font-medium">
                        {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">
                      {friend.displayName || friend.username}
                    </p>
                    <p className="text-xs text-gray-500">LVL {friend.level}</p>
                  </div>
                  <button
                    onClick={() => handleInvite(friend.id)}
                    disabled={invitingId === friend.id}
                    className="px-3 py-1.5 text-xs bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors disabled:opacity-50"
                  >
                    {invitingId === friend.id ? (
                      <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      'Invite'
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
