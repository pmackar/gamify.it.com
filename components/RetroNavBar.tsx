'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

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

export function RetroNavBar() {
  const pathname = usePathname();
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<'loading' | 'authenticated' | 'unauthenticated' | 'error'>('loading');
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

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

  const handleGoogleSignIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoginLoading(false);
    if (error) {
      alert(`Login error: ${error.message}`);
    } else {
      setShowLoginDropdown(false);
    }
  };

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.nav-dropdown-zone')) {
        setShowUserMenu(false);
        setShowLoginDropdown(false);
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
          z-index: 9999;
          padding: 10px 16px;
          pointer-events: none;
        }

        .global-nav-inner {
          max-width: 1000px;
          margin: 0 auto;
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

        .nav-logo {
          font-family: 'Press Start 2P', monospace;
          font-size: 9px;
          letter-spacing: -0.5px;
          background: linear-gradient(180deg, #FFD700 0%, #F0A500 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          text-decoration: none;
          transition: all 0.2s ease;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.3);
        }

        .nav-logo:hover {
          filter: brightness(1.2);
          text-shadow: 0 0 30px rgba(255, 215, 0, 0.5);
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
          width: 36px;
          height: 36px;
          border-radius: 10px;
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
          width: 32px;
          height: 32px;
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
          width: 32px;
          height: 32px;
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
          z-index: 10000;
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
          z-index: 10000;
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

        /* Mobile responsive - same nav everywhere */
        @media (max-width: 768px) {
          .global-nav {
            padding: 8px 12px;
          }

          .global-nav-inner {
            padding: 6px 12px;
            border-radius: 12px;
          }

          .nav-logo {
            font-size: 8px;
          }

          .nav-app-link {
            width: 32px;
            height: 32px;
            border-radius: 8px;
          }

          .nav-app-link svg {
            width: 18px;
            height: 18px;
          }

          .nav-login-btn {
            font-size: 6px;
            padding: 6px 10px;
          }

          .nav-avatar,
          .nav-avatar-placeholder {
            width: 28px;
            height: 28px;
          }

          .nav-avatar-placeholder {
            font-size: 9px;
          }

          .nav-dropdown,
          .nav-login-dropdown {
            right: -8px;
            min-width: 200px;
          }
        }
      `}</style>

      <nav className="global-nav">
        <div className="global-nav-inner">
          <Link href="/" className="nav-logo">GAMIFY.IT</Link>

          <div className="nav-apps">
            <Link href="/fitness" className={`nav-app-link ${isFitness ? 'active' : ''}`} title="Iron Quest">
              <DumbbellIcon active={isFitness} />
            </Link>
            <Link href="/today" className={`nav-app-link ${isToday ? 'active' : ''}`} title="Day Quest">
              <ChecklistIcon active={isToday} />
            </Link>
            <Link href="/travel" className={`nav-app-link ${isTravel ? 'active' : ''}`} title="Explorer">
              <PlaneIcon active={isTravel} />
            </Link>
            <div className="nav-app-link disabled" title="Coming Soon">
              <LifeIcon />
            </div>
          </div>

          <div className="nav-auth">
            {authStatus === 'loading' && <div className="nav-loading" />}

            {authStatus === 'authenticated' && user && (
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
                    <Link href="/account" className="nav-dropdown-item">PROFILE</Link>
                    <button onClick={handleSignOut} className="nav-dropdown-item danger">SIGN OUT</button>
                  </div>
                )}
              </div>
            )}

            {authStatus === 'unauthenticated' && (
              <div style={{ position: 'relative' }} className="nav-dropdown-zone">
                <button
                  onClick={(e) => { e.stopPropagation(); setShowLoginDropdown(!showLoginDropdown); }}
                  className="nav-login-btn"
                >
                  PLAY
                </button>
                {showLoginDropdown && (
                  <div className="nav-login-dropdown">
                    <p className="nav-login-title">CONTINUE WITH</p>
                    <button onClick={handleGoogleSignIn} className="nav-google-btn">
                      <svg width="16" height="16" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                      Google
                    </button>
                    <div className="nav-divider"><span>OR</span></div>
                    <form onSubmit={handleEmailLogin}>
                      <input
                        type="email"
                        placeholder="Email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="nav-input"
                      />
                      <input
                        type="password"
                        placeholder="Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="nav-input"
                      />
                      <button type="submit" disabled={loginLoading} className="nav-submit-btn">
                        {loginLoading ? 'LOADING...' : 'LOGIN'}
                      </button>
                    </form>
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
