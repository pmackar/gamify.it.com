'use client';

import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from 'react';
import { getRarityColor, getRarityGlow, ItemRarity } from '@/lib/loot';

interface LootDropItem {
  code: string;
  name: string;
  icon: string;
  rarity?: ItemRarity;
  description?: string;
  type?: string;
}

interface LootDrop {
  item: LootDropItem;
  rarity?: ItemRarity;
  quantity: number;
  instantXP?: number;
  message?: string;
  bonuses?: string[];
  isWorkoutLoot?: boolean;
}

interface LootDropContextType {
  showLootDrop: (drop: LootDrop) => void;
  showWorkoutLoot: (drop: LootDrop) => void;
}

const LootDropContext = createContext<LootDropContextType | null>(null);

export function useLootDrop() {
  const context = useContext(LootDropContext);
  if (!context) {
    throw new Error('useLootDrop must be used within LootDropProvider');
  }
  return context;
}

function LootDropNotification({
  drop,
  onClose,
}: {
  drop: LootDrop;
  onClose: () => void;
}) {
  const rarity = drop.rarity || drop.item.rarity || 'COMMON';
  const rarityColor = getRarityColor(rarity);
  const rarityGlow = getRarityGlow(rarity);
  const message = drop.message || `Found ${drop.item.name}!`;

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .loot-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.7);
          backdrop-filter: blur(4px);
          z-index: 10002;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .loot-card {
          position: relative;
          background: linear-gradient(180deg, rgba(30, 30, 40, 0.98) 0%, rgba(20, 20, 28, 0.98) 100%);
          border: 3px solid ${rarityColor};
          border-radius: 20px;
          padding: 2rem;
          text-align: center;
          max-width: 320px;
          animation: dropIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
          box-shadow: 0 0 60px ${rarityGlow},
                      0 20px 60px rgba(0, 0, 0, 0.5);
        }

        @keyframes dropIn {
          0% {
            transform: translateY(-100px) scale(0.5);
            opacity: 0;
          }
          60% {
            transform: translateY(10px) scale(1.05);
          }
          100% {
            transform: translateY(0) scale(1);
            opacity: 1;
          }
        }

        .loot-card::before {
          content: '';
          position: absolute;
          top: -2px;
          left: -2px;
          right: -2px;
          bottom: -2px;
          background: linear-gradient(45deg, ${rarityColor}, transparent, ${rarityColor});
          border-radius: 22px;
          z-index: -1;
          animation: rotate 3s linear infinite;
          opacity: 0.5;
        }

        @keyframes rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .loot-sparkles {
          position: absolute;
          inset: -20px;
          pointer-events: none;
          overflow: hidden;
        }

        .sparkle {
          position: absolute;
          width: 6px;
          height: 6px;
          background: ${rarityColor};
          border-radius: 50%;
          animation: sparkle 1.5s ease-out infinite;
        }

        @keyframes sparkle {
          0% {
            transform: translateY(0) scale(0);
            opacity: 1;
          }
          100% {
            transform: translateY(-100px) scale(1);
            opacity: 0;
          }
        }

        .loot-rarity {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: ${rarityColor};
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 1rem;
          text-shadow: 0 0 10px ${rarityGlow};
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.7; }
        }

        .loot-icon {
          font-size: 4rem;
          margin-bottom: 1rem;
          animation: bounce 1s ease-in-out infinite;
          filter: drop-shadow(0 0 20px ${rarityGlow});
        }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .loot-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.8rem;
          color: #fff;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .loot-message {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          color: #888;
          margin-bottom: 1.5rem;
          line-height: 1.6;
        }

        .loot-xp {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(255, 215, 0, 0.15);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          margin-bottom: 1.5rem;
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
          0%, 100% { box-shadow: 0 0 10px rgba(255, 215, 0, 0.3); }
          50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
        }

        .loot-xp-icon {
          font-size: 1.2rem;
        }

        .loot-xp-value {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          background: linear-gradient(90deg, #FFD700, #FFA500);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .loot-button {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(180deg, ${rarityColor} 0%, ${rarityColor}CC 100%);
          border: none;
          border-radius: 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: ${drop.item.rarity === 'LEGENDARY' ? '#000' : '#fff'};
          cursor: pointer;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          transition: all 0.2s ease;
          box-shadow: 0 4px 0 ${rarityColor}80,
                      0 6px 20px ${rarityGlow};
        }

        .loot-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 ${rarityColor}80,
                      0 8px 30px ${rarityGlow};
        }

        .loot-button:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 ${rarityColor}80;
        }
      `}</style>

      <div className="loot-overlay" onClick={onClose}>
        <div className="loot-card" onClick={(e) => e.stopPropagation()}>
          {/* Sparkle effects */}
          <div className="loot-sparkles">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="sparkle"
                style={{
                  left: `${10 + Math.random() * 80}%`,
                  animationDelay: `${i * 0.2}s`,
                }}
              />
            ))}
          </div>

          <div className="loot-rarity">{rarity} DROP!</div>
          <div className="loot-icon">{drop.item.icon}</div>
          <div className="loot-name">{drop.item.name}</div>
          <div className="loot-message">{message}</div>
          {drop.bonuses && drop.bonuses.length > 0 && (
            <div className="loot-bonuses" style={{
              fontSize: '0.4rem',
              color: '#5fbf8a',
              marginBottom: '0.5rem',
              fontFamily: "'Press Start 2P', monospace",
            }}>
              Bonus: {drop.bonuses.join(', ')}
            </div>
          )}

          {drop.instantXP && (
            <div className="loot-xp">
              <span className="loot-xp-icon">⭐</span>
              <span className="loot-xp-value">+{drop.instantXP} XP</span>
            </div>
          )}

          <button className="loot-button" onClick={onClose}>
            Awesome!
          </button>
        </div>
      </div>
    </>
  );
}

// Chest animation component for workout loot
function WorkoutLootChest({
  drop,
  onOpen,
}: {
  drop: LootDrop;
  onOpen: () => void;
}) {
  const [isOpening, setIsOpening] = useState(false);
  const rarity = drop.rarity || 'COMMON';
  const rarityColor = getRarityColor(rarity);
  const rarityGlow = getRarityGlow(rarity);

  const handleOpen = () => {
    setIsOpening(true);
    // Delay before showing the loot
    setTimeout(onOpen, 800);
  };

  return (
    <>
      <style jsx>{`
        .chest-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.85);
          backdrop-filter: blur(8px);
          z-index: 10002;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.3s ease;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .chest-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.8rem;
          color: #FFD700;
          text-transform: uppercase;
          letter-spacing: 0.2em;
          margin-bottom: 2rem;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
          animation: pulse 2s ease-in-out infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.02); }
        }

        .chest-container {
          position: relative;
          cursor: pointer;
          transition: transform 0.2s ease;
        }

        .chest-container:hover {
          transform: scale(1.05);
        }

        .chest-container:active {
          transform: scale(0.98);
        }

        .chest {
          font-size: 6rem;
          filter: drop-shadow(0 0 30px ${rarityGlow});
          animation: chestBounce 1.5s ease-in-out infinite;
        }

        .chest.opening {
          animation: chestOpen 0.8s ease forwards;
        }

        @keyframes chestBounce {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          25% { transform: translateY(-10px) rotate(2deg); }
          50% { transform: translateY(0) rotate(-2deg); }
          75% { transform: translateY(-5px) rotate(1deg); }
        }

        @keyframes chestOpen {
          0% { transform: scale(1) rotate(0deg); }
          30% { transform: scale(1.2) rotate(-5deg); }
          50% { transform: scale(1.3) rotate(5deg); filter: brightness(2); }
          70% { transform: scale(1.1) rotate(-2deg); }
          100% { transform: scale(0) rotate(10deg); opacity: 0; }
        }

        .chest-glow {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 200px;
          height: 200px;
          background: radial-gradient(circle, ${rarityGlow} 0%, transparent 70%);
          transform: translate(-50%, -50%);
          animation: glowPulse 2s ease-in-out infinite;
          pointer-events: none;
        }

        @keyframes glowPulse {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 0.8; transform: translate(-50%, -50%) scale(1.2); }
        }

        .chest-prompt {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #888;
          margin-top: 2rem;
          animation: blink 1s ease-in-out infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .chest-bonuses {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #5fbf8a;
          margin-top: 1rem;
          text-align: center;
          max-width: 300px;
        }

        .particles {
          position: absolute;
          inset: -50px;
          pointer-events: none;
        }

        .particle {
          position: absolute;
          width: 4px;
          height: 4px;
          background: ${rarityColor};
          border-radius: 50%;
          animation: float 3s ease-in-out infinite;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.5; }
          50% { transform: translateY(-30px) rotate(180deg); opacity: 1; }
        }
      `}</style>

      <div className="chest-overlay">
        <div className="chest-title">Workout Complete!</div>

        <div className="chest-container" onClick={handleOpen}>
          <div className="chest-glow" />
          <div className="particles">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="particle"
                style={{
                  left: `${20 + Math.random() * 60}%`,
                  top: `${20 + Math.random() * 60}%`,
                  animationDelay: `${i * 0.25}s`,
                }}
              />
            ))}
          </div>
          <div className={`chest ${isOpening ? 'opening' : ''}`}>📦</div>
        </div>

        {!isOpening && (
          <>
            <div className="chest-prompt">TAP TO OPEN</div>
            {drop.bonuses && drop.bonuses.length > 0 && (
              <div className="chest-bonuses">
                Rarity boosted by: {drop.bonuses.join(', ')}
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export function LootDropProvider({ children }: { children: ReactNode }) {
  const [currentDrop, setCurrentDrop] = useState<LootDrop | null>(null);
  const [showChest, setShowChest] = useState(false);
  const [pendingWorkoutDrop, setPendingWorkoutDrop] = useState<LootDrop | null>(null);

  const showLootDrop = useCallback((drop: LootDrop) => {
    setCurrentDrop(drop);
    setShowChest(false);

    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      setCurrentDrop(null);
    }, 10000);
  }, []);

  const showWorkoutLoot = useCallback((drop: LootDrop) => {
    setPendingWorkoutDrop(drop);
    setShowChest(true);
  }, []);

  const handleChestOpen = useCallback(() => {
    setShowChest(false);
    if (pendingWorkoutDrop) {
      setCurrentDrop(pendingWorkoutDrop);
      setPendingWorkoutDrop(null);

      // Auto-dismiss after 10 seconds
      setTimeout(() => {
        setCurrentDrop(null);
      }, 10000);
    }
  }, [pendingWorkoutDrop]);

  const closeDrop = useCallback(() => {
    setCurrentDrop(null);
  }, []);

  // Listen for loot-dropped event (from workout completion)
  useEffect(() => {
    const handleLootDropped = (event: CustomEvent) => {
      const detail = event.detail;
      if (detail?.isWorkoutLoot) {
        showWorkoutLoot({
          item: detail.item,
          rarity: detail.rarity,
          quantity: 1,
          instantXP: detail.instantXP,
          bonuses: detail.bonuses,
          isWorkoutLoot: true,
        });
      } else {
        showLootDrop({
          item: detail.item,
          rarity: detail.rarity,
          quantity: 1,
          instantXP: detail.instantXP,
          message: detail.message,
        });
      }
    };

    window.addEventListener('loot-dropped', handleLootDropped as EventListener);
    return () => {
      window.removeEventListener('loot-dropped', handleLootDropped as EventListener);
    };
  }, [showLootDrop, showWorkoutLoot]);

  return (
    <LootDropContext.Provider value={{ showLootDrop, showWorkoutLoot }}>
      {children}
      {showChest && pendingWorkoutDrop && (
        <WorkoutLootChest drop={pendingWorkoutDrop} onOpen={handleChestOpen} />
      )}
      {currentDrop && !showChest && (
        <LootDropNotification drop={currentDrop} onClose={closeDrop} />
      )}
    </LootDropContext.Provider>
  );
}

// Custom event for loot drops from API responses
export const LOOT_DROP_EVENT = 'loot-drop';

export function dispatchLootDrop(drop: LootDrop) {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(LOOT_DROP_EVENT, { detail: drop }));
  }
}
