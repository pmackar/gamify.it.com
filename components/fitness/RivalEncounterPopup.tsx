'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import type { EncounterRecord, RivalRelationship } from '@/lib/fitness/types';

// Event name for rival encounters
export const RIVAL_ENCOUNTER_EVENT = 'rival-encounter';

export interface RivalEncounterData {
  encounter: EncounterRecord;
  rival: RivalRelationship;
  rivalName: string;
}

interface RivalEncounterContextType {
  showEncounter: (data: RivalEncounterData) => void;
}

const RivalEncounterContext = createContext<RivalEncounterContextType | null>(null);

export function useRivalEncounter() {
  const context = useContext(RivalEncounterContext);
  if (!context) {
    throw new Error('useRivalEncounter must be used within RivalEncounterProvider');
  }
  return context;
}

// Dispatch encounter event
export function dispatchRivalEncounter(data: RivalEncounterData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(RIVAL_ENCOUNTER_EVENT, { detail: data }));
  }
}

// Taunt messages by outcome
const WIN_TAUNTS = [
  "You crushed it this week!",
  "Your rival couldn't keep up!",
  "Dominant performance!",
  "That's how it's done!",
  "Victory is yours!",
];

const LOSE_TAUNTS = [
  "Your rival got the edge this time...",
  "Close battle, but they edged ahead.",
  "Time to step up next week!",
  "The rivalry intensifies...",
  "Fuel for the fire!",
];

const TIE_MESSAGES = [
  "Evenly matched this week!",
  "Neither could pull ahead!",
  "A true rivalry!",
  "Dead heat!",
];

function getRandomMessage(messages: string[]): string {
  return messages[Math.floor(Math.random() * messages.length)];
}

function getOutcomeMessage(winner: 'user' | 'rival' | 'tie'): string {
  switch (winner) {
    case 'user':
      return getRandomMessage(WIN_TAUNTS);
    case 'rival':
      return getRandomMessage(LOSE_TAUNTS);
    case 'tie':
      return getRandomMessage(TIE_MESSAGES);
  }
}

interface PopupProps {
  data: RivalEncounterData;
  onClose: () => void;
}

