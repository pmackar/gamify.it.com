'use client';

import { useState, useEffect, useCallback } from 'react';

interface StreakStatus {
  currentStreak: number;
  streakShields: number;
  hasWorkedOutToday: boolean;
  lastActivityDate: string | null;
}

export function StreakDangerBanner({ onStartWorkout }: { onStartWorkout?: () => void }) {
  const [status, setStatus] = useState<StreakStatus | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const [urgencyLevel, setUrgencyLevel] = useState<'low' | 'medium' | 'high'>('low');

  // Calculate urgency based on time of day
  useEffect(() => {
    const updateUrgency = () => {
      const hour = new Date().getHours();
      if (hour >= 21) {
        setUrgencyLevel('high'); // After 9pm
      } else if (hour >= 18) {
        setUrgencyLevel('medium'); // After 6pm
      } else if (hour >= 14) {
        setUrgencyLevel('low'); // After 2pm
      }
    };

    updateUrgency();
    const interval = setInterval(updateUrgency, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  // Fetch streak status
  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/profile');
      if (!res.ok) return;
      const data = await res.json();

      // Profile API returns data under 'character' key
      const char = data.character || data;

      // Check if user has worked out today
      const today = new Date().toISOString().split('T')[0];
      const lastActivity = char.lastActivityDate?.split('T')[0];
      const hasWorkedOutToday = lastActivity === today;

      setStatus({
        currentStreak: char.currentStreak || 0,
        streakShields: char.streakShields || 0,
        hasWorkedOutToday,
        lastActivityDate: char.lastActivityDate,
      });
    } catch (error) {
      console.error('Failed to fetch streak status:', error);
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    // Refresh every 5 minutes
    const interval = setInterval(fetchStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  // Don't show if:
  // - No status yet
  // - User has no streak to lose
  // - User already worked out today
  // - Banner was dismissed
  // - It's before 2pm (give them time)
  const hour = new Date().getHours();
  if (!status || status.currentStreak === 0 || status.hasWorkedOutToday || dismissed || hour < 14) {
    return null;
  }

  const hasShield = status.streakShields > 0;

  return (
    <>
      <style jsx>{`
        .streak-banner {
          padding: 12px 16px;
          display: flex;
          align-items: center;
          gap: 12px;
          animation: slideDown 0.3s ease-out;
        }

        @keyframes slideDown {
          from {
            transform: translateY(-100%);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }

        .low {
          background: linear-gradient(135deg, rgba(251, 191, 36, 0.15) 0%, rgba(251, 191, 36, 0.1) 100%);
          border-bottom: 1px solid rgba(251, 191, 36, 0.3);
        }

        .medium {
          background: linear-gradient(135deg, rgba(249, 115, 22, 0.2) 0%, rgba(249, 115, 22, 0.1) 100%);
          border-bottom: 1px solid rgba(249, 115, 22, 0.4);
        }

        .high {
          background: linear-gradient(135deg, rgba(239, 68, 68, 0.25) 0%, rgba(239, 68, 68, 0.15) 100%);
          border-bottom: 1px solid rgba(239, 68, 68, 0.5);
          animation: slideDown 0.3s ease-out, pulse-border 2s ease-in-out infinite;
        }

        @keyframes pulse-border {
          0%, 100% {
            border-bottom-color: rgba(239, 68, 68, 0.5);
          }
          50% {
            border-bottom-color: rgba(239, 68, 68, 0.8);
          }
        }

        .icon {
          font-size: 1.5rem;
          flex-shrink: 0;
        }

        .content {
          flex: 1;
          min-width: 0;
        }

        .title {
          font-weight: 600;
          font-size: 0.875rem;
          color: var(--rpg-text);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .title.low { color: #fbbf24; }
        .title.medium { color: #f97316; }
        .title.high { color: #ef4444; }

        .streak-count {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          background: rgba(0, 0, 0, 0.3);
          padding: 2px 6px;
          border-radius: 4px;
        }

        .subtitle {
          font-size: 0.75rem;
          color: var(--rpg-text-secondary);
          margin-top: 2px;
        }

        .shield-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(95, 191, 138, 0.2);
          color: var(--rpg-teal);
          padding: 2px 8px;
          border-radius: 12px;
          font-size: 0.65rem;
          margin-left: 8px;
        }

        .actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .btn-workout {
          padding: 8px 16px;
          background: linear-gradient(180deg, #FFD700 0%, #D4A800 100%);
          border: none;
          border-radius: 8px;
          color: #000;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          white-space: nowrap;
        }

        .btn-workout:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .btn-dismiss {
          padding: 8px;
          background: transparent;
          border: none;
          color: var(--rpg-muted);
          font-size: 1rem;
          cursor: pointer;
          opacity: 0.6;
          transition: opacity 0.2s;
        }

        .btn-dismiss:hover {
          opacity: 1;
        }

        @media (max-width: 480px) {
          .streak-banner {
            flex-wrap: wrap;
          }
          .actions {
            width: 100%;
            margin-top: 8px;
            justify-content: flex-end;
          }
        }
      `}</style>

      <div className={`streak-banner ${urgencyLevel}`}>
        <span className="icon">
          {urgencyLevel === 'high' ? '🔥' : urgencyLevel === 'medium' ? '⚠️' : '💪'}
        </span>

        <div className="content">
          <div className={`title ${urgencyLevel}`}>
            {urgencyLevel === 'high' ? 'Streak in Danger!' : 'Keep Your Streak Alive'}
            <span className="streak-count">{status.currentStreak} days</span>
            {hasShield && (
              <span className="shield-badge">🛡️ Protected</span>
            )}
          </div>
          <div className="subtitle">
            {urgencyLevel === 'high'
              ? hasShield
                ? "Your shield will save you, but why not keep the momentum?"
                : "Time's running out! Don't lose your progress."
              : urgencyLevel === 'medium'
                ? "Evening already! A quick workout keeps your streak going."
                : "Don't forget to train today!"}
          </div>
        </div>

        <div className="actions">
          {onStartWorkout && (
            <button className="btn-workout" onClick={onStartWorkout} type="button">
              Start Workout
            </button>
          )}
          <button
            className="btn-dismiss"
            onClick={() => setDismissed(true)}
            type="button"
            aria-label="Dismiss"
          >
            ✕
          </button>
        </div>
      </div>
    </>
  );
}
