'use client';

import { useState, useEffect } from 'react';
import { useFitnessStore } from '@/lib/fitness/store';

interface FriendRivalry {
  id: string;
  rivalType: 'friend';
  friendId: string;
  friend: {
    id: string;
    username: string | null;
    displayName: string | null;
    avatarUrl: string | null;
    level: number;
  };
  victoryCondition: string;
  streakHolderId: string | null;
  streakCount: number;
  lastShowdown: string | null;
  headToHead: {
    userWins: number;
    rivalWins: number;
    ties: number;
  };
}

const VICTORY_CONDITION_NAMES: Record<string, string> = {
  rolling_average: 'Beat Your Average',
  volume_growth: 'Volume Growth',
  consistency: 'Consistency',
  prs: 'PR Race',
  best_of_3: 'Best of 3',
};

export function FriendRivalryScoreboard() {
  const store = useFitnessStore();
  const [friendRivalries, setFriendRivalries] = useState<FriendRivalry[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchRivalries = async () => {
      try {
        const res = await fetch('/api/fitness/narrative/rivals');
        if (res.ok) {
          const data = await res.json();
          // Filter to only friend rivalries
          const friends = (data.rivals || []).filter(
            (r: { rivalType: string }) => r.rivalType === 'friend'
          );
          setFriendRivalries(friends);
        }
      } catch (error) {
        console.error('Failed to fetch rivalries:', error);
      }
      setLoading(false);
    };

    fetchRivalries();
  }, []);

  if (loading || friendRivalries.length === 0) {
    return null;
  }

  return (
    <div className="friend-rivalry-scoreboard">
      <button
        className="scoreboard-header"
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: 'pointer', width: '100%', background: 'transparent', border: 'none', padding: 0 }}
      >
        <span className="scoreboard-icon">⚔️</span>
        <span className="scoreboard-title">Active Rivalries</span>
        <span className="scoreboard-count">{friendRivalries.length}</span>
        <span className="collapse-toggle">{collapsed ? '▶' : '▼'}</span>
      </button>

      {!collapsed && <div className="scoreboard-list">
        {friendRivalries.map((rivalry) => {
          const friend = rivalry.friend;
          const myWins = rivalry.headToHead.userWins;
          const theirWins = rivalry.headToHead.rivalWins;
          const ties = rivalry.headToHead.ties;
          const totalGames = myWins + theirWins + ties;
          const isWinning = myWins > theirWins;
          const isLosing = theirWins > myWins;
          const isTied = myWins === theirWins;

          return (
            <div key={rivalry.id} className="rivalry-card">
              <div className="rivalry-opponents">
                {/* You */}
                <div className={`opponent you ${isWinning ? 'winning' : ''}`}>
                  <div className="opponent-avatar you-avatar">
                    {store.profile.name?.[0]?.toUpperCase() || 'Y'}
                  </div>
                  <div className="opponent-score">{myWins}</div>
                  <div className="opponent-label">YOU</div>
                </div>

                {/* VS */}
                <div className="rivalry-vs">
                  <div className="vs-text">VS</div>
                  {totalGames > 0 && (
                    <div className="vs-record">
                      {ties > 0 ? `${ties} tie${ties > 1 ? 's' : ''}` : ''}
                    </div>
                  )}
                </div>

                {/* Friend */}
                <div className={`opponent friend ${isLosing ? 'winning' : ''}`}>
                  <div className="opponent-avatar">
                    {friend.avatarUrl ? (
                      <img src={friend.avatarUrl} alt="" className="avatar-img" />
                    ) : (
                      friend.displayName?.[0]?.toUpperCase() ||
                      friend.username?.[0]?.toUpperCase() ||
                      '?'
                    )}
                  </div>
                  <div className="opponent-score">{theirWins}</div>
                  <div className="opponent-label">
                    {friend.displayName || friend.username || 'Friend'}
                  </div>
                </div>
              </div>

              {/* Victory condition & streak info */}
              <div className="rivalry-footer">
                <div className="victory-condition">
                  {VICTORY_CONDITION_NAMES[rivalry.victoryCondition] || 'Weekly Showdown'}
                </div>
                {rivalry.streakCount > 0 && rivalry.streakHolderId && (
                  <div className={`streak-badge ${rivalry.streakHolderId === store.profile.id ? 'your-streak' : 'their-streak'}`}>
                    🔥 {rivalry.streakCount} streak
                  </div>
                )}
              </div>

              {/* Status message */}
              <div className="rivalry-status">
                {totalGames === 0 ? (
                  <span className="status-new">First showdown this week!</span>
                ) : isWinning ? (
                  <span className="status-winning">You're ahead! Keep it up 💪</span>
                ) : isLosing ? (
                  <span className="status-losing">Time to catch up! 🏃</span>
                ) : (
                  <span className="status-tied">It's a tie - break it this week!</span>
                )}
              </div>
            </div>
          );
        })}
      </div>}

      <style jsx>{`
        .friend-rivalry-scoreboard {
          margin: 16px 0;
          padding: 16px;
          background: linear-gradient(180deg, #2d2d3d 0%, #1f1f2e 100%);
          border-radius: 16px;
          border: 1px solid #3d3d4d;
        }

        .scoreboard-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 16px;
          text-align: left;
        }

        .scoreboard-icon {
          font-size: 1.25rem;
        }

        .scoreboard-title {
          font-size: 0.875rem;
          font-weight: 600;
          color: #FFD700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          flex: 1;
        }

        .scoreboard-count {
          font-size: 0.7rem;
          background: rgba(255, 215, 0, 0.2);
          color: #FFD700;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .collapse-toggle {
          font-size: 0.6rem;
          color: #888;
          margin-left: 4px;
        }

        .scoreboard-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .rivalry-card {
          background: rgba(0, 0, 0, 0.3);
          border-radius: 12px;
          padding: 16px;
          border: 1px solid rgba(255, 215, 0, 0.2);
        }

        .rivalry-opponents {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .opponent {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
          flex: 1;
        }

        .opponent-avatar {
          width: 48px;
          height: 48px;
          border-radius: 50%;
          background: #3d3d4d;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          font-weight: 700;
          color: #888;
          overflow: hidden;
        }

        .opponent.you .opponent-avatar {
          background: linear-gradient(135deg, #4ECDC4 0%, #44a08d 100%);
          color: white;
        }

        .opponent.winning .opponent-avatar {
          box-shadow: 0 0 0 3px #FFD700, 0 0 20px rgba(255, 215, 0, 0.3);
        }

        .avatar-img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .opponent-score {
          font-size: 1.75rem;
          font-weight: 800;
          color: white;
        }

        .opponent.winning .opponent-score {
          color: #FFD700;
        }

        .opponent-label {
          font-size: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 1px;
          color: #888;
        }

        .rivalry-vs {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0 12px;
        }

        .vs-text {
          font-size: 0.875rem;
          font-weight: 700;
          color: #666;
        }

        .vs-record {
          font-size: 0.625rem;
          color: #555;
        }

        .rivalry-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }

        .victory-condition {
          font-size: 0.75rem;
          color: #888;
        }

        .streak-badge {
          font-size: 0.625rem;
          padding: 2px 8px;
          border-radius: 12px;
          background: rgba(255, 107, 107, 0.2);
          color: #FF6B6B;
        }

        .streak-badge.your-streak {
          background: rgba(78, 205, 196, 0.2);
          color: #4ECDC4;
        }

        .rivalry-status {
          text-align: center;
          font-size: 0.75rem;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.1);
        }

        .status-new {
          color: #888;
        }

        .status-winning {
          color: #4ECDC4;
        }

        .status-losing {
          color: #FF6B6B;
        }

        .status-tied {
          color: #FFD700;
        }
      `}</style>
    </div>
  );
}
