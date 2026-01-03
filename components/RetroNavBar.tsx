'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { useNavBarContent, useNavBarTheme } from './NavBarContext';
import { useXP, XPState } from './XPContext';
import { ThemeSwitcher } from './ThemeSwitcher';
import { useTheme } from './ThemeContext';
import NotificationBell from './social/NotificationBell';
import { useDailyRewards } from './DailyRewards';
import { useTodayStore } from '@/lib/today/store';

// Sync indicator for Today app
const SyncIndicator = () => {
  const syncStatus = useTodayStore((state) => state.syncStatus);
  const pendingSync = useTodayStore((state) => state.pendingSync);

  if (syncStatus === 'syncing') {
    return (
      <div className="sync-indicator syncing" title="Syncing...">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12a9 9 0 11-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
          <path d="M21 3v5h-5" />
        </svg>
      </div>
    );
  }

  if (syncStatus === 'error') {
    return (
      <div className="sync-indicator error" title="Sync error - will retry">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      </div>
    );
  }

  if (pendingSync) {
    return (
      <div className="sync-indicator pending" title="Changes pending sync">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12,6 12,12 16,14" />
        </svg>
      </div>
    );
  }

  // Synced state - show checkmark briefly then fade
  return (
    <div className="sync-indicator synced" title="All changes synced">
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
        <polyline points="22,4 12,14.01 9,11.01" />
      </svg>
    </div>
  );
};

// Compact XP bar for when app content is active
const CompactXPBar = ({ xp }: { xp: XPState }) => (
  <div className="nav-xp-compact">
    <span className="nav-level-compact">L{xp.level}</span>
    <div className="nav-xp-mini-bar">
      <div
        className="nav-xp-mini-fill"
        style={{ width: `${Math.min(100, (xp.xpInCurrentLevel / xp.xpToNextLevel) * 100)}%` }}
      />
    </div>
  </div>
);

// Full XP display
const FullXPBar = ({ xp }: { xp: XPState }) => (
  <div className="nav-level-xp">
    <div className="nav-level-badge">LVL {xp.level}</div>
    <div className="nav-xp-bar">
      <div
        className="nav-xp-fill"
        style={{ width: `${Math.min(100, (xp.xpInCurrentLevel / xp.xpToNextLevel) * 100)}%` }}
      />
    </div>
  </div>
);

// Refined pixel art icons - smaller, crisper
const DumbbellIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 64 64" fill="none" style={{ opacity: active ? 1 : 0.6 }}>
    <rect x="8" y="20" width="8" height="24" fill="#FF6B6B"/>
    <rect x="16" y="16" width="8" height="32" fill="#CC5555"/>
    <rect x="24" y="28" width="16" height="8" fill="#888"/>
    <rect x="40" y="16" width="8" height="32" fill="#CC5555"/>
    <rect x="48" y="20" width="8" height="24" fill="#FF6B6B"/>
  </svg>
);

const ChecklistIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 64 64" fill="none" style={{ opacity: active ? 1 : 0.6 }}>
    <rect x="8" y="8" width="48" height="48" fill="#5CC9F5"/>
    <rect x="12" y="12" width="40" height="40" fill="#2D8AB5"/>
    <rect x="16" y="20" width="8" height="8" fill="#7FD954"/>
    <rect x="28" y="20" width="20" height="8" fill="white"/>
    <rect x="16" y="36" width="8" height="8" fill="white" opacity="0.6"/>
    <rect x="28" y="36" width="20" height="8" fill="white" opacity="0.6"/>
  </svg>
);

const PlaneIcon = ({ active }: { active?: boolean }) => (
  <svg width="20" height="20" viewBox="0 0 64 64" fill="none" style={{ opacity: active ? 1 : 0.6 }}>
    <rect x="28" y="8" width="8" height="16" fill="#5fbf8a"/>
    <rect x="24" y="24" width="16" height="24" fill="#5fbf8a"/>
    <rect x="8" y="28" width="16" height="8" fill="#4a9d70"/>
    <rect x="40" y="28" width="16" height="8" fill="#4a9d70"/>
    <rect x="20" y="48" width="8" height="8" fill="#4a9d70"/>
    <rect x="36" y="48" width="8" height="8" fill="#4a9d70"/>
  </svg>
);

const LifeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 64 64" fill="none" style={{ opacity: 0.25 }}>
    <path d="M32 56L12 36C4 28 4 16 14 12C24 8 32 18 32 18C32 18 40 8 50 12C60 16 60 28 52 36L32 56Z" fill="#a855f7"/>
    <path d="M32 48L18 34C12 28 12 20 18 17C24 14 32 22 32 22C32 22 40 14 46 17C52 20 52 28 46 34L32 48Z" fill="#c084fc"/>
  </svg>
);

const HomeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 64 64" fill="none">
    <path d="M32 8L8 28V56H24V40H40V56H56V28L32 8Z" fill="#FFD700"/>
    <path d="M32 14L14 30V52H22V38H42V52H50V30L32 14Z" fill="#E6A000"/>
    <rect x="28" y="38" width="8" height="14" fill="#1a1a24"/>
  </svg>
);

// Main app logo icon - pixel art "G" with gradient (theme-aware via CSS)
const AppLogoIcon = ({ className }: { className?: string }) => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" className={className}>
    {/* Pixel art "G" - colors applied via CSS currentColor and classes */}
    {/* Top horizontal bar */}
    <rect x="10" y="4" width="14" height="4" className="logo-g-top" />
    {/* Left vertical */}
    <rect x="6" y="8" width="4" height="4" className="logo-g-top" />
    <rect x="6" y="12" width="4" height="4" className="logo-g-mid" />
    <rect x="6" y="16" width="4" height="4" className="logo-g-mid" />
    <rect x="6" y="20" width="4" height="4" className="logo-g-bottom" />
    {/* Bottom horizontal bar */}
    <rect x="10" y="24" width="14" height="4" className="logo-g-bottom" />
    {/* Right vertical (bottom half) */}
    <rect x="20" y="20" width="4" height="4" className="logo-g-bottom" />
    {/* Middle horizontal notch */}
    <rect x="14" y="16" width="10" height="4" className="logo-g-mid" />
  </svg>
);

export interface AppMenuItem {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface QuickAction {
  label: string;
  href: string;
  icon?: React.ReactNode;
}

export interface RetroNavBarProps {
  appMenuItems?: AppMenuItem[];
  quickActions?: QuickAction[];
  children?: React.ReactNode;
  theme?: 'dark' | 'light';
}

export function RetroNavBar({ appMenuItems, quickActions, children, theme: themeProp }: RetroNavBarProps = {}) {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'error'>('loading');
  const { xp: userProfile } = useXP();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showAppsMenu, setShowAppsMenu] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [loginMode, setLoginMode] = useState<'magic' | 'password'>('magic');
  const [loginError, setLoginError] = useState('');

