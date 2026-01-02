'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { RetroNavBar } from '@/components/RetroNavBar';
import AddFriendButton from '@/components/social/AddFriendButton';

interface UserProfile {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  bio: string | null;
  level: number;
  xp: number;
  currentStreak: number;
  createdAt: string;
}

interface Friendship {
  status: string | null;
  friendshipId: string | null;
  isRequester: boolean;
}

interface Stats {
  visitedCount: number;
  reviewCount: number;
  questCount: number;
  locationCount: number;
}

interface VisitedLocation {
  id: string;
  name: string;
  type: string;
  latitude: number;
  longitude: number;
  city: { id: string; name: string; country: string } | null;
  visitedAt: string | null;
}

interface ProfileData {
  user: UserProfile;
  friendship: Friendship;
  stats: Stats;
  visitedLocations: VisitedLocation[];
}

const locationTypeIcons: Record<string, string> = {
  RESTAURANT: '🍽️',
  BAR: '🍺',
  CAFE: '☕',
  ATTRACTION: '🎡',
  HOTEL: '🏨',
  SHOP: '🛍️',
  NATURE: '🌲',
  TRANSPORT: '🚇',
  MUSEUM: '🏛️',
  BEACH: '🏖️',
  NIGHTLIFE: '🌙',
  OTHER: '📍',
};

export default function UserProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [data, setData] = useState<ProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await fetch(`/api/users/${userId}`);
        if (!res.ok) {
          if (res.status === 404) {
            setError('User not found');
          } else {
            setError('Failed to load profile');
          }
          return;
        }
        const profileData = await res.json();
        setData(profileData);
      } catch (err) {
        console.error('Error fetching profile:', err);
        setError('Failed to load profile');
      } finally {
        setIsLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  const getFriendshipInitialStatus = () => {
    if (!data?.friendship.status) return 'none';
    if (data.friendship.status === 'ACCEPTED') return 'accepted';
    if (data.friendship.status === 'PENDING') {
      return data.friendship.isRequester ? 'pending_sent' : 'pending_received';
    }
    if (data.friendship.status === 'BLOCKED') return 'blocked';
    return 'none';
  };

  if (isLoading) {
    return (
      <>
        <RetroNavBar />
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-20 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <>
        <RetroNavBar />
        <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-20">
          <div className="max-w-2xl mx-auto px-4 py-12 text-center">
            <div className="text-4xl mb-4">😕</div>
            <h1 className="text-xl font-bold text-white mb-2">{error || 'Something went wrong'}</h1>
            <Link href="/friends" className="text-purple-400 hover:text-purple-300">
              Back to Friends
            </Link>
          </div>
        </div>
      </>
    );
  }

  const { user, stats, visitedLocations } = data;
  const displayName = user.displayName || user.username || 'Player';

  return (
    <>
      <RetroNavBar />
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black pt-20 pb-8">
        <div className="max-w-2xl mx-auto px-4">
          {/* Profile Header */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-6 mb-6">
            <div className="flex items-start gap-4">
              {/* Avatar */}
              <div className="flex-shrink-0">
                {user.avatarUrl ? (
                  <Image
                    src={user.avatarUrl}
                    alt={displayName}
                    width={80}
                    height={80}
                    className="rounded-xl border-2 border-purple-500/50"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center border-2 border-purple-500/50">
                    <span className="text-white font-bold text-2xl">
                      {displayName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h1 className="text-xl font-bold text-white truncate">{displayName}</h1>
                    {user.username && user.displayName && (
                      <p className="text-gray-400 text-sm">@{user.username}</p>
                    )}
                  </div>
                  <AddFriendButton
                    userId={user.id}
                    initialStatus={getFriendshipInitialStatus()}
                    friendshipId={data.friendship.friendshipId}
                  />
                </div>

                {user.bio && (
                  <p className="text-gray-300 text-sm mt-3">{user.bio}</p>
                )}

                <div className="flex items-center gap-3 mt-4">
                  <span className="px-3 py-1 bg-purple-500/20 text-purple-400 rounded-lg border border-purple-500/30 text-sm font-medium">
                    LVL {user.level}
                  </span>
                  <span className="text-gray-400 text-sm">
                    {user.xp.toLocaleString()} XP
                  </span>
                  {user.currentStreak > 0 && (
                    <span className="text-amber-400 text-sm flex items-center gap-1">
                      🔥 {user.currentStreak} day streak
                    </span>
                  )}
                </div>

                <p className="text-gray-500 text-xs mt-3">
                  Member since {formatDistanceToNow(new Date(user.createdAt), { addSuffix: true })}
                </p>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-white">{stats.locationCount}</div>
              <div className="text-xs text-gray-400 mt-1">Locations</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-green-400">{stats.visitedCount}</div>
              <div className="text-xs text-gray-400 mt-1">Visited</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-amber-400">{stats.reviewCount}</div>
              <div className="text-xs text-gray-400 mt-1">Reviews</div>
            </div>
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-purple-400">{stats.questCount}</div>
              <div className="text-xs text-gray-400 mt-1">Quests</div>
            </div>
          </div>

          {/* Recent Visits */}
          {visitedLocations.length > 0 && (
            <div className="bg-gray-800/50 border border-gray-700 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-400 mb-4">Recent Visits</h2>
              <div className="space-y-3">
                {visitedLocations.map((location) => (
                  <div
                    key={location.id}
                    className="flex items-center gap-3 p-3 bg-gray-900/50 rounded-lg hover:bg-gray-900/70 transition-colors"
                  >
                    <span className="text-xl">
                      {locationTypeIcons[location.type] || '📍'}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">
                        {location.name}
                      </p>
                      {location.city && (
                        <p className="text-gray-400 text-xs truncate">
                          {location.city.name}, {location.city.country}
                        </p>
                      )}
                    </div>
                    {location.visitedAt && (
                      <span className="text-gray-500 text-xs">
                        {formatDistanceToNow(new Date(location.visitedAt), { addSuffix: true })}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
