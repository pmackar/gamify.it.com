'use client';

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';

// Event name for weekly showdowns
export const SHOWDOWN_EVENT = 'weekly-showdown';

export interface ShowdownResult {
  rivalId: string;
  rivalType: 'ai_phantom' | 'friend';
  rivalName: string;
  winner: 'user' | 'rival' | 'tie';
  margin: number;
  dominantFactor: string;
  userScore: number;
  rivalScore: number;
  userMetrics: {
    workouts: number;
    volume: number;
    prs: number;
  };
  rivalMetrics: {
    workouts: number;
    volume: number;
    prs: number;
  };
}

export interface ShowdownData {
  showdownDate: string;
  weekStart: string;
  summary: {
    totalRivals: number;
    wins: number;
    losses: number;
    ties: number;
    overallResult: 'victory' | 'defeat' | 'draw';
  };
  results: ShowdownResult[];
}

interface ShowdownContextType {
  showShowdown: (data: ShowdownData) => void;
}

const ShowdownContext = createContext<ShowdownContextType | null>(null);

export function useShowdown() {
  const context = useContext(ShowdownContext);
  if (!context) {
    throw new Error('useShowdown must be used within ShowdownProvider');
  }
  return context;
}

// Dispatch showdown event
export function dispatchShowdown(data: ShowdownData) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(SHOWDOWN_EVENT, { detail: data }));
  }
}

interface ModalProps {
  data: ShowdownData;
  onClose: () => void;
}

