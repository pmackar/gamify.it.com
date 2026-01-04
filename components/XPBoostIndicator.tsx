'use client';

import { useState, useEffect, useCallback } from 'react';
import { Zap } from 'lucide-react';

interface BoostStatus {
  active: boolean;
  multiplier: number;
  expiresAt: string | null;
  remainingSeconds: number;
}

function formatTimeRemaining(seconds: number): string {
  if (seconds <= 0) return '0:00';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

export default function XPBoostIndicator() {
  const [boost, setBoost] = useState<BoostStatus | null>(null);
  const [remaining, setRemaining] = useState(0);

  const fetchBoostStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/xp-boost');
      if (res.ok) {
        const data = await res.json();
        setBoost(data);
        setRemaining(data.remainingSeconds);
      }
    } catch (err) {
      console.error('Failed to fetch boost status:', err);
    }
  }, []);

  useEffect(() => {
    fetchBoostStatus();

    // Refresh every 30 seconds
    const interval = setInterval(fetchBoostStatus, 30000);
    return () => clearInterval(interval);
  }, [fetchBoostStatus]);

  // Countdown timer
  useEffect(() => {
    if (!boost?.active || remaining <= 0) return;

    const timer = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          // Refresh status when expired
          fetchBoostStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [boost?.active, remaining, fetchBoostStatus]);

  // Listen for item use events to refresh
  useEffect(() => {
    const handleItemUsed = () => {
      fetchBoostStatus();
    };

    window.addEventListener('item-used', handleItemUsed);
    return () => window.removeEventListener('item-used', handleItemUsed);
  }, [fetchBoostStatus]);

  if (!boost?.active) return null;

  return (
    <>
      <style jsx>{`
        .boost-indicator {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: linear-gradient(135deg, rgba(255, 215, 0, 0.2) 0%, rgba(255, 165, 0, 0.2) 100%);
          border: 1px solid var(--rpg-gold);
          border-radius: 20px;
          font-family: var(--font-pixel), monospace;
          animation: boostPulse 2s ease-in-out infinite;
          box-shadow: 0 0 10px var(--rpg-gold-glow);
        }

        @keyframes boostPulse {
          0%, 100% { box-shadow: 0 0 10px var(--rpg-gold-glow); }
          50% { box-shadow: 0 0 20px var(--rpg-gold-glow); }
        }

        .boost-icon {
          color: var(--rpg-gold);
          animation: iconBounce 1s ease-in-out infinite;
        }

        @keyframes iconBounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-2px); }
        }

        .boost-text {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          line-height: 1.2;
        }

        .boost-multiplier {
          font-size: 10px;
          font-weight: 700;
          color: var(--rpg-gold);
          text-shadow: 0 0 8px var(--rpg-gold-glow);
        }

        .boost-timer {
          font-size: 8px;
          color: var(--rpg-muted);
        }

        @media (max-width: 768px) {
          .boost-indicator {
            padding: 3px 8px;
          }
          .boost-multiplier {
            font-size: 9px;
          }
          .boost-timer {
            font-size: 7px;
          }
        }
      `}</style>

      <div className="boost-indicator" title={`XP Boost active: ${boost.multiplier}x for ${formatTimeRemaining(remaining)}`}>
        <Zap className="boost-icon" size={14} fill="currentColor" />
        <div className="boost-text">
          <span className="boost-multiplier">{boost.multiplier}x XP</span>
          <span className="boost-timer">{formatTimeRemaining(remaining)}</span>
        </div>
      </div>
    </>
  );
}
