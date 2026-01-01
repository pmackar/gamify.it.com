'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface AccountData {
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
    username: string | null;
    bio: string | null;
  };
  mainStats: {
    level: number;
    totalXP: number;
    currentLevelXP: number;
    xpToNext: number;
    currentStreak: number;
    longestStreak: number;
  };
  apps: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    url: string;
    profile: {
      xp: number;
      level: number;
      xp_to_next: number;
      stats: Record<string, unknown>;
    } | null;
  }>;
  achievements: {
    total: number;
    list: Array<{
      id: string;
      code: string;
      name: string;
      description: string;
      icon: string;
      appId: string;
      completedAt: string;
      xpReward: number;
    }>;
  };
  memberSince: string;
}

export default function AccountPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/account')
      .then(res => res.json())
      .then(setData)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-16 h-16 border-4 border-gray-700 border-t-yellow-400 rounded-full animate-spin" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p style={{ color: '#888', fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem' }}>
          Failed to load account data
        </p>
      </div>
    );
  }

  const xpProgress = (data.mainStats.currentLevelXP / data.mainStats.xpToNext) * 100;

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .account-container {
          max-width: 900px;
          margin: 0 auto;
          padding: 2rem;
          font-family: 'Press Start 2P', monospace;
        }

        .character-card {
          background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%);
          border: 3px solid #3a3a3a;
          border-radius: 16px;
          padding: 2rem;
          margin-bottom: 2rem;
          box-shadow: 0 6px 0 #1a1a1a;
          position: relative;
          overflow: hidden;
        }

        .character-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
        }

        .avatar-container {
          position: relative;
          display: inline-block;
        }

        .avatar {
          width: 100px;
          height: 100px;
          border-radius: 12px;
          border: 3px solid #FFD700;
          box-shadow: 0 0 20px rgba(255,215,0,0.3);
        }

        .avatar-placeholder {
          width: 100px;
          height: 100px;
          border-radius: 12px;
          border: 3px solid #FFD700;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          color: #1a1a1a;
        }

        .level-badge {
          position: absolute;
          bottom: -8px;
          right: -8px;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 8px;
          padding: 0.4rem 0.6rem;
          font-size: 0.6rem;
          color: #1a1a1a;
          font-weight: bold;
          box-shadow: 0 2px 0 #996600;
        }

        .xp-bar-container {
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          height: 24px;
          overflow: hidden;
          position: relative;
        }

        .xp-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #00ff00 0%, #7FD954 50%, #FFD700 100%);
          border-radius: 6px;
          transition: width 0.5s ease;
          position: relative;
        }

        .xp-bar-fill::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 50%;
          background: linear-gradient(180deg, rgba(255,255,255,0.2) 0%, transparent 100%);
        }

        .xp-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 0.45rem;
          color: #fff;
          text-shadow: 0 1px 2px rgba(0,0,0,0.8);
          z-index: 1;
        }

        .stats-row {
          display: flex;
          gap: 1rem;
          flex-wrap: wrap;
          margin-top: 1.5rem;
        }

        .stat-item {
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 0.75rem 1rem;
          text-align: center;
          flex: 1;
          min-width: 80px;
        }

        .stat-value {
          font-size: 1rem;
          color: #FFD700;
          margin-bottom: 0.25rem;
        }

        .stat-label {
          font-size: 0.4rem;
          color: #888;
        }

        .apps-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 2rem;
        }

        .app-card {
          background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%);
          border: 2px solid #3a3a3a;
          border-radius: 12px;
          padding: 1.5rem;
          text-decoration: none;
          display: block;
          transition: all 0.25s ease;
          box-shadow: 0 4px 0 #1a1a1a;
          position: relative;
          overflow: hidden;
        }

        .app-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 0 #1a1a1a, 0 0 30px rgba(255,215,0,0.2);
        }

        .app-card.inactive {
          opacity: 0.6;
        }

        .app-card.inactive:hover {
          opacity: 0.8;
        }

        .app-icon {
          font-size: 2rem;
          margin-bottom: 0.75rem;
        }

        .app-name {
          font-size: 0.7rem;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .app-level {
          display: inline-block;
          padding: 0.3rem 0.6rem;
          border-radius: 4px;
          font-size: 0.5rem;
          margin-bottom: 0.75rem;
        }

        .app-xp {
          font-size: 0.4rem;
          color: #888;
        }

        .app-inactive-label {
          font-size: 0.4rem;
          color: #666;
          font-style: italic;
        }

        .section-title {
          font-size: 0.8rem;
          color: #FFD700;
          margin-bottom: 1.5rem;
          text-shadow: 0 0 10px rgba(255,215,0,0.3);
        }

        .achievements-list {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
        }

        .achievement-badge {
          background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%);
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 0.75rem;
          display: flex;
          align-items: center;
          gap: 0.75rem;
          min-width: 200px;
          transition: all 0.2s ease;
        }

        .achievement-badge:hover {
          border-color: #FFD700;
          box-shadow: 0 0 15px rgba(255,215,0,0.2);
        }

        .achievement-icon {
          width: 40px;
          height: 40px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          border-radius: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .achievement-name {
          font-size: 0.5rem;
          color: #fff;
          margin-bottom: 0.2rem;
        }

        .achievement-desc {
          font-size: 0.35rem;
          color: #888;
        }

        .member-since {
          text-align: center;
          font-size: 0.45rem;
          color: #555;
          margin-top: 2rem;
        }
      `}</style>

      <div className="account-container">
        {/* Character Card */}
        <div className="character-card">
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Avatar */}
            <div className="avatar-container">
              {data.user.avatarUrl ? (
                <img src={data.user.avatarUrl} alt={data.user.displayName} className="avatar" />
              ) : (
                <div className="avatar-placeholder">
                  {data.user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="level-badge">LVL {data.mainStats.level}</div>
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: '200px' }}>
              <h1 style={{ fontSize: '1.2rem', color: '#FFD700', marginBottom: '0.5rem', textShadow: '0 0 15px rgba(255,215,0,0.4)' }}>
                {data.user.displayName}
              </h1>
              <p style={{ fontSize: '0.45rem', color: '#888', marginBottom: '1rem' }}>
                {data.user.email}
              </p>

              {/* XP Bar */}
              <div className="xp-bar-container">
                <div className="xp-bar-fill" style={{ width: `${Math.min(xpProgress, 100)}%` }} />
                <span className="xp-text">
                  {data.mainStats.currentLevelXP.toLocaleString()} / {data.mainStats.xpToNext.toLocaleString()} XP
                </span>
              </div>
              <p style={{ fontSize: '0.4rem', color: '#666', marginTop: '0.5rem' }}>
                {data.mainStats.totalXP.toLocaleString()} Total XP Earned
              </p>
            </div>
          </div>

          {/* Stats Row */}
          <div className="stats-row">
            <div className="stat-item">
              <div className="stat-value">{data.mainStats.level}</div>
              <div className="stat-label">MAIN LEVEL</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{data.apps.filter(a => a.profile).length}</div>
              <div className="stat-label">GAMES PLAYED</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#FF6B6B' }}>{data.mainStats.currentStreak}</div>
              <div className="stat-label">DAY STREAK</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#5CC9F5' }}>{data.mainStats.longestStreak}</div>
              <div className="stat-label">BEST STREAK</div>
            </div>
            <div className="stat-item">
              <div className="stat-value" style={{ color: '#7FD954' }}>{data.achievements.total}</div>
              <div className="stat-label">ACHIEVEMENTS</div>
            </div>
          </div>
        </div>

        {/* Games Section */}
        <h2 className="section-title">YOUR GAMES</h2>
        <div className="apps-grid">
          {data.apps.map(app => (
            <Link
              key={app.id}
              href={app.url}
              className={`app-card ${!app.profile ? 'inactive' : ''}`}
              style={{ borderTopColor: app.color, borderTopWidth: '3px' }}
            >
              <div className="app-icon">{app.icon}</div>
              <div className="app-name">{app.name}</div>
              {app.profile ? (
                <>
                  <div className="app-level" style={{ background: app.color, color: '#1a1a1a' }}>
                    Level {app.profile.level}
                  </div>
                  <div className="app-xp">{app.profile.xp.toLocaleString()} XP</div>
                </>
              ) : (
                <div className="app-inactive-label">Not started yet - Click to play!</div>
              )}
            </Link>
          ))}
        </div>

        {/* Achievements Section */}
        {data.achievements.list.length > 0 && (
          <>
            <h2 className="section-title">ACHIEVEMENTS</h2>
            <div className="achievements-list">
              {data.achievements.list.slice(0, 8).map(achievement => (
                <div key={achievement.id} className="achievement-badge">
                  <div className="achievement-icon">
                    {achievement.icon === 'dumbbell' ? '💪' :
                     achievement.icon === 'fire' ? '🔥' :
                     achievement.icon === 'trophy' ? '🏆' :
                     achievement.icon === 'zap' ? '⚡' :
                     achievement.icon === 'crown' ? '👑' :
                     achievement.icon === 'map-pin' ? '📍' :
                     achievement.icon === 'compass' ? '🧭' :
                     achievement.icon === 'globe' ? '🌍' :
                     achievement.icon === 'star' ? '⭐' :
                     achievement.icon === 'check-circle' ? '✅' :
                     achievement.icon === 'layers' ? '📚' :
                     '🎮'}
                  </div>
                  <div>
                    <div className="achievement-name">{achievement.name}</div>
                    <div className="achievement-desc">{achievement.description}</div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Member Since */}
        <p className="member-since">
          Member since {new Date(data.memberSince).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
        </p>
      </div>
    </>
  );
}