function ShowdownNotification({ data, onClose }: ModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [confetti, setConfetti] = useState<Array<{ id: number; left: number; delay: number; color: string }>>([]);

  const totalSlides = data.results.length + 1; // Results + summary
  const isLastSlide = currentSlide === totalSlides - 1;
  const isOverallWin = data.summary.overallResult === 'victory';

  useEffect(() => {
    if (isOverallWin && isLastSlide) {
      // Generate confetti for victory
      const particles = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        delay: Math.random() * 2,
        color: ['#FFD700', '#5fbf8a', '#a855f7', '#5CC9F5'][Math.floor(Math.random() * 4)],
      }));
      setConfetti(particles);
    }
  }, [isOverallWin, isLastSlide]);

  const nextSlide = () => {
    if (currentSlide < totalSlides - 1) {
      setCurrentSlide((s) => s + 1);
    }
  };

  const prevSlide = () => {
    if (currentSlide > 0) {
      setCurrentSlide((s) => s - 1);
    }
  };

  // Colors based on overall result
  const colors = isOverallWin
    ? { primary: '#FFD700', secondary: '#5fbf8a' }
    : data.summary.overallResult === 'draw'
    ? { primary: '#5CC9F5', secondary: '#2196F3' }
    : { primary: '#ff6b6b', secondary: '#f44336' };

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .showdown-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.9);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10003;
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
          0% { transform: translateY(0) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
        }

        .showdown-modal {
          background: rgba(24, 24, 32, 0.98);
          backdrop-filter: blur(20px);
          border: 3px solid ${colors.primary};
          border-radius: 24px;
          padding: 2rem;
          width: 400px;
          max-width: 95vw;
          max-height: 90vh;
          overflow-y: auto;
          position: relative;
          animation: scaleIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 60px ${colors.primary}40,
                      0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes scaleIn {
          0% { transform: scale(0.8); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }

        .showdown-header {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.8rem;
          color: ${colors.primary};
          text-align: center;
          margin-bottom: 1.5rem;
          text-shadow: 0 0 20px ${colors.primary}80;
        }

        .week-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #666;
          text-align: center;
          margin-bottom: 2rem;
        }

        .slide-indicator {
          display: flex;
          justify-content: center;
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .slide-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #333;
          transition: all 0.3s ease;
        }

        .slide-dot.active {
          background: ${colors.primary};
          transform: scale(1.2);
        }

        .result-card {
          background: rgba(40, 40, 50, 0.5);
          border-radius: 16px;
          padding: 1.5rem;
          margin-bottom: 1.5rem;
          animation: slideUp 0.5s ease;
        }

        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }

        .rival-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #fff;
          text-align: center;
          margin-bottom: 1rem;
        }

        .rival-type {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: #666;
          text-align: center;
          margin-bottom: 1rem;
        }

        .result-outcome {
          font-family: 'Press Start 2P', monospace;
          font-size: 1rem;
          text-align: center;
          margin: 1rem 0;
          padding: 0.75rem;
          border-radius: 8px;
        }

        .result-outcome.win {
          color: #5fbf8a;
          background: rgba(95, 191, 138, 0.1);
        }

        .result-outcome.lose {
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.1);
        }

        .result-outcome.tie {
          color: #5CC9F5;
          background: rgba(92, 201, 245, 0.1);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          gap: 0.5rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          margin-top: 1rem;
        }

        .metric-col {
          text-align: center;
        }

        .metric-col.left { text-align: right; }
        .metric-col.right { text-align: left; }

        .metric-header {
          color: #666;
          margin-bottom: 0.5rem;
        }

        .metric-value {
          color: #fff;
          font-size: 0.5rem;
          margin: 0.25rem 0;
        }

        .metric-label {
          color: #888;
          text-align: center;
          font-size: 0.3rem;
        }

        .summary-section {
          text-align: center;
          padding: 1rem;
        }

        .overall-result {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.2rem;
          margin: 1.5rem 0;
          animation: pulse 1.5s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .overall-result.victory { color: #FFD700; }
        .overall-result.defeat { color: #ff6b6b; }
        .overall-result.draw { color: #5CC9F5; }

        .score-breakdown {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin: 1.5rem 0;
        }

        .score-item {
          text-align: center;
        }

        .score-number {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.5rem;
          color: #fff;
        }

        .score-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: #888;
          margin-top: 0.5rem;
        }

        .nav-buttons {
          display: flex;
          justify-content: space-between;
          margin-top: 1.5rem;
        }

        .nav-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          padding: 0.75rem 1.5rem;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-btn.secondary {
          background: transparent;
          color: #666;
          border: 1px solid #333;
        }

        .nav-btn.secondary:hover {
          background: #222;
          color: #aaa;
        }

        .nav-btn.primary {
          background: linear-gradient(180deg, ${colors.primary} 0%, ${colors.secondary} 100%);
          color: #1a1a1a;
          border: none;
          box-shadow: 0 4px 0 ${colors.secondary}80,
                      0 8px 20px ${colors.primary}30;
        }

        .nav-btn.primary:hover {
          transform: translateY(-2px);
        }

        .nav-btn:disabled {
          opacity: 0.3;
          cursor: not-allowed;
        }

        @media (max-width: 768px) {
          .showdown-modal {
            width: 95%;
            padding: 1.5rem;
          }

          .showdown-header {
            font-size: 0.65rem;
          }
        }
      `}</style>

      <div className="showdown-overlay">
        {isOverallWin && isLastSlide && confetti.map((particle) => (
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

        <div className="showdown-modal" onClick={(e) => e.stopPropagation()}>
          <div className="showdown-header">Weekly Showdown</div>
          <div className="week-label">
            Week of {new Date(data.weekStart).toLocaleDateString()}
          </div>

          <div className="slide-indicator">
            {Array.from({ length: totalSlides }, (_, i) => (
              <div
                key={i}
                className={`slide-dot ${i === currentSlide ? 'active' : ''}`}
              />
            ))}
          </div>

          {/* Individual result slides */}
          {currentSlide < data.results.length && (
            <div className="result-card" key={currentSlide}>
              <div className="rival-name">{data.results[currentSlide].rivalName}</div>
              <div className="rival-type">
                {data.results[currentSlide].rivalType === 'ai_phantom' ? 'AI Phantom' : 'Friend'}
              </div>

              <div
                className={`result-outcome ${data.results[currentSlide].winner === 'user' ? 'win' : data.results[currentSlide].winner === 'rival' ? 'lose' : 'tie'}`}
              >
                {data.results[currentSlide].winner === 'user'
                  ? '🏆 Victory'
                  : data.results[currentSlide].winner === 'rival'
                  ? '💪 Defeat'
                  : '⚔️ Draw'}
              </div>

              <div className="metrics-grid">
                <div className="metric-col left">
                  <div className="metric-header">You</div>
                  <div className="metric-value">{data.results[currentSlide].userMetrics.workouts}</div>
                  <div className="metric-value">{Math.round(data.results[currentSlide].userMetrics.volume).toLocaleString()}</div>
                  <div className="metric-value">{data.results[currentSlide].userMetrics.prs}</div>
                </div>
                <div className="metric-col">
                  <div className="metric-header">&nbsp;</div>
                  <div className="metric-label">Workouts</div>
                  <div className="metric-label">Volume</div>
                  <div className="metric-label">PRs</div>
                </div>
                <div className="metric-col right">
                  <div className="metric-header">Rival</div>
                  <div className="metric-value">{data.results[currentSlide].rivalMetrics.workouts}</div>
                  <div className="metric-value">{Math.round(data.results[currentSlide].rivalMetrics.volume).toLocaleString()}</div>
                  <div className="metric-value">{data.results[currentSlide].rivalMetrics.prs}</div>
                </div>
              </div>
            </div>
          )}

          {/* Summary slide */}
          {isLastSlide && (
            <div className="summary-section">
              <div className={`overall-result ${data.summary.overallResult}`}>
                {data.summary.overallResult === 'victory'
                  ? '🏆 VICTORY 🏆'
                  : data.summary.overallResult === 'defeat'
                  ? 'DEFEAT'
                  : 'DRAW'}
              </div>

              <div className="score-breakdown">
                <div className="score-item">
                  <div className="score-number" style={{ color: '#5fbf8a' }}>
                    {data.summary.wins}
                  </div>
                  <div className="score-label">Wins</div>
                </div>
                <div className="score-item">
                  <div className="score-number" style={{ color: '#5CC9F5' }}>
                    {data.summary.ties}
                  </div>
                  <div className="score-label">Ties</div>
                </div>
                <div className="score-item">
                  <div className="score-number" style={{ color: '#ff6b6b' }}>
                    {data.summary.losses}
                  </div>
                  <div className="score-label">Losses</div>
                </div>
              </div>
            </div>
          )}

          <div className="nav-buttons">
            <button
              className="nav-btn secondary"
              onClick={prevSlide}
              disabled={currentSlide === 0}
            >
              Back
            </button>
            {isLastSlide ? (
              <button className="nav-btn primary" onClick={onClose}>
                Done
              </button>
            ) : (
              <button className="nav-btn primary" onClick={nextSlide}>
                Next
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export function ShowdownProvider({ children }: { children: ReactNode }) {
  const [showdownData, setShowdownData] = useState<ShowdownData | null>(null);

  const showShowdown = useCallback((data: ShowdownData) => {
    setShowdownData(data);
  }, []);

  const hideShowdown = useCallback(() => {
    setShowdownData(null);
  }, []);

  // Listen for showdown events
  useEffect(() => {
    const handleShowdown = (event: CustomEvent<ShowdownData>) => {
      showShowdown(event.detail);
    };

    window.addEventListener(SHOWDOWN_EVENT, handleShowdown as EventListener);
    return () => {
      window.removeEventListener(SHOWDOWN_EVENT, handleShowdown as EventListener);
    };
  }, [showShowdown]);

  return (
    <ShowdownContext.Provider value={{ showShowdown }}>
      {children}
      {showdownData && (
        <ShowdownNotification data={showdownData} onClose={hideShowdown} />
      )}
    </ShowdownContext.Provider>
  );
}
