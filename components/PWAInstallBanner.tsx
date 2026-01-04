"use client";

import { usePWAInstall } from "@/hooks/usePWAInstall";
import { PWAInstallTutorial } from "./PWAInstallTutorial";

export function PWAInstallBanner() {
  const {
    shouldShowBanner,
    isIOS,
    showTutorial,
    setShowTutorial,
    dismissBanner,
    completeTutorial,
  } = usePWAInstall();

  if (!shouldShowBanner && !showTutorial) return null;

  return (
    <>
      <style jsx>{`
        .pwa-banner {
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          z-index: var(--z-toast, 300);
          background: linear-gradient(180deg, #1a1a24 0%, #12121a 100%);
          border: 2px solid var(--theme-gold, #FFD700);
          border-radius: 16px;
          padding: 16px 20px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4), 0 0 20px rgba(255, 215, 0, 0.2);
          display: flex;
          align-items: center;
          gap: 16px;
          max-width: calc(100vw - 32px);
          animation: slideUp 0.3s ease-out;
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        .pwa-icon {
          font-size: 28px;
          flex-shrink: 0;
        }

        .pwa-content {
          flex: 1;
          min-width: 0;
        }

        .pwa-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: var(--theme-gold, #FFD700);
          margin-bottom: 6px;
          line-height: 1.4;
        }

        .pwa-message {
          font-size: 13px;
          color: var(--theme-text-secondary, #aaa);
          line-height: 1.4;
        }

        .pwa-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .pwa-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          padding: 10px 12px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
          white-space: nowrap;
        }

        .pwa-btn-primary {
          background: linear-gradient(180deg, var(--theme-gold, #FFD700) 0%, #E6A000 100%);
          color: #1a1a1a;
          box-shadow: 0 2px 0 #996600;
        }

        .pwa-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 0 #996600;
        }

        .pwa-btn-primary:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 #996600;
        }

        .pwa-btn-secondary {
          background: transparent;
          color: var(--theme-text-muted, #666);
          border: 1px solid var(--theme-border, #333);
        }

        .pwa-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--theme-text-secondary, #aaa);
        }

        @media (max-width: 480px) {
          .pwa-banner {
            bottom: 120px;
            flex-direction: column;
            text-align: center;
            padding: 14px 16px;
          }

          .pwa-actions {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      {shouldShowBanner && !showTutorial && (
        <div className="pwa-banner">
          <span className="pwa-icon">📱</span>
          <div className="pwa-content">
            <div className="pwa-title">GET THE FULL EXPERIENCE</div>
            <div className="pwa-message">Add to home screen for instant access</div>
          </div>
          <div className="pwa-actions">
            <button className="pwa-btn pwa-btn-secondary" onClick={dismissBanner}>
              LATER
            </button>
            <button className="pwa-btn pwa-btn-primary" onClick={() => setShowTutorial(true)}>
              SHOW ME
            </button>
          </div>
        </div>
      )}

      {showTutorial && (
        <PWAInstallTutorial
          isIOS={isIOS}
          onClose={() => setShowTutorial(false)}
          onComplete={completeTutorial}
        />
      )}
    </>
  );
}
