'use client';

import { useState, useEffect } from 'react';
import { useFitnessStore } from '@/lib/fitness/store';
import type { RivalRelationship } from '@/lib/fitness/types';

interface RivalWeeklyStats {
  rivalId: string;
  userVolume: number;
  rivalVolume: number;
  userWorkouts: number;
  rivalWorkouts: number;
  userPRs: number;
  rivalPRs: number;
  userXP: number;
  rivalXP: number;
  leadingMetric: 'volume' | 'workouts' | 'prs' | 'xp' | 'tie';
  leadAmount: number;
  isUserLeading: boolean;
}

export function RivalStatusCard({ onOpenSettings }: { onOpenSettings?: () => void }) {
  const store = useFitnessStore();
  const [weeklyStats, setWeeklyStats] = useState<RivalWeeklyStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  const narrativeEngine = store.narrativeEngine;
  const rivals = narrativeEngine?.rivals || [];

  // Fetch weekly comparison stats
  useEffect(() => {
    const fetchWeeklyStats = async () => {
      if (rivals.length === 0) {
        setLoading(false);
        return;
      }

      try {
        const res = await fetch('/api/fitness/narrative/rivals');
        if (res.ok) {
          const data = await res.json();
          // Calculate weekly stats from the response
          const stats: RivalWeeklyStats[] = (data.rivals || []).map((rival: RivalRelationship & { weeklyComparison?: { user: { volume: number; workouts: number; prs: number; xp: number }; rival: { volume: number; workouts: number; prs: number; xp: number } } }) => {
            const comparison = rival.weeklyComparison || {
              user: { volume: 0, workouts: 0, prs: 0, xp: 0 },
              rival: { volume: 0, workouts: 0, prs: 0, xp: 0 }
            };

            const userTotal = comparison.user.volume + comparison.user.workouts * 100 + comparison.user.prs * 50;
            const rivalTotal = comparison.rival.volume + comparison.rival.workouts * 100 + comparison.rival.prs * 50;

            let leadingMetric: 'volume' | 'workouts' | 'prs' | 'xp' | 'tie' = 'tie';
            let leadAmount = 0;

            if (comparison.user.volume !== comparison.rival.volume) {
              leadingMetric = 'volume';
              leadAmount = Math.abs(comparison.user.volume - comparison.rival.volume);
            } else if (comparison.user.workouts !== comparison.rival.workouts) {
              leadingMetric = 'workouts';
              leadAmount = Math.abs(comparison.user.workouts - comparison.rival.workouts);
            } else if (comparison.user.prs !== comparison.rival.prs) {
              leadingMetric = 'prs';
              leadAmount = Math.abs(comparison.user.prs - comparison.rival.prs);
            }

            return {
              rivalId: rival.id,
              userVolume: comparison.user.volume,
              rivalVolume: comparison.rival.volume,
              userWorkouts: comparison.user.workouts,
              rivalWorkouts: comparison.rival.workouts,
              userPRs: comparison.user.prs,
              rivalPRs: comparison.rival.prs,
              userXP: comparison.user.xp,
              rivalXP: comparison.rival.xp,
              leadingMetric,
              leadAmount,
              isUserLeading: userTotal >= rivalTotal,
            };
          });
          setWeeklyStats(stats);
        }
      } catch (error) {
        console.error('Failed to fetch rival stats:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchWeeklyStats();
  }, [rivals.length]);

  // Don't show if no rivals
  if (!loading && rivals.length === 0) {
    return (
      <div className="rival-status-card empty" onClick={onOpenSettings}>
        <style jsx>{`
          .rival-status-card.empty {
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%);
            border: 1px dashed rgba(139, 92, 246, 0.3);
            border-radius: 16px;
            padding: 16px;
            margin: 0 16px 16px;
            text-align: center;
            cursor: pointer;
            transition: all 0.2s;
          }
          .rival-status-card.empty:hover {
            border-color: rgba(139, 92, 246, 0.5);
            background: linear-gradient(135deg, rgba(139, 92, 246, 0.15) 0%, rgba(168, 85, 247, 0.08) 100%);
          }
          .empty-icon {
            font-size: 24px;
            margin-bottom: 8px;
          }
          .empty-title {
            font-size: 14px;
            font-weight: 600;
            color: var(--text-primary);
            margin-bottom: 4px;
          }
          .empty-subtitle {
            font-size: 12px;
            color: var(--text-muted);
          }
        `}</style>
        <div className="empty-icon">⚔️</div>
        <div className="empty-title">Add a Rival</div>
        <div className="empty-subtitle">Compete with friends or AI to stay motivated</div>
      </div>
    );
  }

  if (loading) {
    return null; // Don't show loading state, just wait
  }

  const getRivalName = (rival: RivalRelationship): string => {
    if (rival.rivalType === 'friend' && rival.friend) {
      return rival.friend.displayName || rival.friend.username || 'Friend';
    }
    return rival.phantomConfig?.name || 'AI Rival';
  };

  const getRivalIcon = (rival: RivalRelationship): string => {
    if (rival.rivalType === 'friend') {
      return '👤';
    }
    const personality = rival.phantomConfig?.personality;
    switch (personality) {
      case 'mirror': return '🪞';
      case 'rival': return '⚔️';
      case 'mentor': return '🧘';
      case 'nemesis': return '💀';
      default: return '🤖';
    }
  };

  return (
    <>
      <style jsx>{`
        .rival-status-card {
          background: linear-gradient(135deg, rgba(139, 92, 246, 0.12) 0%, rgba(168, 85, 247, 0.06) 100%);
          border: 1px solid rgba(139, 92, 246, 0.25);
          border-radius: 16px;
          padding: 14px 16px;
          margin: 0 16px 16px;
        }

        .rival-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 12px;
        }

        .rival-header-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .rival-header-icon {
          font-size: 16px;
        }

        .rival-header-title {
          font-size: 11px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          color: #a855f7;
        }

        .rival-header-count {
          font-size: 10px;
          background: rgba(168, 85, 247, 0.2);
          color: #a855f7;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .collapse-btn {
          background: none;
          border: none;
          color: var(--text-muted);
          font-size: 10px;
          cursor: pointer;
          padding: 4px;
        }

        .rival-list {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .rival-item {
          display: flex;
          align-items: center;
          gap: 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 12px;
        }

        .rival-avatar {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: linear-gradient(135deg, #8b5cf6 0%, #a855f7 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          flex-shrink: 0;
        }

        .rival-info {
          flex: 1;
          min-width: 0;
        }

        .rival-name {
          font-size: 14px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 2px;
        }

        .rival-status {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .rival-status.leading {
          color: #5fbf8a;
        }

        .rival-status.behind {
          color: #f97316;
        }

        .rival-status.tied {
          color: var(--text-muted);
        }

        .rival-record {
          text-align: right;
          flex-shrink: 0;
        }

        .rival-record-wins {
          font-size: 13px;
          font-weight: 700;
          color: var(--text-primary);
        }

        .rival-record-label {
          font-size: 10px;
          color: var(--text-muted);
          text-transform: uppercase;
        }

        .rival-manage-btn {
          display: block;
          width: 100%;
          margin-top: 12px;
          padding: 10px;
          background: rgba(139, 92, 246, 0.15);
          border: 1px solid rgba(139, 92, 246, 0.3);
          border-radius: 10px;
          color: #a855f7;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
          text-align: center;
        }

        .rival-manage-btn:hover {
          background: rgba(139, 92, 246, 0.25);
        }
      `}</style>

      <div className="rival-status-card">
        <button className="rival-header" onClick={() => setCollapsed(!collapsed)} style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left' }}>
          <div className="rival-header-left">
            <span className="rival-header-icon">⚔️</span>
            <span className="rival-header-title">Rivals</span>
            <span className="rival-header-count">{rivals.length}</span>
          </div>
          <span className="collapse-btn">{collapsed ? '▶' : '▼'}</span>
        </button>

        {!collapsed && (
          <>
            <div className="rival-list">
              {rivals.slice(0, 3).map((rival) => {
                const stats = weeklyStats.find(s => s.rivalId === rival.id);
                const isLeading = stats?.isUserLeading ?? (rival.headToHead.userWins > rival.headToHead.rivalWins);
                const isTied = stats ? stats.leadAmount === 0 : (rival.headToHead.userWins === rival.headToHead.rivalWins);

                let statusText = '';
                if (stats) {
                  if (isTied) {
                    statusText = 'Tied this week';
                  } else if (stats.leadingMetric === 'volume') {
                    statusText = isLeading
                      ? `+${(stats.leadAmount / 1000).toFixed(1)}k lbs ahead`
                      : `${(stats.leadAmount / 1000).toFixed(1)}k lbs behind`;
                  } else if (stats.leadingMetric === 'workouts') {
                    statusText = isLeading
                      ? `+${stats.leadAmount} workout${stats.leadAmount > 1 ? 's' : ''} ahead`
                      : `${stats.leadAmount} workout${stats.leadAmount > 1 ? 's' : ''} behind`;
                  } else if (stats.leadingMetric === 'prs') {
                    statusText = isLeading
                      ? `+${stats.leadAmount} PR${stats.leadAmount > 1 ? 's' : ''} ahead`
                      : `${stats.leadAmount} PR${stats.leadAmount > 1 ? 's' : ''} behind`;
                  }
                } else {
                  statusText = isLeading ? 'Leading overall' : isTied ? 'Even record' : 'Trailing overall';
                }

                return (
                  <div key={rival.id} className="rival-item">
                    <div className="rival-avatar">
                      {getRivalIcon(rival)}
                    </div>
                    <div className="rival-info">
                      <div className="rival-name">{getRivalName(rival)}</div>
                      <div className={`rival-status ${isTied ? 'tied' : isLeading ? 'leading' : 'behind'}`}>
                        {isTied ? '⚖️' : isLeading ? '🔥' : '⚡'} {statusText}
                      </div>
                    </div>
                    <div className="rival-record">
                      <div className="rival-record-wins">
                        {rival.headToHead.userWins}-{rival.headToHead.rivalWins}
                      </div>
                      <div className="rival-record-label">Record</div>
                    </div>
                  </div>
                );
              })}
            </div>

            {onOpenSettings && (
              <button className="rival-manage-btn" onClick={onOpenSettings}>
                Manage Rivals
              </button>
            )}
          </>
        )}
      </div>
    </>
  );
}
