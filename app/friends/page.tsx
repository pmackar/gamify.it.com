'use client';

import { useState, useEffect, useCallback } from 'react';
import { RetroNavBar } from '@/components/RetroNavBar';
import FriendCard from '@/components/social/FriendCard';
import FriendRequestCard from '@/components/social/FriendRequestCard';
import UserSearchInput from '@/components/social/UserSearchInput';
import FriendLeaderboard from '@/components/social/FriendLeaderboard';

type TabType = 'friends' | 'requests' | 'find';

interface InviteCode {
  code: string;
  link: string;
  expiresAt: string;
}

interface Friend {
  friendshipId: string;
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  friendSince: string | null;
}

interface FriendRequest {
  friendshipId: string;
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
  requestedAt: string;
}

export default function FriendsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('friends');
  const [friends, setFriends] = useState<Friend[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FriendRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [inviteCode, setInviteCode] = useState<InviteCode | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);
  const [copied, setCopied] = useState<'code' | 'link' | null>(null);

  const fetchFriends = useCallback(async () => {
    try {
      const res = await fetch('/api/friends');
      if (res.ok) {
        const data = await res.json();
        setFriends(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  }, []);

  const fetchRequests = useCallback(async () => {
    try {
      const [incomingRes, sentRes] = await Promise.all([
        fetch('/api/friends/requests?type=incoming'),
        fetch('/api/friends/requests?type=sent'),
      ]);

      if (incomingRes.ok) {
        const data = await incomingRes.json();
        setIncomingRequests(data.data || []);
      }
      if (sentRes.ok) {
        const data = await sentRes.json();
        setSentRequests(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching requests:', error);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      await Promise.all([fetchFriends(), fetchRequests()]);
      setIsLoading(false);
    };
    loadData();
  }, [fetchFriends, fetchRequests]);

  const handleRemoveFriend = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
      if (res.ok) {
        setFriends((prev) => prev.filter((f) => f.friendshipId !== friendshipId));
      }
    } catch (error) {
      console.error('Error removing friend:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleAcceptRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'accept' }),
      });
      if (res.ok) {
        await Promise.all([fetchFriends(), fetchRequests()]);
      }
    } catch (error) {
      console.error('Error accepting request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeclineRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch('/api/friends/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friendshipId, action: 'decline' }),
      });
      if (res.ok) {
        setIncomingRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
      }
    } catch (error) {
      console.error('Error declining request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelRequest = async (friendshipId: string) => {
    setActionLoading(friendshipId);
    try {
      const res = await fetch(`/api/friends/${friendshipId}`, { method: 'DELETE' });
      if (res.ok) {
        setSentRequests((prev) => prev.filter((r) => r.friendshipId !== friendshipId));
      }
    } catch (error) {
      console.error('Error canceling request:', error);
    } finally {
      setActionLoading(null);
    }
  };

  const handleSendRequest = async (userId: string) => {
    try {
      const res = await fetch('/api/friends/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.autoAccepted) {
          await fetchFriends();
        }
        await fetchRequests();
      }
    } catch (error) {
      console.error('Error sending request:', error);
    }
  };

  const generateInviteCode = async () => {
    setInviteLoading(true);
    try {
      const res = await fetch('/api/friends/invite');
      if (res.ok) {
        const data = await res.json();
        setInviteCode(data);
      }
    } catch (error) {
      console.error('Error generating invite code:', error);
    } finally {
      setInviteLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: 'code' | 'link') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const handleShare = async () => {
    if (!inviteCode) return;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Join me on gamify.it.com!',
          text: 'I want to add you as a friend on gamify.it.com',
          url: inviteCode.link,
        });
      } catch (error) {
        // User cancelled or share failed, copy link instead
        copyToClipboard(inviteCode.link, 'link');
      }
    } else {
      copyToClipboard(inviteCode.link, 'link');
    }
  };

  const tabs = [
    { id: 'friends' as const, label: 'Friends', count: friends.length },
    { id: 'requests' as const, label: 'Requests', count: incomingRequests.length },
    { id: 'find' as const, label: 'Find Friends', count: null },
  ];

  return (
    <>
      <RetroNavBar />
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-20 pb-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-white mb-2">Friends</h1>
            <p className="text-gray-400 text-sm">Connect with other players and team up for quests</p>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 border-b border-gray-800 pb-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors relative ${
                  activeTab === tab.id
                    ? 'text-purple-400 bg-purple-500/10'
                    : 'text-gray-400 hover:text-gray-300 hover:bg-gray-800/50'
                }`}
              >
                {tab.label}
                {tab.count !== null && tab.count > 0 && (
                  <span
                    className={`ml-2 px-1.5 py-0.5 text-xs rounded-full ${
                      activeTab === tab.id
                        ? 'bg-purple-500/30 text-purple-300'
                        : 'bg-gray-700 text-gray-400'
                    }`}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Content */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Friends Tab */}
              {activeTab === 'friends' && (
                <div className="space-y-6">
                  {friends.length === 0 ? (
                    <div className="text-center py-12">
                      <div className="text-4xl mb-4">👥</div>
                      <p className="text-gray-400 mb-2">No friends yet</p>
                      <p className="text-gray-500 text-sm">
                        Search for players to add as friends
                      </p>
                      <button
                        onClick={() => setActiveTab('find')}
                        className="mt-4 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 hover:bg-purple-500/30 transition-colors"
                      >
                        Find Friends
                      </button>
                    </div>
                  ) : (
                    <>
                      {/* Leaderboard */}
                      <FriendLeaderboard />

                      {/* Friends List */}
                      <div>
                        <h2 className="text-sm font-medium text-gray-400 mb-3">
                          Your Friends ({friends.length})
                        </h2>
                        <div className="space-y-3">
                          {friends.map((friend) => (
                            <FriendCard
                              key={friend.friendshipId}
                              friend={friend}
                              onRemove={handleRemoveFriend}
                              isRemoving={actionLoading === friend.friendshipId}
                            />
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* Requests Tab */}
              {activeTab === 'requests' && (
                <div className="space-y-6">
                  {/* Incoming */}
                  <div>
                    <h2 className="text-sm font-medium text-gray-400 mb-3">
                      Incoming Requests ({incomingRequests.length})
                    </h2>
                    {incomingRequests.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4">No pending requests</p>
                    ) : (
                      <div className="space-y-3">
                        {incomingRequests.map((request) => (
                          <FriendRequestCard
                            key={request.friendshipId}
                            request={request}
                            type="incoming"
                            onAccept={handleAcceptRequest}
                            onDecline={handleDeclineRequest}
                            isLoading={actionLoading === request.friendshipId}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Sent */}
                  <div>
                    <h2 className="text-sm font-medium text-gray-400 mb-3">
                      Sent Requests ({sentRequests.length})
                    </h2>
                    {sentRequests.length === 0 ? (
                      <p className="text-gray-500 text-sm py-4">No sent requests</p>
                    ) : (
                      <div className="space-y-3">
                        {sentRequests.map((request) => (
                          <FriendRequestCard
                            key={request.friendshipId}
                            request={request}
                            type="sent"
                            onCancel={handleCancelRequest}
                            isLoading={actionLoading === request.friendshipId}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Find Friends Tab */}
              {activeTab === 'find' && (
                <div className="space-y-6">
                  {/* Invite Friends Card */}
                  <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border border-purple-500/20 rounded-xl p-5">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-2xl">🔗</span>
                      <div>
                        <h3 className="text-white font-semibold">Invite Friends</h3>
                        <p className="text-gray-400 text-sm">Share a link to connect instantly</p>
                      </div>
                    </div>

                    {!inviteCode ? (
                      <button
                        onClick={generateInviteCode}
                        disabled={inviteLoading}
                        className="w-full py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-purple-500/50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                      >
                        {inviteLoading ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <span>✨</span>
                            Generate Invite Link
                          </>
                        )}
                      </button>
                    ) : (
                      <div className="space-y-3">
                        {/* Link */}
                        <div className="bg-black/30 rounded-lg p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex-1 truncate text-sm text-gray-300 font-mono">
                              {inviteCode.link}
                            </div>
                            <button
                              onClick={() => copyToClipboard(inviteCode.link, 'link')}
                              className="px-3 py-1.5 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-md text-sm font-medium transition-colors flex-shrink-0"
                            >
                              {copied === 'link' ? '✓ Copied!' : 'Copy'}
                            </button>
                          </div>
                        </div>

                        {/* Share Button */}
                        <button
                          onClick={handleShare}
                          className="w-full py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                        >
                          <span>📤</span>
                          Share Link
                        </button>

                        <p className="text-gray-500 text-xs text-center">
                          Link expires in 7 days
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Divider */}
                  <div className="flex items-center gap-4">
                    <div className="flex-1 h-px bg-gray-800" />
                    <span className="text-gray-500 text-sm">or search</span>
                    <div className="flex-1 h-px bg-gray-800" />
                  </div>

                  {/* Search */}
                  <div>
                    <UserSearchInput
                      onSendRequest={handleSendRequest}
                      onAcceptRequest={handleAcceptRequest}
                    />
                    <p className="text-gray-500 text-sm mt-4 text-center">
                      Search by username, display name, or email
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
