'use client';

import { useState, useEffect, useCallback } from 'react';

interface WeeklyWinsData {
  hasWins: boolean;
  thisWeek: {
    workouts: number;
    sets: number;
    volume: number;
    xp: number;
    duration: number;
    prs: number;
    exercises: number;
  };
  lastWeek: {
    workouts: number;
    sets: number;
    volume: number;
    xp: number;
  };
  improvements: {
    workoutChange: number;
    volumeChange: number;
  };
  prs: Array<{ exerciseId: string; weight: number; date: string }>;
  message: string;
}

const STORAGE_KEY = 'gamify_weekly_wins_last_shown';

export function WeeklyWinsModal() {
  const [data, setData] = useState<WeeklyWinsData | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Check if we should show the modal
  const shouldShowModal = useCallback(() => {
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Sunday
    const hour = now.getHours();

    // Only show on Sunday after 6pm or Monday before noon
    const isSundayEvening = dayOfWeek === 0 && hour >= 18;
    const isMondayMorning = dayOfWeek === 1 && hour < 12;

    if (!isSundayEvening && !isMondayMorning) {
      return false;
    }

    // Check if we already showed it this week
    const lastShown = localStorage.getItem(STORAGE_KEY);
    if (lastShown) {
      const lastDate = new Date(lastShown);
      const daysSince = Math.floor((now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince < 5) {
        // Don't show again within 5 days
        return false;
      }
    }

    return true;
  }, []);

  // Fetch weekly wins data
  useEffect(() => {
    if (!shouldShowModal()) return;

    const fetchData = async () => {
      try {
        const res = await fetch('/api/fitness/weekly-wins');
        if (!res.ok) return;

        const winsData = await res.json();
        if (winsData.hasWins && winsData.thisWeek.workouts > 0) {
          setData(winsData);
          setShowModal(true);
          setTimeout(() => setIsVisible(true), 50);
          localStorage.setItem(STORAGE_KEY, new Date().toISOString());
        }
      } catch (error) {
        console.error('Failed to fetch weekly wins:', error);
      }
    };

    // Small delay to let the app load first
    const timer = setTimeout(fetchData, 2000);
    return () => clearTimeout(timer);
  }, [shouldShowModal]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => setShowModal(false), 300);
  };

  if (!showModal || !data) return null;

  const formatVolume = (vol: number) => {
    if (vol >= 1000000) return `${(vol / 1000000).toFixed(1)}M`;
    if (vol >= 1000) return `${(vol / 1000).toFixed(0)}K`;
    return vol.toLocaleString();
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  return (
    <>
      <style jsx>{`
        .wins-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(10px);
          z-index: 10004;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          opacity: ${isVisible ? 1 : 0};
          transition: opacity 0.3s ease;
        }

        .wins-card {
          position: relative;
          background: linear-gradient(180deg, rgba(30, 35, 45, 0.98) 0%, rgba(20, 25, 35, 0.98) 100%);
          border: 2px solid var(--rpg-gold);
          border-radius: 20px;
          padding: 1.5rem;
          max-width: 400px;
          width: 100%;
          text-align: center;
          transform: ${isVisible ? 'scale(1)' : 'scale(0.9)'};
          transition: transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 40px rgba(255, 215, 0, 0.2);
        }

        .wins-header {
          margin-bottom: 1.5rem;
        }

        .wins-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .wins-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 1rem;
          color: var(--rpg-gold);
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
          margin-bottom: 0.25rem;
        }

        .wins-subtitle {
          font-size: 0.75rem;
          color: var(--rpg-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .wins-stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1rem;
          margin-bottom: 1.5rem;
        }

        .stat-item {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 0.75rem;
        }

        .stat-value {
          font-family: 'Press Start 2P', monospace;
          font-size: 1rem;
          color: var(--rpg-text);
        }

        .stat-label {
          font-size: 0.6rem;
          color: var(--rpg-muted);
          margin-top: 0.25rem;
          text-transform: uppercase;
        }

        .stat-change {
          font-size: 0.6rem;
          margin-top: 0.25rem;
        }

        .stat-change.positive {
          color: var(--rpg-teal);
        }

        .stat-change.negative {
          color: #ef4444;
        }

        .wins-highlights {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          justify-content: center;
        }

        .highlight-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.4rem 0.75rem;
          border-radius: 20px;
          font-size: 0.7rem;
          font-weight: 600;
        }

        .highlight-pr {
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 215, 0, 0.1) 100%);
          border: 1px solid var(--rpg-gold);
          color: var(--rpg-gold);
        }

        .highlight-volume {
          background: linear-gradient(135deg, rgba(95, 191, 138, 0.2) 0%, rgba(95, 191, 138, 0.1) 100%);
          border: 1px solid var(--rpg-teal);
          color: var(--rpg-teal);
        }

        .highlight-xp {
          background: linear-gradient(135deg, rgba(168, 85, 247, 0.2) 0%, rgba(168, 85, 247, 0.1) 100%);
          border: 1px solid #a855f7;
          color: #a855f7;
        }

        .wins-message {
          font-size: 0.9rem;
          color: var(--rpg-text);
          margin-bottom: 1.5rem;
          line-height: 1.5;
        }

        .btn-close {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(180deg, var(--rpg-gold) 0%, #D4A800 100%);
          border: none;
          border-radius: 12px;
          color: #000;
          font-size: 0.9rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-close:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        @media (max-width: 400px) {
          .wins-stats {
            grid-template-columns: repeat(2, 1fr);
          }
        }
      `}</style>

      <div className="wins-overlay" onClick={handleClose}>
        <div className="wins-card" onClick={(e) => e.stopPropagation()}>
          <div className="wins-header">
            <div className="wins-icon">🏆</div>
            <div className="wins-title">WEEKLY WINS</div>
            <div className="wins-subtitle">Your Week in Review</div>
          </div>

          <div className="wins-stats">
            <div className="stat-item">
              <div className="stat-value">{data.thisWeek.workouts}</div>
              <div className="stat-label">Workouts</div>
              {data.improvements.workoutChange !== 0 && (
                <div className={`stat-change ${data.improvements.workoutChange > 0 ? 'positive' : 'negative'}`}>
                  {data.improvements.workoutChange > 0 ? '+' : ''}{data.improvements.workoutChange}%
                </div>
              )}
            </div>
            <div className="stat-item">
              <div className="stat-value">{data.thisWeek.sets}</div>
              <div className="stat-label">Sets</div>
            </div>
            <div className="stat-item">
              <div className="stat-value">{formatDuration(data.thisWeek.duration)}</div>
              <div className="stat-label">Time</div>
            </div>
          </div>

          <div className="wins-highlights">
            {data.thisWeek.prs > 0 && (
              <div className="highlight-badge highlight-pr">
                👑 {data.thisWeek.prs} PR{data.thisWeek.prs > 1 ? 's' : ''}
              </div>
            )}
            <div className="highlight-badge highlight-volume">
              ⚖️ {formatVolume(data.thisWeek.volume)} lbs
            </div>
            <div className="highlight-badge highlight-xp">
              ⭐ +{data.thisWeek.xp.toLocaleString()} XP
            </div>
          </div>

          <div className="wins-message">{data.message}</div>

          <button className="btn-close" onClick={handleClose} type="button">
            Keep Crushing It! 💪
          </button>
        </div>
      </div>
    </>
  );
}
