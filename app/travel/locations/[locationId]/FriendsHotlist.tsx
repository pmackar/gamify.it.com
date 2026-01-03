'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { Heart } from 'lucide-react';

interface Friend {
  id: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  level: number;
}

interface FriendsHotlistProps {
  locationId: string;
}

export default function FriendsHotlist({ locationId }: FriendsHotlistProps) {
  const [friends, setFriends] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchFriends() {
      try {
        const res = await fetch(`/api/locations/${locationId}/hotlist-friends`);
        if (res.ok) {
          const data = await res.json();
          setFriends(data.friends);
        }
      } catch (err) {
        console.error('Failed to fetch hotlist friends:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchFriends();
  }, [locationId]);

  if (loading || friends.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg p-5 mt-6"
      style={{
        background: 'var(--rpg-card)',
        border: '2px solid var(--rpg-border)',
        boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
      }}
    >
      <h3
        className="text-sm mb-4 flex items-center gap-2"
        style={{ color: 'var(--rpg-text)' }}
      >
        <Heart className="w-4 h-4" style={{ color: '#ef4444' }} fill="#ef4444" />
        Friends Want to Visit
      </h3>

      <div className="flex flex-wrap gap-3">
        {friends.map((friend) => (
          <Link
            key={friend.id}
            href={`/users/${friend.id}`}
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-all hover:scale-105"
            style={{
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid var(--rpg-border)',
            }}
            title={friend.displayName || friend.username || 'Friend'}
          >
            {friend.avatarUrl ? (
              <Image
                src={friend.avatarUrl}
                alt=""
                width={28}
                height={28}
                className="rounded-full"
              />
            ) : (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium"
                style={{
                  background: 'linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-teal-dark) 100%)',
                  color: 'var(--rpg-bg-dark)',
                }}
              >
                {(friend.displayName || friend.username || '?').charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex flex-col">
              <span
                className="text-xs font-medium"
                style={{ color: 'var(--rpg-text)' }}
              >
                {friend.displayName || friend.username}
              </span>
              <span
                className="text-[10px]"
                style={{ color: 'var(--rpg-muted)' }}
              >
                L{friend.level}
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
