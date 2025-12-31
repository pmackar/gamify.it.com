'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

const videos = [
  '/8-bit city road/8-bit city road_front.mp4',
  '/8-bit city road/8-bit city road_side.mp4',
  '/8-bit city road/8-bit city road_back.mp4',
];

// Game Icons
const DumbbellIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="10" width="4" height="12" fill="#FF6B6B"/>
    <rect x="8" y="8" width="4" height="16" fill="#CC5555"/>
    <rect x="12" y="14" width="8" height="4" fill="#888"/>
    <rect x="20" y="8" width="4" height="16" fill="#CC5555"/>
    <rect x="24" y="10" width="4" height="12" fill="#FF6B6B"/>
  </svg>
);

const ChecklistIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="24" height="24" fill="#5CC9F5"/>
    <rect x="6" y="6" width="20" height="20" fill="#2D8AB5"/>
    <rect x="8" y="10" width="4" height="4" fill="#7FD954"/>
    <rect x="14" y="10" width="10" height="4" fill="white"/>
    <rect x="8" y="18" width="4" height="4" fill="white"/>
    <rect x="14" y="18" width="10" height="4" fill="white"/>
  </svg>
);

const PlaneIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="14" y="4" width="4" height="8" fill="#5CC9F5"/>
    <rect x="12" y="12" width="8" height="12" fill="#5CC9F5"/>
    <rect x="4" y="14" width="8" height="4" fill="#2D8AB5"/>
    <rect x="20" y="14" width="8" height="4" fill="#2D8AB5"/>
    <rect x="10" y="24" width="4" height="4" fill="#2D8AB5"/>
    <rect x="18" y="24" width="4" height="4" fill="#2D8AB5"/>
  </svg>
);

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [user, setUser] = useState<User | null>(null);
  const [typedText, setTypedText] = useState('');
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [secondLineText, setSecondLineText] = useState('');
  const [blinkDots, setBlinkDots] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [nextVideoIndex, setNextVideoIndex] = useState(1);
  const [showVideo, setShowVideo] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [crtFlash, setCrtFlash] = useState(false);

  // Prevent SSR flash of content
  useEffect(() => {
    setMounted(true);
  }, []);

  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const [primaryActive, setPrimaryActive] = useState(true);

  const firstLine = "Life's not a game";
  const secondLine = "but it should be!";

  // Auth state - use getSession() to handle OAuth callback
  useEffect(() => {
    const supabase = createClient();

    // getSession() detects OAuth params in URL and exchanges them
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      // Clean up URL after OAuth callback
      if (window.location.hash || window.location.search.includes('code=')) {
        window.history.replaceState({}, '', window.location.pathname);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
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
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // Preload all videos on mount
  useEffect(() => {
    videos.forEach(src => {
      const video = document.createElement('video');
      video.preload = 'auto';
      video.src = src;
      video.load();
    });
  }, []);

  // Initialize first video
  useEffect(() => {
    if (primaryVideoRef.current) {
      primaryVideoRef.current.src = videos[0];
      primaryVideoRef.current.load();
      primaryVideoRef.current.oncanplaythrough = () => {
        setVideoReady(true);
      };
    }
    if (secondaryVideoRef.current) {
      secondaryVideoRef.current.src = videos[1];
      secondaryVideoRef.current.load();
    }
  }, []);

  // Periodic video cycling with crossfade
  useEffect(() => {
    if (!showVideo) return;

    const cycleInterval = setInterval(() => {
      // Crossfade to next video
      const nextIdx = (currentVideoIndex + 1) % videos.length;
      const followingIdx = (nextIdx + 1) % videos.length;

      // Prepare the next video
      const nextVideo = primaryActive ? secondaryVideoRef.current : primaryVideoRef.current;
      if (nextVideo) {
        nextVideo.src = videos[nextIdx];
        nextVideo.load();
        nextVideo.play().catch(() => {});
      }

      // Switch which video is active
      setPrimaryActive(!primaryActive);
      setCurrentVideoIndex(nextIdx);
      setNextVideoIndex(followingIdx);
    }, 15000); // Switch every 15 seconds

    return () => clearInterval(cycleInterval);
  }, [showVideo, currentVideoIndex, primaryActive]);

  // Typing animation
  useEffect(() => {
    let charIndex = 0;
    let dotBlinks = 0;

    const typeFirstLine = setInterval(() => {
      if (charIndex < firstLine.length) {
        setTypedText(firstLine.slice(0, charIndex + 1));
        charIndex++;
      } else {
        clearInterval(typeFirstLine);
        const blinkInterval = setInterval(() => {
          dotBlinks++;
          setBlinkDots(prev => !prev);
          if (dotBlinks >= 6) {
            clearInterval(blinkInterval);
            setShowSecondLine(true);
            let secondCharIndex = 0;
            const typeSecondLine = setInterval(() => {
              if (secondCharIndex < secondLine.length) {
                setSecondLineText(secondLine.slice(0, secondCharIndex + 1));
                secondCharIndex++;
              } else {
                clearInterval(typeSecondLine);
                // Trigger CRT flash and start video
                setTimeout(() => {
                  setCrtFlash(true);
                  setTimeout(() => {
                    setShowVideo(true);
                    if (primaryVideoRef.current) {
                      primaryVideoRef.current.play().catch(() => {});
                    }
                    setCrtFlash(false);
                    setIntroComplete(true);
                  }, 300);
                }, 500);
              }
            }, 80);
          }
        }, 300);
      }
    }, 100);

    return () => clearInterval(typeFirstLine);
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; overflow-x: hidden; }

        .crt-wrapper {
          background: #1a1a1a;
          position: relative;
          overflow: hidden;
        }

        .crt-wrapper::before {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.15), rgba(0,0,0,0.15) 1px, transparent 1px, transparent 2px);
          pointer-events: none;
          z-index: 1000;
        }

        .crt-wrapper::after {
          content: '';
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.4) 100%);
          pointer-events: none;
          z-index: 999;
        }

        @keyframes flicker { 0% { opacity: 0.97; } 50% { opacity: 1; } 100% { opacity: 0.98; } }
        @keyframes cursor-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }

        .page-content {
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          animation: flicker 0.15s infinite;
        }

        .crt-intro {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
          overflow: hidden;
        }

        .video-background {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          z-index: 0;
          overflow: hidden;
          background: #1a1a1a;
        }

        .video-background video {
          position: absolute;
          top: 50%; left: 50%;
          min-width: 100%; min-height: 100%;
          width: auto; height: auto;
          transform: translate(-50%, -50%);
          object-fit: cover;
        }

        .video-primary {
          opacity: 0;
        }
        .video-primary.active { opacity: 0.6; }
        .video-primary.hidden { opacity: 0; }

        .video-secondary {
          opacity: 0;
        }
        .video-secondary.active { opacity: 0.6; }
        .video-secondary.hidden { opacity: 0; }

        /* CRT Flash Effect - contained within video area */
        .video-flash {
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: white;
          z-index: 10;
          pointer-events: none;
          opacity: 0;
        }

        .video-flash.active {
          animation: crtFlashSmooth 0.4s ease-out forwards;
        }

        @keyframes crtFlashSmooth {
          0% { opacity: 0; }
          15% { opacity: 0.9; }
          30% { opacity: 0.7; }
          100% { opacity: 0; }
        }

        .video-overlay {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.7) 100%);
          z-index: 1;
        }

        .crt-screen {
          max-width: 95vw;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .typing-line {
          white-space: nowrap;
          font-size: clamp(0.5rem, 2.5vw, 1.8rem);
          line-height: 1.8;
        }

        .typing-line-first {
          color: #00ff00;
          text-shadow: 0 0 20px rgba(0,255,0,0.5);
        }

        .typing-line-second {
          color: #FFD700;
          text-shadow: 0 0 20px rgba(255,215,0,0.5);
          display: block;
          margin-top: 0.5rem;
        }

        .typing-cursor {
          display: inline-block;
          width: 0.5em; height: 1em;
          background: currentColor;
          margin-left: 0.15em;
          animation: cursor-blink 0.8s infinite;
          vertical-align: middle;
          box-shadow: 0 0 10px currentColor;
        }

        .dots {
          color: #00ff00;
          text-shadow: 0 0 10px rgba(0,255,0,0.5);
          transition: opacity 0.15s;
        }

        @keyframes rgb-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }

        .shimmer-text {
          background: linear-gradient(90deg, #fff 0%, #fff 35%, #ff6b6b 42%, #FFD700 50%, #00ff00 58%, #fff 65%, #fff 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rgb-shimmer 4s ease-in-out infinite;
        }

        .scroll-hint {
          position: absolute;
          bottom: 2rem; left: 50%;
          transform: translateX(-50%);
          font-size: 0.65rem;
          color: #666;
          animation: bounce 2s infinite;
          opacity: 0;
          transition: opacity 0.5s;
        }
        .scroll-hint.visible { opacity: 1; }

        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-10px); } }
        .scroll-arrow { display: block; margin-top: 0.5rem; font-size: 1rem; }

        .retro-nav { position: fixed; top: 0; left: 0; right: 0; z-index: 100; padding: 1rem; }

        .nav-bar {
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

        .nav-logo {
          font-size: 0.75rem;
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255,215,0,0.5);
          font-family: 'Press Start 2P', monospace;
          transition: all 0.2s ease;
        }

        .nav-logo:hover {
          text-shadow: 0 0 16px rgba(255,215,0,0.8), 0 0 32px rgba(255,215,0,0.4);
          transform: scale(1.02);
        }

        .nav-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          padding: 0.6rem 1.2rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 4px;
          color: #1a1a1a;
          cursor: pointer;
          box-shadow: 0 3px 0 #996600;
          transition: all 0.15s ease;
          text-decoration: none;
        }

        .nav-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 5px 0 #996600, 0 0 20px rgba(255,215,0,0.3);
        }

        .nav-btn:active {
          transform: translateY(2px);
          box-shadow: 0 1px 0 #996600;
        }

        .profile-img {
          width: 38px; height: 38px;
          border-radius: 50%;
          border: 2px solid #FFD700;
          box-shadow: 0 0 10px rgba(255,215,0,0.5);
          transition: all 0.2s ease;
          cursor: pointer;
        }

        .profile-img:hover {
          transform: scale(1.1);
          box-shadow: 0 0 20px rgba(255,215,0,0.7);
        }

        .retro-section { padding: 5rem 2rem; max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label {
          font-size: 0.6rem;
          color: #FFD700;
          margin-bottom: 1rem;
          font-family: 'Press Start 2P', monospace;
          letter-spacing: 0.1em;
          opacity: 0.8;
        }
        .section-title {
          font-size: clamp(1.4rem, 4vw, 2rem);
          color: #fff;
          margin-bottom: 1.5rem;
          font-family: 'Press Start 2P', monospace;
          line-height: 1.6;
        }
        .section-subtitle {
          font-size: 0.6rem;
          color: #888;
          line-height: 2.2;
          max-width: 700px;
          margin: 0 auto;
          font-family: 'Press Start 2P', monospace;
        }

        .games-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .game-card {
          background: linear-gradient(180deg, #2d2d2d 0%, #252525 100%);
          border: 2px solid #3a3a3a;
          border-radius: 12px;
          padding: 2.5rem 2rem;
          text-align: center;
          transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
          text-decoration: none;
          display: block;
          box-shadow: 0 4px 0 #1a1a1a;
          position: relative;
          overflow: hidden;
        }

        .game-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; right: 0; bottom: 0;
          background: linear-gradient(180deg, rgba(255,215,0,0.05) 0%, transparent 50%);
          opacity: 0;
          transition: opacity 0.25s ease;
        }

        .game-card:hover {
          transform: translateY(-6px);
          border-color: #FFD700;
          box-shadow: 0 10px 0 #1a1a1a, 0 0 30px rgba(255,215,0,0.25);
        }

        .game-card:hover::before { opacity: 1; }

        .game-card:active {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 #1a1a1a, 0 0 20px rgba(255,215,0,0.2);
        }

        .game-icon {
          width: 72px;
          height: 72px;
          margin: 0 auto 1.5rem;
          transition: transform 0.25s ease;
        }

        .game-card:hover .game-icon {
          transform: scale(1.1);
        }

        .game-name {
          font-size: 0.9rem;
          color: #FFD700;
          margin-bottom: 0.75rem;
          font-family: 'Press Start 2P', monospace;
          text-shadow: 0 0 10px rgba(255,215,0,0.3);
        }

        .game-desc {
          font-size: 0.55rem;
          color: #aaa;
          line-height: 1.9;
          font-family: 'Press Start 2P', monospace;
        }

        .game-domain {
          font-size: 0.45rem;
          color: #666;
          margin-top: 1.25rem;
          font-family: 'Press Start 2P', monospace;
          transition: color 0.2s ease;
        }

        .game-card:hover .game-domain { color: #888; }

        .retro-footer {
          padding: 3rem 2rem;
          text-align: center;
          border-top: 2px solid #2d2d2d;
          background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.3) 100%);
        }
        .footer-text {
          font-size: 0.55rem;
          color: #555;
          font-family: 'Press Start 2P', monospace;
        }
      `}</style>

      <div className="crt-wrapper">
        <div className="page-content">
          <nav className="retro-nav">
            <div className="nav-bar">
              <span className="nav-logo">gamify.it.com</span>
              {user ? (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowUserMenu(!showUserMenu)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    {user.user_metadata?.avatar_url ? (
                      <img src={user.user_metadata.avatar_url} alt="Profile" className="profile-img" />
                    ) : (
                      <div className="profile-img" style={{ background: '#FFD700', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1a1a1a', fontFamily: "'Press Start 2P', monospace", fontSize: '0.6rem' }}>
                        {user.email?.charAt(0).toUpperCase()}
                      </div>
                    )}
                  </button>
                  {showUserMenu && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: '#2d2d2d', border: '2px solid #3a3a3a', borderRadius: '8px', padding: '0.5rem', minWidth: '120px', boxShadow: '0 4px 0 #1a1a1a' }}>
                      <div style={{ padding: '0.5rem', color: '#888', fontSize: '0.4rem', borderBottom: '1px solid #3a3a3a', marginBottom: '0.5rem' }}>
                        {user.email}
                      </div>
                      <button onClick={handleSignOut} style={{ width: '100%', padding: '0.5rem', background: 'none', border: 'none', color: '#ff6b6b', fontSize: '0.45rem', fontFamily: "'Press Start 2P', monospace", cursor: 'pointer', textAlign: 'left' }}>
                        SIGN OUT
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ position: 'relative' }}>
                  <button onClick={() => setShowLoginDropdown(!showLoginDropdown)} className="nav-btn">LOGIN / SIGN UP</button>
                  {showLoginDropdown && (
                    <div style={{ position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem', background: '#2d2d2d', border: '2px solid #3a3a3a', borderRadius: '8px', padding: '1rem', minWidth: '200px', boxShadow: '0 4px 0 #1a1a1a' }}>
                      <p style={{ fontSize: '0.45rem', color: '#888', marginBottom: '0.75rem', textAlign: 'center', fontFamily: "'Press Start 2P', monospace" }}>
                        Continue with
                      </p>
                      <button
                        onClick={handleGoogleSignIn}
                        style={{
                          width: '100%',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '0.5rem',
                          padding: '0.75rem',
                          background: 'white',
                          border: '2px solid #ddd',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontFamily: "'Press Start 2P', monospace",
                          fontSize: '0.4rem',
                          color: '#333',
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </nav>

          <section className="crt-intro">
            <div className="video-background">
              <video
                ref={primaryVideoRef}
                className={`video-primary ${showVideo && primaryActive ? 'active' : 'hidden'}`}
                muted
                loop
                playsInline
                preload="auto"
              />
              <video
                ref={secondaryVideoRef}
                className={`video-secondary ${showVideo && !primaryActive ? 'active' : 'hidden'}`}
                muted
                loop
                playsInline
                preload="auto"
              />
              <div className={`video-flash ${crtFlash ? 'active' : ''}`} />
              <div className="video-overlay" />
            </div>

            <div className="crt-screen">
              <div className="typing-line typing-line-first">
                {typedText}
                {!showSecondLine && (
                  <>
                    <span className="dots" style={{ opacity: blinkDots ? 1 : 0 }}>...</span>
                    {typedText.length === firstLine.length && !blinkDots ? null : <span className="typing-cursor" />}
                  </>
                )}
              </div>
              {showSecondLine && (
                <div className="typing-line typing-line-second">
                  {secondLineText}
                  {secondLineText.length < secondLine.length && (
                    <span className="typing-cursor" />
                  )}
                </div>
              )}
            </div>

            <div className={`scroll-hint ${introComplete ? 'visible' : ''}`}>
              Scroll to continue
              <span className="scroll-arrow">▼</span>
            </div>
          </section>

          {mounted && (
            <>
              <section className="retro-section">
                <div className="section-header">
                  <p className="section-label">CHOOSE YOUR GAME</p>
                  <h2 className="section-title shimmer-text">Play Now</h2>
                  <p className="section-subtitle">Each app serves a unique purpose in your life. Where will your adventure begin?</p>
                </div>

                <div className="games-grid">
                  <a href="https://gamify-fitness.vercel.app" target="_blank" rel="noopener noreferrer" className="game-card">
                    <DumbbellIcon className="game-icon" />
                    <h3 className="game-name">IRON QUEST</h3>
                    <p className="game-desc">Level up your fitness journey</p>
                    <p className="game-domain">gamify.fitness</p>
                  </a>

                  <a href="https://gamify-today.vercel.app" target="_blank" rel="noopener noreferrer" className="game-card">
                    <ChecklistIcon className="game-icon" />
                    <h3 className="game-name">DAY QUEST</h3>
                    <p className="game-desc">Conquer your daily tasks</p>
                    <p className="game-domain">gamify.today</p>
                  </a>

                  <a href="/dashboard" className="game-card">
                    <PlaneIcon className="game-icon" />
                    <h3 className="game-name">EXPLORER</h3>
                    <p className="game-desc">Track your travels</p>
                    <p className="game-domain">gamify.travel</p>
                  </a>
                </div>
              </section>

              <footer className="retro-footer">
                <p className="footer-text shimmer-text">Life&apos;s not a game... but it should be!</p>
                <p className="footer-text" style={{ marginTop: '1rem' }}>© {new Date().getFullYear()} gamify.it.com</p>
              </footer>
            </>
          )}
        </div>
      </div>

    </>
  );
}