  // Get content from NavBarContext
  const contextContent = useNavBarContent();

  // Get theme from ThemeContext (universal theme system)
  const { resolvedTheme } = useTheme();

  // Daily rewards
  const { rewardState, openModal: openDailyRewards } = useDailyRewards();

  // Use prop if provided, otherwise use resolved theme from context
  const theme = themeProp ?? resolvedTheme;

  const isFitness = pathname.startsWith('/fitness');
  const isToday = pathname.startsWith('/today');
  const isTravel = pathname.startsWith('/travel');


  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          setAuthStatus('error');
        } else if (session?.user) {
          setUser(session.user);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      })
      .catch(() => setAuthStatus('error'));

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        setAuthStatus('authenticated');
      } else {
        setUser(null);
        setAuthStatus('unauthenticated');
      }
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    setUser(null);
    setShowUserMenu(false);
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoginLoading(false);
    if (error) {
      setLoginError(error.message);
    } else {
      setMagicLinkSent(true);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    setLoginError('');
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoginLoading(false);
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setLoginError('Invalid email or password');
      } else {
        setLoginError(error.message);
      }
    } else {
      setShowLoginDropdown(false);
      setPassword('');
      setEmail('');
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-dropdown-zone')) {
        setShowUserMenu(false);
        setShowLoginDropdown(false);
        setShowAppsMenu(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .global-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: var(--z-navbar, 100);
          padding: calc(10px + env(safe-area-inset-top, 0px)) 16px 10px;
          pointer-events: none;
        }

        .global-nav-inner {
          /* Full width with consistent padding */
          background: rgba(18, 18, 24, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 14px;
          padding: 8px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.3),
            0 0 0 1px rgba(0, 0, 0, 0.2),
            inset 0 1px 0 rgba(255, 255, 255, 0.04);
          pointer-events: auto;
        }

        /* Light theme */
        .global-nav.theme-light .global-nav-inner {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(0, 0, 0, 0.08);
          box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.08),
            0 0 0 1px rgba(0, 0, 0, 0.05),
            inset 0 1px 0 rgba(255, 255, 255, 0.8);
        }

        .global-nav.theme-light .nav-logo {
          background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: none;
        }

        .global-nav.theme-light .nav-app-link:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .global-nav.theme-light .nav-app-link.active {
          background: rgba(99, 102, 241, 0.1);
        }

        .global-nav.theme-light .nav-app-link.active::after {
          background: #6366f1;
          box-shadow: 0 0 6px 1px rgba(99, 102, 241, 0.6);
        }

        .global-nav.theme-light .nav-menu-link {
          color: #6b7280;
        }

        .global-nav.theme-light .nav-menu-link:hover {
          color: #111827;
          background: rgba(0, 0, 0, 0.05);
        }

        .global-nav.theme-light .nav-menu-link.active {
          color: #6366f1;
          background: rgba(99, 102, 241, 0.1);
        }

        .global-nav.theme-light .nav-login-btn {
          background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
          color: white;
        }

        .global-nav.theme-light .nav-avatar {
          border: 2px solid rgba(99, 102, 241, 0.5);
        }

        .global-nav.theme-light .nav-avatar:hover {
          border-color: #6366f1;
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
        }

        .global-nav.theme-light .nav-avatar-placeholder {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          color: white;
        }

        .global-nav.theme-light .nav-avatar-placeholder:hover {
          box-shadow: 0 0 12px rgba(99, 102, 241, 0.4);
        }

        .global-nav.theme-light .nav-level-badge {
          background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
          color: white;
          box-shadow: 0 2px 0 #3730a3;
        }

        .global-nav.theme-light .nav-xp-bar {
          background: rgba(0, 0, 0, 0.1);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }

        .global-nav.theme-light .nav-xp-fill {
          background: linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%);
          box-shadow: 0 0 6px rgba(99, 102, 241, 0.4);
        }

        .global-nav.theme-light .nav-dropdown {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }

        .global-nav.theme-light .nav-dropdown-email {
          color: #6b7280;
          border-bottom: 1px solid rgba(0, 0, 0, 0.08);
        }

        .global-nav.theme-light .nav-dropdown-item {
          color: #374151;
        }

        .global-nav.theme-light .nav-dropdown-item:hover {
          background: rgba(0, 0, 0, 0.05);
          color: #111827;
        }

        .global-nav.theme-light .nav-dropdown-item.danger {
          color: #dc2626;
        }

        .global-nav.theme-light .nav-dropdown-item.danger:hover {
          background: rgba(220, 38, 38, 0.1);
        }

        .global-nav.theme-light .nav-login-dropdown {
          background: rgba(255, 255, 255, 0.98);
          border: 1px solid rgba(0, 0, 0, 0.1);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15);
        }

        .global-nav.theme-light .nav-login-title {
          color: #6b7280;
        }

        .global-nav.theme-light .nav-divider {
          color: #9ca3af;
        }

        .global-nav.theme-light .nav-divider::before,
        .global-nav.theme-light .nav-divider::after {
          background: rgba(0, 0, 0, 0.1);
        }

        .global-nav.theme-light .nav-input {
          background: rgba(0, 0, 0, 0.03);
          border: 1px solid rgba(0, 0, 0, 0.1);
          color: #111827;
        }

        .global-nav.theme-light .nav-input:focus {
          border-color: rgba(99, 102, 241, 0.5);
        }

        .global-nav.theme-light .nav-input::placeholder {
          color: #9ca3af;
        }

        .global-nav.theme-light .nav-submit-btn {
          background: linear-gradient(180deg, #6366f1 0%, #4f46e5 100%);
          color: white;
        }

        .global-nav.theme-light .nav-loading {
          background: #6366f1;
        }

        /* ===== TERMINAL THEME ===== */
        .global-nav.theme-terminal .global-nav-inner {
          background: rgba(0, 10, 0, 0.95);
          border: 1px solid #003300;
          box-shadow: 0 0 20px rgba(0, 255, 0, 0.1);
        }

        .global-nav.theme-terminal .nav-logo {
          background: linear-gradient(180deg, #00ff00 0%, #00cc00 100%);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        }

        .global-nav.theme-terminal .nav-app-link:hover {
          background: rgba(0, 255, 0, 0.1);
        }

        .global-nav.theme-terminal .nav-app-link.active {
          background: rgba(0, 255, 0, 0.15);
        }

        .global-nav.theme-terminal .nav-app-link.active::after {
          background: #00ff00;
          box-shadow: 0 0 6px 1px rgba(0, 255, 0, 0.6);
        }

        .global-nav.theme-terminal .nav-login-btn {
          background: linear-gradient(180deg, #00ff00 0%, #00aa00 100%);
          color: #000;
        }

        .global-nav.theme-terminal .nav-avatar {
          border: 2px solid rgba(0, 255, 0, 0.5);
        }

        .global-nav.theme-terminal .nav-avatar:hover {
          border-color: #00ff00;
          box-shadow: 0 0 12px rgba(0, 255, 0, 0.4);
        }

        .global-nav.theme-terminal .nav-avatar-placeholder {
          background: linear-gradient(135deg, #00ff00 0%, #00aa00 100%);
          color: #000;
        }

        .global-nav.theme-terminal .nav-level-badge {
          background: linear-gradient(180deg, #00ff00 0%, #00aa00 100%);
          color: #000;
          box-shadow: 0 2px 0 #005500;
        }

        .global-nav.theme-terminal .nav-xp-fill {
          background: linear-gradient(90deg, #00ff00 0%, #00cc00 100%);
          box-shadow: 0 0 6px rgba(0, 255, 0, 0.4);
        }

        .global-nav.theme-terminal .nav-dropdown {
          background: rgba(0, 10, 0, 0.98);
          border: 1px solid #003300;
        }

        .global-nav.theme-terminal .nav-dropdown-email {
          color: #00aa00;
          border-bottom-color: #003300;
        }

        .global-nav.theme-terminal .nav-dropdown-item {
          color: #00cc00;
        }

        .global-nav.theme-terminal .nav-dropdown-item:hover {
          background: rgba(0, 255, 0, 0.1);
          color: #00ff00;
        }

        .global-nav.theme-terminal .nav-dropdown-item.danger {
          color: #ff0000;
        }

        .global-nav.theme-terminal .nav-apps-dropdown {
          background: rgba(0, 10, 0, 0.98);
          border: 1px solid #003300;
        }

        .global-nav.theme-terminal .nav-apps-dropdown-item {
          color: #00cc00;
        }

        .global-nav.theme-terminal .nav-apps-dropdown-item:hover {
          background: rgba(0, 255, 0, 0.1);
          color: #00ff00;
        }

        .global-nav.theme-terminal .nav-apps-dropdown-item.active {
          background: rgba(0, 255, 0, 0.15);
          color: #00ff00;
        }

        .global-nav.theme-terminal .nav-loading {
          background: #00ff00;
        }

        /* ===== MARIO / NES THEME ===== */
        .global-nav.theme-mario .global-nav-inner {
          background: rgba(92, 148, 252, 0.95);
          border: 3px solid #000000;
          box-shadow: 4px 4px 0 #000000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-logo {
          background: linear-gradient(180deg, #FBD000 0%, #E6A000 100%);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 2px 2px 0 #000;
        }

        .global-nav.theme-mario .nav-app-link:hover {
          background: rgba(229, 37, 33, 0.3);
        }

        .global-nav.theme-mario .nav-app-link.active {
          background: rgba(229, 37, 33, 0.5);
        }

        .global-nav.theme-mario .nav-app-link.active::after {
          background: #FBD000;
          box-shadow: 0 0 6px 1px rgba(251, 208, 0, 0.8);
        }

        .global-nav.theme-mario .nav-login-btn {
          background: linear-gradient(180deg, #E52521 0%, #CC1E1A 100%);
          color: #fff;
          border: 2px solid #000;
          box-shadow: 2px 2px 0 #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-login-btn:hover {
          transform: translateY(-2px);
          box-shadow: 4px 4px 0 #000;
        }

        .global-nav.theme-mario .nav-avatar {
          border: 3px solid #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-avatar:hover {
          border-color: #FBD000;
          box-shadow: 2px 2px 0 #000;
        }

        .global-nav.theme-mario .nav-avatar-placeholder {
          background: linear-gradient(135deg, #E52521 0%, #CC1E1A 100%);
          color: #fff;
          border: 2px solid #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-level-badge {
          background: linear-gradient(180deg, #FBD000 0%, #E6A000 100%);
          color: #000;
          border: 2px solid #000;
          box-shadow: 2px 2px 0 #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-xp-bar {
          background: #1a1a1a;
          border: 2px solid #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-xp-fill {
          background: linear-gradient(90deg, #43B047 0%, #5CC965 100%);
          box-shadow: none;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-dropdown {
          background: #049CD8;
          border: 3px solid #000;
          box-shadow: 4px 4px 0 #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-dropdown-email {
          color: #FBD000;
          border-bottom: 2px solid #000;
        }

        .global-nav.theme-mario .nav-dropdown-item {
          color: #fff;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-dropdown-item:hover {
          background: rgba(229, 37, 33, 0.5);
          color: #FBD000;
        }

        .global-nav.theme-mario .nav-dropdown-item.danger {
          color: #FBD000;
        }

        .global-nav.theme-mario .nav-dropdown-item.danger:hover {
          background: #E52521;
        }

        .global-nav.theme-mario .nav-apps-dropdown {
          background: #049CD8;
          border: 3px solid #000;
          box-shadow: 4px 4px 0 #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-apps-dropdown-item {
          color: #fff;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-apps-dropdown-item:hover {
          background: rgba(229, 37, 33, 0.5);
          color: #FBD000;
        }

        .global-nav.theme-mario .nav-apps-dropdown-item.active {
          background: #E52521;
          color: #FBD000;
        }

        .global-nav.theme-mario .nav-quick-action {
          background: #E52521;
          border: 2px solid #000;
          color: #fff;
          border-radius: 0;
          box-shadow: 2px 2px 0 #000;
        }

        .global-nav.theme-mario .nav-quick-action:hover {
          background: #FF3B36;
          border-color: #000;
          color: #FBD000;
          transform: translateY(-2px);
          box-shadow: 4px 4px 0 #000;
        }

        .global-nav.theme-mario .theme-switcher {
          border-bottom: 2px solid #000;
        }

        .global-nav.theme-mario .theme-toggle {
          background: #1a1a1a;
          border: 2px solid #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .toggle-thumb {
          background: linear-gradient(135deg, #FBD000 0%, #E6A000 100%);
          border-radius: 0;
        }

        .global-nav.theme-mario .theme-option {
          background: #1a1a1a;
          border: 2px solid transparent;
          border-radius: 0;
        }

        .global-nav.theme-mario .theme-option:hover {
          background: #E52521;
        }

        .global-nav.theme-mario .theme-option.active {
          background: #43B047;
          border-color: #000;
        }

        .global-nav.theme-mario .nav-loading {
          background: #FBD000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-separator {
          color: #FBD000;
        }

        .global-nav.theme-mario .nav-active-app {
          text-shadow: 2px 2px 0 #000;
        }

        .global-nav.theme-mario .nav-login-dropdown {
          background: #049CD8;
          border: 3px solid #000;
          box-shadow: 4px 4px 0 #000;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-login-title {
          color: #FBD000;
        }

        .global-nav.theme-mario .nav-input {
          background: #1a1a1a;
          border: 2px solid #000;
          color: #fff;
          border-radius: 0;
        }

        .global-nav.theme-mario .nav-input:focus {
          border-color: #FBD000;
        }

        .global-nav.theme-mario .nav-submit-btn {
          background: linear-gradient(180deg, #43B047 0%, #2E8A32 100%);
          border: 2px solid #000;
          color: #fff;
          border-radius: 0;
          box-shadow: 2px 2px 0 #000;
        }

        .global-nav.theme-mario .nav-submit-btn:hover {
          transform: translateY(-1px);
          box-shadow: 3px 3px 0 #000;
        }

        /* Pixel art G logo - theme aware gradient */
        .nav-logo-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.3));
        }

        .nav-logo-icon:hover {
          transform: scale(1.1);
          filter: drop-shadow(0 0 12px rgba(255, 215, 0, 0.5));
        }

        /* Default dark theme - gold/orange gradient */
        .logo-g-top { fill: #FFD700; }
        .logo-g-mid { fill: #FFA500; }
        .logo-g-bottom { fill: #5fbf8a; }

        /* Light theme - indigo gradient */
        .global-nav.theme-light .logo-g-top { fill: #6366f1; }
        .global-nav.theme-light .logo-g-mid { fill: #8b5cf6; }
        .global-nav.theme-light .logo-g-bottom { fill: #a855f7; }
        .global-nav.theme-light .nav-logo-icon {
          filter: drop-shadow(0 0 8px rgba(99, 102, 241, 0.3));
        }
        .global-nav.theme-light .nav-logo-icon:hover {
          filter: drop-shadow(0 0 12px rgba(99, 102, 241, 0.5));
        }

        /* Terminal theme - green monochrome */
        .global-nav.theme-terminal .logo-g-top { fill: #00ff00; }
        .global-nav.theme-terminal .logo-g-mid { fill: #00cc00; }
        .global-nav.theme-terminal .logo-g-bottom { fill: #009900; }
        .global-nav.theme-terminal .nav-logo-icon {
          filter: drop-shadow(0 0 8px rgba(0, 255, 0, 0.4));
        }
        .global-nav.theme-terminal .nav-logo-icon:hover {
          filter: drop-shadow(0 0 12px rgba(0, 255, 0, 0.6));
        }

        /* Mario theme - NES colors */
        .global-nav.theme-mario .logo-g-top { fill: #FBD000; }
        .global-nav.theme-mario .logo-g-mid { fill: #E52521; }
        .global-nav.theme-mario .logo-g-bottom { fill: #43B047; }
        .global-nav.theme-mario .nav-logo-icon {
          filter: drop-shadow(2px 2px 0 #000);
        }
        .global-nav.theme-mario .nav-logo-icon:hover {
          filter: drop-shadow(3px 3px 0 #000);
        }

        /* ===== APP-SPECIFIC LOGO COLORS ===== */
        /* These override theme colors when in a specific app */

        /* Fitness (Iron Quest) - Red gradient */
        .logo-app-fitness .logo-g-top { fill: #FF6B6B !important; }
        .logo-app-fitness .logo-g-mid { fill: #CC5555 !important; }
        .logo-app-fitness .logo-g-bottom { fill: #993333 !important; }
        .nav-logo-icon.logo-app-fitness {
          filter: drop-shadow(0 0 8px rgba(255, 107, 107, 0.4)) !important;
        }
        .nav-logo-icon.logo-app-fitness:hover {
          filter: drop-shadow(0 0 12px rgba(255, 107, 107, 0.6)) !important;
        }

        /* Today (Day Quest) - Cyan gradient */
        .logo-app-today .logo-g-top { fill: #5CC9F5 !important; }
        .logo-app-today .logo-g-mid { fill: #4AB8E4 !important; }
        .logo-app-today .logo-g-bottom { fill: #2D8AB5 !important; }
        .nav-logo-icon.logo-app-today {
          filter: drop-shadow(0 0 8px rgba(92, 201, 245, 0.4)) !important;
        }
        .nav-logo-icon.logo-app-today:hover {
          filter: drop-shadow(0 0 12px rgba(92, 201, 245, 0.6)) !important;
        }

        /* Travel (Explorer) - Teal gradient */
        .logo-app-travel .logo-g-top { fill: #5fbf8a !important; }
        .logo-app-travel .logo-g-mid { fill: #4a9d70 !important; }
        .logo-app-travel .logo-g-bottom { fill: #3d8260 !important; }
        .nav-logo-icon.logo-app-travel {
          filter: drop-shadow(0 0 8px rgba(95, 191, 138, 0.4)) !important;
        }
        .nav-logo-icon.logo-app-travel:hover {
          filter: drop-shadow(0 0 12px rgba(95, 191, 138, 0.6)) !important;
        }

        .nav-logo-btn {
          background: none;
          border: none;
          padding: 4px;
          cursor: pointer;
          border-radius: 8px;
          transition: background 0.2s ease;
        }

        .nav-logo-btn:hover {
          background: rgba(255, 255, 255, 0.05);
        }

        .global-nav.theme-light .nav-logo-btn:hover {
          background: rgba(0, 0, 0, 0.05);
        }

        .nav-brand-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-separator {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: var(--theme-text-muted, #666);
          opacity: 0.5;
        }

        .nav-active-app {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          letter-spacing: -0.5px;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .nav-active-app.fitness {
          color: var(--app-fitness, #FF6B6B);
        }

        .nav-active-app.today {
          color: var(--app-today, #5CC9F5);
        }

        .nav-active-app.travel {
          color: var(--app-travel, #5fbf8a);
        }

        .nav-active-app.home {
          color: var(--theme-gold, #FFD700);
        }

        .nav-active-app:hover {
          filter: brightness(1.3);
        }

        .nav-active-app-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          transition: all 0.2s ease;
        }

        .nav-active-app-icon:hover {
          filter: brightness(1.3);
          transform: scale(1.1);
        }

        .nav-active-app-icon svg {
          opacity: 1 !important;
        }

        .nav-apps-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          background: rgba(24, 24, 32, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px;
          min-width: 180px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: var(--z-dropdown, 200);
        }

        .nav-apps-dropdown-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #ccc;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .nav-apps-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .nav-apps-dropdown-item.active {
          background: rgba(255, 215, 0, 0.1);
          color: #FFD700;
        }

        .nav-apps-dropdown-item.disabled {
          opacity: 0.4;
          cursor: default;
          pointer-events: none;
        }

        .nav-apps-dropdown-icon {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
        }

        .nav-left {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .nav-apps {
          display: flex;
          align-items: center;
          gap: 2px;
        }

        .nav-app-link {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          transition: all 0.2s ease;
          text-decoration: none;
        }

        .nav-app-link:hover {
          background: rgba(255, 255, 255, 0.08);
        }

        .nav-app-link:hover svg {
          opacity: 1 !important;
          transform: scale(1.1);
        }

        .nav-app-link svg {
          width: 26px;
          height: 26px;
          transition: all 0.2s ease;
        }

        .nav-app-link.active {
          background: rgba(255, 215, 0, 0.1);
        }

        .nav-app-link.active::after {
          content: '';
          position: absolute;
          bottom: 4px;
          left: 50%;
          transform: translateX(-50%);
          width: 3px;
          height: 3px;
          background: #FFD700;
          border-radius: 50%;
          box-shadow: 0 0 6px 1px rgba(255, 215, 0, 0.6);
        }

        .nav-app-link.disabled {
          cursor: default;
          pointer-events: none;
        }

        .nav-center {
          display: flex;
          align-items: center;
          gap: 4px;
          flex: 1;
          justify-content: center;
        }

        .nav-quick-actions {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
        }

        .nav-quick-action {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px 16px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 10px;
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: #ccc;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
          min-height: 44px;
        }

        .nav-quick-action:hover {
          background: rgba(255, 215, 0, 0.15);
          border-color: rgba(255, 215, 0, 0.3);
          color: #FFD700;
          transform: translateY(-1px);
        }

        .nav-quick-action-icon {
          font-size: 14px;
          line-height: 1;
        }

        /* Light theme quick actions */
        .global-nav.theme-light .nav-quick-action {
          background: rgba(0, 0, 0, 0.05);
          border-color: rgba(0, 0, 0, 0.1);
          color: #6b7280;
        }

        .global-nav.theme-light .nav-quick-action:hover {
          background: rgba(99, 102, 241, 0.1);
          border-color: rgba(99, 102, 241, 0.3);
          color: #6366f1;
        }

        /* Terminal theme quick actions */
        .global-nav.theme-terminal .nav-quick-action {
          background: rgba(0, 50, 0, 0.3);
          border-color: rgba(0, 255, 0, 0.2);
          color: #00aa00;
        }

        .global-nav.theme-terminal .nav-quick-action:hover {
          background: rgba(0, 255, 0, 0.15);
          border-color: rgba(0, 255, 0, 0.4);
          color: #00ff00;
        }

        .nav-menu-items {
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .nav-menu-link {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: #888;
          text-decoration: none;
          padding: 8px 12px;
          border-radius: 8px;
          transition: all 0.2s ease;
          display: flex;
          align-items: center;
          gap: 6px;
          white-space: nowrap;
        }

        .nav-menu-link:hover {
          color: #fff;
          background: rgba(255, 255, 255, 0.08);
        }

        .nav-menu-link.active {
          color: #FFD700;
          background: rgba(255, 215, 0, 0.1);
        }

        .nav-menu-icon {
          font-size: 0.9rem;
        }

        .nav-auth {
          display: flex;
          align-items: center;
        }

        .nav-login-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          padding: 8px 14px;
          background: linear-gradient(180deg, #FFD700 0%, #E6A000 100%);
          border: none;
          border-radius: 8px;
          color: #1a1a1a;
          cursor: pointer;
          transition: all 0.15s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .nav-login-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.3);
          filter: brightness(1.1);
        }

        .nav-login-btn:active {
          transform: translateY(0);
        }

        .nav-avatar {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid rgba(255, 215, 0, 0.5);
          cursor: pointer;
          transition: all 0.2s ease;
          object-fit: cover;
        }

        .nav-avatar:hover {
          border-color: #FFD700;
          box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
        }

        .nav-avatar-placeholder {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #FFD700 0%, #F0A500 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Press Start 2P', monospace;
          font-size: 10px;
          color: #1a1a1a;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .nav-avatar-placeholder:hover {
          box-shadow: 0 0 12px rgba(255, 215, 0, 0.4);
          transform: scale(1.05);
        }

        .nav-user-info {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .nav-level-xp {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 4px;
        }

        .nav-level-badge {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          background: linear-gradient(180deg, #FFD700 0%, #E6A000 100%);
          color: #1a1a1a;
          padding: 3px 8px;
          border-radius: 6px;
          box-shadow: 0 2px 0 #996600;
          white-space: nowrap;
        }

        .nav-xp-bar {
          width: 60px;
          height: 6px;
          background: rgba(0, 0, 0, 0.4);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .nav-xp-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
          border-radius: 2px;
          transition: width 0.3s ease;
          box-shadow: 0 0 6px rgba(255, 215, 0, 0.4);
        }

        /* Compact XP bar for when app content is active */
        .nav-xp-compact {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 4px 10px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .nav-level-compact {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #FFD700;
          white-space: nowrap;
        }

        .nav-xp-mini-bar {
          width: 32px;
          height: 4px;
          background: rgba(0, 0, 0, 0.4);
          border-radius: 2px;
          overflow: hidden;
        }

        .nav-xp-mini-fill {
          height: 100%;
          background: linear-gradient(90deg, #FFD700 0%, #FFA500 100%);
          border-radius: 2px;
          transition: width 0.3s ease;
        }

        /* App content wrapper */
        .nav-app-content {
          flex: 1;
          display: flex;
          justify-content: center;
          max-width: 100%;
        }

        .nav-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: rgba(24, 24, 32, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px;
          min-width: 160px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: var(--z-dropdown, 200);
        }

        .nav-dropdown-email {
          padding: 8px 12px;
          font-family: -apple-system, sans-serif;
          font-size: 11px;
          color: #888;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 4px;
          word-break: break-all;
        }

        .nav-dropdown-item {
          display: block;
          width: 100%;
          padding: 10px 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #ccc;
          background: none;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          text-decoration: none;
          transition: all 0.15s ease;
        }

        .nav-dropdown-item:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #fff;
        }

        .nav-dropdown-item.danger {
          color: #ff6b6b;
        }

        .nav-dropdown-item.danger:hover {
          background: rgba(255, 107, 107, 0.1);
        }

        /* Theme Switcher */
        .theme-switcher {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          border-bottom: 1px solid rgba(255, 255, 255, 0.08);
          margin-bottom: 4px;
        }

        /* Dark/Light Toggle */
        .theme-toggle {
          position: relative;
          width: 56px;
          height: 28px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.15);
          border-radius: 14px;
          cursor: pointer;
          padding: 0;
          transition: all 0.2s ease;
        }

        .theme-toggle:hover {
          border-color: rgba(255, 255, 255, 0.25);
        }

        .toggle-track {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          height: 100%;
          padding: 0 4px;
        }

        .toggle-icon {
          font-size: 12px;
          z-index: 1;
          transition: opacity 0.2s ease;
        }

        .toggle-icon.sun { opacity: 0.4; }
        .toggle-icon.moon { opacity: 0.4; }
        .theme-toggle.dark .toggle-icon.moon { opacity: 1; }
        .theme-toggle.light .toggle-icon.sun { opacity: 1; }

        .toggle-thumb {
          position: absolute;
          top: 3px;
          left: 3px;
          width: 20px;
          height: 20px;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          border-radius: 50%;
          transition: transform 0.2s ease, background 0.2s ease;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
        }

        .theme-toggle.light .toggle-thumb {
          transform: translateX(28px);
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        }

        .theme-option {
          flex: 1;
          padding: 6px;
          background: rgba(0, 0, 0, 0.2);
          border: 1px solid transparent;
          border-radius: 6px;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.15s ease;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .theme-option:hover {
          background: rgba(255, 255, 255, 0.1);
        }

        .theme-option.active {
          background: rgba(255, 215, 0, 0.15);
          border-color: #FFD700;
        }

        .theme-icon {
          font-size: 14px;
        }

        /* Light theme switcher */
        .global-nav.theme-light .theme-switcher {
          border-bottom-color: rgba(0, 0, 0, 0.08);
        }

        .global-nav.theme-light .theme-toggle {
          background: rgba(0, 0, 0, 0.08);
          border-color: rgba(0, 0, 0, 0.15);
        }

        .global-nav.theme-light .theme-option {
          background: rgba(0, 0, 0, 0.05);
        }

        .global-nav.theme-light .theme-option:hover {
          background: rgba(0, 0, 0, 0.1);
        }

        .global-nav.theme-light .theme-option.active {
          background: rgba(99, 102, 241, 0.1);
          border-color: #6366f1;
        }

        .nav-login-dropdown {
          position: absolute;
          top: calc(100% + 8px);
          right: 0;
          background: rgba(24, 24, 32, 0.95);
          backdrop-filter: blur(16px);
          -webkit-backdrop-filter: blur(16px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 16px;
          min-width: 220px;
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
          z-index: var(--z-dropdown, 200);
        }

        .nav-login-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #888;
          text-align: center;
          margin-bottom: 12px;
        }

        .nav-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 10px;
          background: #fff;
          border: none;
          border-radius: 8px;
          font-family: -apple-system, sans-serif;
          font-size: 13px;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          transition: all 0.15s ease;
        }

        .nav-google-btn:hover {
          background: #f5f5f5;
          transform: translateY(-1px);
        }

        .nav-divider {
          display: flex;
          align-items: center;
          margin: 14px 0;
          color: #555;
          font-size: 9px;
          font-family: 'Press Start 2P', monospace;
        }

        .nav-divider::before,
        .nav-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }

        .nav-divider span {
          padding: 0 10px;
        }

        .nav-input {
          width: 100%;
          padding: 10px 12px;
          background: rgba(0, 0, 0, 0.3);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          color: #fff;
          font-size: 13px;
          outline: none;
          transition: border-color 0.15s ease;
          margin-bottom: 8px;
        }

        .nav-input:focus {
          border-color: rgba(255, 215, 0, 0.5);
        }

        .nav-input::placeholder {
          color: #666;
        }

        .nav-submit-btn {
          width: 100%;
          padding: 10px;
          background: linear-gradient(180deg, #FFD700 0%, #E6A000 100%);
          border: none;
          border-radius: 8px;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #1a1a1a;
          cursor: pointer;
          transition: all 0.15s ease;
          margin-top: 4px;
        }

        .nav-submit-btn:hover {
          filter: brightness(1.1);
        }

        .nav-submit-btn:disabled {
          opacity: 0.6;
          cursor: wait;
        }

        .nav-loading {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #FFD700;
          animation: nav-pulse 1s ease infinite;
        }

        @keyframes nav-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.9); }
        }

        /* Sync indicator */
        .sync-indicator {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 28px;
          height: 28px;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .sync-indicator.syncing {
          color: #5CC9F5;
          animation: sync-spin 1s linear infinite;
        }

        .sync-indicator.error {
          color: #ff6b6b;
        }

        .sync-indicator.pending {
          color: #FFD700;
        }

        .sync-indicator.synced {
          color: #5fbf8a;
          opacity: 0.6;
        }

        @keyframes sync-spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        /* Workout status in navbar */
        .nav-workout-status {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .nav-workout-timer {
          display: flex;
          align-items: center;
          gap: 6px;
          font-family: 'Press Start 2P', monospace;
          font-size: 8px;
          color: #fff;
        }

        .nav-workout-dot {
          width: 6px;
          height: 6px;
          background: #34c759;
          border-radius: 50%;
          animation: nav-workout-pulse 2s infinite;
          box-shadow: 0 0 6px #34c759;
        }

        @keyframes nav-workout-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(0.85); }
        }

        .nav-workout-sets {
          font-family: 'Press Start 2P', monospace;
          font-size: 7px;
          color: #888;
        }

        .nav-workout-finish {
          padding: 4px 10px;
          background: #34c759;
          border: none;
          border-radius: 100px;
          color: white;
          font-family: 'Press Start 2P', monospace;
          font-size: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-workout-finish:hover {
          transform: scale(1.05);
          box-shadow: 0 0 12px rgba(52, 199, 89, 0.4);
        }

        /* Today app header in navbar */
        .nav-today-header {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 4px 12px;
          background: rgba(0, 0, 0, 0.2);
          border-radius: 100px;
          border: 1px solid rgba(255, 255, 255, 0.08);
        }

        .nav-today-view {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          color: #fff;
          line-height: 1;
        }

        .nav-today-subtitle {
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 9px;
          color: #666;
          line-height: 1;
        }

        /* Mobile responsive - same nav everywhere */
        @media (max-width: 768px) {
          .global-nav {
            padding: calc(8px + env(safe-area-inset-top, 0px)) 12px 8px;
          }

          .global-nav-inner {
            padding: 6px 12px;
            border-radius: 12px;
          }

          .nav-logo {
            font-size: 8px;
          }

          .nav-app-link {
            width: 40px;
            height: 40px;
            border-radius: 10px;
          }

          .nav-app-link svg {
            width: 22px;
            height: 22px;
          }

          .nav-login-btn {
            font-size: 6px;
            padding: 6px 10px;
          }

          .nav-avatar,
          .nav-avatar-placeholder {
            width: 36px;
            height: 36px;
          }

          .nav-avatar-placeholder {
            font-size: 10px;
          }

          .nav-dropdown,
          .nav-login-dropdown {
            right: -8px;
            min-width: 200px;
          }

          /* Mobile XP - compact version always */
          .nav-level-xp {
            display: flex;
            flex-direction: row;
            align-items: center;
            gap: 4px;
          }

          .nav-level-badge {
            font-size: 5px;
            padding: 2px 5px;
          }

          .nav-xp-bar {
            width: 28px;
            height: 4px;
          }

          /* Compact XP adjustments for mobile */
          .nav-xp-compact {
            padding: 2px 6px;
            gap: 4px;
          }

          .nav-level-compact {
            font-size: 5px;
          }

          .nav-xp-mini-bar {
            width: 20px;
            height: 3px;
          }

          /* App content on mobile */
          .nav-app-content {
            flex: 1;
            max-width: 55%;
          }

          .nav-menu-link {
            font-size: 0.35rem;
            padding: 6px 8px;
          }

          .nav-menu-icon {
            font-size: 0.8rem;
          }

          .nav-center {
            flex: 1;
            gap: 6px;
          }

          /* Hide menu items on mobile but keep workout/today headers */
          .nav-menu-items {
            display: none;
          }

          /* Quick actions on mobile - larger touch targets */
          .nav-quick-actions {
            gap: 8px;
          }

          .nav-quick-action {
            padding: 8px 12px;
            font-size: 7px;
            gap: 6px;
            min-height: 40px;
          }

          .nav-quick-action-icon {
            font-size: 12px;
          }

          /* Hide labels on very small screens, show only icons */
          @media (max-width: 480px) {
            .nav-quick-action-label {
              display: none;
            }
            .nav-quick-action {
              padding: 10px;
              min-width: 40px;
              min-height: 40px;
            }
            .nav-quick-action-icon {
              font-size: 14px;
            }
          }

          .nav-left {
            gap: 4px;
          }

          .nav-logo {
            font-size: 7px;
          }

          /* Mobile today header */
          .nav-today-header {
            padding: 3px 8px;
            gap: 6px;
          }

          .nav-today-view {
            font-size: 7px;
          }

          .nav-today-subtitle {
            display: none;
          }

          .nav-today-btn {
            font-size: 5px;
            padding: 3px 6px;
          }

          .nav-today-stats {
            font-size: 9px;
            padding: 2px 5px;
          }

          /* Mobile workout header */
          .nav-workout-status {
            padding: 3px 8px;
            gap: 6px;
          }

          .nav-workout-timer {
            font-size: 6px;
          }

          .nav-workout-sets {
            font-size: 5px;
          }

          .nav-workout-finish {
            font-size: 5px;
            padding: 3px 6px;
          }
        }
      `}</style>

      <nav className={`global-nav ${theme === 'light' ? 'theme-light' : theme === 'terminal' ? 'theme-terminal' : theme === 'mario' ? 'theme-mario' : ''}`}>
        <div className="global-nav-inner">
          {/* Left section: Logo with apps dropdown */}
          <div className="nav-left">
            <div className="nav-brand-group">
              <div style={{ position: 'relative' }} className="nav-dropdown-zone">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowAppsMenu(!showAppsMenu); }}
                  className="nav-logo-btn"
                  aria-label="Open apps menu"
                >
                  <AppLogoIcon className={`nav-logo-icon ${
                    isFitness ? 'logo-app-fitness' :
                    isToday ? 'logo-app-today' :
                    isTravel ? 'logo-app-travel' : ''
                  }`} />
                </button>
              {showAppsMenu && (
                <div className="nav-apps-dropdown">
                  <Link href="/account" className="nav-apps-dropdown-item" onClick={() => setShowAppsMenu(false)}>
                    <span className="nav-apps-dropdown-icon">🏠</span>
                    HOME
                  </Link>
                  <Link href="/fitness" className={`nav-apps-dropdown-item ${isFitness ? 'active' : ''}`} onClick={() => setShowAppsMenu(false)}>
                    <span className="nav-apps-dropdown-icon"><DumbbellIcon active={isFitness} /></span>
                    IRON QUEST
                  </Link>
                  <Link href="/today" className={`nav-apps-dropdown-item ${isToday ? 'active' : ''}`} onClick={() => setShowAppsMenu(false)}>
                    <span className="nav-apps-dropdown-icon"><ChecklistIcon active={isToday} /></span>
                    DAY QUEST
                  </Link>
                  <Link href="/travel" className={`nav-apps-dropdown-item ${isTravel ? 'active' : ''}`} onClick={() => setShowAppsMenu(false)}>
                    <span className="nav-apps-dropdown-icon"><PlaneIcon active={isTravel} /></span>
                    EXPLORER
                  </Link>
                  <div className="nav-apps-dropdown-item disabled">
                    <span className="nav-apps-dropdown-icon"><LifeIcon /></span>
                    LIFE (SOON)
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>

          {/* Center section: app content only */}
          <div className="nav-center">
            {/* Quick action buttons - from props or default travel actions */}
            {(quickActions && quickActions.length > 0) && (
              <div className="nav-quick-actions">
                {quickActions.map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="nav-quick-action"
                  >
                    {action.icon && <span className="nav-quick-action-icon">{action.icon}</span>}
                    <span className="nav-quick-action-label">{action.label}</span>
                  </Link>
                ))}
              </div>
            )}

            {/* Travel app quick actions */}
            {isTravel && !quickActions && (
              <div className="nav-quick-actions">
                <Link href="/travel/quests" className="nav-quick-action">
                  <span className="nav-quick-action-icon">📋</span>
                  <span className="nav-quick-action-label">QUESTS</span>
                </Link>
                <Link href="/travel/locations/new" className="nav-quick-action">
                  <span className="nav-quick-action-icon">+</span>
                  <span className="nav-quick-action-label">ADD</span>
                </Link>
                <Link href="/travel/hotlist" className="nav-quick-action">
                  <span className="nav-quick-action-icon">❤️</span>
                  <span className="nav-quick-action-label">HOTLIST</span>
                </Link>
              </div>
            )}


            {/* App-specific content from context */}
            {contextContent && (
              <div className="nav-app-content">
                {contextContent}
              </div>
            )}

            {/* Legacy menu items support */}
            {appMenuItems && (
              <div className="nav-menu-items">
                {appMenuItems.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`nav-menu-link ${pathname === item.href ? 'active' : ''}`}
                  >
                    {item.icon && <span className="nav-menu-icon">{item.icon}</span>}
                    {item.label}
                  </Link>
                ))}
              </div>
            )}
            {children}
          </div>

          <div className="nav-auth">
            {authStatus === 'loading' && <div className="nav-loading" />}

            {authStatus === 'authenticated' && user && (
              <div className="nav-user-info">
                {isToday && <SyncIndicator />}
                <NotificationBell />
                <div style={{ position: 'relative' }} className="nav-dropdown-zone">
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                    style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer' }}
                  >
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="" className="nav-avatar" />
                    ) : (
                      <div className="nav-avatar-placeholder">
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  {showUserMenu && (
                    <div className="nav-dropdown">
                      <div className="nav-dropdown-email">{user.email}</div>
                      {userProfile && (
                        <div style={{ padding: '12px', borderBottom: '1px solid var(--theme-border)', marginBottom: '4px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                            <div className="nav-level-badge">LVL {userProfile.level}</div>
                            <div style={{ fontSize: '9px', color: 'var(--theme-gold)', fontFamily: "'Press Start 2P', monospace" }}>
                              {userProfile.xp.toLocaleString()} XP
                            </div>
                          </div>
                          <div className="nav-xp-bar" style={{ width: '100%' }}>
                            <div
                              className="nav-xp-fill"
                              style={{ width: `${Math.min(100, (userProfile.xpInCurrentLevel / userProfile.xpToNextLevel) * 100)}%` }}
                            />
                          </div>
                          <div style={{ fontSize: '7px', color: 'var(--theme-text-muted)', fontFamily: "'Press Start 2P', monospace", marginTop: '6px', textAlign: 'center' }}>
                            {userProfile.xpInCurrentLevel} / {userProfile.xpToNextLevel} to next
                          </div>
                        </div>
                      )}
                      <ThemeSwitcher />
                      <button
                        onClick={() => { openDailyRewards(); setShowUserMenu(false); }}
                        className="nav-dropdown-item"
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}
                      >
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>📅</span> DAILY REWARDS
                        </span>
                        {rewardState && !rewardState.claimedToday && (
                          <span style={{
                            width: '8px',
                            height: '8px',
                            background: '#FF6B6B',
                            borderRadius: '50%',
                            boxShadow: '0 0 6px rgba(255, 107, 107, 0.6)',
                            animation: 'nav-pulse 1.5s ease infinite',
                          }} />
                        )}
                      </button>
                      <Link href="/account" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>PROFILE</Link>
                      <Link href="/inventory" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>🎒</span> INVENTORY
                        </span>
                      </Link>
                      <Link href="/friends" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>FRIENDS</Link>
                      <Link href="/settings" className="nav-dropdown-item" onClick={() => setShowUserMenu(false)}>SETTINGS</Link>
                      <button onClick={handleSignOut} className="nav-dropdown-item danger">SIGN OUT</button>
                    </div>
                  )}
                </div>
              </div>
            )}

            {authStatus === 'unauthenticated' && (
              <div style={{ position: 'relative' }} className="nav-dropdown-zone">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowLoginDropdown(!showLoginDropdown); setMagicLinkSent(false); setLoginError(''); }}
                  className="nav-login-btn"
                >
                  PLAY
                </button>
                {showLoginDropdown && (
                  <div className="nav-login-dropdown">
                    <ThemeSwitcher />
                    {magicLinkSent ? (
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>✉️</div>
                        <p style={{ fontSize: '8px', color: '#5fbf8a', marginBottom: '0.5rem', fontFamily: "'Press Start 2P', monospace" }}>CHECK YOUR EMAIL!</p>
                        <p style={{ fontSize: '10px', color: '#888', lineHeight: '1.6' }}>Click the magic link we sent to {email}</p>
                        <button onClick={() => { setMagicLinkSent(false); setEmail(''); }} style={{ marginTop: '1rem', padding: '8px 12px', background: 'none', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px', color: '#888', fontFamily: "'Press Start 2P', monospace", fontSize: '6px', cursor: 'pointer' }}>USE DIFFERENT EMAIL</button>
                      </div>
                    ) : (
                      <>
                        {/* Login mode toggle */}
                        <div style={{ display: 'flex', marginBottom: '12px', background: 'rgba(0,0,0,0.2)', borderRadius: '6px', padding: '3px' }}>
                          <button
                            type="button"
                            onClick={() => { setLoginMode('magic'); setLoginError(''); }}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              background: loginMode === 'magic' ? 'rgba(255,215,0,0.2)' : 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              color: loginMode === 'magic' ? '#FFD700' : '#666',
                              fontFamily: "'Press Start 2P', monospace",
                              fontSize: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            MAGIC LINK
                          </button>
                          <button
                            type="button"
                            onClick={() => { setLoginMode('password'); setLoginError(''); }}
                            style={{
                              flex: 1,
                              padding: '6px 8px',
                              background: loginMode === 'password' ? 'rgba(255,215,0,0.2)' : 'transparent',
                              border: 'none',
                              borderRadius: '4px',
                              color: loginMode === 'password' ? '#FFD700' : '#666',
                              fontFamily: "'Press Start 2P', monospace",
                              fontSize: '6px',
                              cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                          >
                            PASSWORD
                          </button>
                        </div>

                        {loginError && (
                          <div style={{ padding: '8px 10px', background: 'rgba(255,107,107,0.15)', border: '1px solid rgba(255,107,107,0.3)', borderRadius: '6px', marginBottom: '10px', fontSize: '10px', color: '#ff6b6b' }}>
                            {loginError}
                          </div>
                        )}

                        {loginMode === 'magic' ? (
                          <>
                            <p className="nav-login-title">ENTER YOUR EMAIL</p>
                            <form onSubmit={handleMagicLink}>
                              <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="nav-input"
                              />
                              <button type="submit" disabled={loginLoading} className="nav-submit-btn">
                                {loginLoading ? 'SENDING...' : 'SEND MAGIC LINK'}
                              </button>
                            </form>
                            <p style={{ fontSize: '7px', color: '#555', marginTop: '12px', textAlign: 'center', fontFamily: "'Press Start 2P', monospace" }}>No password needed!</p>
                          </>
                        ) : (
                          <>
                            <p className="nav-login-title">SIGN IN</p>
                            <form onSubmit={handlePasswordLogin}>
                              <input
                                type="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="nav-input"
                              />
                              <input
                                type="password"
                                placeholder="Password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                className="nav-input"
                              />
                              <button type="submit" disabled={loginLoading} className="nav-submit-btn">
                                {loginLoading ? 'SIGNING IN...' : 'SIGN IN'}
                              </button>
                            </form>
                            <p style={{ fontSize: '7px', color: '#555', marginTop: '12px', textAlign: 'center', fontFamily: "'Press Start 2P', monospace" }}>
                              No password? Use Magic Link
                            </p>
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {authStatus === 'error' && (
              <button className="nav-login-btn" onClick={() => window.location.reload()}>
                RETRY
              </button>
            )}
          </div>
        </div>
      </nav>
    </>
  );
}
