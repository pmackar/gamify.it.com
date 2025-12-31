'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';

// Dynamic import for map to avoid SSR issues
const MapView = dynamic(() => import('@/components/map/MapView'), {
  ssr: false,
  loading: () => <div className="map-loading">Loading map...</div>,
});

interface PublicProfileData {
  user: {
    id: string;
    username: string | null;
    avatarUrl: string | null;
    bio: string | null;
    totalXp: number;
    level: number;
    createdAt: string;
  };
  stats: {
    visitedCount: number;
    reviewCount: number;
    questCount: number;
  };
  visitedLocations: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    category: string;
    latitude: number;
    longitude: number;
    photoUrl: string | null;
    visitedAt: string | null;
  }>;
}

export default function PublicProfilePage() {
  const params = useParams();
  const userId = params.userId as string;
  const [profile, setProfile] = useState<PublicProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'map'>('list');

  useEffect(() => {
    async function fetchProfile() {
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
        const data = await res.json();
        setProfile(data.data);
      } catch (err) {
        setError('Failed to load profile');
        console.error(err);
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [userId]);

  if (loading) {
    return <div className="loading">Loading profile...</div>;
  }

  if (error || !profile) {
    return (
      <div className="error-state">
        <h2>{error || 'Profile not found'}</h2>
        <Link href="/explore">Back to Explore</Link>
      </div>
    );
  }

  const mapLocations = profile.visitedLocations.map((loc) => ({
    id: loc.id,
    name: loc.name,
    description: null,
    city: loc.city,
    state: loc.state,
    category: loc.category as any,
    latitude: loc.latitude,
    longitude: loc.longitude,
    photoUrl: loc.photoUrl,
    averageRating: null,
    totalVisits: 0,
    totalReviews: 0,
    userSpecific: { hotlist: false, visited: true, rating: null },
  }));

  return (
    <>
      <style jsx>{`
        .profile-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .loading, .error-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 50vh;
          text-align: center;
          color: #888;
          font-size: 0.5rem;
          gap: 1rem;
        }

        .error-state h2 {
          font-size: 0.7rem;
          color: #ff4444;
        }

        .error-state a {
          color: #FFD700;
        }

        .profile-header {
          display: flex;
          gap: 2rem;
          align-items: flex-start;
          margin-bottom: 2rem;
          padding: 1.5rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
        }

        .avatar {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: #2a2a2a;
          border: 3px solid #5fbf8a;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5fbf8a, #4a9);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: #1a1a1a;
          border: 3px solid #4a9;
        }

        .profile-info {
          flex: 1;
        }

        .username {
          font-size: 0.8rem;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .bio {
          font-size: 0.45rem;
          color: #888;
          margin-bottom: 1rem;
          line-height: 1.8;
        }

        .level-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.4rem 0.8rem;
          background: rgba(95, 191, 138, 0.1);
          border: 1px solid rgba(95, 191, 138, 0.3);
          border-radius: 4px;
          font-size: 0.4rem;
          color: #5fbf8a;
        }

        .member-since {
          font-size: 0.35rem;
          color: #666;
          margin-top: 0.5rem;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
          padding: 1rem;
          text-align: center;
        }

        .stat-value {
          font-size: 1.2rem;
          color: #5fbf8a;
          text-shadow: 0 0 10px rgba(95, 191, 138, 0.5);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.4rem;
          color: #888;
          text-transform: uppercase;
        }

        .section-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: 0.6rem;
          color: #5fbf8a;
        }

        .view-toggle {
          display: flex;
          gap: 0.5rem;
        }

        .toggle-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          padding: 0.5rem 0.75rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 4px;
          color: #888;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          border-color: #3a3a3a;
          color: #fff;
        }

        .toggle-btn.active {
          border-color: #5fbf8a;
          color: #5fbf8a;
        }

        .locations-list {
          display: grid;
          gap: 0.75rem;
        }

        .location-item {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 0.75rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
          text-decoration: none;
          transition: all 0.2s;
        }

        .location-item:hover {
          border-color: #3a3a3a;
          background: #2a2a2a;
        }

        .location-photo {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          object-fit: cover;
          background: #2a2a2a;
        }

        .location-photo-placeholder {
          width: 48px;
          height: 48px;
          border-radius: 4px;
          background: #2a2a2a;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .location-details {
          flex: 1;
        }

        .location-name {
          font-size: 0.5rem;
          color: #fff;
          margin-bottom: 0.25rem;
        }

        .location-meta {
          font-size: 0.35rem;
          color: #888;
        }

        .visited-date {
          font-size: 0.35rem;
          color: #5fbf8a;
        }

        .map-container {
          height: 500px;
          border-radius: 8px;
          overflow: hidden;
          border: 2px solid #2a2a2a;
        }

        .map-loading {
          height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #1a1a1a;
          color: #888;
          font-size: 0.5rem;
        }

        .empty-state {
          text-align: center;
          padding: 3rem;
          color: #888;
          font-size: 0.45rem;
          background: #1a1a1a;
          border: 2px solid #2a2a2a;
          border-radius: 8px;
        }

        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }
      `}</style>

      <div className="profile-container">
        <div className="profile-header">
          {profile.user.avatarUrl ? (
            <img src={profile.user.avatarUrl} alt="Avatar" className="avatar" />
          ) : (
            <div className="avatar-placeholder">
              {profile.user.username?.[0]?.toUpperCase() || '?'}
            </div>
          )}

          <div className="profile-info">
            <h1 className="username">{profile.user.username || 'Explorer'}</h1>
            {profile.user.bio && <p className="bio">{profile.user.bio}</p>}
            <div className="level-badge">
              Level {profile.user.level} · {profile.user.totalXp} XP
            </div>
            <p className="member-since">
              Exploring since {new Date(profile.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>

        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{profile.stats.visitedCount}</div>
            <div className="stat-label">Places Visited</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile.stats.reviewCount}</div>
            <div className="stat-label">Reviews</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{profile.stats.questCount}</div>
            <div className="stat-label">Quests Completed</div>
          </div>
        </div>

        <div className="section-header">
          <h2 className="section-title">Visited Locations</h2>
          <div className="view-toggle">
            <button
              className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
            >
              List
            </button>
            <button
              className={`toggle-btn ${viewMode === 'map' ? 'active' : ''}`}
              onClick={() => setViewMode('map')}
            >
              Map
            </button>
          </div>
        </div>

        {profile.visitedLocations.length === 0 ? (
          <div className="empty-state">
            This explorer hasn't visited any locations yet.
          </div>
        ) : viewMode === 'list' ? (
          <div className="locations-list">
            {profile.visitedLocations.map((location) => (
              <Link
                key={location.id}
                href={`/locations/${location.id}`}
                className="location-item"
              >
                {location.photoUrl ? (
                  <img
                    src={location.photoUrl}
                    alt={location.name}
                    className="location-photo"
                  />
                ) : (
                  <div className="location-photo-placeholder">📍</div>
                )}
                <div className="location-details">
                  <div className="location-name">{location.name}</div>
                  <div className="location-meta">
                    {location.city}
                    {location.state ? `, ${location.state}` : ''} · {location.category.toLowerCase()}
                  </div>
                </div>
                {location.visitedAt && (
                  <div className="visited-date">
                    {new Date(location.visitedAt).toLocaleDateString()}
                  </div>
                )}
              </Link>
            ))}
          </div>
        ) : (
          <div className="map-container">
            <MapView locations={mapLocations} interactive={true} />
          </div>
        )}
      </div>
    </>
  );
}
