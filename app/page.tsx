'use client';

import { useEffect, useState } from 'react';

const videos = [
  '/8-bit city road/8-bit city road_front.mp4',
  '/8-bit city road/8-bit city road_side.mp4',
  '/8-bit city road/8-bit city road_back.mp4',
];

export default function Home() {
  const [typedText, setTypedText] = useState('');
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [secondLineText, setSecondLineText] = useState('');
  const [blinkDots, setBlinkDots] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [videoTurningOn, setVideoTurningOn] = useState(false);
  const [videoLoaded, setVideoLoaded] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    realms: true,
    abilities: true,
  });

  const firstLine = "Life's not a game";
  const secondLine = "but it should be!";

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  useEffect(() => {
    let charIndex = 0;
    let dotBlinks = 0;

    // Type first line
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
                // Trigger CRT turn-on effect for video
                setVideoTurningOn(true);
                setTimeout(() => setShowVideo(true), 400);
                // Mark as loaded after CRT animation completes
                setTimeout(() => setVideoLoaded(true), 900);
                // Mark intro complete after delay
                setTimeout(() => setIntroComplete(true), 1500);
              }
            }, 80);
          }
        }, 300);
      }
    }, 100);

    return () => clearInterval(typeFirstLine);
  }, []);

  // Cycle through videos
  useEffect(() => {
    const videoInterval = setInterval(() => {
      setCurrentVideoIndex((prev) => (prev + 1) % videos.length);
    }, 10000); // Switch every 10 seconds

    return () => clearInterval(videoInterval);
  }, []);

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        * {
          box-sizing: border-box;
          margin: 0;
          padding: 0;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          background: #0a0a0a;
        }

        .crt-wrapper {
          background: #1a1a1a;
          position: relative;
          overflow: hidden;
        }

        /* CRT Scanlines */
        .crt-wrapper::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15),
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 1000;
        }

        /* CRT Vignette */
        .crt-wrapper::after {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 60%,
            rgba(0, 0, 0, 0.4) 100%
          );
          pointer-events: none;
          z-index: 999;
        }

        /* Screen flicker animation */
        @keyframes flicker {
          0% { opacity: 0.97; }
          50% { opacity: 1; }
          100% { opacity: 0.98; }
        }

        /* Typing cursor blink */
        @keyframes cursor-blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }

        .page-content {
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          animation: flicker 0.15s infinite;
        }

        /* CRT TV Intro Section */
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
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
          overflow: hidden;
        }

        .video-background video {
          position: absolute;
          top: 50%;
          left: 50%;
          min-width: 100%;
          min-height: 100%;
          width: auto;
          height: auto;
          transform: translate(-50%, -50%) scaleY(0);
          object-fit: cover;
          opacity: 0;
          transition: opacity 1.5s ease-in-out;
        }

        .video-background video.active {
          opacity: 0.5;
          transform: translate(-50%, -50%) scaleY(1);
        }

        /* Simple fade for video transitions after initial load */
        .video-background.loaded video {
          transition: opacity 0.5s ease-in-out;
          transform: translate(-50%, -50%) scaleY(1);
        }

        .video-background.loaded video.active {
          opacity: 0.5;
        }

        /* CRT Turn-on effect - only on first load */
        .video-background.crt-on:not(.loaded) video.active {
          animation: crt-turn-on 0.5s ease-out forwards;
        }

        @keyframes crt-turn-on {
          0% {
            opacity: 0;
            transform: translate(-50%, -50%) scaleY(0.005) scaleX(0.8);
            filter: brightness(10);
          }
          30% {
            opacity: 1;
            transform: translate(-50%, -50%) scaleY(0.005) scaleX(0.9);
            filter: brightness(10);
          }
          50% {
            transform: translate(-50%, -50%) scaleY(1.1) scaleX(1);
            filter: brightness(2);
          }
          70% {
            transform: translate(-50%, -50%) scaleY(0.95) scaleX(1);
            filter: brightness(1);
          }
          100% {
            opacity: 0.5;
            transform: translate(-50%, -50%) scaleY(1) scaleX(1);
            filter: brightness(1);
          }
        }

        /* White flash overlay for CRT effect */
        .crt-flash {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: white;
          opacity: 0;
          z-index: 0;
          pointer-events: none;
        }

        .crt-flash.flash {
          animation: crt-flash 0.3s ease-out;
        }

        @keyframes crt-flash {
          0% { opacity: 0; }
          20% { opacity: 0.8; }
          100% { opacity: 0; }
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(ellipse at center, transparent 0%, rgba(0, 0, 0, 0.7) 100%);
          z-index: 1;
        }

        .crt-screen {
          max-width: 800px;
          text-align: center;
          position: relative;
          z-index: 2;
        }

        .typing-text {
          font-size: clamp(1.3rem, 5.2vw, 2.3rem);
          line-height: 2;
          color: #00ff00;
        }

        .typing-cursor {
          display: inline-block;
          width: 0.6em;
          height: 1.2em;
          background: #00ff00;
          margin-left: 0.2em;
          animation: cursor-blink 0.8s infinite;
          vertical-align: middle;
          box-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        }

        .dots {
          color: #00ff00;
          text-shadow: 0 0 10px rgba(0, 255, 0, 0.5);
        }

        .second-line {
          display: block;
          margin-top: 0.5rem;
          color: #FFD700;
        }

        .scroll-hint {
          position: absolute;
          bottom: 2rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.5rem;
          color: #666;
          animation: bounce 2s infinite;
          opacity: 0;
          transition: opacity 0.5s;
        }

        .scroll-hint.visible {
          opacity: 1;
        }

        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-10px); }
        }

        .scroll-arrow {
          display: block;
          margin-top: 0.5rem;
          font-size: 1rem;
        }

        /* Navigation */
        .retro-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          padding: 1rem;
        }

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
          font-size: 0.7rem;
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        .nav-links {
          display: none;
          align-items: center;
          gap: 1.5rem;
        }

        .nav-links a {
          font-size: 0.5rem;
          color: #888;
          text-decoration: none;
          transition: color 0.2s;
        }

        .nav-links a:hover {
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        @media (min-width: 768px) {
          .nav-links {
            display: flex;
          }
        }

        .nav-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          padding: 0.5rem 1rem;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 4px;
          color: #1a1a1a;
          cursor: pointer;
          box-shadow: 0 3px 0 #996600;
          transition: all 0.1s;
        }

        .nav-btn:hover {
          transform: translateY(1px);
          box-shadow: 0 2px 0 #996600;
        }

        .nav-btn-secondary {
          background: transparent;
          border-color: #FFD700;
          color: #FFD700;
          box-shadow: none;
        }

        /* Section styling */
        .retro-section {
          padding: 6rem 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-label {
          font-size: 0.5rem;
          color: var(--rpg-teal, #5fbf8a);
          text-shadow: 0 0 8px rgba(95, 191, 138, 0.5);
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: clamp(1rem, 3vw, 1.5rem);
          font-weight: normal;
          margin-bottom: 1rem;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        /* Shimmer text effect */
        .shimmer-text {
          background: linear-gradient(
            90deg,
            #fff 0%,
            #fff 40%,
            #5fbf8a 45%,
            #FFD700 50%,
            #5fbf8a 55%,
            #fff 60%,
            #fff 100%
          );
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: shimmer 3s ease-in-out infinite;
        }

        @keyframes shimmer {
          0% { background-position: 100% 0; }
          100% { background-position: -100% 0; }
        }

        .keyword {
          color: #5fbf8a;
          -webkit-text-fill-color: #5fbf8a;
          text-shadow: 0 0 20px rgba(95, 191, 138, 0.5);
        }

        .keyword-gold {
          color: #FFD700;
          -webkit-text-fill-color: #FFD700;
          text-shadow: 0 0 20px rgba(255, 215, 0, 0.5);
        }

        .section-subtitle {
          font-size: 0.55rem;
          color: #888;
          line-height: 2;
          max-width: 600px;
          margin: 0 auto;
        }

        /* Collapsible Sections */
        .collapsible-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          cursor: pointer;
          user-select: none;
        }

        .collapsible-header:hover .section-title {
          text-shadow: 0 0 15px rgba(95, 191, 138, 0.5);
        }

        .section-toggle {
          font-size: 0.8rem;
          color: var(--rpg-teal, #5fbf8a);
        }

        .section-content {
          overflow: hidden;
          transition: max-height 0.4s ease-out, opacity 0.4s ease-out;
        }

        .section-content.collapsed {
          max-height: 0;
          opacity: 0;
        }

        .section-content.expanded {
          max-height: 2000px;
          opacity: 1;
        }

        /* RPG Banner */
        .rpg-banner {
          width: 100%;
          max-width: 1000px;
          margin: 0 auto 2rem;
          padding: 0 1.5rem;
        }

        .rpg-banner img {
          width: 100%;
          height: auto;
          max-height: 160px;
          object-fit: cover;
          border-radius: 8px;
          image-rendering: pixelated;
          border: 2px solid #3a3a3a;
        }

        /* Hero stats */
        .hero-stats {
          display: flex;
          justify-content: center;
          gap: 2rem;
          margin-top: 3rem;
          flex-wrap: wrap;
        }

        .stat-card {
          background: #2d2d2d;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 1.5rem 2rem;
          text-align: center;
          box-shadow: 0 4px 0 #1a1a1a;
          min-width: 120px;
        }

        .stat-value {
          font-size: 1.5rem;
          color: #FFD700;
          text-shadow: 0 0 10px rgba(255, 215, 0, 0.5);
          margin-bottom: 0.5rem;
        }

        .stat-label {
          font-size: 0.5rem;
          color: #888;
        }

        /* Product cards */
        .products-grid {
          display: grid;
          gap: 1.5rem;
        }

        @media (min-width: 768px) {
          .products-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .product-card {
          background: #2d2d2d;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 1.5rem;
          box-shadow: 0 4px 0 #1a1a1a;
          transition: all 0.2s;
        }

        .product-card:hover {
          transform: translateY(-4px);
          border-color: #FFD700;
          box-shadow: 0 8px 0 #1a1a1a, 0 0 20px rgba(255, 215, 0, 0.2);
        }

        .product-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .product-name {
          font-size: 0.7rem;
          color: #fff;
          margin-bottom: 0.25rem;
        }

        .product-domain {
          font-size: 0.5rem;
          color: #FFD700;
          margin-bottom: 1rem;
        }

        .product-desc {
          font-size: 0.5rem;
          color: #888;
          line-height: 2;
          margin-bottom: 1rem;
        }

        .product-status {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.45rem;
          color: #00ff00;
          margin-bottom: 1rem;
        }

        .status-dot {
          width: 6px;
          height: 6px;
          background: #00ff00;
          border-radius: 50%;
          box-shadow: 0 0 8px #00ff00;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .product-btn {
          display: block;
          width: 100%;
          padding: 0.75rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          text-align: center;
          text-decoration: none;
          background: #3a3a3a;
          border: 2px solid #4a4a4a;
          border-radius: 4px;
          color: #fff;
          cursor: pointer;
          box-shadow: 0 3px 0 #222;
          transition: all 0.1s;
        }

        .product-btn:hover {
          background: #4a4a4a;
          transform: translateY(1px);
          box-shadow: 0 2px 0 #222;
        }

        /* Features grid */
        .features-grid {
          display: grid;
          gap: 1rem;
        }

        @media (min-width: 768px) {
          .features-grid {
            grid-template-columns: repeat(4, 1fr);
          }
        }

        .feature-card {
          background: #2d2d2d;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          padding: 1.5rem;
          text-align: center;
          box-shadow: 0 4px 0 #1a1a1a;
        }

        .feature-icon {
          font-size: 1.5rem;
          margin-bottom: 1rem;
        }

        .feature-title {
          font-size: 0.55rem;
          color: #fff;
          margin-bottom: 0.5rem;
        }

        .feature-desc {
          font-size: 0.45rem;
          color: #888;
          line-height: 1.8;
        }

        /* CTA section */
        .cta-section {
          text-align: center;
          padding: 4rem 2rem;
          background: #2d2d2d;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          box-shadow: 0 4px 0 #1a1a1a;
          margin: 0 1.5rem;
          max-width: 800px;
          margin-left: auto;
          margin-right: auto;
        }

        .cta-title {
          font-size: clamp(0.9rem, 2.5vw, 1.25rem);
          margin-bottom: 1rem;
        }

        .cta-subtitle {
          font-size: 0.55rem;
          color: #888;
          margin-bottom: 2rem;
        }

        .cta-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          text-decoration: none;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 2px solid #CC8800;
          border-radius: 8px;
          color: #1a1a1a;
          cursor: pointer;
          box-shadow: 0 4px 0 #996600;
          transition: all 0.1s;
        }

        .cta-btn:hover {
          transform: translateY(2px);
          box-shadow: 0 2px 0 #996600;
        }

        /* Footer Banner */
        .footer-banner {
          width: 100%;
          margin-top: 4rem;
        }

        .footer-banner img {
          width: 100%;
          height: auto;
          max-height: 180px;
          object-fit: cover;
          object-position: center;
          image-rendering: pixelated;
          display: block;
        }

        /* Footer */
        .retro-footer {
          padding: 2rem 1.5rem;
          text-align: center;
        }

        .footer-copyright {
          font-size: 0.45rem;
          color: #444;
        }

        /* Progress Bar */
        .rpg-progress {
          height: 4px;
          background: linear-gradient(90deg,
            var(--rpg-teal, #5fbf8a) 0%,
            var(--rpg-gold, #FFD700) 50%,
            var(--rpg-teal, #5fbf8a) 100%
          );
          max-width: 800px;
          margin: 0 auto 2rem;
          border-radius: 2px;
        }
      `}</style>

      <div className="crt-wrapper">
        <div className="page-content">
          {/* Navigation */}
          <nav className="retro-nav">
            <div className="nav-bar">
              <span className="nav-logo">gamify.it.com</span>
              <div className="nav-links">
                <a href="#realms">Games</a>
                <a href="#abilities">Progress</a>
                <a
                  href="https://gamify-fitness.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="nav-btn"
                >
                  Play Now
                </a>
              </div>
            </div>
          </nav>

          {/* CRT TV Intro */}
          <section className="crt-intro">
            {/* Video Background */}
            <div className={`video-background ${videoTurningOn ? 'crt-on' : ''} ${videoLoaded ? 'loaded' : ''}`}>
              <div className={`crt-flash ${videoTurningOn ? 'flash' : ''}`} />
              {videos.map((src, index) => (
                <video
                  key={src}
                  className={showVideo && index === currentVideoIndex ? 'active' : ''}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
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
                    {typedText.length === firstLine.length && !blinkDots ? null : (
                      <span className="typing-cursor" />
                    )}
                  </>
                )}
                {showSecondLine && (
                  <span className="second-line">
                    {secondLineText}
                    {secondLineText.length < secondLine.length && (
                      <span className="typing-cursor" style={{ background: '#FFD700', boxShadow: '0 0 10px rgba(255, 215, 0, 0.5)' }} />
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

          {/* Hero Stats */}
          <section className="retro-section">
            <div className="section-header">
              <p className="section-label">Welcome to gamify.it.com</p>
              <h2 className="section-title shimmer-text">Transform Your Reality Into Adventure</h2>
              <p className="section-subtitle">
                Where everyday tasks become epic quests. Earn experience, unlock achievements, and level up your life through the power of play.
              </p>
            </div>
            <div className="hero-stats">
              <div className="stat-card">
                <div className="stat-value">3</div>
                <div className="stat-label">REALMS</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">50+</div>
                <div className="stat-label">ACHIEVEMENTS</div>
              </div>
              <div className="stat-card">
                <div className="stat-value">∞</div>
                <div className="stat-label">POTENTIAL</div>
              </div>
            </div>
          </section>

          {/* Products/Realms */}
          <section id="realms" className="retro-section">
            <div className="section-header">
              <p className="section-label">CHOOSE YOUR STORY</p>
              <div
                className="collapsible-header"
                onClick={() => toggleSection('realms')}
              >
                <span className="section-toggle">
                  {expandedSections.realms ? '▾' : '▸'}
                </span>
                <h2 className="section-title shimmer-text">Choose your Game</h2>
              </div>
              <p className="section-subtitle">
                Each app serves a unique purpose in your life. Where will your adventure begin?
              </p>
            </div>
            <div className={`section-content ${expandedSections.realms ? 'expanded' : 'collapsed'}`}>
            <div className="products-grid">
              {/* gamify.fitness */}
              <div className="product-card">
                <div className="product-icon">🔥</div>
                <h3 className="product-name">gamify.fitness</h3>
                <p className="product-domain">fitness.gamify.it.com</p>
                <p className="product-desc">
                  Forge your legend through iron and sweat. Every workout becomes a battle, every rep a step toward greatness.
                </p>
                <div className="product-status">
                  <span className="status-dot" />
                  TESTING
                </div>
                <a
                  href="https://gamify-fitness.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-btn"
                >
                  Enter Realm
                </a>
              </div>

              {/* Day Quest */}
              <div className="product-card">
                <div className="product-icon">📋</div>
                <h3 className="product-name">Day Quest</h3>
                <p className="product-domain">dayquest.gamify.it.com</p>
                <p className="product-desc">
                  Transform mundane tasks into legendary quests. Defeat the procrastination dragon and master your daily destiny.
                </p>
                <div className="product-status">
                  <span className="status-dot" />
                  TESTING
                </div>
                <a
                  href="https://gamify-today.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="product-btn"
                >
                  Enter Realm
                </a>
              </div>

              {/* Explorer */}
              <div className="product-card">
                <div className="product-icon">🧭</div>
                <h3 className="product-name">Explorer</h3>
                <p className="product-domain">gamify.travel</p>
                <p className="product-desc">
                  Uncover hidden realms in your own neighborhood. Every location holds secrets, every journey earns experience.
                </p>
                <div className="product-status">
                  <span className="status-dot" style={{ background: '#FFD700', boxShadow: '0 0 8px #FFD700' }} />
                  <span style={{ color: '#FFD700' }}>PREVIEW</span>
                </div>
                <a href="/travel" className="product-btn">
                  Learn More
                </a>
              </div>
            </div>
            </div>
          </section>

          {/* Features/Abilities */}
          <section id="abilities" className="retro-section">
            <div className="section-header">
              <p className="section-label">POWER UP!</p>
              <h2 className="section-title shimmer-text">Every action builds toward something greater</h2>
            </div>
            <div className={`section-content ${expandedSections.abilities ? 'expanded' : 'collapsed'}`}>
            <div className="features-grid">
              <div className="feature-card">
                <div className="feature-icon">⭐</div>
                <h4 className="feature-title">Earn XP</h4>
                <p className="feature-desc">Every action rewards experience points toward your next level</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">🏆</div>
                <h4 className="feature-title">Achievements</h4>
                <p className="feature-desc">Unlock badges and trophies as you conquer new challenges</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">📊</div>
                <h4 className="feature-title">Track Progress</h4>
                <p className="feature-desc">Visualize your growth with beautiful stats and insights</p>
              </div>
              <div className="feature-card">
                <div className="feature-icon">✅</div>
                <h4 className="feature-title">Build Habits</h4>
                <p className="feature-desc">Form lasting routines through positive reinforcement</p>
              </div>
            </div>
            </div>
          </section>

          {/* CTA */}
          <section className="retro-section">
            <div className="cta-section">
              <h2 className="cta-title shimmer-text">Ready to Level Up?</h2>
              <p className="cta-subtitle">Your adventure awaits. Start with gamify.fitness.</p>
              <a
                href="https://gamify-fitness.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="cta-btn"
              >
                ▶ Begin Your Quest
              </a>
            </div>
          </section>

          {/* Progress Bar */}
          <div className="rpg-progress"></div>

          {/* Footer */}
          <footer className="retro-footer">
            <p className="footer-copyright">
              © {new Date().getFullYear()} gamify.it.com
            </p>
          </footer>
        </div>
      </div>
    </>
  );
}
