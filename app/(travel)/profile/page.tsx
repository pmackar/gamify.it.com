'use client';

import { useEffect, useState } from 'react';
import { useUser } from '@clerk/nextjs';
import Link from 'next/link';
import { LocationCard } from '@/components/location/LocationCard';
import { LocationListItem } from '@/types';

interface ProfileData {
  user: {
    id: string;
    username: string | null;
    email: string | null;
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
    hotlistCount: number;
  };
  recentVisits: Array<{
    id: string;
    name: string;
    city: string | null;
    state: string | null;
    category: string;
    photoUrl: string | null;
    visitedAt: string | null;
    visitCount: number;
  }>;
}

type FilterType = 'visited' | 'hotlist' | 'rated';

export default function ProfilePage() {
  const { isSignedIn, isLoaded } = useUser();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [locations, setLocations] = useState<LocationListItem[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('visited');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    async function fetchProfile() {
      try {
        const res = await fetch('/api/user/profile');
        const data = await res.json();
        setProfile(data.data);
      } catch (err) {
        console.error('Failed to fetch profile:', err);
      }
    }

    fetchProfile();
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (!isSignedIn) return;

    async function fetchLocations() {
      setLoading(true);
      try {
        const res = await fetch(`/api/user/locations?filter=${activeFilter}`);
        const data = await res.json();
        setLocations(data.data || []);
      } catch (err) {
        console.error('Failed to fetch locations:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchLocations();
  }, [isSignedIn, activeFilter]);

  if (!isLoaded) {
    return <div className="loading">Loading...</div>;
  }

  if (!isSignedIn) {
    return (
      <div className="auth-required">
        <h2>Sign in to view your profile</h2>
        <p>Track your adventures, save locations, and more!</p>
      </div>
    );
  }

  return (
    <>
      <style jsx>{`
        .profile-container {
          max-width: 1000px;
          margin: 0 auto;
          padding: 2rem 1rem;
        }

        .loading, .auth-required {
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

        .auth-required h2 {
          font-size: 0.7rem;
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
          border: 3px solid #FFD700;
          object-fit: cover;
        }

        .avatar-placeholder {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFD700, #FFA500);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          border: 3px solid #CC8800;
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
          background: rgba(255, 215, 0, 0.1);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 4px;
          font-size: 0.4rem;
          color: #FFD700;
        }

        .xp-bar {
          width: 100%;
          max-width: 200px;
          height: 8px;
          background: #2a2a2a;
          border-radius: 4px;
          margin-top: 0.5rem;
          overflow: hidden;
        }

        .xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFD700, #FFA500);
          border-radius: 4px;
          transition: width 0.3s;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
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
          color: #FFD700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
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
          color: #FFD700;
        }

        .filter-tabs {
          display: flex;
          gap: 0.5rem;
        }

        .filter-tab {
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

        .filter-tab:hover {
          border-color: #3a3a3a;
          color: #fff;
        }

        .filter-tab.active {
          border-color: #FFD700;
          color: #FFD700;
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
        }

        .locations-grid {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .locations-grid {
            grid-template-columns: repeat(2, 1fr);
          }
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

        .empty-state a {
          color: #FFD700;
        }

        @media (max-width: 768px) {
          .profile-header {
            flex-direction: column;
            align-items: center;
            text-align: center;
          }

          .stats-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="profile-container">
        {profile && (
          <>
            <div className="profile-header">
              {profile.user.avatarUrl ? (
                <img src={profile.user.avatarUrl} alt="Avatar" className="avatar" />
              ) : (
                <div className="avatar-placeholder">
                  {profile.user.username?.[0]?.toUpperCase() || '?'}
                </div>
              )}

              <div className="profile-info">
                <h1 className="username">
                  {profile.user.username || 'Explorer'}
                </h1>
                {profile.user.bio && <p className="bio">{profile.user.bio}</p>}
                <div className="level-badge">
                  Level {profile.user.level} · {profile.user.totalXp} XP
                </div>
                <div className="xp-bar">
                  <div
                    className="xp-fill"
                    style={{ width: `${(profile.user.totalXp % 1000) / 10}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value">{profile.stats.visitedCount}</div>
                <div className="stat-label">Visited</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{profile.stats.hotlistCount}</div>
                <div className="stat-label">Saved</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{profile.stats.reviewCount}</div>
                <div className="stat-label">Reviews</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">{profile.stats.questCount}</div>
                <div className="stat-label">Quests</div>
              </div>
            </div>
          </>
        )}

        <div className="section-header">
          <h2 className="section-title">My Locations</h2>
          <div className="filter-tabs">
            <button
              className={`filter-tab ${activeFilter === 'visited' ? 'active' : ''}`}
              onClick={() => setActiveFilter('visited')}
            >
              Visited
            </button>
            <button
              className={`filter-tab ${activeFilter === 'hotlist' ? 'active' : ''}`}
              onClick={() => setActiveFilter('hotlist')}
            >
              Saved
            </button>
            <button
              className={`filter-tab ${activeFilter === 'rated' ? 'active' : ''}`}
              onClick={() => setActiveFilter('rated')}
            >
              Rated
            </button>
          </div>
        </div>

        {loading ? (
          <div className="empty-state">Loading...</div>
        ) : locations.length === 0 ? (
          <div className="empty-state">
            {activeFilter === 'visited' && (
              <>No locations visited yet. <Link href="/explore">Start exploring!</Link></>
            )}
            {activeFilter === 'hotlist' && (
              <>No saved locations. Save places you want to visit!</>
            )}
            {activeFilter === 'rated' && (
              <>No rated locations. Rate places you've been to!</>
            )}
          </div>
        ) : (
          <div className="locations-grid">
            {locations.map((location) => (
              <LocationCard
                key={location.id}
                location={location}
                showActions={true}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
