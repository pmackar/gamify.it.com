'use client';

import { useState, useEffect } from 'react';

interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  xp: number;
  progress: number;
  current: number;
  target: number;
}

export function AlmostThereCard() {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const res = await fetch('/api/fitness/achievement-progress');
        if (!res.ok) return;
        const data = await res.json();
        // Only show achievements that are >= 95% complete
        const nearComplete = (data.almostThere || []).filter(
          (a: Achievement) => a.progress >= 95
        );
        setAchievements(nearComplete);
      } catch (error) {
        console.error('Failed to fetch achievement progress:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProgress();
  }, []);

  if (loading || achievements.length === 0) {
    return null;
  }

  return (
    <>
      <style jsx>{`
        .almost-there-card {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(139, 92, 246, 0.05) 100%);
          border: 1px solid rgba(168, 85, 247, 0.3);
          border-radius: 16px;
          padding: 1rem;
          margin-bottom: 1rem;
        }

        .card-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 0.75rem;
          cursor: pointer;
          width: 100%;
          background: transparent;
          border: none;
          padding: 0;
          text-align: left;
        }

        .card-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #a855f7;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          flex: 1;
        }

        .card-count {
          font-size: 0.6rem;
          background: rgba(168, 85, 247, 0.2);
          color: #a855f7;
          padding: 2px 8px;
          border-radius: 10px;
          font-weight: 600;
        }

        .collapse-toggle {
          font-size: 0.5rem;
          color: #888;
          margin-left: 4px;
        }

        .sparkle {
          animation: sparkle 1.5s ease-in-out infinite;
        }

        @keyframes sparkle {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }

        .achievements-list {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .achievement-item {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 12px;
          padding: 0.75rem;
        }

        .achievement-icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .achievement-info {
          flex: 1;
          min-width: 0;
        }

        .achievement-name {
          font-size: 0.85rem;
          font-weight: 600;
          color: var(--rpg-text);
          margin-bottom: 0.25rem;
        }

        .achievement-progress-row {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .progress-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #a855f7 0%, #d946ef 100%);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-text {
          font-size: 0.65rem;
          color: var(--rpg-muted);
          white-space: nowrap;
        }

        .achievement-xp {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--rpg-gold);
          flex-shrink: 0;
        }
      `}</style>

      <div className="almost-there-card">
        <button className="card-header" onClick={() => setCollapsed(!collapsed)}>
          <span className="sparkle">✨</span>
          <span className="card-title">Almost There!</span>
          <span className="card-count">{achievements.length}</span>
          <span className="collapse-toggle">{collapsed ? '▶' : '▼'}</span>
        </button>

        {!collapsed && (
          <div className="achievements-list">
            {achievements.map((achievement) => (
              <div key={achievement.id} className="achievement-item">
                <span className="achievement-icon">{achievement.icon}</span>
                <div className="achievement-info">
                  <div className="achievement-name">{achievement.name}</div>
                  <div className="achievement-progress-row">
                    <div className="progress-bar">
                      <div
                        className="progress-fill"
                        style={{ width: `${achievement.progress}%` }}
                      />
                    </div>
                    <span className="progress-text">
                      {achievement.current}/{achievement.target}
                    </span>
                  </div>
                </div>
                <span className="achievement-xp">+{achievement.xp}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