function RivalEncounterNotification({ data, onClose }: PopupProps) {
  const { encounter, rival, rivalName } = data;
  const isWin = encounter.winner === 'user';
  const isTie = encounter.winner === 'tie';
  const message = getOutcomeMessage(encounter.winner);

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    const timer = setTimeout(onClose, 8000);
    return () => clearTimeout(timer);
  }, [onClose]);

  // Color scheme based on outcome
  const colors = isWin
    ? { primary: '#5fbf8a', secondary: '#4CAF50', bg: 'rgba(95, 191, 138, 0.1)' }
    : isTie
    ? { primary: '#5CC9F5', secondary: '#2196F3', bg: 'rgba(92, 201, 245, 0.1)' }
    : { primary: '#ff6b6b', secondary: '#f44336', bg: 'rgba(255, 107, 107, 0.1)' };

  // Format percentage
  const formatPercent = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(1)}%`;

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .encounter-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.75);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10002;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .encounter-card {
          background: rgba(24, 24, 32, 0.98);
          backdrop-filter: blur(20px);
          border: 3px solid ${colors.primary};
          border-radius: 24px;
          padding: 2rem;
          width: 360px;
          max-width: 95vw;
          text-align: center;
          position: relative;
          overflow: hidden;
          animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 40px ${colors.primary}40,
                      0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes slideIn {
          0% {
            transform: translateY(100px) scale(0.9);
            opacity: 0;
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        .encounter-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, ${colors.primary}, ${colors.secondary}, ${colors.primary});
          animation: shimmer 2s linear infinite;
          background-size: 200% 100%;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .outcome-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: ${colors.primary};
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 1rem;
          text-shadow: 0 0 20px ${colors.primary}80;
        }

        .outcome-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
        }

        .vs-section {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin: 1.5rem 0;
          padding: 1rem;
          background: ${colors.bg};
          border-radius: 12px;
        }

        .vs-player {
          flex: 1;
          text-align: center;
        }

        .vs-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #aaa;
          margin-bottom: 0.5rem;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100px;
        }

        .vs-score {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.2rem;
          color: #fff;
        }

        .vs-divider {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #666;
          padding: 0 0.5rem;
        }

        .metric-bars {
          margin: 1.5rem 0;
        }

        .metric-row {
          display: flex;
          align-items: center;
          margin-bottom: 0.75rem;
        }

        .metric-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #888;
          width: 60px;
          text-align: left;
        }

        .metric-bar {
          flex: 1;
          height: 8px;
          background: #333;
          border-radius: 4px;
          overflow: hidden;
          margin: 0 0.5rem;
        }

        .metric-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .metric-value {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #aaa;
          width: 50px;
          text-align: right;
        }

        .message {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: ${colors.primary};
          margin: 1.5rem 0;
          line-height: 1.8;
        }

        .streak-badge {
          display: inline-block;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          padding: 0.4rem 0.8rem;
          background: ${colors.bg};
          border: 1px solid ${colors.primary}40;
          border-radius: 6px;
          color: ${colors.primary};
          margin-bottom: 1rem;
        }

        .dismiss-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          background: transparent;
          color: #666;
          border: 1px solid #333;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.2s ease;
        }

        .dismiss-btn:hover {
          background: #222;
          color: #aaa;
          border-color: #444;
        }

        .respect-change {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: ${encounter.respectDelta > 0 ? '#5fbf8a' : encounter.respectDelta < 0 ? '#ff6b6b' : '#666'};
          margin-top: 0.5rem;
        }

        @media (max-width: 768px) {
          .encounter-card {
            padding: 1.5rem;
            width: 95%;
          }

          .vs-name {
            font-size: 0.4rem;
            max-width: 80px;
          }

          .vs-score {
            font-size: 1rem;
          }
        }
      `}</style>

      <div className="encounter-overlay" onClick={onClose}>
        <div className="encounter-card" onClick={(e) => e.stopPropagation()}>
          <div className="outcome-icon">
            {isWin ? '🏆' : isTie ? '⚔️' : '💪'}
          </div>
          <div className="outcome-label">
            {isWin ? 'Victory!' : isTie ? 'Draw!' : 'Defeat'}
          </div>

          <div className="vs-section">
            <div className="vs-player">
              <div className="vs-name">You</div>
              <div className="vs-score">
                {encounter.userMetrics.workoutCount}
              </div>
            </div>
            <div className="vs-divider">VS</div>
            <div className="vs-player">
              <div className="vs-name">{rivalName}</div>
              <div className="vs-score">
                {encounter.rivalMetrics.workoutCount}
              </div>
            </div>
          </div>

          <div className="metric-bars">
            <div className="metric-row">
              <span className="metric-label">Volume</span>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${Math.min(100, Math.max(10, 50 + encounter.userMetrics.volumeChange / 2))}%`,
                    background: `linear-gradient(90deg, ${colors.secondary}, ${colors.primary})`,
                  }}
                />
              </div>
              <span className="metric-value">
                {formatPercent(encounter.userMetrics.volumeChange)}
              </span>
            </div>

            <div className="metric-row">
              <span className="metric-label">PRs</span>
              <div className="metric-bar">
                <div
                  className="metric-fill"
                  style={{
                    width: `${Math.min(100, encounter.userMetrics.prCount * 25)}%`,
                    background: '#FFD700',
                  }}
                />
              </div>
              <span className="metric-value">{encounter.userMetrics.prCount}</span>
            </div>
          </div>

          <div className="message">{message}</div>

          {rival.winStreak !== 0 && (
            <div className="streak-badge">
              {rival.winStreak > 0
                ? `${rival.winStreak} Win Streak!`
                : `${Math.abs(rival.winStreak)} Loss Streak`}
            </div>
          )}

          <div className="respect-change">
            Respect {encounter.respectDelta > 0 ? '+' : ''}{encounter.respectDelta}
          </div>

          <button className="dismiss-btn" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}

export function RivalEncounterProvider({ children }: { children: ReactNode }) {
  const [encounterData, setEncounterData] = useState<RivalEncounterData | null>(null);

  const showEncounter = useCallback((data: RivalEncounterData) => {
    setEncounterData(data);
  }, []);

  const hideEncounter = useCallback(() => {
    setEncounterData(null);
  }, []);

  // Listen for rival-encounter events
  useEffect(() => {
    const handleEncounter = (event: CustomEvent<RivalEncounterData>) => {
      showEncounter(event.detail);
    };

    window.addEventListener(RIVAL_ENCOUNTER_EVENT, handleEncounter as EventListener);
    return () => {
      window.removeEventListener(RIVAL_ENCOUNTER_EVENT, handleEncounter as EventListener);
    };
  }, [showEncounter]);

  return (
    <RivalEncounterContext.Provider value={{ showEncounter }}>
      {children}
      {encounterData && (
        <RivalEncounterNotification data={encounterData} onClose={hideEncounter} />
      )}
    </RivalEncounterContext.Provider>
  );
}
