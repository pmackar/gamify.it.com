'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated' | 'error';

export function NavBar() {
  const [user, setUser] = useState<User | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('loading');
  const [authError, setAuthError] = useState<string | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [email, setEmail] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [ssoRequired, setSsoRequired] = useState(false);
  const [ssoProviders, setSsoProviders] = useState<string[]>([]);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          setAuthStatus('error');
          setAuthError(error.message);
          console.error('Auth error:', error);
        } else if (session?.user) {
          setUser(session.user);
          setAuthStatus('authenticated');
        } else {
          setAuthStatus('unauthenticated');
        }
      })
      .catch((err) => {
        setAuthStatus('error');
        setAuthError(err.message);
        console.error('Auth error:', err);
      });
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

  const getProviderDisplayName = (provider: string) => {
    const names: Record<string, string> = {
      google: 'Google',
      github: 'GitHub',
      apple: 'Apple',
      facebook: 'Facebook',
      twitter: 'Twitter',
    };
    return names[provider] || provider.charAt(0).toUpperCase() + provider.slice(1);
  };

  const handleGoogleSignIn = async () => {
    setLoginLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoginLoading(false);
    if (error) {
      alert(`Error: ${error.message}`);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginLoading(true);

    try {
      // First check if email is associated with SSO-only account
      const checkRes = await fetch('/api/auth/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      });
      const checkData = await checkRes.json();

      if (checkData.exists && !checkData.canUseMagicLink && checkData.providers?.length > 0) {
        // User signed up with SSO - guide them to use that instead
        setSsoProviders(checkData.providers);
        setSsoRequired(true);
        setLoginLoading(false);
        return;
      }

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      setLoginLoading(false);
      if (error) {
        alert(`Error: ${error.message}`);
      } else {
        setMagicLinkSent(true);
      }
    } catch (err) {
      setLoginLoading(false);
      alert(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        .gamify-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 1rem; }
        .gamify-nav-bar {
          max-width: 1000px;
          margin: 0 auto;
          background: #2d2d2d;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 0.75rem 1.5rem;
          display: flex;
          align-items: center;
          justify-content: space-between;
          box-shadow: 0 4px 0 #1a1a1a;
        }
        .gamify-nav-logo {
          font-size: 0.75rem;
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255,215,0,0.5);
          font-family: 'Press Start 2P', monospace;
          text-decoration: none;
        }
        .gamify-nav-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 0.6rem 1rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 4px;
          color: #1a1a1a;
          cursor: pointer;
          box-shadow: 0 3px 0 #996600;
          transition: all 0.15s ease;
          text-decoration: none;
        }
        .gamify-nav-btn:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 0 #996600;
        }
        .gamify-nav-btn:active {
          transform: translateY(1px);
          box-shadow: 0 2px 0 #996600;
        }
        .gamify-profile-img {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 2px solid #FFD700;
          box-shadow: 0 0 10px rgba(255,215,0,0.5);
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .gamify-profile-img:hover {
          transform: scale(1.05);
          box-shadow: 0 0 15px rgba(255,215,0,0.7);
        }
      `}</style>

      <nav className="gamify-nav">
        <div className="gamify-nav-bar">
          <Link href="/" className="gamify-nav-logo">gamify.it.com</Link>

          {/* Auth Status Indicator */}
          {authStatus === 'loading' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#FFD700',
                animation: 'pulse 1s infinite'
              }} />
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.4rem', color: '#888' }}>
                CHECKING...
              </span>
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }`}</style>
            </div>
          )}

          {authStatus === 'error' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{
                width: '10px', height: '10px', borderRadius: '50%',
                background: '#ff4444'
              }} />
              <span style={{ fontFamily: "'Press Start 2P', monospace", fontSize: '0.35rem', color: '#ff4444' }}>
                AUTH ERROR: {authError}
              </span>
            </div>
          )}

          {authStatus === 'authenticated' && user && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt="Profile" className="gamify-profile-img" />
                ) : (
                  <div className="gamify-profile-img" style={{ background: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
              </button>
              {showUserMenu && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: '#2d2d2d', border: '2px solid #3a3a3a', borderRadius: '8px', padding: '0.5rem', minWidth: '140px', boxShadow: '0 4px 0 #1a1a1a', fontFamily: "'Press Start 2P', monospace" }}>
                  <div style={{ padding: '0.5rem', color: '#888', fontSize: '0.35rem', borderBottom: '1px solid #3a3a3a', marginBottom: '0.5rem' }}>
                    {user.email}
                  </div>
                  <Link href="/account" style={{ display: 'block', padding: '0.5rem', color: '#FFD700', fontSize: '0.4rem', textDecoration: 'none' }}>
                    MY PROFILE
                  </Link>
                  <button onClick={handleSignOut} style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', color: '#ff6b6b', fontSize: '0.4rem', fontFamily: "'Press Start 2P', monospace", cursor: 'pointer', textAlign: 'left' }}>
                    SIGN OUT
                  </button>
                </div>
              )}
            </div>
          )}

          {authStatus === 'unauthenticated' && (
            <div style={{ position: 'relative' }}>
              <button onClick={() => { setShowLoginDropdown(!showLoginDropdown); setMagicLinkSent(false); setSsoRequired(false); }} className="gamify-nav-btn">LOGIN</button>
              {showLoginDropdown && (
                <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: '#2d2d2d', border: '2px solid #3a3a3a', borderRadius: '8px', padding: '1rem', minWidth: '220px', boxShadow: '0 4px 0 #1a1a1a' }}>
                  {ssoRequired ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>🔐</div>
                      <p style={{ fontSize: '0.4rem', color: '#FFD700', marginBottom: '0.5rem', fontFamily: "'Press Start 2P', monospace" }}>ACCOUNT FOUND!</p>
                      <p style={{ fontSize: '0.32rem', color: '#888', fontFamily: "'Press Start 2P', monospace", lineHeight: '1.8', marginBottom: '0.75rem' }}>This account uses {ssoProviders.map(getProviderDisplayName).join(' or ')}.</p>
                      {ssoProviders.includes('google') && (
                        <button onClick={handleGoogleSignIn} disabled={loginLoading} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', width: '100%', padding: '0.6rem', background: '#fff', border: 'none', borderRadius: '4px', color: '#333', fontFamily: 'sans-serif', fontSize: '0.7rem', cursor: loginLoading ? 'wait' : 'pointer', marginBottom: '0.75rem' }}>
                          <svg style={{ width: '14px', height: '14px' }} viewBox="0 0 24 24">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                          </svg>
                          {loginLoading ? 'Signing in...' : 'Continue with Google'}
                        </button>
                      )}
                      <button onClick={() => { setSsoRequired(false); setSsoProviders([]); setEmail(''); }} style={{ padding: '0.5rem 1rem', background: 'none', border: '1px solid #3a3a3a', borderRadius: '4px', color: '#888', fontFamily: "'Press Start 2P', monospace", fontSize: '0.3rem', cursor: 'pointer' }}>USE DIFFERENT EMAIL</button>
                    </div>
                  ) : magicLinkSent ? (
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: '1.5rem', marginBottom: '0.75rem' }}>✉️</div>
                      <p style={{ fontSize: '0.4rem', color: '#5fbf8a', marginBottom: '0.5rem', fontFamily: "'Press Start 2P', monospace" }}>CHECK YOUR EMAIL!</p>
                      <p style={{ fontSize: '0.32rem', color: '#888', fontFamily: "'Press Start 2P', monospace", lineHeight: '1.8' }}>Click the magic link we sent to {email}</p>
                      <button onClick={() => { setMagicLinkSent(false); setEmail(''); }} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: 'none', border: '1px solid #3a3a3a', borderRadius: '4px', color: '#888', fontFamily: "'Press Start 2P', monospace", fontSize: '0.3rem', cursor: 'pointer' }}>USE DIFFERENT EMAIL</button>
                    </div>
                  ) : (
                    <>
                      <p style={{ fontSize: '0.4rem', color: '#888', marginBottom: '0.75rem', textAlign: 'center', fontFamily: "'Press Start 2P', monospace" }}>Enter your email</p>
                      <form onSubmit={handleMagicLink}>
                        <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ width: '100%', padding: '0.5rem', marginBottom: '0.75rem', background: '#1a1a1a', border: '2px solid #3a3a3a', borderRadius: '4px', color: '#fff', fontFamily: "'Press Start 2P', monospace", fontSize: '0.32rem', boxSizing: 'border-box' }} />
                        <button type="submit" disabled={loginLoading} style={{ width: '100%', padding: '0.6rem', background: loginLoading ? '#666' : 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)', border: '2px solid #CC8800', borderRadius: '4px', color: '#1a1a1a', fontFamily: "'Press Start 2P', monospace", fontSize: '0.35rem', cursor: loginLoading ? 'wait' : 'pointer', boxShadow: '0 3px 0 #996600' }}>{loginLoading ? 'SENDING...' : 'SEND MAGIC LINK'}</button>
                      </form>
                      <p style={{ fontSize: '0.28rem', color: '#666', marginTop: '0.75rem', textAlign: 'center', fontFamily: "'Press Start 2P', monospace" }}>No password needed!</p>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </nav>
    </>
  );
}
