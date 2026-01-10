'use client';

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';
import { dispatchXPUpdate } from './XPContext';

interface DayReward {
  day: number;
  xp: number;
  bonusItems: string[];
  claimed: boolean;
  current: boolean;
}

interface DailyRewardState {
  claimedToday: boolean;
  loginStreak: number;
  streakShields: number;
  nextReward: { day: number; xp: number; bonusItems: string[] } | null;
  weekView: DayReward[];
}

interface DailyRewardsContextValue {
  rewardState: DailyRewardState | null;
  isLoading: boolean;
  showModal: boolean;
  openModal: () => void;
  closeModal: () => void;
  claimReward: () => Promise<void>;
  lastClaimResult: ClaimResult | null;
}

interface ClaimResult {
  success: boolean;
  reward?: {
    day: number;
    xp: number;
    bonusItems: string[];
    isWeekComplete: boolean;
  };
  message?: string;
  error?: string;
}

const DailyRewardsContext = createContext<DailyRewardsContextValue | null>(null);

export function useDailyRewards() {
  const context = useContext(DailyRewardsContext);
  if (!context) {
    throw new Error('useDailyRewards must be used within DailyRewardsProvider');
  }
  return context;
}

// Bonus item display mapping
const BONUS_ITEM_DISPLAY: Record<string, { icon: string; name: string; color: string }> = {
  streak_shield: { icon: '🛡️', name: 'Streak Shield', color: '#5CC9F5' },
  rare_loot_box: { icon: '📦', name: 'Rare Loot Box', color: '#a855f7' },
  random_cosmetic: { icon: '✨', name: 'Mystery Cosmetic', color: '#FFD700' },
  xp_boost_2x: { icon: '⚡', name: '2x XP Boost', color: '#FF6B6B' },
};

