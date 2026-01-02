'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';

interface SearchResult {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  friendshipStatus: string | null;
  isPendingFromThem: boolean;
  friendshipId: string | null;
}

interface UserSearchInputProps {
  onSendRequest: (userId: string) => Promise<void>;
  onAcceptRequest: (friendshipId: string) => Promise<void>;
}

export default function UserSearchInput({ onSendRequest, onAcceptRequest }: UserSearchInputProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const searchTimeout = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          setResults(data.data || []);
          setIsOpen(true);
        }
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [query]);

  const handleAction = async (user: SearchResult) => {
    setPendingAction(user.id);
    try {
      if (user.isPendingFromThem && user.friendshipId) {
        await onAcceptRequest(user.friendshipId);
      } else if (!user.friendshipStatus) {
        await onSendRequest(user.id);
      }
      // Refresh search results
      const res = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.data || []);
      }
    } catch (error) {
      console.error('Action error:', error);
    } finally {
      setPendingAction(null);
    }
  };

  const getActionButton = (user: SearchResult) => {
    if (user.friendshipStatus === 'ACCEPTED') {
      return (
        <span className="text-xs text-green-400 px-2 py-1 bg-green-500/10 rounded-lg border border-green-500/30">
          Friends
        </span>
      );
    }
    if (user.friendshipStatus === 'PENDING') {
      if (user.isPendingFromThem) {
        return (
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleAction(user);
            }}
            disabled={pendingAction === user.id}
            className="text-xs text-green-400 px-2 py-1 bg-green-500/20 hover:bg-green-500/30 rounded-lg border border-green-500/30 transition-colors disabled:opacity-50"
          >
            {pendingAction === user.id ? '...' : 'Accept'}
          </button>
        );
      }
      return (
        <span className="text-xs text-amber-400 px-2 py-1 bg-amber-500/10 rounded-lg border border-amber-500/30">
          Pending
        </span>
      );
    }
    if (user.friendshipStatus === 'BLOCKED') {
      return null;
    }
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleAction(user);
        }}
        disabled={pendingAction === user.id}
        className="text-xs text-purple-400 px-2 py-1 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg border border-purple-500/30 transition-colors disabled:opacity-50"
      >
        {pendingAction === user.id ? '...' : 'Add Friend'}
      </button>
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setIsOpen(true)}
          placeholder="Search users by name or email..."
          className="w-full px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none transition-colors"
        />
        {isLoading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </div>

      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center gap-3 p-3 hover:bg-gray-700/50 transition-colors cursor-pointer"
              onClick={() => window.location.href = `/users/${user.id}`}
            >
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt={user.displayName || 'User'}
                  width={36}
                  height={36}
                  className="rounded-full"
                />
              ) : (
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm font-semibold">
                    {(user.displayName || user.username || 'U').charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white truncate">
                  {user.displayName || user.username || 'Player'}
                </p>
                {user.username && (
                  <p className="text-xs text-gray-400 truncate">@{user.username}</p>
                )}
              </div>
              <span className="text-xs text-gray-500">LVL {user.level}</span>
              {getActionButton(user)}
            </div>
          ))}
        </div>
      )}

      {isOpen && query.length >= 2 && results.length === 0 && !isLoading && (
        <div className="absolute z-50 w-full mt-2 bg-gray-800 border border-gray-700 rounded-lg p-4 text-center">
          <p className="text-gray-400 text-sm">No users found</p>
        </div>
      )}
    </div>
  );
}
