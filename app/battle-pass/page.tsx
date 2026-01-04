'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

interface SeasonReward {
  type: 'xp' | 'item' | 'cosmetic' | 'currency' | 'title';
  code?: string;
  amount?: number;
  name?: string;
}

interface TierData {
  tierNumber: number;
  freeReward: SeasonReward;
  premiumReward: SeasonReward | null;
  isMilestone: boolean;
  isUnlocked: boolean;
  isFreeClaimed: boolean;
  isPremiumClaimed: boolean;
}

interface SeasonData {
  active: boolean;
  season?: {
    id: string;
    name: string;
    theme: string | null;
    description: string | null;
    icon: string | null;
    tierCount: number;
    xpPerTier: number;
    startsAt: string;
    endsAt: string;
  };
  progress?: {
    seasonXp: number;
    currentTier: number;
    xpInTier: number;
    xpToNextTier: number;
    hasPremium: boolean;
    claimedFree: number[];
    claimedPremium: number[];
  };
  tiers?: TierData[];
  timeRemaining?: {
    days: number;
    hours: number;
  };
}

const REWARD_ICONS: Record<string, string> = {
  xp: '✨',
  item: '📦',
  cosmetic: '🎨',
  currency: '💰',
  title: '🏷️',
  streak_shield: '🛡️',
  loot_box_rare: '📦',
  loot_box_epic: '💎',
  legendary_loot_box: '👑',
};

