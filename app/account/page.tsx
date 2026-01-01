'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

// Icon mapping for achievements
const ICON_MAP: Record<string, string> = {
  footprints: '👣', compass: '🧭', map: '🗺️', globe: '🌍', building: '🏢',
  buildings: '🏙️', sparkles: '✨', plane: '✈️', airplane: '🛩️', earth: '🌎',
  utensils: '🍴', star: '⭐', 'chef-hat': '👨‍🍳', beer: '🍺', cocktail: '🍸',
  tree: '🌲', mountain: '⛰️', flame: '🔥', fire: '🔥', trophy: '🏆',
  medal: '🏅', crown: '👑', landmark: '🏛️', camera: '📷', 'umbrella-beach': '🏖️',
  waves: '🌊', dumbbell: '💪', zap: '⚡', 'map-pin': '📍', 'check-circle': '✅',
  layers: '📚',
};

function getIcon(icon: string): string {
  return ICON_MAP[icon] || '🎖️';
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return '#5fbf8a';
    case 2: return '#5CC9F5';
    case 3: return '#a855f7';
    case 4: return '#FFD700';
    default: return '#888';
  }
}

function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'COMMON';
    case 2: return 'RARE';
    case 3: return 'EPIC';
    case 4: return 'LEGENDARY';
    default: return '';
  }
}

// Pixel Particles Component
function PixelParticles() {
  const [particles, setParticles] = useState<Array<{ id: number; left: number; size: number; duration: number; delay: number; color: string }>>([]);
  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#5CC9F5', '#5fbf8a', '#a855f7'];
    const newParticles = Array.from({ length: 20 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      size: Math.random() * 4 + 2,
      duration: Math.random() * 15 + 10,
      delay: Math.random() * 10,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));
    setParticles(newParticles);
  }, []);
  return (
    <div className="particles-container">
      {particles.map((p) => (
        <div key={p.id} className="pixel-particle" style={{ left: `${p.left}%`, width: `${p.size}px`, height: `${p.size}px`, backgroundColor: p.color, animationDuration: `${p.duration}s`, animationDelay: `${p.delay}s` }} />
      ))}
    </div>
  );
}

// Game Icons
const DumbbellIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="8" y="20" width="8" height="24" fill="#FF6B6B"/><rect x="16" y="16" width="8" height="32" fill="#CC5555"/><rect x="24" y="28" width="16" height="8" fill="#888"/><rect x="40" y="16" width="8" height="32" fill="#CC5555"/><rect x="48" y="20" width="8" height="24" fill="#FF6B6B"/></svg>);
const ChecklistIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="8" y="8" width="48" height="48" fill="#5CC9F5"/><rect x="12" y="12" width="40" height="40" fill="#2D8AB5"/><rect x="16" y="20" width="8" height="8" fill="#7FD954"/><rect x="28" y="20" width="20" height="8" fill="white"/><rect x="16" y="36" width="8" height="8" fill="white" opacity="0.6"/><rect x="28" y="36" width="20" height="8" fill="white" opacity="0.6"/></svg>);
const PlaneIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="28" y="8" width="8" height="16" fill="#5fbf8a"/><rect x="24" y="24" width="16" height="24" fill="#5fbf8a"/><rect x="8" y="28" width="16" height="8" fill="#4a9d70"/><rect x="40" y="28" width="16" height="8" fill="#4a9d70"/><rect x="20" y="48" width="8" height="8" fill="#4a9d70"/><rect x="36" y="48" width="8" height="8" fill="#4a9d70"/></svg>);

