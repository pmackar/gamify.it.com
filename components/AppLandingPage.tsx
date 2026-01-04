'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

interface Feature {
  icon: string;
  title: string;
  description: string;
}

interface AppLandingPageProps {
  appId: 'fitness' | 'travel' | 'today';
  appName: string;
  tagline: string;
  description: string;
  color: string;
  colorGlow: string;
  icon: React.ReactNode;
  features: Feature[];
  tryPath: string;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  opacity: number;
  delay: number;
}

const PixelParticles = ({ accentColor }: { accentColor: string }) => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = ['#FFD700', accentColor, '#ffffff40'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 30; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 20 + 15,
        opacity: Math.random() * 0.3 + 0.1,
        delay: Math.random() * 10,
      });
    }
    setParticles(newParticles);
  }, [accentColor]);

  return (
    <div className="particles-container">
      {particles.map((p) => (
        <div
          key={p.id}
          className="pixel-particle"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            backgroundColor: p.color,
            opacity: p.opacity,
            animationDuration: `${p.speed}s`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}
    </div>
  );
};

export default function AppLandingPage({
  appId,
  appName,
  tagline,
  description,
  color,
  colorGlow,
  icon,
  features,
  tryPath,
}: AppLandingPageProps) {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/${appId}`
      }
    });
  };

  return (
    <div className="landing-wrapper">
      <PixelParticles accentColor={color} />

      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-icon" style={{ '--accent-color': color, '--accent-glow': colorGlow } as React.CSSProperties}>
            {icon}
          </div>
          <h1 className="hero-title" style={{ color }}>{appName}</h1>
          <p className="hero-tagline">{tagline}</p>
          <p className="hero-description">{description}</p>

          <div className="hero-cta">
            <Link href={tryPath} className="cta-primary" style={{ '--accent-color': color, '--accent-glow': colorGlow } as React.CSSProperties}>
              Try It Free
            </Link>
            <button onClick={handleLogin} className="cta-secondary">
              Sign Up
            </button>
          </div>
        </section>

        {/* Features Section */}
        <section className="features-section">
          <div className="section-header">
            <p className="section-label" style={{ color }}>// FEATURES</p>
            <h2 className="section-title shimmer-text">What You Can Do</h2>
          </div>
          <div className="features-grid">
            {features.map((feature, index) => (
              <div
                key={index}
                className="feature-card"
                style={{ '--accent-color': color, '--accent-glow': colorGlow } as React.CSSProperties}
              >
                <div className="feature-icon">{feature.icon}</div>
                <h3 className="feature-title">{feature.title}</h3>
                <p className="feature-desc">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Ecosystem Section */}
        <section className="ecosystem-section">
          <div className="section-header">
            <p className="section-label" style={{ color }}>// PART OF SOMETHING BIGGER</p>
            <h2 className="section-title shimmer-text">The gamify.it.com Universe</h2>
            <p className="section-subtitle">One character. Multiple worlds. Infinite progress.</p>
          </div>

          <div className="ecosystem-grid">
            <div className="ecosystem-card">
              <div className="ecosystem-icon">&#x1F3AE;</div>
              <h3 className="ecosystem-title">Global Leveling</h3>
              <p className="ecosystem-desc">XP from any app feeds your main level. Level up faster by playing multiple games.</p>
            </div>
            <div className="ecosystem-card">
              <div className="ecosystem-icon">&#x1F525;</div>
              <h3 className="ecosystem-title">Streak Power</h3>
              <p className="ecosystem-desc">30-day streak = 2x XP multiplier on everything. Stay consistent, grow exponentially.</p>
            </div>
            <div className="ecosystem-card">
              <div className="ecosystem-icon">&#x1F3C6;</div>
              <h3 className="ecosystem-title">Achievement Collection</h3>
              <p className="ecosystem-desc">Collect badges from Common to Legendary tier across all games.</p>
            </div>
          </div>

          <div className="ecosystem-visual">
            <div className="app-connector">
              <div className="app-node fitness">&#x1F4AA;</div>
              <div className="app-node today">&#x2705;</div>
              <div className="app-node travel">&#x2708;&#xFE0F;</div>
            </div>
            <div className="connector-line"></div>
            <div className="level-badge-large">
              <span className="level-text">LVL</span>
              <span className="level-number">&#x221E;</span>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="final-cta-section">
          <h2 className="final-title shimmer-text">Ready to Level Up?</h2>
          <p className="final-subtitle">Start your journey today. No credit card required.</p>
          <div className="final-buttons">
            <Link href={tryPath} className="cta-primary large" style={{ '--accent-color': color, '--accent-glow': colorGlow } as React.CSSProperties}>
              Try {appName} Free
            </Link>
            <button onClick={handleLogin} className="cta-secondary large">
              Create Account
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p className="footer-tagline shimmer-text">Life&apos;s not a game... but it should be!</p>
          <p className="footer-text">&copy; {new Date().getFullYear()} GAMIFY.IT.COM</p>
        </footer>
      </div>

      <style jsx>{`
        .landing-wrapper {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(180deg, var(--theme-bg-base) 0%, var(--theme-bg-elevated) 50%, var(--theme-bg-base) 100%);
          position: relative;
          overflow-x: hidden;
        }

        .landing-wrapper::before {
          content: '';
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px);
          pointer-events: none;
          z-index: 1000;
        }

        /* Content */
        .landing-content {
          position: relative;
          z-index: 2;
          font-family: 'Press Start 2P', monospace;
        }

        /* Hero Section */
        .hero-section {
          min-height: 100vh;
          min-height: 100dvh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          padding: calc(var(--content-top, 80px) + 2rem) 2rem 4rem;
        }

        .hero-icon {
          width: 120px;
          height: 120px;
          margin-bottom: 2rem;
          filter: drop-shadow(0 0 30px var(--accent-glow));
          animation: float 3s ease-in-out infinite;
        }

        .hero-icon :global(svg) {
          width: 100%;
          height: 100%;
        }

        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }

        .hero-title {
          font-size: clamp(1.5rem, 5vw, 2.5rem);
          margin-bottom: 1rem;
          text-shadow: 0 0 30px var(--accent-glow);
        }

        .hero-tagline {
          font-size: clamp(0.6rem, 2vw, 0.9rem);
          color: var(--theme-text-secondary);
          margin-bottom: 1.5rem;
          line-height: 1.8;
        }

        .hero-description {
          font-size: 0.5rem;
          color: var(--theme-text-muted);
          max-width: 600px;
          line-height: 2.2;
          margin-bottom: 3rem;
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
        }

        .cta-primary {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 1rem 2rem;
          background: var(--accent-color);
          border: none;
          border-radius: 8px;
          color: #1a1a1a;
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 0 rgba(0,0,0,0.3);
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 rgba(0,0,0,0.3), 0 0 30px var(--accent-glow);
        }

        .cta-primary:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 rgba(0,0,0,0.3);
        }

        .cta-secondary {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 1rem 2rem;
          background: transparent;
          border: 2px solid var(--theme-border-light);
          border-radius: 8px;
          color: var(--theme-text-primary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .cta-secondary:hover {
          border-color: var(--theme-gold);
          color: var(--theme-gold);
        }

        .cta-primary.large,
        .cta-secondary.large {
          padding: 1.25rem 2.5rem;
          font-size: 0.55rem;
        }

        /* Features Section */
        .features-section {
          padding: 6rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 4rem;
        }

        .section-label {
          font-size: 0.45rem;
          letter-spacing: 0.2em;
          margin-bottom: 1rem;
        }

        .section-title {
          font-size: clamp(1rem, 3vw, 1.5rem);
          color: var(--theme-text-primary);
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .section-subtitle {
          font-size: 0.5rem;
          color: var(--theme-text-muted);
          line-height: 2;
        }

        @keyframes rgb-shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .shimmer-text {
          background: linear-gradient(90deg, var(--theme-text-primary) 0%, var(--theme-text-primary) 35%, #ff6b6b 42%, #FFD700 50%, #5fbf8a 58%, var(--theme-text-primary) 65%, var(--theme-text-primary) 100%);
          background-size: 200% 100%;
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: rgb-shimmer 4s ease-in-out infinite;
        }

        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          background: linear-gradient(180deg, var(--theme-bg-card) 0%, var(--theme-bg-elevated) 100%);
          border: 1px solid var(--theme-border);
          border-radius: 12px;
          padding: 1.75rem;
          transition: all 0.3s ease;
        }

        .feature-card:hover {
          border-color: var(--accent-color);
          transform: translateY(-4px);
          box-shadow: 0 10px 30px rgba(0,0,0,0.2), 0 0 20px var(--accent-glow);
        }

        .feature-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .feature-title {
          font-size: 0.55rem;
          color: var(--theme-gold);
          margin-bottom: 0.75rem;
        }

        .feature-desc {
          font-size: 0.45rem;
          color: var(--theme-text-muted);
          line-height: 2;
        }

        /* Ecosystem Section */
        .ecosystem-section {
          padding: 6rem 2rem;
          max-width: 1100px;
          margin: 0 auto;
          background: linear-gradient(180deg, transparent 0%, rgba(255,215,0,0.02) 50%, transparent 100%);
        }

        .ecosystem-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 1.5rem;
          margin-bottom: 4rem;
        }

        .ecosystem-card {
          background: var(--theme-bg-card);
          border: 1px solid var(--theme-border);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          transition: all 0.3s ease;
        }

        .ecosystem-card:hover {
          border-color: var(--theme-gold);
          box-shadow: 0 0 20px var(--theme-gold-glow);
        }

        .ecosystem-icon {
          font-size: 2rem;
          margin-bottom: 1rem;
        }

        .ecosystem-title {
          font-size: 0.55rem;
          color: var(--theme-gold);
          margin-bottom: 0.75rem;
        }

        .ecosystem-desc {
          font-size: 0.45rem;
          color: var(--theme-text-muted);
          line-height: 2;
        }

        .ecosystem-visual {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .app-connector {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }

        .app-node {
          width: 50px;
          height: 50px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.25rem;
          border: 2px solid;
        }

        .app-node.fitness {
          background: rgba(255, 107, 107, 0.2);
          border-color: #FF6B6B;
        }

        .app-node.today {
          background: rgba(92, 201, 245, 0.2);
          border-color: #5CC9F5;
        }

        .app-node.travel {
          background: rgba(95, 191, 138, 0.2);
          border-color: #5fbf8a;
        }

        .connector-line {
          width: 60px;
          height: 2px;
          background: linear-gradient(90deg, var(--theme-border), var(--theme-gold), var(--theme-border));
        }

        .level-badge-large {
          width: 80px;
          height: 80px;
          background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%);
          border: 3px solid #CC8800;
          border-radius: 16px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 0 #996600, 0 0 30px var(--theme-gold-glow);
        }

        .level-text {
          font-size: 0.4rem;
          color: #1a1a1a;
        }

        .level-number {
          font-size: 1.5rem;
          color: #1a1a1a;
        }

        /* Final CTA */
        .final-cta-section {
          padding: 6rem 2rem;
          text-align: center;
        }

        .final-title {
          font-size: clamp(1rem, 3vw, 1.5rem);
          margin-bottom: 1rem;
        }

        .final-subtitle {
          font-size: 0.5rem;
          color: var(--theme-text-muted);
          margin-bottom: 2rem;
        }

        .final-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          flex-wrap: wrap;
        }

        /* Footer */
        .landing-footer {
          padding: 4rem 2rem;
          text-align: center;
          border-top: 1px solid var(--theme-border);
        }

        .footer-tagline {
          font-size: 0.5rem;
          margin-bottom: 1rem;
        }

        .footer-text {
          font-size: 0.35rem;
          color: var(--theme-text-muted);
        }

        /* Particles */
        :global(.particles-container) {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        :global(.pixel-particle) {
          position: absolute;
          image-rendering: pixelated;
          animation: float-up linear infinite;
        }

        @keyframes float-up {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }

        /* Responsive */
        @media (max-width: 768px) {
          .hero-section {
            padding: calc(var(--content-top, 80px) + 1rem) 1rem 3rem;
          }

          .hero-icon {
            width: 80px;
            height: 80px;
          }

          .features-section,
          .ecosystem-section,
          .final-cta-section {
            padding: 4rem 1rem;
          }

          .ecosystem-visual {
            flex-direction: column;
          }

          .app-connector {
            flex-direction: row;
          }

          .connector-line {
            width: 2px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}
