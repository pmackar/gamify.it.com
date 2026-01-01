'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

// Pixel art icons
const DumbbellIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 64 64" fill="none">
    <rect x="8" y="20" width="8" height="24" fill="#FF6B6B"/>
    <rect x="16" y="16" width="8" height="32" fill="#CC5555"/>
    <rect x="24" y="28" width="16" height="8" fill="#888"/>
    <rect x="40" y="16" width="8" height="32" fill="#CC5555"/>
    <rect x="48" y="20" width="8" height="24" fill="#FF6B6B"/>
  </svg>
);

const ChecklistIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 64 64" fill="none">
    <rect x="8" y="8" width="48" height="48" fill="#5CC9F5"/>
    <rect x="12" y="12" width="40" height="40" fill="#2D8AB5"/>
    <rect x="16" y="20" width="8" height="8" fill="#7FD954"/>
    <rect x="28" y="20" width="20" height="8" fill="white"/>
    <rect x="16" y="36" width="8" height="8" fill="white" opacity="0.6"/>
    <rect x="28" y="36" width="20" height="8" fill="white" opacity="0.6"/>
  </svg>
);

const PlaneIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 64 64" fill="none">
    <rect x="28" y="8" width="8" height="16" fill="#5fbf8a"/>
    <rect x="24" y="24" width="16" height="24" fill="#5fbf8a"/>
    <rect x="8" y="28" width="16" height="8" fill="#4a9d70"/>
    <rect x="40" y="28" width="16" height="8" fill="#4a9d70"/>
    <rect x="20" y="48" width="8" height="8" fill="#4a9d70"/>
    <rect x="36" y="48" width="8" height="8" fill="#4a9d70"/>
  </svg>
);