export default function BattlePassPage() {
  const router = useRouter();
  const [data, setData] = useState<SeasonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState<number | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const tierListRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkAdminAndFetch();
  }, []);

  useEffect(() => {
    // Scroll to current tier
    if (data?.progress && tierListRef.current) {
      const currentTierEl = tierListRef.current.querySelector('.tier-row.current');
      if (currentTierEl) {
        currentTierEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [data?.progress?.currentTier]);

  async function checkAdminAndFetch() {
    try {
      const accountRes = await fetch('/api/account');
      if (!accountRes.ok) {
        router.push('/login');
        return;
      }
      const accountData = await accountRes.json();

      if (!accountData.isAdmin) {
        router.push('/');
        return;
      }

      setIsAdmin(true);
      await fetchSeasonData();
    } catch (err) {
      console.error('Error checking admin:', err);
      router.push('/');
    }
  }

  async function fetchSeasonData() {
    try {
      const res = await fetch('/api/seasons');
      if (res.ok) {
        const json = await res.json();
        setData(json);
      }
    } catch (err) {
      console.error('Failed to fetch season:', err);
    } finally {
      setLoading(false);
    }
  }

  async function claimReward(tierNumber: number, isPremium: boolean) {
    setClaiming(tierNumber);
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'claim',
          tierNumber,
          isPremium,
        }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.progress) {
          setData((prev) => prev ? { ...prev, ...json.progress } : prev);
        }
        await fetchSeasonData();
      }
    } catch (err) {
      console.error('Failed to claim reward:', err);
    } finally {
      setClaiming(null);
    }
  }

  async function purchasePremium() {
    try {
      const res = await fetch('/api/seasons', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'purchase_premium' }),
      });

      if (res.ok) {
        await fetchSeasonData();
      }
    } catch (err) {
      console.error('Failed to purchase premium:', err);
    }
  }

  function getRewardIcon(reward: SeasonReward): string {
    if (reward.code && REWARD_ICONS[reward.code]) {
      return REWARD_ICONS[reward.code];
    }
    return REWARD_ICONS[reward.type] || '🎁';
  }

  function getRewardName(reward: SeasonReward): string {
    if (reward.name) return reward.name;
    if (reward.type === 'xp' && reward.amount) return `${reward.amount} XP`;
    if (reward.code) return reward.code.replace(/_/g, ' ');
    return 'Reward';
  }

  if (loading || !isAdmin) {
    return (
      <div className="battle-pass-page">
        <style jsx>{styles}</style>
        <div className="loading">
          <div className="loading-spinner">⚔️</div>
          <p>Loading Battle Pass...</p>
        </div>
      </div>
    );
  }

  if (!data?.active || !data.season) {
    return (
      <div className="battle-pass-page">
        <style jsx>{styles}</style>
        <div className="admin-badge">Admin Preview</div>
        <Link href="/admin" className="back-link">
          ← Back to Admin
        </Link>
        <div className="no-season">
          <div className="no-season-icon">📅</div>
          <h2>No Active Season</h2>
          <p>Check back soon for the next Battle Pass!</p>
        </div>
      </div>
    );
  }

  const progress = data.progress!;
  const progressPercent = (progress.xpInTier / data.season.xpPerTier) * 100;

  return (
    <>
      <style jsx>{styles}</style>
      <div className="battle-pass-page">
        <div className="admin-badge">Admin Preview</div>

        <Link href="/admin" className="back-link">
          ← Back to Admin
        </Link>

        {/* Season Header */}
        <div className="season-header">
          <div className="season-icon">{data.season.icon || '⚔️'}</div>
          <h1 className="season-name">{data.season.name}</h1>
          {data.season.description && (
            <p className="season-desc">{data.season.description}</p>
          )}
          <div className="season-time">
            {data.timeRemaining && (
              <span>
                {data.timeRemaining.days}d {data.timeRemaining.hours}h remaining
              </span>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <div className="tier-display">
            <span className="tier-label">Tier</span>
            <span className="tier-value">{progress.currentTier}</span>
            <span className="tier-max">/ {data.season.tierCount}</span>
          </div>
          <div className="progress-bar-container">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPercent}%` }}
            />
            <div className="progress-text">
              {progress.xpInTier.toLocaleString()} / {data.season.xpPerTier.toLocaleString()} XP
            </div>
          </div>
          <div className="total-xp">
            Total Season XP: {progress.seasonXp.toLocaleString()}
          </div>
        </div>

        {/* Premium Banner */}
        {!progress.hasPremium && (
          <div className="premium-banner">
            <div className="premium-content">
              <span className="premium-icon">👑</span>
              <div className="premium-text">
                <div className="premium-title">Unlock Premium Rewards</div>
                <div className="premium-desc">Get exclusive cosmetics, items & more!</div>
              </div>
            </div>
            <button className="premium-btn" onClick={purchasePremium}>
              Unlock - $9.99
            </button>
          </div>
        )}

        {/* Tier Track */}
        <div className="tier-track" ref={tierListRef}>
          <div className="track-header">
            <div className="track-col tier-col">Tier</div>
            <div className="track-col free-col">Free</div>
            <div className="track-col premium-col">
              Premium {progress.hasPremium ? '✓' : '🔒'}
            </div>
          </div>

          {data.tiers?.map((tier) => {
            const isCurrent = tier.tierNumber === progress.currentTier + 1;
            const canClaimFree = tier.isUnlocked && !tier.isFreeClaimed;
            const canClaimPremium = tier.isUnlocked && progress.hasPremium && !tier.isPremiumClaimed && tier.premiumReward;

            return (
              <div
                key={tier.tierNumber}
                className={`tier-row ${tier.isUnlocked ? 'unlocked' : 'locked'} ${
                  isCurrent ? 'current' : ''
                } ${tier.isMilestone ? 'milestone' : ''}`}
              >
                <div className="tier-number">
                  {tier.isMilestone ? '⭐' : tier.tierNumber}
                </div>

                {/* Free Reward */}
                <div className={`reward-cell free ${tier.isFreeClaimed ? 'claimed' : ''}`}>
                  <div className="reward-icon">{getRewardIcon(tier.freeReward)}</div>
                  <div className="reward-name">{getRewardName(tier.freeReward)}</div>
                  {canClaimFree && (
                    <button
                      className="claim-btn"
                      onClick={() => claimReward(tier.tierNumber, false)}
                      disabled={claiming === tier.tierNumber}
                    >
                      {claiming === tier.tierNumber ? '...' : 'Claim'}
                    </button>
                  )}
                  {tier.isFreeClaimed && <div className="claimed-badge">✓</div>}
                </div>

                {/* Premium Reward */}
                <div
                  className={`reward-cell premium ${
                    tier.isPremiumClaimed ? 'claimed' : ''
                  } ${!progress.hasPremium ? 'locked' : ''}`}
                >
                  {tier.premiumReward ? (
                    <>
                      <div className="reward-icon">{getRewardIcon(tier.premiumReward)}</div>
                      <div className="reward-name">{getRewardName(tier.premiumReward)}</div>
                      {canClaimPremium && (
                        <button
                          className="claim-btn premium-claim"
                          onClick={() => claimReward(tier.tierNumber, true)}
                          disabled={claiming === tier.tierNumber}
                        >
                          {claiming === tier.tierNumber ? '...' : 'Claim'}
                        </button>
                      )}
                      {tier.isPremiumClaimed && <div className="claimed-badge">✓</div>}
                      {!progress.hasPremium && <div className="lock-icon">🔒</div>}
                    </>
                  ) : (
                    <div className="no-reward">-</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

  .battle-pass-page {
    min-height: 100vh;
    padding: calc(80px + env(safe-area-inset-top)) 1rem 2rem;
    background: linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 100%);
    max-width: 700px;
    margin: 0 auto;
  }

  .admin-badge {
    position: fixed;
    top: 60px;
    right: 10px;
    background: rgba(255, 107, 107, 0.2);
    border: 1px solid #FF6B6B;
    color: #FF6B6B;
    padding: 4px 8px;
    border-radius: 4px;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    z-index: 100;
  }

  .loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    height: 60vh;
    gap: 1rem;
  }

  .loading-spinner {
    font-size: 3rem;
    animation: spin 1s linear infinite;
  }

  .loading p {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.6rem;
    color: #666;
  }

  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }

  .back-link {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #666;
    text-decoration: none;
    margin-bottom: 1rem;
    transition: color 0.2s;
  }

  .back-link:hover {
    color: #FFD700;
  }

  .no-season {
    text-align: center;
    padding: 4rem 2rem;
  }

  .no-season-icon {
    font-size: 4rem;
    margin-bottom: 1rem;
  }

  .no-season h2 {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.8rem;
    color: #888;
    margin-bottom: 0.5rem;
  }

  .no-season p {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #666;
  }

  .season-header {
    text-align: center;
    margin-bottom: 1.5rem;
    padding: 1.5rem;
    background: linear-gradient(180deg, rgba(255, 215, 0, 0.1) 0%, rgba(255, 107, 107, 0.1) 100%);
    border: 2px solid rgba(255, 215, 0, 0.3);
    border-radius: 16px;
  }

  .season-icon {
    font-size: 3rem;
    margin-bottom: 0.5rem;
  }

  .season-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 1rem;
    color: #FFD700;
    text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
    margin-bottom: 0.5rem;
  }

  .season-desc {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #888;
    line-height: 1.6;
    margin-bottom: 0.5rem;
  }

  .season-time {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.45rem;
    color: #FF6B6B;
  }

  .progress-section {
    margin-bottom: 1.5rem;
  }

  .tier-display {
    display: flex;
    align-items: baseline;
    justify-content: center;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .tier-label {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #666;
  }

  .tier-value {
    font-family: 'Press Start 2P', monospace;
    font-size: 1.5rem;
    color: #FFD700;
    text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
  }

  .tier-max {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #666;
  }

  .progress-bar-container {
    position: relative;
    height: 24px;
    background: rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
    margin-bottom: 0.5rem;
  }

  .progress-bar-fill {
    position: absolute;
    top: 0;
    left: 0;
    height: 100%;
    background: linear-gradient(90deg, #5CC9F5 0%, #FFD700 100%);
    border-radius: 12px;
    transition: width 0.5s ease;
  }

  .progress-text {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  }

  .total-xp {
    text-align: center;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #666;
  }

  .premium-banner {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    padding: 1rem;
    background: linear-gradient(90deg, rgba(255, 215, 0, 0.15) 0%, rgba(255, 107, 107, 0.15) 100%);
    border: 2px solid rgba(255, 215, 0, 0.4);
    border-radius: 12px;
    margin-bottom: 1.5rem;
  }

  .premium-content {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .premium-icon {
    font-size: 1.5rem;
  }

  .premium-title {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #FFD700;
    margin-bottom: 0.25rem;
  }

  .premium-desc {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    color: #888;
  }

  .premium-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.45rem;
    padding: 0.75rem 1rem;
    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
    border: none;
    border-radius: 8px;
    color: #000;
    cursor: pointer;
    white-space: nowrap;
    transition: transform 0.2s, box-shadow 0.2s;
  }

  .premium-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
  }

  .tier-track {
    background: rgba(255, 255, 255, 0.03);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 12px;
    overflow: hidden;
  }

  .track-header {
    display: grid;
    grid-template-columns: 60px 1fr 1fr;
    padding: 0.75rem;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  }

  .track-col {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.4rem;
    color: #888;
    text-align: center;
  }

  .tier-row {
    display: grid;
    grid-template-columns: 60px 1fr 1fr;
    border-bottom: 1px solid rgba(255, 255, 255, 0.05);
    transition: background 0.2s;
  }

  .tier-row:last-child {
    border-bottom: none;
  }

  .tier-row.locked {
    opacity: 0.5;
  }

  .tier-row.current {
    background: rgba(92, 201, 245, 0.1);
    border-color: rgba(92, 201, 245, 0.3);
  }

  .tier-row.milestone {
    background: rgba(255, 215, 0, 0.05);
  }

  .tier-row.milestone.unlocked {
    background: rgba(255, 215, 0, 0.1);
  }

  .tier-number {
    display: flex;
    align-items: center;
    justify-content: center;
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #888;
    padding: 1rem;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .reward-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 1rem 0.5rem;
    gap: 0.25rem;
    position: relative;
    border-right: 1px solid rgba(255, 255, 255, 0.05);
  }

  .reward-cell:last-child {
    border-right: none;
  }

  .reward-cell.claimed {
    opacity: 0.5;
  }

  .reward-cell.locked {
    opacity: 0.4;
  }

  .reward-icon {
    font-size: 1.5rem;
  }

  .reward-name {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    color: #aaa;
    text-align: center;
    line-height: 1.4;
  }

  .no-reward {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.5rem;
    color: #444;
  }

  .claim-btn {
    font-family: 'Press Start 2P', monospace;
    font-size: 0.35rem;
    padding: 0.35rem 0.6rem;
    background: linear-gradient(180deg, #5CC9F5 0%, #4AA8D8 100%);
    border: none;
    border-radius: 4px;
    color: #000;
    cursor: pointer;
    margin-top: 0.25rem;
    transition: transform 0.2s;
  }

  .claim-btn.premium-claim {
    background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
  }

  .claim-btn:hover:not(:disabled) {
    transform: scale(1.05);
  }

  .claim-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .claimed-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 0.8rem;
    color: #4ADE80;
  }

  .lock-icon {
    position: absolute;
    top: 8px;
    right: 8px;
    font-size: 0.7rem;
    opacity: 0.5;
  }

  @media (max-width: 500px) {
    .premium-banner {
      flex-direction: column;
      text-align: center;
    }

    .premium-content {
      flex-direction: column;
    }
  }
`;
