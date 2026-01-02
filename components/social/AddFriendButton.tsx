'use client';

import { useState } from 'react';

interface AddFriendButtonProps {
  userId: string;
  initialStatus?: 'none' | 'pending_sent' | 'pending_received' | 'accepted' | 'blocked';
  friendshipId?: string | null;
  onStatusChange?: (newStatus: string) => void;
  size?: 'sm' | 'md';
}

export default function AddFriendButton({
  userId,
  initialStatus = 'none',
  friendshipId,
  onStatusChange,
  size = 'md',
}: AddFriendButtonProps) {
  const [status, setStatus] = useState(initialStatus);
  const [currentFriendshipId, setCurrentFriendshipId] = useState(friendshipId);
  const [isLoading, setIsLoading] = useState(false);

  const sizeClasses = size === 'sm'
    ? 'px-3 py-1.5 text-xs'
    : 'px-4 py-2 text-sm';

  const handleSendRequest = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.autoAccepted) {
          setStatus('accepted');
          onStatusChange?.('accepted');
        } else {
          setStatus('pending_sent');
          setCurrentFriendshipId(data.friendship?.id);
          onStatusChange?.('pending_sent');
        }
      }
    } catch (error) {
      console.error('Error sending request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!currentFriendshipId) return;
    setIsLoading(true);
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId: currentFriendshipId, action: 'accept' }),
      });
      if (res.ok) {
        setStatus('accepted');
        onStatusChange?.('accepted');
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelRequest = async () => {
    if (!currentFriendshipId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/friends/${currentFriendshipId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatus('none');
        setCurrentFriendshipId(null);
        onStatusChange?.('none');
      }
    } catch (error) {
      console.error('Error canceling request:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveFriend = async () => {
    if (!currentFriendshipId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/friends/${currentFriendshipId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setStatus('none');
        setCurrentFriendshipId(null);
        onStatusChange?.('none');
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (status === 'blocked') {
    return null;
  }

  if (status === 'accepted') {
    return (
      <div className="flex items-center gap-2">
        <span className={`${sizeClasses} bg-green-500/20 text-green-400 rounded-lg border border-green-500/30 flex items-center gap-1.5`}>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Friends
        </span>
        <button
          onClick={handleRemoveFriend}
          disabled={isLoading}
          className={`${sizeClasses} text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50`}
        >
          Remove
        </button>
      </div>
    );
  }

  if (status === 'pending_sent') {
    return (
      <button
        onClick={handleCancelRequest}
        disabled={isLoading}
        className={`${sizeClasses} bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 rounded-lg border border-amber-500/30 transition-colors disabled:opacity-50`}
      >
        {isLoading ? 'Canceling...' : 'Cancel Request'}
      </button>
    );
  }

  if (status === 'pending_received') {
    return (
      <div className="flex items-center gap-2">
        <button
          onClick={handleAcceptRequest}
          disabled={isLoading}
          className={`${sizeClasses} bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors disabled:opacity-50`}
        >
          {isLoading ? '...' : 'Accept'}
        </button>
        <button
          onClick={handleCancelRequest}
          disabled={isLoading}
          className={`${sizeClasses} text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50`}
        >
          Decline
        </button>
      </div>
    );
  }

  // status === 'none'
  return (
    <button
      onClick={handleSendRequest}
      disabled={isLoading}
      className={`${sizeClasses} bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors disabled:opacity-50 flex items-center gap-1.5`}
    >
      {isLoading ? (
        'Sending...'
      ) : (
        <>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
          </svg>
          Add Friend
        </>
      )}
    </button>
  );
}
