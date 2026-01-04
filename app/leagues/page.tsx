'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface LeagueMember {
  userId: string;
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
  weeklyXp: number;
  rank: number;
  zone: 'promotion' | 'safe' | 'demotion';
}

interface LeagueData {
  inLeague: boolean;
  league?: {
    id: string;
    tier: string;
    tierInfo: {
      tier: string;
      name: string;
      color: string;
      icon: string;
    };
  };
  userStats: {
    weeklyXp: number;
    rank: number | null;
    zone: 'promotion' | 'safe' | 'demotion';
  };
  overallStats: {
    currentTier: string;
    highestTier: string;
    weeksParticipated: number;
    totalPromotions: number;
    top3Finishes: number;
    firstPlaceWins: number;
  };
  timeRemaining: {
    hours: number;
    minutes: number;
    seconds: number;
  };
  standings?: {
    members: LeagueMember[];
    league: {
      id: string;
      tier: string;
      memberCount: number;
    };
  };
  tiers: Array<{
    tier: string;
    name: string;
    color: string;
    icon: string;
  }>;
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: '#CD7F32',
  SILVER: '#C0C0C0',
  GOLD: '#FFD700',
  PLATINUM: '#E5E4E2',
  DIAMOND: '#B9F2FF',
  OBSIDIAN: '#3D3D3D',
  LEGENDARY: '#FF6B6B',
};

