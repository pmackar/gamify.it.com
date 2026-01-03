'use client';

import { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { RetroNavBar } from '@/components/RetroNavBar';
import { formatDistanceToNow } from 'date-fns';
import {
  ArrowLeft,
  Trophy,
  Flame,
  Star,
  MapPin,
  Globe,
  Calendar,
  UserPlus,
  UserCheck,
  Clock,
  Dumbbell,
  CheckSquare,
  Plane,
} from 'lucide-react';

interface UserProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  memberSince: string | null;
}

interface AppStat {
  app: string;
  xp: number;
  level: number;
}

interface TravelStats {
  locationsVisited: number;
  countriesVisited: number;
}

interface Activity {
  id: string;
  type: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface ProfileData {
  profile: UserProfile;
  appStats: AppStat[];
  travelStats: TravelStats | null;
  recentActivity: Activity[];
  friendshipStatus: 'none' | 'friends' | 'pending_sent' | 'pending_received';
  friendshipId: string | null;
  isCurrentUser: boolean;
}

const appIcons: Record<string, React.ReactNode> = {
  fitness: <Dumbbell className="w-4 h-4" />,
  today: <CheckSquare className="w-4 h-4" />,
  travel: <Plane className="w-4 h-4" />,
};

const appColors: Record<string, string> = {
  fitness: '#ef4444',
  today: '#22c55e',
  travel: '#3b82f6',
};

export default function UserProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: userId } = use(params);
  const router = useRouter();
  const [data, setData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (res.ok) {
          const json = await res.json();
          setData(json);
        } else if (res.status === 404) {
          setError('User not found');
        } else {
          setError('Failed to load profile');
        }
      } catch (err) {
        console.error('Failed to fetch profile:', err);
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  const handleFriendAction = async (action: 'add' | 'accept' | 'decline' | 'cancel') => {
    if (!data) return;
    setActionLoading(true);

    try {
      if (action === 'add') {
        const res = await fetch('/api/friends/request', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId }),
        });
        if (res.ok) {
          setData({ ...data, friendshipStatus: 'pending_sent' });
        }
      } else if (action === 'accept' || action === 'decline') {
        const res = await fetch('/api/friends/respond', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            friendshipId: data.friendshipId,
            action,
          }),
        });
        if (res.ok) {
          setData({
            ...data,
            friendshipStatus: action === 'accept' ? 'friends' : 'none',
          });
        }
      } else if (action === 'cancel' && data.friendshipId) {
        const res = await fetch(`/api/friends/${data.friendshipId}`, {
          method: 'DELETE',
        });
        if (res.ok) {
          setData({ ...data, friendshipStatus: 'none', friendshipId: null });
        }
      }
    } catch (err) {
      console.error('Friend action failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  const getActivityMessage = (activity: Activity): string => {
    const metadata = activity.metadata;
    switch (activity.type) {
      case 'QUEST_COMPLETED':
        return `Completed quest "${metadata.questName || 'Unknown'}"`;
      case 'QUEST_ITEM_COMPLETED':
        return `Checked off "${metadata.itemName || 'an item'}"`;
      case 'PARTY_MEMBER_JOINED':
        return `Joined quest "${metadata.questName || 'Unknown'}"`;
      default:
        return 'Did something awesome';
    }
  };

  if (loading) {
    return (
      <>
        <RetroNavBar />
        <div
          className="min-h-screen pt-20 flex items-center justify-center"
          style={{ background: 'var(--rpg-bg-dark)' }}
        >
          <div
            className="w-8 h-8 border-2 rounded-full animate-spin"
            style={{ borderColor: 'var(--rpg-purple)', borderTopColor: 'transparent' }}
          />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <RetroNavBar />
        <div className="min-h-screen pt-20" style={{ background: 'var(--rpg-bg-dark)' }}>
          <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <div className="text-6xl mb-4">😕</div>
            <h1 className="text-xl mb-2" style={{ color: 'var(--rpg-text)' }}>
              {error || 'Something went wrong'}
            </h1>
            <button
              onClick={() => router.back()}
              className="mt-4 px-4 py-2 rounded-lg transition-colors"
              style={{
                background: 'rgba(168, 85, 247, 0.2)',
                color: 'var(--rpg-purple)',
                border: '1px solid var(--rpg-purple)',
              }}
            >
              Go Back
            </button>
          </div>
        </div>
      </>
    );
  }

  const { profile, appStats, travelStats, recentActivity, friendshipStatus, isCurrentUser } = data;

  return (
    <>
      <RetroNavBar />
      <div className="min-h-screen pt-20 pb-8" style={{ background: 'var(--rpg-bg-dark)' }}>
        <div className="max-w-2xl mx-auto px-4">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm mb-6 transition-colors hover:opacity-80"
            style={{ color: 'var(--rpg-muted)' }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>

          {/* Profile Header Card */}
          <div
            className="rounded-lg p-6 mb-6"
            style={{
              background: 'var(--rpg-card)',
              border: '2px solid var(--rpg-border)',
              boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
            }}
          >
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="relative">
                {profile.avatarUrl ? (
                  <Image
                    src={profile.avatarUrl}
                    alt=""
                    width={80}
                    height={80}
                    className="rounded-full"
                  />
                ) : (
                  <div
                    className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                    style={{
                      background: 'linear-gradient(135deg, var(--rpg-purple) 0%, var(--rpg-cyan) 100%)',
                      color: '#fff',
                    }}
                  >
                    {(profile.displayName || profile.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <div
                  className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                  style={{
                    background: 'linear-gradient(135deg, var(--rpg-gold) 0%, #ffa500 100%)',
                    color: 'var(--rpg-bg-dark)',
                    border: '2px solid var(--rpg-bg-dark)',
                  }}
                >
                  {profile.level}
                </div>
              </div>

              {/* Info */}
              <div className="flex-1">
                <h1 className="text-xl font-bold" style={{ color: 'var(--rpg-text)' }}>
                  {profile.displayName || profile.username || 'Unknown User'}
                </h1>
                {profile.username && profile.displayName && (
                  <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>@{profile.username}</p>
                )}
                {profile.bio && (
                  <p className="text-sm mt-2" style={{ color: 'var(--rpg-text)' }}>{profile.bio}</p>
                )}
                {profile.memberSince && (
                  <p className="text-xs mt-2 flex items-center gap-1" style={{ color: 'var(--rpg-muted)' }}>
                    <Calendar className="w-3 h-3" />
                    Member since {new Date(profile.memberSince).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </p>
                )}
              </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mt-6">
              <div
                className="text-center p-3 rounded-lg"
                style={{ background: 'rgba(0, 0, 0, 0.3)' }}
              >
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--rpg-gold)' }}>
                  <Star className="w-4 h-4" />
                  <span className="font-bold">{profile.xp.toLocaleString()}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Total XP</p>
              </div>
              <div
                className="text-center p-3 rounded-lg"
                style={{ background: 'rgba(0, 0, 0, 0.3)' }}
              >
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: '#ff6432' }}>
                  <Flame className="w-4 h-4" />
                  <span className="font-bold">{profile.currentStreak}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Day Streak</p>
              </div>
              <div
                className="text-center p-3 rounded-lg"
                style={{ background: 'rgba(0, 0, 0, 0.3)' }}
              >
                <div className="flex items-center justify-center gap-1 mb-1" style={{ color: 'var(--rpg-purple)' }}>
                  <Trophy className="w-4 h-4" />
                  <span className="font-bold">{profile.longestStreak}</span>
                </div>
                <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Best Streak</p>
              </div>
            </div>

            {/* Friend Action Button */}
            {!isCurrentUser && (
              <div className="mt-6">
                {friendshipStatus === 'none' && (
                  <button
                    onClick={() => handleFriendAction('add')}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      background: 'var(--rpg-purple)',
                      color: '#fff',
                    }}
                  >
                    <UserPlus className="w-4 h-4" />
                    Add Friend
                  </button>
                )}
                {friendshipStatus === 'pending_sent' && (
                  <button
                    onClick={() => handleFriendAction('cancel')}
                    disabled={actionLoading}
                    className="w-full py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    style={{
                      background: 'var(--rpg-border)',
                      color: 'var(--rpg-text)',
                    }}
                  >
                    <Clock className="w-4 h-4" />
                    Request Pending (Cancel)
                  </button>
                )}
                {friendshipStatus === 'pending_received' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleFriendAction('accept')}
                      disabled={actionLoading}
                      className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: 'var(--rpg-teal)',
                        color: 'var(--rpg-bg-dark)',
                      }}
                    >
                      Accept
                    </button>
                    <button
                      onClick={() => handleFriendAction('decline')}
                      disabled={actionLoading}
                      className="flex-1 py-3 rounded-lg font-medium transition-colors disabled:opacity-50"
                      style={{
                        background: 'var(--rpg-border)',
                        color: 'var(--rpg-text)',
                      }}
                    >
                      Decline
                    </button>
                  </div>
                )}
                {friendshipStatus === 'friends' && (
                  <div
                    className="flex items-center justify-center gap-2 py-3 rounded-lg"
                    style={{
                      background: 'rgba(95, 191, 138, 0.2)',
                      color: 'var(--rpg-teal)',
                      border: '1px solid var(--rpg-teal)',
                    }}
                  >
                    <UserCheck className="w-4 h-4" />
                    Friends
                  </div>
                )}
              </div>
            )}
          </div>

          {/* App Stats */}
          {appStats.length > 0 && (
            <div
              className="rounded-lg p-5 mb-6"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <h2
                className="text-sm font-semibold mb-4 uppercase tracking-wide"
                style={{ color: 'var(--rpg-muted)' }}
              >
                App Progress
              </h2>
              <div className="space-y-3">
                {appStats.map((stat) => (
                  <div
                    key={stat.app}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                  >
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ background: `${appColors[stat.app] || '#6366f1'}20` }}
                    >
                      <span style={{ color: appColors[stat.app] || '#6366f1' }}>
                        {appIcons[stat.app] || <Star className="w-4 h-4" />}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p className="font-medium capitalize" style={{ color: 'var(--rpg-text)' }}>{stat.app}</p>
                      <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Level {stat.level}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold" style={{ color: 'var(--rpg-gold)' }}>{stat.xp.toLocaleString()}</p>
                      <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>XP</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Travel Stats (only for friends) */}
          {travelStats && (
            <div
              className="rounded-lg p-5 mb-6"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <h2
                className="text-sm font-semibold mb-4 uppercase tracking-wide"
                style={{ color: 'var(--rpg-muted)' }}
              >
                Travel Stats
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                >
                  <MapPin className="w-5 h-5" style={{ color: 'var(--rpg-cyan)' }} />
                  <div>
                    <p className="font-bold" style={{ color: 'var(--rpg-text)' }}>{travelStats.locationsVisited}</p>
                    <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Places Visited</p>
                  </div>
                </div>
                <div
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                >
                  <Globe className="w-5 h-5" style={{ color: 'var(--rpg-teal)' }} />
                  <div>
                    <p className="font-bold" style={{ color: 'var(--rpg-text)' }}>{travelStats.countriesVisited}</p>
                    <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>Countries</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Activity */}
          {recentActivity.length > 0 && (
            <div
              className="rounded-lg p-5"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <h2
                className="text-sm font-semibold mb-4 uppercase tracking-wide"
                style={{ color: 'var(--rpg-muted)' }}
              >
                Recent Activity
              </h2>
              <div className="space-y-3">
                {recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-3 p-3 rounded-lg"
                    style={{ background: 'rgba(0, 0, 0, 0.3)' }}
                  >
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-sm"
                      style={{ background: 'rgba(168, 85, 247, 0.2)' }}
                    >
                      {activity.type === 'QUEST_COMPLETED' ? '🏆' :
                       activity.type === 'QUEST_ITEM_COMPLETED' ? '✅' :
                       activity.type === 'PARTY_MEMBER_JOINED' ? '🎉' : '⭐'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate" style={{ color: 'var(--rpg-text)' }}>
                        {getActivityMessage(activity)}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--rpg-muted)' }}>
                        {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {recentActivity.length === 0 && (
            <div
              className="rounded-lg p-8 text-center"
              style={{
                background: 'var(--rpg-card)',
                border: '2px solid var(--rpg-border)',
                boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
              }}
            >
              <p style={{ color: 'var(--rpg-muted)' }}>No recent activity</p>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
