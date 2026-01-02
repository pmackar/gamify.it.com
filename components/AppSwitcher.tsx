'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';

interface App {
  id: string;
  name: string;
  path: string;
  icon: string;
  color: string;
}

const APPS: App[] = [
  { id: 'account', name: 'Home', path: '/account', icon: '🏠', color: '#FFD700' },
  { id: 'fitness', name: 'Fitness', path: '/fitness', icon: '💪', color: '#FF6B6B' },
  { id: 'today', name: 'Today', path: '/today', icon: '📋', color: '#5CC9F5' },
  { id: 'travel', name: 'Travel', path: '/travel', icon: '✈️', color: '#5fbf8a' },
];

export default function AppSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();
  const pathname = usePathname();

  // Find current app index
  const getCurrentAppIndex = useCallback(() => {
    const index = APPS.findIndex(app => pathname?.startsWith(app.path));
    return index >= 0 ? index : 0;
  }, [pathname]);

  // Open switcher
  const openSwitcher = useCallback(() => {
    setSelectedIndex(getCurrentAppIndex());
    setIsOpen(true);
  }, [getCurrentAppIndex]);

  // Close switcher
  const closeSwitcher = useCallback(() => {
    setIsOpen(false);
  }, []);

  // Navigate to selected app
  const navigateToApp = useCallback((index: number) => {
    const app = APPS[index];
    if (app) {
      router.push(app.path);
      closeSwitcher();
    }
  }, [router, closeSwitcher]);

  // Handle keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      // Toggle with backtick
      if (e.key === '`') {
        e.preventDefault();
        if (isOpen) {
          closeSwitcher();
        } else {
          openSwitcher();
        }
        return;
      }

      // Only handle other keys when open
      if (!isOpen) return;

      switch (e.key) {
        case 'Escape':
          e.preventDefault();
          closeSwitcher();
          break;
        case 'ArrowLeft':
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => (prev - 1 + APPS.length) % APPS.length);
          break;
        case 'ArrowRight':
        case 'ArrowDown':
        case 'Tab':
          e.preventDefault();
          setSelectedIndex(prev => (prev + 1) % APPS.length);
          break;
        case 'Enter':
        case ' ':
          e.preventDefault();
          navigateToApp(selectedIndex);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
          e.preventDefault();
          const numIndex = parseInt(e.key) - 1;
          if (numIndex < APPS.length) {
            navigateToApp(numIndex);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, openSwitcher, closeSwitcher, navigateToApp]);

  if (!isOpen) return null;

  const currentAppIndex = getCurrentAppIndex();

  return (
    <>
      <style jsx>{`
        .switcher-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.75);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          z-index: 10000;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .switcher-container {
          background: var(--theme-bg-card, #1e1e28);
          border: 2px solid var(--theme-border-light, #3a3a3a);
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
          animation: scaleIn 0.15s ease-out;
        }

        @keyframes scaleIn {
          from { transform: scale(0.95); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        .switcher-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--theme-text-muted, #666);
          text-align: center;
          margin-bottom: 20px;
          letter-spacing: 0.1em;
        }

        .switcher-apps {
          display: flex;
          gap: 16px;
        }

        .switcher-app {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          padding: 20px 24px;
          background: var(--theme-bg-tertiary, #151520);
          border: 2px solid transparent;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.15s ease;
          min-width: 100px;
          position: relative;
        }

        .switcher-app:hover {
          background: var(--theme-bg-hover, #252530);
        }

        .switcher-app.selected {
          border-color: var(--app-color);
          box-shadow: 0 0 20px var(--app-glow);
        }

        .switcher-app.current::after {
          content: '';
          position: absolute;
          bottom: -8px;
          left: 50%;
          transform: translateX(-50%);
          width: 6px;
          height: 6px;
          background: var(--app-color);
          border-radius: 50%;
        }

        .app-icon {
          font-size: 2.5rem;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.3));
        }

        .app-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--theme-text-primary, #fff);
        }

        .app-key {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-text-muted, #666);
          background: var(--theme-bg-base, #0a0a0a);
          padding: 4px 8px;
          border-radius: 4px;
          border: 1px solid var(--theme-border, #2a2a2a);
        }

        .switcher-hint {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-text-muted, #666);
          text-align: center;
          margin-top: 20px;
        }

        .hint-key {
          color: var(--theme-text-secondary, #aaa);
          background: var(--theme-bg-base, #0a0a0a);
          padding: 2px 6px;
          border-radius: 3px;
          border: 1px solid var(--theme-border, #2a2a2a);
          margin: 0 2px;
        }
      `}</style>

      <div className="switcher-overlay" onClick={closeSwitcher}>
        <div className="switcher-container" onClick={e => e.stopPropagation()}>
          <div className="switcher-title">SWITCH APP</div>
          <div className="switcher-apps">
            {APPS.map((app, index) => (
              <div
                key={app.id}
                className={`switcher-app ${index === selectedIndex ? 'selected' : ''} ${index === currentAppIndex ? 'current' : ''}`}
                style={{
                  '--app-color': app.color,
                  '--app-glow': `${app.color}40`,
                } as React.CSSProperties}
                onClick={() => navigateToApp(index)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="app-icon">{app.icon}</span>
                <span className="app-name">{app.name}</span>
                <span className="app-key">{index + 1}</span>
              </div>
            ))}
          </div>
          <div className="switcher-hint">
            <span className="hint-key">←→</span> navigate
            <span style={{ margin: '0 12px' }}>·</span>
            <span className="hint-key">Enter</span> select
            <span style={{ margin: '0 12px' }}>·</span>
            <span className="hint-key">`</span> close
          </div>
        </div>
      </div>
    </>
  );
}