export default function LeaguesPage() {
  const router = useRouter();
  const [data, setData] = useState<LeagueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [timeDisplay, setTimeDisplay] = useState('');

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    if (!data?.timeRemaining) return;

    const updateTime = () => {
      const { hours, minutes, seconds } = data.timeRemaining;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      const now = Date.now();
      const endTime = now + totalSeconds * 1000;

      const remaining = Math.max(0, endTime - Date.now());
      const h = Math.floor(remaining / 3600000);
      const m = Math.floor((remaining % 3600000) / 60000);
      const s = Math.floor((remaining % 60000) / 1000);

      setTimeDisplay(`${h}h ${m}m ${s}s`);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, [data?.timeRemaining]);

  async function checkAdminAndFetch() {
    try {
      // Check admin status
      const accountRes = await fetch('/api/account');
      if (!accountRes.ok) {
        router.push('/login');
        return;
      }
      const accountData = await accountRes.json();

      if (!accountData.isAdmin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await fetchLeagueData();
    } catch (err) {
      console.error('Error checking admin:', err);
      router.push('/');
    }
  }

  async function fetchLeagueData() {
    try {
      const res = await fetch('/api/leagues');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch leagues:', err);
    } finally {
      setLoading(false);
    }
  }

  async function joinLeague() {
    setJoining(true);
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
      });
      if (res.ok) {
        await fetchLeagueData();
      }
    } catch (err) {
      console.error('Failed to join league:', err);
    } finally {
      setJoining(false);
    }
  }

  if (loading || !isAdmin) {
    return (
      <div className="leagues-page">
        <style jsx>{styles}</style>
        <div className="loading">
          <div className="loading-spinner">⚔️</div>
          <p>Loading leagues...</p>
        </div>
      </div>
    );
  }

  const tierColor = data?.league?.tierInfo?.color || TIER_COLORS.BRONZE;

  return (
    <>
      <style jsx>{styles}</style>
      <div className="leagues-page">
        <div className="admin-badge">Admin Preview</div>

        <Link href="/admin" className="back-link">
          ← Back to Admin
        </Link>

        <div className="header">
          <h1 className="title">Weekly Leagues</h1>
          <p className="subtitle">Compete for glory every week</p>
        </div>

        {/* Time Remaining */}
        <div className="countdown-card">
          <div className="countdown-label">Week ends in</div>
          <div className="countdown-time">{timeDisplay || '--:--:--'}</div>
        </div>

        {!data?.inLeague ? (
          <div className="join-card">
            <div className="join-icon">⚔️</div>
            <h2 className="join-title">Join This Week's League</h2>
            <p className="join-text">
              Compete against 30 players to earn XP and climb the ranks.
              Top 10 get promoted, bottom 5 get demoted.
            </p>
            <button
              className="join-btn"
              onClick={joinLeague}
              disabled={joining}
            >
              {joining ? 'Joining...' : 'Join League'}
            </button>
          </div>
        ) : (
          <>
            {/* Current League Info */}
            <div
              className="league-card"
              style={{
                borderColor: tierColor,
                boxShadow: `0 0 30px ${tierColor}30`,
              }}
            >
              <div className="league-tier-icon">{data.league?.tierInfo?.icon}</div>
              <div className="league-tier-name" style={{ color: tierColor }}>
                {data.league?.tierInfo?.name} League
              </div>
              <div className="league-stats">
                <div className="stat">
                  <div className="stat-value">{data.userStats.weeklyXp.toLocaleString()}</div>
                  <div className="stat-label">Weekly XP</div>
                </div>
                <div className="stat">
                  <div className="stat-value">#{data.userStats.rank || '-'}</div>
                  <div className="stat-label">Rank</div>
                </div>
                <div className="stat">
                  <div
                    className="stat-value"
                    style={{
                      color:
                        data.userStats.zone === 'promotion'
                          ? '#4ADE80'
                          : data.userStats.zone === 'demotion'
                          ? '#EF4444'
                          : '#888',
                    }}
                  >
                    {data.userStats.zone === 'promotion'
                      ? '↑ Promo'
                      : data.userStats.zone === 'demotion'
                      ? '↓ Demo'
                      : 'Safe'}
                  </div>
                  <div className="stat-label">Zone</div>
                </div>
              </div>
            </div>

            {/* Tier Ladder */}
            <div className="tier-ladder">
              <h3 className="section-title">League Tiers</h3>
              <div className="tiers">
                {data.tiers?.slice().reverse().map((tier) => (
                  <div
                    key={tier.tier}
                    className={`tier-item ${tier.tier === data.league?.tier ? 'current' : ''}`}
                    style={{ borderColor: tier.color }}
                  >
                    <span className="tier-icon">{tier.icon}</span>
                    <span className="tier-name" style={{ color: tier.color }}>
                      {tier.name}
                    </span>
                    {tier.tier === data.league?.tier && (
                      <span className="current-badge">You</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Leaderboard */}
            <div className="leaderboard">
              <h3 className="section-title">
                Leaderboard ({data.standings?.league.memberCount || 0} players)
              </h3>
              <div className="leaderboard-list">
                {data.standings?.members.map((member, index) => (
                  <div
                    key={member.userId}
                    className={`leaderboard-item ${
                      member.zone === 'promotion'
                        ? 'promo-zone'
                        : member.zone === 'demotion'
                        ? 'demo-zone'
                        : ''
                    }`}
                  >
                    <div className="rank">
                      {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `#${member.rank}`}
                    </div>
                    <div className="player-info">
                      <div className="player-avatar">
                        {member.avatarUrl ? (
                          <img src={member.avatarUrl} alt="" />
                        ) : (
                          <span>👤</span>
                        )}
                      </div>
                      <div className="player-name">
                        {member.displayName || member.username || 'Anonymous'}
                      </div>
                    </div>
                    <div className="player-xp">{member.weeklyXp.toLocaleString()} XP</div>
                  </div>
                ))}
              </div>

              <div className="zone-legend">
                <div className="legend-item promo">
                  <span className="legend-color"></span>
                  Top 10 = Promotion
                </div>
                <div className="legend-item demo">
                  <span className="legend-color"></span>
                  Bottom 5 = Demotion
                </div>
              </div>
            </div>

            {/* Career Stats */}
            <div className="career-stats">
              <h3 className="section-title">Career Stats</h3>
              <div className="stats-grid">
                <div className="career-stat">
                  <div className="career-value">{data.overallStats.weeksParticipated}</div>
                  <div className="career-label">Weeks Played</div>
                </div>
                <div className="career-stat">
                  <div className="career-value">{data.overallStats.totalPromotions}</div>
                  <div className="career-label">Promotions</div>
                </div>
                <div className="career-stat">
                  <div className="career-value">{data.overallStats.top3Finishes}</div>
                  <div className="career-label">Top 3 Finishes</div>
                </div>
                <div className="career-stat">
                  <div className="career-value">{data.overallStats.firstPlaceWins}</div>
                  <div className="career-label">1st Place Wins</div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

  .leagues-page {
    min-height: 100vh;
    padding: calc(80px + env(safe-area-inset-top)) 1rem 2rem;
    background: linear-gradient(180deg, #0a0a0f 0%, #12121a 100%);
    max-width: 600px;
    margin: 0 auto;
  }

  .admin-badge {
    position: fixed;
    top: 60px;
    right: 10px;
    background: rgba(255, 107, 107, 0.2);
    border: 1px solid #FF6B6B;
    color: #FF6B6B;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    z-index: 100;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    gap: 1rem;
  }

  .loading-spinner {
    font-size: 3rem;
    animation: spin 1s linear infinite;
  }

  .loading p {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    color: #666;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #666;
    text-decoration: none;
    margin-bottom: 1rem;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #FFD700;
  }

  .header {
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .title {
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem;
    color: #FFD700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
    margin-bottom: 0.5rem;
  }

  .subtitle {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #666;
  }

  .countdown-card {
    background: rgba(255, 255, 255, 0.05);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    padding: 1rem;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .countdown-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #666;
    margin-bottom: 0.5rem;
  }

  .countdown-time {
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem;
    color: #FF6B6B;
    text-shadow: 0 0 10px rgba(255, 107, 107, 0.5);
  }

  .join-card {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid rgba(255, 215, 0, 0.3);
    border-radius: 16px;
    padding: 2rem;
    text-align: center;
  }

  .join-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .join-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.8rem;
    color: #FFD700;
    margin-bottom: 1rem;
  }

  .join-text {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #888;
    line-height: 1.8;
    margin-bottom: 1.5rem;
  }

  .join-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    padding: 1rem 2rem;
    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
    border: none;
    border-radius: 8px;
    color: #000;
    cursor: pointer;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .join-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
  }

  .join-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .league-card {
    background: rgba(255, 255, 255, 0.05);
    border: 2px solid;
    border-radius: 16px;
    padding: 1.5rem;
    text-align: center;
    margin-bottom: 1.5rem;
  }

  .league-tier-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .league-tier-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.8rem;
    margin-bottom: 1rem;
  }

  .league-stats {
    display: flex;
    justify-content: center;
    gap: 2rem;
  }

  .stat {
    text-align: center;
  }

  .stat-value {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.8rem;
    color: #fff;
    margin-bottom: 0.25rem;
  }

  .stat-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    color: #666;
  }

  .section-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    color: #888;
    margin-bottom: 1rem;
  }

  .tier-ladder {
    margin-bottom: 1.5rem;
  }

  .tiers {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .tier-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    transition: all 0.2s;
  }

  .tier-item.current {
    background: rgba(255, 255, 255, 0.08);
    border-width: 2px;
  }

  .tier-icon {
    font-size: 1.2rem;
  }

  .tier-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    flex: 1;
  }

  .current-badge {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    background: rgba(255, 215, 0, 0.2);
    color: #FFD700;
    padding: 4px 8px;
    border-radius: 4px;
  }

  .leaderboard {
    margin-bottom: 1.5rem;
  }

  .leaderboard-list {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .leaderboard-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
  }

  .leaderboard-item.promo-zone {
    border-color: rgba(74, 222, 128, 0.3);
    background: rgba(74, 222, 128, 0.05);
  }

  .leaderboard-item.demo-zone {
    border-color: rgba(239, 68, 68, 0.3);
    background: rgba(239, 68, 68, 0.05);
  }

  .rank {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #888;
    width: 40px;
    text-align: center;
  }

  .player-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex: 1;
  }

  .player-avatar {
    width: 28px;
    height: 28px;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
  }

  .player-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .player-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #fff;
  }

  .player-xp {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #5CC9F5;
  }

  .zone-legend {
    display: flex;
    gap: 1.5rem;
    margin-top: 1rem;
    justify-content: center;
  }

  .legend-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    color: #666;
  }

  .legend-color {
    width: 12px;
    height: 12px;
    border-radius: 3px;
  }

  .legend-item.promo .legend-color {
    background: rgba(74, 222, 128, 0.5);
    border: 1px solid #4ADE80;
  }

  .legend-item.demo .legend-color {
    background: rgba(239, 68, 68, 0.5);
    border: 1px solid #EF4444;
  }

  .career-stats {
    margin-bottom: 2rem;
  }

  .stats-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .career-stat {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 8px;
    padding: 1rem;
    text-align: center;
  }

  .career-value {
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem;
    color: #FFD700;
    margin-bottom: 0.25rem;
  }

  .career-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    color: #666;
  }
`;
