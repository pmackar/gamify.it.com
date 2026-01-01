'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Achievement {
  code: string;
  name: string;
  description: string;
  icon: string;
  xpReward: number;
  category: string;
  tier: number;
}

interface AchievementContextType {
  showAchievement: (achievement: Achievement) => void;
  showAchievements: (achievements: Achievement[]) => void;
}

const AchievementContext = createContext<AchievementContextType | null>(null);

export function useAchievements() {
  const context = useContext(AchievementContext);
  if (!context) {
    throw new Error('useAchievements must be used within AchievementProvider');
  }
  return context;
}

// Icon mapping for achievements
const ICON_MAP: Record<string, string> = {
  footprints: '👣',
  compass: '🧭',
  map: '🗺️',
  globe: '🌍',
  building: '🏢',
  buildings: '🏙️',
  sparkles: '✨',
  plane: '✈️',
  airplane: '🛩️',
  earth: '🌎',
  utensils: '🍴',
  star: '⭐',
  'chef-hat': '👨‍🍳',
  beer: '🍺',
  cocktail: '🍸',
  tree: '🌲',
  mountain: '⛰️',
  flame: '🔥',
  fire: '🔥',
  trophy: '🏆',
  medal: '🏅',
  crown: '👑',
  landmark: '🏛️',
  camera: '📷',
  'umbrella-beach': '🏖️',
  waves: '🌊',
};

function getIcon(iconName: string): string {
  return ICON_MAP[iconName] || '🎖️';
}

function getTierColor(tier: number): string {
  switch (tier) {
    case 1: return '#5fbf8a'; // Green - common
    case 2: return '#5CC9F5'; // Blue - rare
    case 3: return '#a855f7'; // Purple - epic
    case 4: return '#FFD700'; // Gold - legendary
    default: return '#888';
  }
}

function getTierName(tier: number): string {
  switch (tier) {
    case 1: return 'COMMON';
    case 2: return 'RARE';
    case 3: return 'EPIC';
    case 4: return 'LEGENDARY';
    default: return '';
  }
}

interface PopupProps {
  achievement: Achievement;
  onClose: () => void;
  index: number;
}

function AchievementNotification({ achievement, onClose, index }: PopupProps) {
  const tierColor = getTierColor(achievement.tier);

  return (
    <>
      <style jsx>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .achievement-popup {
          position: fixed;
          top: ${80 + index * 140}px;
          right: 20px;
          z-index: 10001;
          animation: slideIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
                     glow 2s ease-in-out infinite;
          pointer-events: auto;
        }

        @keyframes slideIn {
          0% {
            transform: translateX(120%);
            opacity: 0;
          }
          100% {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes glow {
          0%, 100% {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                        0 0 20px ${tierColor}40;
          }
          50% {
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4),
                        0 0 40px ${tierColor}60;
          }
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        @keyframes bounce {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .popup-card {
          background: rgba(24, 24, 32, 0.98);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 2px solid ${tierColor};
          border-radius: 16px;
          padding: 1.25rem;
          width: 320px;
          position: relative;
          overflow: hidden;
        }

        .popup-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, transparent, ${tierColor}, transparent);
        }

        .popup-card::after {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(circle at 50% 0%, ${tierColor}15 0%, transparent 60%);
          pointer-events: none;
        }

        .popup-header {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin-bottom: 1rem;
        }

        .popup-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: ${tierColor};
          text-transform: uppercase;
          letter-spacing: 0.1em;
          text-shadow: 0 0 10px ${tierColor}80;
        }

        .tier-badge {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          background: ${tierColor}20;
          border: 1px solid ${tierColor}50;
          color: ${tierColor};
          padding: 0.2rem 0.4rem;
          border-radius: 4px;
          margin-left: auto;
        }

        .popup-content {
          display: flex;
          gap: 1rem;
          position: relative;
          z-index: 1;
        }

        .popup-icon {
          width: 64px;
          height: 64px;
          background: linear-gradient(135deg, ${tierColor}30 0%, ${tierColor}10 100%);
          border: 2px solid ${tierColor}50;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2rem;
          flex-shrink: 0;
          animation: bounce 2s ease-in-out infinite;
        }

        .popup-info {
          flex: 1;
          min-width: 0;
        }

        .popup-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #fff;
          margin-bottom: 0.5rem;
          line-height: 1.4;
        }

        .popup-desc {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #888;
          line-height: 1.8;
          margin-bottom: 0.75rem;
        }

        .popup-xp {
          display: inline-flex;
          align-items: center;
          gap: 0.4rem;
          background: rgba(255, 215, 0, 0.15);
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 6px;
          padding: 0.3rem 0.6rem;
        }

        .xp-icon {
          font-size: 0.8rem;
        }

        .xp-value {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          background: linear-gradient(90deg, #FFD700, #FFA500);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .popup-close {
          position: absolute;
          top: 0.5rem;
          right: 0.5rem;
          width: 24px;
          height: 24px;
          background: rgba(255, 255, 255, 0.1);
          border: none;
          border-radius: 6px;
          color: #666;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1rem;
          transition: all 0.2s ease;
          z-index: 2;
        }

        .popup-close:hover {
          background: rgba(255, 255, 255, 0.2);
          color: #fff;
        }

        @media (max-width: 768px) {
          .achievement-popup {
            right: 10px;
            left: 10px;
            top: ${70 + index * 130}px;
          }

          .popup-card {
            width: auto;
          }
        }
      `}</style>

      <div className="achievement-popup">
        <div className="popup-card">
          <button className="popup-close" onClick={onClose}>×</button>
          <div className="popup-header">
            <span className="popup-label">Achievement Unlocked!</span>
            <span className="tier-badge">{getTierName(achievement.tier)}</span>
          </div>
          <div className="popup-content">
            <div className="popup-icon">
              {getIcon(achievement.icon)}
            </div>
            <div className="popup-info">
              <h3 className="popup-name">{achievement.name}</h3>
              <p className="popup-desc">{achievement.description}</p>
              <div className="popup-xp">
                <span className="xp-icon">⭐</span>
                <span className="xp-value">+{achievement.xpReward} XP</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

interface QueuedAchievement {
  id: string;
  achievement: Achievement;
}

export function AchievementProvider({ children }: { children: ReactNode }) {
  const [queue, setQueue] = useState<QueuedAchievement[]>([]);

  const showAchievement = useCallback((achievement: Achievement) => {
    const id = `${achievement.code}-${Date.now()}`;
    setQueue((prev) => [...prev, { id, achievement }]);

    // Auto-dismiss after 6 seconds
    setTimeout(() => {
      setQueue((prev) => prev.filter((item) => item.id !== id));
    }, 6000);
  }, []);

  const showAchievements = useCallback((achievements: Achievement[]) => {
    achievements.forEach((achievement, index) => {
      // Stagger the popups
      setTimeout(() => {
        showAchievement(achievement);
      }, index * 500);
    });
  }, [showAchievement]);

  const dismissAchievement = useCallback((id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  }, []);

  return (
    <AchievementContext.Provider value={{ showAchievement, showAchievements }}>
      {children}
      {queue.slice(0, 3).map((item, index) => (
        <AchievementNotification
          key={item.id}
          achievement={item.achievement}
          onClose={() => dismissAchievement(item.id)}
          index={index}
        />
      ))}
    </AchievementContext.Provider>
  );
}
