'use client';

import Link from 'next/link';
import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';
import { LoginModal } from '@/components/LoginModal';

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
  const [user, setUser] = useState<User | null>(null);
  const [typedText, setTypedText] = useState('');
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [secondLineText, setSecondLineText] = useState('');
  const [blinkDots, setBlinkDots] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [videoFading, setVideoFading] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [crtFlash, setCrtFlash] = useState(false);
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

  const firstLine = "Life's not a game";
  const secondLine = "but it should be!";

  // Auth state
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user);
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
        // Start blinking dots
        const blinkInterval = setInterval(() => {
          dotBlinks++;
          setBlinkDots(prev => !prev);
          if (dotBlinks >= 6) {
            clearInterval(blinkInterval);
            setShowSecondLine(true);
            // Type second line
            let secondCharIndex = 0;
            const typeSecondLine = setInterval(() => {
              if (secondCharIndex < secondLine.length) {
                setSecondLineText(secondLine.slice(0, secondCharIndex + 1));
                secondCharIndex++;
              } else {
                clearInterval(typeSecondLine);
                // Start video AFTER second line completes with CRT flash
                setTimeout(() => {
                  setCrtFlash(true);
                  setTimeout(() => {
                    setShowVideo(true);
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

  // Smooth video cycling with crossfade
  useEffect(() => {
    if (!showVideo) return;

    const videoInterval = setInterval(() => {
      setVideoFading(true);
      setTimeout(() => {
        setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
        setVideoFading(false);
      }, 1000);
    }, 10000);

    return () => clearInterval(videoInterval);
  }, [showVideo]);

  // Preload and play videos
  useEffect(() => {
    videoRefs.current.forEach((video, index) => {
      if (video) {
        video.load();
        if (index === currentVideoIndex && showVideo) {
          video.play().catch(() => {});
        }
      }
    });
  }, [currentVideoIndex, showVideo]);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #0a0a0a; }

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
        }

        .video-background video {
          position: absolute;
          top: 50%; left: 50%;
          min-width: 100%; min-height: 100%;
          width: auto; height: auto;
          transform: translate(-50%, -50%);
          object-fit: cover;
          opacity: 0;
          transition: opacity 1s ease-in-out;
        }

        .video-background video.active { opacity: 0.6; }
        .video-background video.fading { opacity: 0; }

        /* CRT Flash Effect */
        .crt-flash {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: white;
          z-index: 50;
          animation: crtFlash 0.3s ease-out forwards;
        }
        @keyframes crtFlash {
          0% { opacity: 0; }
          20% { opacity: 0.9; }
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
          max-width: 800px;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .typing-text {
          font-size: clamp(1.7rem, 6.8vw, 3rem);
          line-height: 2;
          color: #00ff00;
        }

        .typing-cursor {
          display: inline-block;
          width: 0.6em; height: 1.2em;
          background: #00ff00;
          margin-left: 0.2em;
          animation: cursor-blink 0.8s infinite;
          vertical-align: middle;
          box-shadow: 0 0 10px rgba(0,255,0,0.5);
        }

        .dots { color: #00ff00; text-shadow: 0 0 10px rgba(0,255,0,0.5); }
        .second-line { display: block; margin-top: 0.5rem; color: #FFD700; }

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
          font-size: 0.9rem;
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255,215,0,0.5);
          font-family: 'Press Start 2P', monospace;
        }

        .nav-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 4px;
          color: #1a1a1a;
          cursor: pointer;
          box-shadow: 0 3px 0 #996600;
          transition: all 0.1s;
          text-decoration: none;
        }

        .nav-btn:hover { transform: translateY(1px); box-shadow: 0 2px 0 #996600; }

        .profile-img {
          width: 36px; height: 36px;
          border-radius: 50%;
          border: 2px solid #FFD700;
          box-shadow: 0 0 10px rgba(255,215,0,0.5);
        }

        .retro-section { padding: 4rem 2rem; max-width: 1200px; margin: 0 auto; }
        .section-header { text-align: center; margin-bottom: 3rem; }
        .section-label { font-size: 0.65rem; color: #FFD700; margin-bottom: 0.5rem; font-family: 'Press Start 2P', monospace; }
        .section-title { font-size: clamp(1.2rem, 3.9vw, 1.6rem); color: #fff; margin-bottom: 1rem; font-family: 'Press Start 2P', monospace; line-height: 1.8; }
        .section-subtitle { font-size: 0.7rem; color: #888; line-height: 2; max-width: 600px; margin: 0 auto; font-family: 'Press Start 2P', monospace; }

        .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; max-width: 1000px; margin: 0 auto; }

        .game-card {
          background: #2d2d2d;
          border: 2px solid #3a3a3a;
          border-radius: 12px;
          padding: 2rem;
          text-align: center;
          transition: all 0.3s;
          text-decoration: none;
          display: block;
        }

        .game-card:hover { transform: translateY(-4px); border-color: #FFD700; box-shadow: 0 8px 0 #1a1a1a, 0 0 20px rgba(255,215,0,0.2); }

        .game-icon { width: 80px; height: 80px; margin: 0 auto 1.5rem; }
        .game-name { font-size: 1rem; color: #FFD700; margin-bottom: 0.5rem; font-family: 'Press Start 2P', monospace; }
        .game-desc { font-size: 0.65rem; color: #888; line-height: 1.8; font-family: 'Press Start 2P', monospace; }
        .game-domain { font-size: 0.5rem; color: #666; margin-top: 1rem; font-family: 'Press Start 2P', monospace; }

        .retro-footer { padding: 2rem; text-align: center; border-top: 2px solid #2d2d2d; }
        .footer-text { font-size: 0.65rem; color: #666; font-family: 'Press Start 2P', monospace; }
      `}</style>

      <div className="crt-wrapper">
        {crtFlash && <div className="crt-flash" />}
        <div className="page-content">
          <nav className="retro-nav">
            <div className="nav-bar">
              <span className="nav-logo">gamify.it</span>
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
                <button onClick={() => setShowLoginModal(true)} className="nav-btn">LOGIN</button>
              )}
            </div>
          </nav>

          <section className="crt-intro">
            <div className="video-background">
              {videos.map((src, index) => (
                <video
                  key={src}
                  ref={(el) => { videoRefs.current[index] = el; }}
                  className={`${index === currentVideoIndex && showVideo ? 'active' : ''} ${videoFading && index === currentVideoIndex ? 'fading' : ''}`}
                  muted loop playsInline
                >
                  <source src={src} type="video/mp4" />
                </video>
              ))}
              <div className="video-overlay" />
            </div>

            <div className="crt-screen">
              <div className="typing-text">
                {typedText}
                {!showSecondLine && (
                  <>
                    <span className="dots" style={{ opacity: blinkDots ? 1 : 0 }}>...</span>
                    {typedText.length === firstLine.length && !blinkDots ? null : <span className="typing-cursor" />}
                  </>
                )}
                {showSecondLine && (
                  <span className="second-line">
                    {secondLineText}
                    {secondLineText.length < secondLine.length && (
                      <span className="typing-cursor" style={{ background: '#FFD700', boxShadow: '0 0 10px rgba(255,215,0,0.5)' }} />
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className={`scroll-hint ${introComplete ? 'visible' : ''}`}>
              Scroll to continue
              <span className="scroll-arrow">▼</span>
            </div>
          </section>

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
            <p className="footer-text" style={{ marginTop: '1rem' }}>© {new Date().getFullYear()} gamify.it</p>
          </footer>
        </div>
      </div>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={async () => {
          const supabase = createClient();
          // Force refresh session from server
          await supabase.auth.refreshSession();
          const { data: { user } } = await supabase.auth.getUser();
          setUser(user);
        }}
      />
    </>
  );
}
