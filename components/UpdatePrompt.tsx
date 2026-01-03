'use client';

import { useEffect, useState, useCallback } from 'react';

const CHECK_INTERVAL = 5 * 60 * 1000; // Check every 5 minutes
const STORAGE_KEY = 'app_version';

export function UpdatePrompt() {
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const checkForUpdate = useCallback(async () => {
    try {
      const response = await fetch('/api/version', { cache: 'no-store' });
      if (!response.ok) return;

      const data = await response.json();
      const serverVersion = data.version;
      const storedVersion = localStorage.getItem(STORAGE_KEY);

      if (!storedVersion) {
        // First visit - store current version
        localStorage.setItem(STORAGE_KEY, serverVersion);
        return;
      }

      if (storedVersion !== serverVersion && !dismissed) {
        setShowPrompt(true);
      }
    } catch (error) {
      // Silently fail - don't bother user if check fails
    }
  }, [dismissed]);

  const handleUpdate = () => {
    // Clear caches and reload
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((registrations) => {
        registrations.forEach((registration) => {
          registration.unregister();
        });
      });
    }

    // Clear caches
    if ('caches' in window) {
      caches.keys().then((names) => {
        names.forEach((name) => {
          caches.delete(name);
        });
      });
    }

    // Update stored version and reload
    fetch('/api/version', { cache: 'no-store' })
      .then(res => res.json())
      .then(data => {
        localStorage.setItem(STORAGE_KEY, data.version);
        window.location.reload();
      })
      .catch(() => {
        window.location.reload();
      });
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

  useEffect(() => {
    // Check on mount
    checkForUpdate();

    // Check periodically
    const interval = setInterval(checkForUpdate, CHECK_INTERVAL);

    // Check when tab becomes visible
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        checkForUpdate();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [checkForUpdate]);

  if (!showPrompt) return null;

  return (
    <>
      <style jsx>{`
        .update-prompt {
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

        .update-icon {
          font-size: 24px;
          flex-shrink: 0;
        }

        .update-content {
          flex: 1;
          min-width: 0;
        }

        .update-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: var(--theme-gold, #FFD700);
          margin-bottom: 4px;
        }

        .update-message {
          font-size: 13px;
          color: var(--theme-text-secondary, #aaa);
        }

        .update-actions {
          display: flex;
          gap: 8px;
          flex-shrink: 0;
        }

        .update-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          padding: 10px 14px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .update-btn-primary {
          background: linear-gradient(180deg, var(--theme-gold, #FFD700) 0%, #E6A000 100%);
          color: #1a1a1a;
          box-shadow: 0 2px 0 #996600;
        }

        .update-btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 3px 0 #996600;
        }

        .update-btn-primary:active {
          transform: translateY(1px);
          box-shadow: 0 1px 0 #996600;
        }

        .update-btn-secondary {
          background: transparent;
          color: var(--theme-text-muted, #666);
          border: 1px solid var(--theme-border, #333);
        }

        .update-btn-secondary:hover {
          background: rgba(255, 255, 255, 0.05);
          color: var(--theme-text-secondary, #aaa);
        }

        @media (max-width: 480px) {
          .update-prompt {
            bottom: 120px;
            flex-direction: column;
            text-align: center;
            padding: 14px 16px;
          }

          .update-actions {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="update-prompt">
        <span className="update-icon">🆕</span>
        <div className="update-content">
          <div className="update-title">UPDATE AVAILABLE</div>
          <div className="update-message">Tap refresh to get the latest version</div>
        </div>
        <div className="update-actions">
          <button className="update-btn update-btn-secondary" onClick={handleDismiss}>
            LATER
          </button>
          <button className="update-btn update-btn-primary" onClick={handleUpdate}>
            REFRESH
          </button>
        </div>
      </div>
    </>
  );
}