const XPBar = ({ current, max, color }: { current: number; max: number; color: string }) => (
  <div className="xp-bar-container">
    <div className="xp-bar-bg">
      <div className="xp-bar-fill" style={{ width: `${(current / max) * 100}%`, background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`, boxShadow: `0 0 8px ${color}60` }} />
    </div>
    <span className="xp-bar-text">{current.toLocaleString()} / {max.toLocaleString()} XP</span>
  </div>
);

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
      tier: number;
      category: string;
    }>;
  };
  memberSince: string;
}

const APP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  fitness: DumbbellIcon,
  travel: PlaneIcon,
  today: ChecklistIcon,
};

export default function AccountPage() {
  const [data, setData] = useState<AccountData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAllAchievements, setShowAllAchievements] = useState(false);

  useEffect(() => {
    fetch('/api/account')
      .then(res => {
        if (!res.ok) {
          if (res.status === 401) {
            window.location.href = '/';
            return null;
          }
          throw new Error('Failed to load account');
        }
        return res.json();
      })
      .then(data => data && setData(data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <style jsx global>{`body { background: #0a0a0a; }`}</style>
        <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid #333', borderTopColor: '#FFD700', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  if (!data || !data.user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0a0a' }}>
        <p style={{ color: '#888', fontFamily: "'Press Start 2P', monospace", fontSize: '0.7rem' }}>
          Please sign in to view your account
        </p>
      </div>
    );
  }

  const xpProgress = Math.min((data.mainStats.currentLevelXP / data.mainStats.xpToNext) * 100, 100);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; overflow-x: hidden; }

        /* Particles */
        .particles-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1; overflow: hidden; }
        .pixel-particle { position: absolute; image-rendering: pixelated; animation: float-up linear infinite; }
        @keyframes float-up { 0% { transform: translateY(100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; } }

        /* Dashboard Wrapper */
        .account-wrapper { background: linear-gradient(180deg, #0a0a0a 0%, #121218 50%, #0a0a0a 100%); position: relative; min-height: 100vh; }
        .account-wrapper::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.05) 0px, rgba(0,0,0,0.05) 1px, transparent 1px, transparent 3px); pointer-events: none; z-index: 1000; }
        .account-content { position: relative; z-index: 2; padding: 80px 2rem 4rem; max-width: 1100px; margin: 0 auto; font-family: 'Press Start 2P', monospace; }

        /* Welcome Card - Glass morphic */
        .welcome-card { background: rgba(30, 30, 40, 0.8); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; padding: 2rem; display: flex; align-items: center; gap: 2rem; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.05); margin-bottom: 3rem; }
        .welcome-avatar { position: relative; flex-shrink: 0; }
        .welcome-avatar img { width: 80px; height: 80px; border-radius: 16px; border: 3px solid #FFD700; box-shadow: 0 0 30px rgba(255, 215, 0, 0.3); }
        .avatar-placeholder { width: 80px; height: 80px; border-radius: 16px; border: 3px solid #FFD700; background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #1a1a1a; box-shadow: 0 0 30px rgba(255, 215, 0, 0.3); }
        .level-badge { position: absolute; bottom: -8px; right: -8px; background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%); border: 2px solid #CC8800; border-radius: 8px; padding: 0.3rem 0.5rem; font-size: 0.45rem; color: #1a1a1a; font-weight: bold; box-shadow: 0 2px 0 #996600; }
        .welcome-info { flex: 1; }
        .welcome-label { font-size: 0.4rem; color: #5fbf8a; letter-spacing: 0.2em; margin-bottom: 0.5rem; text-shadow: 0 0 10px rgba(95, 191, 138, 0.5); }
        .welcome-name { font-size: clamp(0.9rem, 3vw, 1.4rem); color: #fff; margin-bottom: 0.75rem; text-shadow: 0 0 20px rgba(255, 255, 255, 0.1); }
        .welcome-email { font-size: 0.4rem; color: #666; margin-bottom: 1rem; }
        .xp-display { display: inline-flex; align-items: baseline; gap: 0.75rem; background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 215, 0, 0.2); border-radius: 10px; padding: 0.6rem 1rem; }
        .xp-value { font-size: 1rem; color: #FFD700; text-shadow: 0 0 15px rgba(255, 215, 0, 0.5); }
        .xp-label { font-size: 0.35rem; color: #888; }

        /* XP Bar */
        .xp-bar-section { margin-top: 1rem; }
        .xp-bar-bg { height: 12px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 6px; overflow: hidden; }
        .xp-bar-fill { height: 100%; border-radius: 5px; transition: width 0.5s ease-out; }
        .xp-bar-text { display: block; margin-top: 0.4rem; font-size: 0.35rem; color: #666; }

        /* Stats Grid */
        .stats-section { margin-bottom: 3rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 1rem; }
        .stat-card { background: rgba(30, 30, 40, 0.6); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1.25rem; text-align: center; transition: all 0.3s ease; }
        .stat-card:hover { border-color: rgba(255, 215, 0, 0.3); box-shadow: 0 0 20px rgba(255, 215, 0, 0.1); }
        .stat-value { font-size: 1.5rem; margin-bottom: 0.5rem; text-shadow: 0 0 15px currentColor; }
        .stat-label { font-size: 0.4rem; color: #888; }

        /* Section Headers */
        .section-header { margin-bottom: 1.5rem; }
        .section-label { font-size: 0.45rem; color: #5fbf8a; margin-bottom: 0.5rem; letter-spacing: 0.2em; text-shadow: 0 0 10px rgba(95,191,138,0.5); }
        .section-title { font-size: clamp(0.8rem, 2.5vw, 1.1rem); }
        @keyframes rgb-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .shimmer-text { background: linear-gradient(90deg, #fff 0%, #fff 35%, #ff6b6b 42%, #FFD700 50%, #00ff00 58%, #fff 65%, #fff 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: rgb-shimmer 4s ease-in-out infinite; }

        /* Games Grid - Same as landing */
        .games-section { margin-bottom: 3rem; }
        .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; }
        .game-card { background: linear-gradient(180deg, #252525 0%, #1a1a1a 100%); border: 2px solid #3a3a3a; border-radius: 16px; padding: 1.5rem 1.25rem 1.25rem; text-align: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration: none; display: block; box-shadow: 0 4px 0 #0a0a0a, 0 8px 30px rgba(0,0,0,0.3); position: relative; overflow: hidden; }
        .game-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, var(--card-color, #FFD700), transparent); opacity: 0; transition: opacity 0.3s ease; }
        .game-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 0%, var(--card-glow, rgba(255,215,0,0.1)) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
        .game-card:hover { transform: translateY(-8px); border-color: var(--card-color, #FFD700); box-shadow: 0 12px 0 #0a0a0a, 0 20px 40px rgba(0,0,0,0.4), 0 0 40px var(--card-glow, rgba(255,215,0,0.15)); }
        .game-card:hover::before, .game-card:hover::after { opacity: 1; }
        .game-card.fitness { --card-color: #FF6B6B; --card-glow: rgba(255,107,107,0.15); }
        .game-card.travel { --card-color: #5fbf8a; --card-glow: rgba(95,191,138,0.15); }
        .game-card.today { --card-color: #5CC9F5; --card-glow: rgba(92,201,245,0.15); }
        .game-card.inactive { opacity: 0.6; }
        .game-card.inactive:hover { opacity: 0.9; }
        .game-card-badge { position: absolute; top: 0.7rem; right: 0.7rem; font-size: 0.31rem; padding: 0.22rem 0.44rem; border-radius: 4px; }
        .game-icon { width: 64px; height: 64px; margin: 0 auto 1rem; transition: all 0.3s ease; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
        .game-card:hover .game-icon { transform: scale(1.1) translateY(-4px); filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4)); }
        .game-name { font-size: 0.7rem; color: #fff; margin-bottom: 0.35rem; }
        .game-tagline { font-size: 0.45rem; color: #888; margin-bottom: 0.75rem; line-height: 1.8; }
        .xp-bar-container { margin-top: 0.5rem; }
        .game-domain { font-size: 0.32rem; color: #555; margin-top: 0.6rem; transition: color 0.2s ease; }
        .game-card:hover .game-domain { color: #888; }

        /* Achievements Section */
        .achievements-section { margin-bottom: 3rem; }
        .achievements-row { display: flex; gap: 1rem; overflow-x: auto; padding: 0.5rem 0; scrollbar-width: thin; scrollbar-color: #3a3a3a #1a1a1a; }
        .achievements-row::-webkit-scrollbar { height: 6px; }
        .achievements-row::-webkit-scrollbar-track { background: #1a1a1a; border-radius: 3px; }
        .achievements-row::-webkit-scrollbar-thumb { background: #3a3a3a; border-radius: 3px; }
        .achievement-card { flex-shrink: 0; width: 130px; background: rgba(30, 30, 40, 0.6); backdrop-filter: blur(10px); border: 2px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1rem; text-align: center; cursor: pointer; transition: all 0.25s ease; position: relative; overflow: hidden; }
        .achievement-card:hover { transform: translateY(-4px); box-shadow: 0 8px 20px rgba(0, 0, 0, 0.4); }
        .achievement-card-icon { width: 56px; height: 56px; margin: 0 auto 0.75rem; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 1.8rem; }
        .achievement-card-name { font-size: 0.4rem; color: #fff; line-height: 1.4; margin-bottom: 0.25rem; }
        .achievement-card-tier { font-size: 0.28rem; padding: 0.15rem 0.3rem; border-radius: 3px; display: inline-block; }
        .view-all-btn { flex-shrink: 0; width: 130px; background: rgba(30, 30, 40, 0.4); border: 2px dashed rgba(255, 255, 255, 0.1); border-radius: 12px; padding: 1rem; display: flex; flex-direction: column; align-items: center; justify-content: center; cursor: pointer; transition: all 0.25s ease; }
        .view-all-btn:hover { border-color: #FFD700; background: rgba(30, 30, 40, 0.8); }
        .view-all-icon { font-size: 2rem; margin-bottom: 0.5rem; }
        .view-all-text { font-size: 0.4rem; color: #888; text-align: center; line-height: 1.6; }

        /* Modal */
        .achievements-modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.85); z-index: 10000; display: flex; align-items: center; justify-content: center; padding: 2rem; backdrop-filter: blur(8px); }
        .achievements-modal { background: rgba(30, 30, 40, 0.95); backdrop-filter: blur(20px); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 20px; max-width: 900px; width: 100%; max-height: 80vh; overflow-y: auto; position: relative; box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6); }
        .achievements-modal::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #5fbf8a, #5CC9F5, #a855f7, #FFD700); border-radius: 20px 20px 0 0; }
        .modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1.5rem 2rem; border-bottom: 1px solid rgba(255, 255, 255, 0.1); position: sticky; top: 0; background: rgba(30, 30, 40, 0.95); z-index: 1; }
        .modal-title { font-size: 0.9rem; color: #FFD700; text-shadow: 0 0 15px rgba(255, 215, 0, 0.3); }
        .modal-close { width: 36px; height: 36px; background: rgba(255, 255, 255, 0.1); border: none; border-radius: 8px; color: #888; font-size: 1.5rem; cursor: pointer; transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: rgba(255, 255, 255, 0.2); color: #fff; }
        .modal-content { padding: 2rem; }
        .achievement-tier-section { margin-bottom: 2rem; }
        .tier-header { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 1rem; }
        .tier-label { font-size: 0.55rem; padding: 0.25rem 0.5rem; border-radius: 4px; }
        .tier-count { font-size: 0.4rem; color: #666; }
        .tier-achievements-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; }
        .modal-achievement-card { background: rgba(0, 0, 0, 0.3); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 12px; padding: 1rem; display: flex; gap: 1rem; transition: all 0.2s ease; }
        .modal-achievement-card:hover { border-color: rgba(255, 255, 255, 0.2); }
        .modal-achievement-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; flex-shrink: 0; }
        .modal-achievement-info { flex: 1; min-width: 0; }
        .modal-achievement-name { font-size: 0.45rem; color: #fff; margin-bottom: 0.25rem; }
        .modal-achievement-desc { font-size: 0.35rem; color: #888; line-height: 1.6; margin-bottom: 0.5rem; }
        .modal-achievement-xp { font-size: 0.35rem; color: #FFD700; }

        /* Footer */
        .member-since { text-align: center; font-size: 0.4rem; color: #444; margin-top: 2rem; padding-top: 2rem; border-top: 1px solid rgba(255, 255, 255, 0.05); }

        @media (max-width: 768px) {
          .welcome-card { flex-direction: column; text-align: center; gap: 1.5rem; }
          .account-content { padding: 70px 1rem 2rem; }
          .games-grid { gap: 1rem; }
          .game-card { padding: 1.25rem 1rem 1rem; }
          .game-icon { width: 48px; height: 48px; }
          .game-name { font-size: 0.6rem; }
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
      `}</style>

      <div className="account-wrapper">
        <PixelParticles />
        <div className="account-content">
          {/* Welcome Card */}
          <div className="welcome-card">
            <div className="welcome-avatar">
              {data.user.avatarUrl ? (
                <img src={data.user.avatarUrl} alt={data.user.displayName} />
              ) : (
                <div className="avatar-placeholder">
                  {data.user.displayName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="level-badge">LVL {data.mainStats.level}</div>
            </div>
            <div className="welcome-info">
              <p className="welcome-label">YOUR PROFILE</p>
              <h1 className="welcome-name">{data.user.displayName}</h1>
              <p className="welcome-email">{data.user.email}</p>
              <div className="xp-display">
                <span className="xp-value">{data.mainStats.totalXP.toLocaleString()}</span>
                <span className="xp-label">TOTAL XP</span>
              </div>
              <div className="xp-bar-section">
                <div className="xp-bar-bg">
                  <div className="xp-bar-fill" style={{ width: `${xpProgress}%`, background: 'linear-gradient(90deg, #FFD700 0%, #FFA500 100%)', boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }} />
                </div>
                <span className="xp-bar-text">{data.mainStats.currentLevelXP.toLocaleString()} / {data.mainStats.xpToNext.toLocaleString()} XP to Level {data.mainStats.level + 1}</span>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <section className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#FFD700' }}>{data.mainStats.level}</div>
                <div className="stat-label">MAIN LEVEL</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#5CC9F5' }}>{data.apps.filter(a => a.profile).length}</div>
                <div className="stat-label">GAMES ACTIVE</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#FF6B6B' }}>{data.mainStats.currentStreak}</div>
                <div className="stat-label">DAY STREAK</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#a855f7' }}>{data.mainStats.longestStreak}</div>
                <div className="stat-label">BEST STREAK</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#5fbf8a' }}>{data.achievements.total}</div>
                <div className="stat-label">ACHIEVEMENTS</div>
              </div>
            </div>
          </section>

          {/* Games Section */}
          <section className="games-section">
            <div className="section-header">
              <p className="section-label">// YOUR GAMES</p>
              <h2 className="section-title shimmer-text">Active Adventures</h2>
            </div>
            <div className="games-grid">
              {data.apps.map(app => {
                const IconComponent = APP_ICONS[app.id];
                return (
                  <Link
                    key={app.id}
                    href={app.url}
                    className={`game-card ${app.id} ${!app.profile ? 'inactive' : ''}`}
                  >
                    {app.profile && (
                      <span className="game-card-badge" style={{ background: `${app.color}30`, border: `1px solid ${app.color}`, color: app.color }}>
                        LVL {app.profile.level}
                      </span>
                    )}
                    {IconComponent && <IconComponent className="game-icon" />}
                    <h3 className="game-name">{app.name}</h3>
                    {app.profile ? (
                      <>
                        <p className="game-tagline">{app.profile.xp.toLocaleString()} XP earned</p>
                        <XPBar current={app.profile.xp} max={app.profile.xp + app.profile.xp_to_next} color={app.color} />
                      </>
                    ) : (
                      <p className="game-tagline">Not started yet</p>
                    )}
                    <p className="game-domain">/{app.id}</p>
                  </Link>
                );
              })}
            </div>
          </section>

          {/* Achievements Section */}
          {data.achievements.list.length > 0 && (() => {
            const sortedAchievements = [...data.achievements.list].sort((a, b) => {
              if ((b.tier || 1) !== (a.tier || 1)) return (b.tier || 1) - (a.tier || 1);
              return new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime();
            });

            const tierGroups = sortedAchievements.reduce((acc, ach) => {
              const tier = ach.tier || 1;
              if (!acc[tier]) acc[tier] = [];
              acc[tier].push(ach);
              return acc;
            }, {} as Record<number, typeof sortedAchievements>);

            return (
              <section className="achievements-section">
                <div className="section-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p className="section-label">// ACHIEVEMENTS</p>
                    <h2 className="section-title shimmer-text">Trophy Case</h2>
                  </div>
                  <span style={{ fontSize: '0.45rem', color: '#888' }}>{data.achievements.total} Unlocked</span>
                </div>
                <div className="achievements-row">
                  {sortedAchievements.slice(0, 6).map(achievement => {
                    const tierColor = getTierColor(achievement.tier || 1);
                    return (
                      <div
                        key={achievement.id}
                        className="achievement-card"
                        style={{ borderColor: `${tierColor}50` }}
                        onClick={() => setShowAllAchievements(true)}
                      >
                        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: tierColor }} />
                        <div className="achievement-card-icon" style={{ background: `${tierColor}20`, border: `2px solid ${tierColor}50` }}>
                          {getIcon(achievement.icon)}
                        </div>
                        <div className="achievement-card-name">{achievement.name}</div>
                        <div className="achievement-card-tier" style={{ background: `${tierColor}30`, color: tierColor }}>
                          {getTierName(achievement.tier || 1)}
                        </div>
                      </div>
                    );
                  })}
                  {data.achievements.total > 6 && (
                    <div className="view-all-btn" onClick={() => setShowAllAchievements(true)}>
                      <div className="view-all-icon">🏆</div>
                      <div className="view-all-text">View All<br />({data.achievements.total})</div>
                    </div>
                  )}
                </div>

                {showAllAchievements && (
                  <div className="achievements-modal-overlay" onClick={() => setShowAllAchievements(false)}>
                    <div className="achievements-modal" onClick={e => e.stopPropagation()}>
                      <div className="modal-header">
                        <h3 className="modal-title">ALL ACHIEVEMENTS</h3>
                        <button className="modal-close" onClick={() => setShowAllAchievements(false)}>×</button>
                      </div>
                      <div className="modal-content">
                        {[4, 3, 2, 1].map(tier => {
                          const tierAchievements = tierGroups[tier];
                          if (!tierAchievements?.length) return null;
                          const tierColor = getTierColor(tier);
                          return (
                            <div key={tier} className="achievement-tier-section">
                              <div className="tier-header">
                                <span className="tier-label" style={{ background: `${tierColor}30`, color: tierColor }}>
                                  {getTierName(tier)}
                                </span>
                                <span className="tier-count">{tierAchievements.length} unlocked</span>
                              </div>
                              <div className="tier-achievements-grid">
                                {tierAchievements.map(ach => (
                                  <div key={ach.id} className="modal-achievement-card" style={{ borderColor: `${tierColor}30` }}>
                                    <div className="modal-achievement-icon" style={{ background: `${tierColor}20`, border: `2px solid ${tierColor}50` }}>
                                      {getIcon(ach.icon)}
                                    </div>
                                    <div className="modal-achievement-info">
                                      <div className="modal-achievement-name">{ach.name}</div>
                                      <div className="modal-achievement-desc">{ach.description}</div>
                                      <div className="modal-achievement-xp">+{ach.xpReward} XP</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </section>
            );
          })()}

          {/* Member Since */}
          <p className="member-since">
            Member since {new Date(data.memberSince).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </p>
        </div>
      </div>
    </>
  );
}
