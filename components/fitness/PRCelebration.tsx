'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';

export interface PRData {
  exerciseId: string;
  exerciseName: string;
  newWeight: number;
  newReps: number;
  previousBest?: {
    weight: number;
    reps: number;
    date: string;
  };
  firstRecord?: {
    weight: number;
    reps: number;
    date: string;
  };
  improvement: {
    weightGain: number;
    percentageGain: number;
  };
  e1rm?: number;
}

interface PRCelebrationContextType {
  celebratePR: (data: PRData) => void;
}

const PRCelebrationContext = createContext<PRCelebrationContextType | null>(null);

export function usePRCelebration() {
  const context = useContext(PRCelebrationContext);
  if (!context) {
    throw new Error('usePRCelebration must be used within PRCelebrationProvider');
  }
  return context;
}

function PRCelebrationModal({
  data,
  onClose,
}: {
  data: PRData;
  onClose: () => void;
}) {
  const [isVisible, setIsVisible] = useState(false);
  const [showConfetti, setShowConfetti] = useState(true);

  useEffect(() => {
    setTimeout(() => setIsVisible(true), 50);
    // Stop confetti after 3 seconds
    const timer = setTimeout(() => setShowConfetti(false), 3000);
    return () => clearTimeout(timer);
  }, []);

  const handleShare = async () => {
    const shareText = `New PR! ${data.exerciseName}: ${data.newWeight} lbs x ${data.newReps} reps (+${data.improvement.weightGain} lbs!)`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'New Personal Record!',
          text: shareText,
        });
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard?.writeText(shareText);
    }
  };

  return (
    <>
      <style jsx>{`
        .pr-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.9);
          backdrop-filter: blur(10px);
          z-index: 10003;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          opacity: ${isVisible ? 1 : 0};
          transition: opacity 0.3s ease;
        }

        .pr-card {
          position: relative;
          background: linear-gradient(180deg, rgba(40, 30, 20, 0.98) 0%, rgba(25, 20, 15, 0.98) 100%);
          border: 3px solid #FFD700;
          border-radius: 20px;
          padding: 2rem;
          max-width: 380px;
          width: 100%;
          text-align: center;
          transform: ${isVisible ? 'scale(1)' : 'scale(0.8)'};
          transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 60px rgba(255, 215, 0, 0.4),
                      0 0 120px rgba(255, 215, 0, 0.2);
        }

        .confetti {
          position: absolute;
          inset: -50px;
          pointer-events: none;
          overflow: hidden;
        }

        .confetti-piece {
          position: absolute;
          width: 10px;
          height: 10px;
          animation: fall 3s ease-out forwards;
        }

        @keyframes fall {
          0% {
            transform: translateY(-100px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(500px) rotate(720deg);
            opacity: 0;
          }
        }

        .pr-crown {
          font-size: 4rem;
          margin-bottom: 0.5rem;
          animation: bounce 0.6s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .pr-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 1rem;
          color: #FFD700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          margin-bottom: 0.5rem;
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.8; }
        }

        .pr-subtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--rpg-muted);
          margin-bottom: 1.5rem;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .pr-exercise {
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          margin-bottom: 1rem;
        }

        .pr-main-stat {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 0.5rem;
        }

        .pr-weight {
          font-family: 'Press Start 2P', monospace;
          font-size: 2rem;
          color: #FFD700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }

        .pr-unit {
          font-size: 1rem;
          color: var(--rpg-muted);
        }

        .pr-reps {
          font-size: 1rem;
          color: var(--rpg-text-secondary);
          margin-bottom: 1.5rem;
        }

        .pr-improvement {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: linear-gradient(135deg, rgba(95, 191, 138, 0.2) 0%, rgba(95, 191, 138, 0.1) 100%);
          border: 1px solid var(--rpg-teal);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          margin-bottom: 1.5rem;
        }

        .improvement-arrow {
          color: var(--rpg-teal);
          font-size: 1.25rem;
        }

        .improvement-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: var(--rpg-teal);
        }

        .pr-journey {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 1rem;
          margin-bottom: 1.5rem;
        }

        .journey-title {
          font-size: 0.65rem;
          color: var(--rpg-muted);
          margin-bottom: 0.75rem;
          text-transform: uppercase;
        }

        .journey-timeline {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 0.5rem;
        }

        .journey-point {
          text-align: center;
          flex: 1;
        }

        .journey-weight {
          font-size: 0.9rem;
          font-weight: 700;
          color: var(--rpg-text);
        }

        .journey-label {
          font-size: 0.6rem;
          color: var(--rpg-muted);
        }

        .journey-arrow {
          color: var(--rpg-gold);
          font-size: 1.5rem;
        }

        .journey-current {
          color: #FFD700;
        }

        .pr-actions {
          display: flex;
          gap: 0.75rem;
        }

        .btn-close {
          flex: 2;
          padding: 1rem;
          background: linear-gradient(180deg, #FFD700 0%, #D4A800 100%);
          border: none;
          border-radius: 12px;
          color: #000;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-close:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(255, 215, 0, 0.3);
        }

        .btn-share {
          flex: 1;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 12px;
          color: var(--rpg-text);
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .btn-share:hover {
          background: rgba(255, 255, 255, 0.15);
        }

        @media (max-width: 400px) {
          .pr-card {
            padding: 1.5rem;
          }
          .pr-weight {
            font-size: 1.5rem;
          }
        }
      `}</style>

      <div className="pr-overlay" onClick={onClose}>
        <div className="pr-card" onClick={(e) => e.stopPropagation()}>
          {showConfetti && (
            <div className="confetti">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="confetti-piece"
                  style={{
                    left: `${Math.random() * 100}%`,
                    background: ['#FFD700', '#FF6B6B', '#5fbf8a', '#5CC9F5', '#a855f7'][i % 5],
                    borderRadius: i % 2 === 0 ? '50%' : '0',
                    animationDelay: `${Math.random() * 0.5}s`,
                    animationDuration: `${2 + Math.random()}s`,
                  }}
                />
              ))}
            </div>
          )}

          <div className="pr-crown">👑</div>
          <div className="pr-title">NEW PR!</div>
          <div className="pr-subtitle">Personal Record Broken</div>

          <div className="pr-exercise">{data.exerciseName}</div>

          <div className="pr-main-stat">
            <span className="pr-weight">{data.newWeight}</span>
            <span className="pr-unit">lbs</span>
          </div>
          <div className="pr-reps">{data.newReps} reps</div>

          <div className="pr-improvement">
            <span className="improvement-arrow">↑</span>
            <span className="improvement-text">
              +{data.improvement.weightGain} lbs ({data.improvement.percentageGain}%)
            </span>
          </div>

          {data.firstRecord && (
            <div className="pr-journey">
              <div className="journey-title">Your Journey</div>
              <div className="journey-timeline">
                <div className="journey-point">
                  <div className="journey-weight">{data.firstRecord.weight} lbs</div>
                  <div className="journey-label">First Time</div>
                </div>
                <div className="journey-arrow">→</div>
                {data.previousBest && data.previousBest.weight !== data.firstRecord.weight && (
                  <>
                    <div className="journey-point">
                      <div className="journey-weight">{data.previousBest.weight} lbs</div>
                      <div className="journey-label">Previous Best</div>
                    </div>
                    <div className="journey-arrow">→</div>
                  </>
                )}
                <div className="journey-point">
                  <div className="journey-weight journey-current">{data.newWeight} lbs</div>
                  <div className="journey-label">Today!</div>
                </div>
              </div>
            </div>
          )}

          {data.e1rm && (
            <div style={{ fontSize: '0.7rem', color: 'var(--rpg-muted)', marginBottom: '1rem' }}>
              Estimated 1RM: {data.e1rm} lbs
            </div>
          )}

          <div className="pr-actions">
            <button className="btn-share" onClick={handleShare} type="button">
              📤
            </button>
            <button className="btn-close" onClick={onClose} type="button">
              Awesome!
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export function PRCelebrationProvider({ children }: { children: ReactNode }) {
  const [currentPR, setCurrentPR] = useState<PRData | null>(null);
  const [prQueue, setPRQueue] = useState<PRData[]>([]);

  const celebratePR = useCallback((data: PRData) => {
    if (currentPR) {
      // Queue the PR if one is already showing
      setPRQueue(prev => [...prev, data]);
    } else {
      setCurrentPR(data);
    }
  }, [currentPR]);

  const handleClose = useCallback(() => {
    setCurrentPR(null);
    // Show next PR in queue if any
    if (prQueue.length > 0) {
      setTimeout(() => {
        setCurrentPR(prQueue[0]);
        setPRQueue(prev => prev.slice(1));
      }, 300);
    }
  }, [prQueue]);

  // Listen for PR events
  useEffect(() => {
    const handlePREvent = (event: CustomEvent<PRData>) => {
      celebratePR(event.detail);
    };

    window.addEventListener('pr-achieved', handlePREvent as EventListener);
    return () => {
      window.removeEventListener('pr-achieved', handlePREvent as EventListener);
    };
  }, [celebratePR]);

  return (
    <PRCelebrationContext.Provider value={{ celebratePR }}>
      {children}
      {currentPR && (
        <PRCelebrationModal data={currentPR} onClose={handleClose} />
      )}
    </PRCelebrationContext.Provider>
  );
}

// Helper to dispatch PR celebration
export function dispatchPRCelebration(data: PRData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('pr-achieved', { detail: data }));
  }
}
