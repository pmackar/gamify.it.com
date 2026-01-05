'use client';

import { useState, useEffect } from 'react';

interface Challenge {
  id: string;
  type: string;
  title: string;
  description: string;
  target: number;
  current: number;
  xpReward: number;
  difficulty: 'easy' | 'medium' | 'hard';
  completed: boolean;
}

interface ChallengeData {
  challenges: Challenge[];
  hoursRemaining: number;
  allCompleted: boolean;
  bonusXP: number;
}

const DIFFICULTY_COLORS = {
  easy: { bg: 'rgba(95, 191, 138, 0.15)', border: 'rgba(95, 191, 138, 0.4)', text: '#5fbf8a' },
  medium: { bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)', text: '#fbbf24' },
  hard: { bg: 'rgba(239, 68, 68, 0.15)', border: 'rgba(239, 68, 68, 0.4)', text: '#ef4444' },
};

export function DailyChallengeCard() {
  const [data, setData] = useState<ChallengeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchChallenges = async () => {
      try {
        const res = await fetch('/api/fitness/daily-challenge');
        if (!res.ok) return;
        const result = await res.json();
        setData(result);
      } catch (error) {
        console.error('Failed to fetch challenges:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchChallenges();
    // Refresh every 5 minutes to update progress
    const interval = setInterval(fetchChallenges, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading || !data || data.challenges.length === 0) {
    return null;
  }

  const completedCount = data.challenges.filter(c => c.completed).length;
  const totalXP = data.challenges.reduce((sum, c) => sum + (c.completed ? c.xpReward : 0), 0);

  return (
    <>
      <style jsx>{`
        .challenge-card {
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.1) 0%, rgba(255, 107, 107, 0.05) 100%);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .challenge-card:hover {
          border-color: rgba(255, 107, 107, 0.5);
        }

        .card-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .header-left {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .card-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          color: #ff6b6b;
          text-transform: uppercase;
        }

        .time-badge {
          font-size: 0.6rem;
          color: var(--rpg-muted);
          background: rgba(0, 0, 0, 0.2);
          padding: 0.2rem 0.5rem;
          border-radius: 10px;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .progress-badge {
          font-size: 0.7rem;
          color: var(--rpg-text);
          background: rgba(255, 107, 107, 0.2);
          padding: 0.25rem 0.5rem;
          border-radius: 8px;
        }

        .expand-icon {
          font-size: 0.8rem;
          color: var(--rpg-muted);
          transition: transform 0.2s;
        }

        .expand-icon.expanded {
          transform: rotate(180deg);
        }

        .challenges-list {
          margin-top: 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .challenge-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          border-radius: 12px;
          transition: all 0.2s;
        }

        .challenge-item.completed {
          opacity: 0.7;
        }

        .difficulty-icon {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          flex-shrink: 0;
        }

        .challenge-info {
          flex: 1;
          min-width: 0;
        }

        .challenge-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: var(--rpg-text);
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .challenge-title .check {
          color: var(--rpg-teal);
        }

        .challenge-desc {
          font-size: 0.7rem;
          color: var(--rpg-muted);
          margin-top: 0.2rem;
        }

        .challenge-progress {
          margin-top: 0.4rem;
        }

        .progress-bar {
          height: 4px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 2px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        .challenge-xp {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 0.35rem 0.5rem;
          border-radius: 8px;
          flex-shrink: 0;
        }

        .all-complete {
          margin-top: 1rem;
          padding: 0.75rem;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
          border: 1px solid var(--rpg-gold);
          border-radius: 12px;
          text-align: center;
        }

        .bonus-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: var(--rpg-gold);
        }
      `}</style>

      <div className="challenge-card" onClick={() => setExpanded(!expanded)}>
        <div className="card-header">
          <div className="header-left">
            <span>🎯</span>
            <span className="card-title">Daily Challenges</span>
            <span className="time-badge">{data.hoursRemaining}h left</span>
          </div>
          <div className="header-right">
            <span className="progress-badge">
              {completedCount}/{data.challenges.length}
            </span>
            <span className={`expand-icon ${expanded ? 'expanded' : ''}`}>▼</span>
          </div>
        </div>

        {expanded && (
          <div className="challenges-list">
            {data.challenges.map((challenge) => {
              const colors = DIFFICULTY_COLORS[challenge.difficulty];
              const progress = Math.min(100, Math.round((challenge.current / challenge.target) * 100));

              return (
                <div
                  key={challenge.id}
                  className={`challenge-item ${challenge.completed ? 'completed' : ''}`}
                  style={{
                    background: colors.bg,
                    border: `1px solid ${colors.border}`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <div
                    className="difficulty-icon"
                    style={{ background: colors.bg, border: `1px solid ${colors.border}` }}
                  >
                    {challenge.difficulty === 'easy' ? '⭐' :
                     challenge.difficulty === 'medium' ? '🔥' : '💎'}
                  </div>

                  <div className="challenge-info">
                    <div className="challenge-title">
                      {challenge.title}
                      {challenge.completed && <span className="check">✓</span>}
                    </div>
                    <div className="challenge-desc">{challenge.description}</div>
                    {!challenge.completed && (
                      <div className="challenge-progress">
                        <div className="progress-bar">
                          <div
                            className="progress-fill"
                            style={{
                              width: `${progress}%`,
                              background: colors.text,
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div
                    className="challenge-xp"
                    style={{
                      background: challenge.completed ? 'rgba(95, 191, 138, 0.2)' : colors.bg,
                      color: challenge.completed ? '#5fbf8a' : colors.text,
                    }}
                  >
                    +{challenge.xpReward}
                  </div>
                </div>
              );
            })}

            {data.allCompleted && data.bonusXP > 0 && (
              <div className="all-complete">
                <span className="bonus-text">
                  🏆 All Complete! +{data.bonusXP} Bonus XP
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