const LifeIcon = ({ className, style }: { className?: string; style?: React.CSSProperties }) => (
  <svg className={className} style={style} viewBox="0 0 64 64" fill="none">
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

  // Determine which app is active based on pathname
  const isHome = pathname === '/';
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

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.retro-nav-dropdown')) {
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

        .retro-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 1000;
          padding: 1rem 1.5rem;
        }

        .retro-nav-bar {
          max-width: 1200px;
          margin: 0 auto;
          background: linear-gradient(180deg, rgba(30,30,30,0.98) 0%, rgba(20,20,20,0.98) 100%);
          backdrop-filter: blur(10px);
          border: 2px solid #3a3a3a;
          border-radius: 12px;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 0 #1a1a1a, 0 0 30px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05);
        }

        .retro-nav-logo {
          font-size: 0.65rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: 'Press Start 2P', monospace;
          filter: drop-shadow(0 0 10px rgba(255,215,0,0.5));
          transition: all 0.3s ease;
          text-decoration: none;
        }

        .retro-nav-logo:hover {
          filter: drop-shadow(0 0 20px rgba(255,215,0,0.8));
          transform: scale(1.02);
        }

        .retro-nav-icons {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .retro-nav-icon-link {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 0.35rem;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .retro-nav-icon-link:hover {
          background: rgba(255,255,255,0.1);
        }

        .retro-nav-icon-link.active {
          background: rgba(255,215,0,0.15);
        }

        .retro-nav-icon-link.active::after {
          content: '';
          position: absolute;
          bottom: -2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background: #FFD700;
          border-radius: 50%;
          box-shadow: 0 0 6px #FFD700;
        }

        .retro-nav-icon {
          width: 28px;
          height: 28px;
          opacity: 0.7;
          transition: all 0.2s ease;
        }

        .retro-nav-icon-link:hover .retro-nav-icon,
        .retro-nav-icon-link.active .retro-nav-icon {
          opacity: 1;
          transform: scale(1.1);
        }

        .retro-nav-icon.disabled {
          opacity: 0.3;
          cursor: default;
        }

        .retro-nav-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 6px;
          color: #1a1a1a;
          cursor: pointer;
          box-shadow: 0 3px 0 #996600, 0 0 15px rgba(255,215,0,0.2);
          transition: all 0.15s ease;
          text-decoration: none;
        }

        .retro-nav-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 0 #996600, 0 0 25px rgba(255,215,0,0.4);
        }

        .retro-nav-btn:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #996600;
        }

        .retro-profile-img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid #FFD700;
          box-shadow: 0 0 15px rgba(255,215,0,0.4);
          transition: all 0.3s ease;
          cursor: pointer;
        }

        .retro-profile-img:hover {
          transform: scale(1.1);
          box-shadow: 0 0 25px rgba(255,215,0,0.6);
        }

        .retro-nav-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.75rem;
          background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%);
          border: 2px solid #3a3a3a;
          border-radius: 10px;
          padding: 0.75rem;
          min-width: 180px;
          box-shadow: 0 4px 0 #1a1a1a, 0 10px 30px rgba(0,0,0,0.5);
          z-index: 1001;
        }

        .retro-dropdown-email {
          padding: 0.5rem 0.75rem;
          color: #666;
          font-size: 0.32rem;
          font-family: 'Press Start 2P', monospace;
          border-bottom: 1px solid #3a3a3a;
          margin-bottom: 0.5rem;
          word-break: break-all;
        }

        .retro-dropdown-link {
          display: block;
          padding: 0.6rem 0.75rem;
          color: #FFD700;
          font-size: 0.38rem;
          font-family: 'Press Start 2P', monospace;
          text-decoration: none;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .retro-dropdown-link:hover {
          background: rgba(255,215,0,0.1);
        }

        .retro-dropdown-btn {
          width: 100%;
          padding: 0.6rem 0.75rem;
          background: none;
          border: none;
          color: #ff6b6b;
          font-size: 0.38rem;
          font-family: 'Press Start 2P', monospace;
          cursor: pointer;
          text-align: left;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .retro-dropdown-btn:hover {
          background: rgba(255,107,107,0.1);
        }

        .retro-login-dropdown {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 0.75rem;
          background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%);
          border: 2px solid #3a3a3a;
          border-radius: 10px;
          padding: 1.25rem;
          min-width: 220px;
          box-shadow: 0 4px 0 #1a1a1a, 0 10px 30px rgba(0,0,0,0.5);
          z-index: 1001;
        }

        .retro-login-label {
          font-size: 0.38rem;
          color: #888;
          margin-bottom: 1rem;
          text-align: center;
          font-family: 'Press Start 2P', monospace;
        }

        .retro-google-btn {
          width: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          padding: 0.85rem;
          background: #fff;
          border: 2px solid #ddd;
          border-radius: 8px;
          cursor: pointer;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.38rem;
          color: #333;
          transition: all 0.2s ease;
          box-shadow: 0 2px 0 #ccc;
        }

        .retro-google-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 0 #ccc;
          border-color: #bbb;
        }

        .retro-input {
          width: 100%;
          padding: 0.5rem;
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 4px;
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.32rem;
          box-sizing: border-box;
          outline: none;
        }

        .retro-input:focus {
          border-color: #FFD700;
        }

        .retro-submit-btn {
          width: 100%;
          padding: 0.6rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 4px;
          color: #1a1a1a;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          cursor: pointer;
          box-shadow: 0 3px 0 #996600;
        }

        .retro-submit-btn:disabled {
          background: #666;
          cursor: wait;
        }

        /* Hide on mobile - apps have their own mobile nav */
        @media (max-width: 768px) {
          .retro-nav {
            display: none;
          }
        }
      `}</style>

      <nav className="retro-nav">
        <div className="retro-nav-bar">
          <Link href="/" className="retro-nav-logo">GAMIFY.IT.COM</Link>

          <div className="retro-nav-icons">
            <Link
              href="/fitness"
              className={`retro-nav-icon-link ${isFitness ? 'active' : ''}`}
              title="Iron Quest"
            >
              <DumbbellIcon className="retro-nav-icon" />
            </Link>
            <Link
              href="/today"
              className={`retro-nav-icon-link ${isToday ? 'active' : ''}`}
              title="Day Quest"
            >
              <ChecklistIcon className="retro-nav-icon" />
            </Link>
            <Link
              href="/travel"
              className={`retro-nav-icon-link ${isTravel ? 'active' : ''}`}
              title="Explorer"
            >
              <PlaneIcon className="retro-nav-icon" />
            </Link>
            <div
              className="retro-nav-icon-link"
              title="Life Tracker (Coming Soon)"
              style={{ cursor: 'default' }}
            >
              <LifeIcon className="retro-nav-icon disabled" />
            </div>
          </div>

          {/* Auth UI */}
          {authStatus === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#FFD700',
                animation: 'pulse 1s infinite'
              }} />
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
            </div>
          )}

          {authStatus === 'authenticated' && user && (
            <div style={{ position: 'relative' }} className="retro-nav-dropdown">
              <button
                onClick={(e) => { e.stopPropagation(); setShowUserMenu(!showUserMenu); }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
              >
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="retro-profile-img" />
                ) : (
                  <div className="retro-profile-img" style={{
                    background: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#1a1a1a', fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem'
                  }}>
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              {showUserMenu && (
                <div className="retro-nav-dropdown" style={{ position: 'absolute' }}>
                  <div className="retro-dropdown-email">{user.email}</div>
                  <Link href="/account" className="retro-dropdown-link">MY PROFILE</Link>
                  <button onClick={handleSignOut} className="retro-dropdown-btn">SIGN OUT</button>
                </div>
              )}
            </div>
          )}

          {authStatus === 'unauthenticated' && (
            <div style={{ position: 'relative' }} className="retro-nav-dropdown">
              <button
                onClick={(e) => { e.stopPropagation(); setShowLoginDropdown(!showLoginDropdown); }}
                className="retro-nav-btn"
              >
                START PLAYING
              </button>
              {showLoginDropdown && (
                <div className="retro-login-dropdown">
                  <p className="retro-login-label">Continue with</p>
                  <button onClick={handleGoogleSignIn} className="retro-google-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    Google
                  </button>
                  <div style={{ margin: '1rem 0', borderTop: '1px solid #3a3a3a', position: 'relative' }}>
                    <span style={{
                      position: 'absolute', top: '-0.5rem', left: '50%', transform: 'translateX(-50%)',
                      background: '#2d2d2d', padding: '0 0.5rem', fontSize: '0.3rem', color: '#666',
                      fontFamily: "'Press Start 2P', monospace"
                    }}>OR</span>
                  </div>
                  <form onSubmit={handleEmailLogin}>
                    <input
                      type="email"
                      placeholder="Email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="retro-input"
                      style={{ marginBottom: '0.5rem' }}
                    />
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="retro-input"
                      style={{ marginBottom: '0.75rem' }}
                    />
                    <button type="submit" disabled={loginLoading} className="retro-submit-btn">
                      {loginLoading ? 'LOADING...' : 'LOGIN'}
                    </button>
                  </form>
                </div>
              )}
            </div>
          )}

          {authStatus === 'error' && (
            <button className="retro-nav-btn" onClick={() => window.location.reload()}>
              RETRY
            </button>
          )}
        </div>
      </nav>
    </>
  );
}