function DailyRewardsModal({
  rewardState,
  onClaim,
  onClose,
  isClaiming,
  claimResult,
}: {
  rewardState: DailyRewardState;
  onClaim: () => void;
  onClose: () => void;
  isClaiming: boolean;
  claimResult: ClaimResult | null;
}) {
  const showSuccess = claimResult?.success;

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1rem;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .modal-card {
          background: linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 28, 0.98) 100%);
          border: 2px solid #5CC9F5;
          border-radius: 20px;
          padding: 1.5rem;
          width: 100%;
          max-width: 420px;
          position: relative;
          overflow: hidden;
          animation: scaleIn 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 60px rgba(92, 201, 245, 0.3),
                      0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes scaleIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }

        .modal-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, #5CC9F5, transparent);
        }

        .modal-close {
          position: absolute;
          top: 1rem;
          right: 1rem;
          width: 32px;
          height: 32px;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: #888;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
          transition: all 0.2s ease;
          z-index: 10;
        }

        .modal-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        .modal-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }

        .modal-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          animation: bounce 2s ease-in-out infinite;
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .modal-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.8rem;
          color: #5CC9F5;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          margin-bottom: 0.5rem;
          text-shadow: 0 0 20px rgba(92, 201, 245, 0.5);
        }

        .modal-subtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #888;
          line-height: 1.6;
        }

        .streak-info {
          display: flex;
          justify-content: center;
          gap: 1.5rem;
          margin-bottom: 1.5rem;
        }

        .streak-stat {
          text-align: center;
        }

        .streak-value {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.2rem;
          color: #FFD700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
        }

        .streak-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: #666;
          margin-top: 0.25rem;
        }

        .week-grid {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.5rem;
          margin-bottom: 1.5rem;
        }

        .day-cell {
          aspect-ratio: 1;
          background: rgba(255, 255, 255, 0.05);
          border: 2px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 0.25rem;
          position: relative;
          transition: all 0.3s ease;
        }

        .day-cell.claimed {
          background: linear-gradient(135deg, rgba(95, 191, 138, 0.2) 0%, rgba(95, 191, 138, 0.1) 100%);
          border-color: #5fbf8a;
        }

        .day-cell.claimed::after {
          content: '✓';
          position: absolute;
          top: 2px;
          right: 2px;
          font-size: 0.5rem;
          color: #5fbf8a;
        }

        .day-cell.current {
          background: linear-gradient(135deg, rgba(92, 201, 245, 0.2) 0%, rgba(92, 201, 245, 0.1) 100%);
          border-color: #5CC9F5;
          box-shadow: 0 0 20px rgba(92, 201, 245, 0.3);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 20px rgba(92, 201, 245, 0.3); }
          50% { box-shadow: 0 0 30px rgba(92, 201, 245, 0.5); }
        }

        .day-number {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #666;
          margin-bottom: 0.15rem;
        }

        .day-cell.claimed .day-number,
        .day-cell.current .day-number {
          color: #fff;
        }

        .day-xp {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: #FFD700;
        }

        .day-bonus {
          font-size: 0.6rem;
          margin-top: 0.1rem;
        }

        .claim-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(180deg, #5CC9F5 0%, #4AA8D8 100%);
          border: none;
          border-radius: 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #000;
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.2s ease;
          box-shadow: 0 4px 0 #3890B8,
                      0 6px 20px rgba(92, 201, 245, 0.3);
          position: relative;
          overflow: hidden;
        }

        .claim-button:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #3890B8,
                      0 8px 30px rgba(92, 201, 245, 0.4);
        }

        .claim-button:active:not(:disabled) {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #3890B8,
                      0 4px 10px rgba(92, 201, 245, 0.2);
        }

        .claim-button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .claim-button.claimed {
          background: linear-gradient(180deg, #5fbf8a 0%, #4a9d6f 100%);
          box-shadow: 0 4px 0 #3d7d58,
                      0 6px 20px rgba(95, 191, 138, 0.3);
        }

        .success-message {
          text-align: center;
          animation: successPop 0.5s ease;
        }

        @keyframes successPop {
          0% { transform: scale(0.8); opacity: 0; }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); opacity: 1; }
        }

        .success-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
        }

        .success-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: #5fbf8a;
          margin-bottom: 0.5rem;
        }

        .success-xp {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.5rem;
          color: #FFD700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          margin-bottom: 1rem;
        }

        .bonus-items {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          flex-wrap: wrap;
          margin-bottom: 1rem;
        }

        .bonus-item {
          display: flex;
          align-items: center;
          gap: 0.3rem;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          padding: 0.4rem 0.6rem;
        }

        .bonus-item-icon {
          font-size: 1rem;
        }

        .bonus-item-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: #fff;
        }

        @media (max-width: 480px) {
          .modal-card {
            padding: 1rem;
          }

          .week-grid {
            gap: 0.3rem;
          }

          .modal-title {
            font-size: 0.65rem;
          }
        }
      `}</style>

      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-card" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={onClose}>×</button>

          {showSuccess ? (
            <div className="success-message">
              <div className="success-icon">🎉</div>
              <div className="success-text">Reward Claimed!</div>
              <div className="success-xp">+{claimResult.reward?.xp} XP</div>

              {claimResult.reward?.bonusItems && claimResult.reward.bonusItems.length > 0 && (
                <div className="bonus-items">
                  {claimResult.reward.bonusItems.map((item, idx) => {
                    const display = BONUS_ITEM_DISPLAY[item] || { icon: '🎁', name: item, color: '#888' };
                    return (
                      <div key={idx} className="bonus-item" style={{ borderColor: display.color }}>
                        <span className="bonus-item-icon">{display.icon}</span>
                        <span className="bonus-item-name">{display.name}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              <button className="claim-button claimed" onClick={onClose}>
                Awesome!
              </button>
            </div>
          ) : (
            <>
              <div className="modal-header">
                <div className="modal-icon">📅</div>
                <h2 className="modal-title">Daily Rewards</h2>
                <p className="modal-subtitle">
                  {rewardState.claimedToday
                    ? "Come back tomorrow for more rewards!"
                    : "Claim your reward to keep your streak alive!"}
                </p>
              </div>

              <div className="streak-info">
                <div className="streak-stat">
                  <div className="streak-value">{rewardState.loginStreak}</div>
                  <div className="streak-label">Day Streak</div>
                </div>
                <div className="streak-stat">
                  <div className="streak-value">{rewardState.streakShields}</div>
                  <div className="streak-label">Streak Shields</div>
                </div>
              </div>

              <div className="week-grid">
                {rewardState.weekView.map((day) => (
                  <div
                    key={day.day}
                    className={`day-cell ${day.claimed ? 'claimed' : ''} ${day.current ? 'current' : ''}`}
                  >
                    <div className="day-number">D{day.day}</div>
                    <div className="day-xp">+{day.xp}</div>
                    {day.bonusItems.length > 0 && (
                      <div className="day-bonus">
                        {day.bonusItems.includes('streak_shield') && '🛡️'}
                        {day.bonusItems.includes('rare_loot_box') && '📦'}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <button
                className={`claim-button ${rewardState.claimedToday ? 'claimed' : ''}`}
                onClick={rewardState.claimedToday ? onClose : onClaim}
                disabled={isClaiming}
              >
                {isClaiming
                  ? 'Claiming...'
                  : rewardState.claimedToday
                  ? 'Come Back Tomorrow'
                  : `Claim Day ${rewardState.nextReward?.day} Reward`}
              </button>
            </>
          )}
        </div>
      </div>
    </>
  );
}

export function DailyRewardsProvider({ children }: { children: ReactNode }) {
  const [rewardState, setRewardState] = useState<DailyRewardState | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isClaiming, setIsClaiming] = useState(false);
  const [lastClaimResult, setLastClaimResult] = useState<ClaimResult | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  const fetchRewardState = useCallback(async () => {
    try {
      const res = await fetch('/api/rewards/daily');
      if (!res.ok) {
        if (res.status === 401) {
          setRewardState(null);
          return;
        }
        throw new Error('Failed to fetch reward state');
      }

      const data = await res.json();
      setRewardState(data);

      // Auto-show modal disabled - can still be opened manually from menu
      // if (!data.claimedToday && isAuthenticated) {
      //   setTimeout(() => setShowModal(true), 500);
      // }
    } catch (err) {
      console.error('Daily rewards fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  // Initialize auth listener
  useEffect(() => {
    const supabase = createClient();

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        setIsAuthenticated(true);
        fetchRewardState();
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        setIsAuthenticated(true);
        fetchRewardState();
      } else if (event === 'SIGNED_OUT') {
        setIsAuthenticated(false);
        setRewardState(null);
        setShowModal(false);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [fetchRewardState]);

  const openModal = useCallback(() => {
    setLastClaimResult(null);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setLastClaimResult(null);
  }, []);

  const claimReward = useCallback(async () => {
    if (isClaiming || !rewardState || rewardState.claimedToday) return;

    setIsClaiming(true);
    try {
      const res = await fetch('/api/rewards/daily', { method: 'POST' });
      const data = await res.json();

      if (res.ok) {
        setLastClaimResult({
          success: true,
          reward: data.reward,
          message: data.message,
        });

        // Update state
        setRewardState({
          ...rewardState,
          claimedToday: true,
          loginStreak: data.loginStreak,
          streakShields: data.streakShields,
          weekView: data.weekView,
          nextReward: null,
        });

        // Trigger XP update for the nav bar
        dispatchXPUpdate();
      } else {
        setLastClaimResult({
          success: false,
          error: data.error || 'Failed to claim reward',
        });
      }
    } catch (err) {
      console.error('Claim reward error:', err);
      setLastClaimResult({
        success: false,
        error: 'Network error',
      });
    } finally {
      setIsClaiming(false);
    }
  }, [isClaiming, rewardState]);

  return (
    <DailyRewardsContext.Provider
      value={{
        rewardState,
        isLoading,
        showModal,
        openModal,
        closeModal,
        claimReward,
        lastClaimResult,
      }}
    >
      {children}
      {showModal && rewardState && (
        <DailyRewardsModal
          rewardState={rewardState}
          onClaim={claimReward}
          onClose={closeModal}
          isClaiming={isClaiming}
          claimResult={lastClaimResult}
        />
      )}
    </DailyRewardsContext.Provider>
  );
}
