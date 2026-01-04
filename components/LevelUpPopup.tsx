'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

interface LevelUpData {
  newLevel: number;
  previousLevel: number;
}

interface LevelUpContextType {
  showLevelUp: (data: LevelUpData) => void;
}

const LevelUpContext = createContext<LevelUpContextType | null>(null);

export function useLevelUp() {
  const context = useContext(LevelUpContext);
  if (!context) {
    throw new Error('useLevelUp must be used within LevelUpProvider');
  }
  return context;
}

// Custom event for level ups
export const LEVEL_UP_EVENT = 'level-up';

export function dispatchLevelUp(newLevel: number, previousLevel: number) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LEVEL_UP_EVENT, {
      detail: { newLevel, previousLevel }
    }));
  }
}

const LEVEL_MESSAGES = [
  "You're on fire!",
  "Keep exploring!",
  "Unstoppable!",
  "Adventure awaits!",
  "Legend in the making!",
  "World traveler!",
  "Epic journey!",
];

function getRandomMessage(): string {
  return LEVEL_MESSAGES[Math.floor(Math.random() * LEVEL_MESSAGES.length)];
}

interface PopupProps {
  data: LevelUpData;
  onClose: () => void;
}

function LevelUpNotification({ data, onClose }: PopupProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);
  const message = getRandomMessage();

  useEffect(() => {
    // Generate confetti particles
    const particles = Array.from({ length: 50 }, (_, i) => ({
      id: i,
      left: Math.random() * 100,
      delay: Math.random() * 2,
      color: ['#FFD700', '#5fbf8a', '#a855f7', '#5CC9F5', '#ff6b6b'][Math.floor(Math.random() * 5)],
    }));
    setConfetti(particles);
  }, []);

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .levelup-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.85);
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

        .confetti {
          position: absolute;
          width: 10px;
          height: 10px;
          top: -20px;
          animation: confettiFall 3s linear forwards;
        }

        @keyframes confettiFall {
          0% {
            transform: translateY(0) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }

        .levelup-card {
          background: rgba(24, 24, 32, 0.98);
          backdrop-filter: blur(20px);
          border: 3px solid #FFD700;
          border-radius: 24px;
          padding: 2.5rem;
          width: 340px;
          text-align: center;
          position: relative;
          overflow: hidden;
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 60px rgba(255, 215, 0, 0.4),
                      0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes scaleIn {
          0% {
            transform: scale(0.5);
            opacity: 0;
          }
          100% {
            transform: scale(1);
            opacity: 1;
          }
        }

        .levelup-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 4px;
          background: linear-gradient(90deg, #FFD700, #FFA500, #FFD700);
          animation: shimmer 2s linear infinite;
          background-size: 200% 100%;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .levelup-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 0%, rgba(255, 215, 0, 0.2) 0%, transparent 60%);
          pointer-events: none;
        }

        .levelup-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #FFD700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 1.5rem;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.8);
          animation: pulse 1s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .level-display {
          position: relative;
          z-index: 1;
          margin-bottom: 1.5rem;
        }

        .level-number {
          font-family: 'Press Start 2P', monospace;
          font-size: 4rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-shadow: none;
          filter: drop-shadow(0 4px 8px rgba(255, 215, 0, 0.5));
          animation: bounce 0.6s ease-in-out;
        }

        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .level-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #888;
          text-transform: uppercase;
          letter-spacing: 0.3em;
          margin-top: 0.5rem;
        }

        .message {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          color: #5fbf8a;
          margin-bottom: 2rem;
          line-height: 1.6;
          text-shadow: 0 0 10px rgba(95, 191, 138, 0.5);
        }

        .continue-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          background: linear-gradient(180deg, #FFD700 0%, #E6A000 100%);
          color: #1a1a1a;
          border: none;
          padding: 1rem 2rem;
          border-radius: 8px;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.2s ease;
          box-shadow: 0 4px 0 #996600,
                      0 8px 20px rgba(255, 215, 0, 0.3);
          position: relative;
          z-index: 1;
        }

        .continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #996600,
                      0 12px 30px rgba(255, 215, 0, 0.4);
        }

        .continue-btn:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #996600,
                      0 4px 10px rgba(255, 215, 0, 0.3);
        }

        .sparkle {
          position: absolute;
          width: 20px;
          height: 20px;
          pointer-events: none;
          animation: sparkle 1.5s ease-in-out infinite;
        }

        .sparkle-1 { top: 15%; left: 15%; animation-delay: 0s; }
        .sparkle-2 { top: 20%; right: 15%; animation-delay: 0.3s; }
        .sparkle-3 { bottom: 25%; left: 20%; animation-delay: 0.6s; }
        .sparkle-4 { bottom: 30%; right: 20%; animation-delay: 0.9s; }

        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.5); }
          50% { opacity: 1; transform: scale(1); }
        }

        @media (max-width: 768px) {
          .levelup-card {
            width: 90%;
            max-width: 340px;
            padding: 2rem;
          }

          .level-number {
            font-size: 3rem;
          }
        }
      `}</style>

      <div className="levelup-overlay" onClick={onClose}>
        {confetti.map((particle) => (
          <div
            key={particle.id}
            className="confetti"
            style={{
              left: `${particle.left}%`,
              animationDelay: `${particle.delay}s`,
              backgroundColor: particle.color,
              borderRadius: Math.random() > 0.5 ? '50%' : '2px',
            }}
          />
        ))}
        <div className="levelup-card" onClick={(e) => e.stopPropagation()}>
          <span className="sparkle sparkle-1">✨</span>
          <span className="sparkle sparkle-2">✨</span>
          <span className="sparkle sparkle-3">✨</span>
          <span className="sparkle sparkle-4">✨</span>

          <div className="levelup-label">Level Up!</div>

          <div className="level-display">
            <div className="level-number">{data.newLevel}</div>
            <div className="level-label">New Level</div>
          </div>

          <div className="message">{message}</div>

          <button className="continue-btn" onClick={onClose}>
            Continue
          </button>
        </div>
      </div>
    </>
  );
}

export function LevelUpProvider({ children }: { children: ReactNode }) {
  const [levelUpData, setLevelUpData] = useState<LevelUpData | null>(null);

  const showLevelUp = useCallback((data: LevelUpData) => {
    setLevelUpData(data);
  }, []);

  const hideLevelUp = useCallback(() => {
    setLevelUpData(null);
  }, []);

  // Listen for level-up events
  useEffect(() => {
    const handleLevelUp = (event: CustomEvent<LevelUpData>) => {
      showLevelUp(event.detail);
    };

    window.addEventListener(LEVEL_UP_EVENT, handleLevelUp as EventListener);
    return () => {
      window.removeEventListener(LEVEL_UP_EVENT, handleLevelUp as EventListener);
    };
  }, [showLevelUp]);

  return (
    <LevelUpContext.Provider value={{ showLevelUp }}>
      {children}
      {levelUpData && (
        <LevelUpNotification data={levelUpData} onClose={hideLevelUp} />
      )}
    </LevelUpContext.Provider>
  );
}
