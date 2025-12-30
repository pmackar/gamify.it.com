'use client';

import { useEffect } from 'react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';

// Logo SVG Component
const Logo = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" stroke="url(#logo-gradient)" strokeWidth="2" fill="none"/>
    <path d="M16 6 L20 14 L28 16 L20 18 L16 26 L12 18 L4 16 L12 14 Z" fill="url(#logo-gradient)"/>
    <defs>
      <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#00d4ff"/>
        <stop offset="100%" stopColor="#a855f7"/>
      </linearGradient>
    </defs>
  </svg>
);

// Icon Components
const PlayIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="5 3 19 12 5 21 5 3"/>
  </svg>
);

const FireIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6.5 6.5c1.5-1.5 3-2 4.5-1.5s2 2.5.5 4.5c-1 1.5-.5 2 .5 2.5s2 .5 3-1c.5-1 1-1.5 1.5-1.5s1 .5 1 1.5c0 2-1 4-3 5s-4.5 1-6.5-1S4 9 6.5 6.5z"/>
    <path d="M12 21c-3 0-6-2-6-6 0-2 1-3 2-4"/>
  </svg>
);

const DocumentIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
    <polyline points="14 2 14 8 20 8"/>
    <line x1="9" y1="15" x2="15" y2="15"/>
    <line x1="9" y1="11" x2="15" y2="11"/>
  </svg>
);

const CompassIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

const MedalIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="8" r="6"/>
    <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/>
  </svg>
);

const ChartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M18 20V10"/>
    <path d="M12 20V4"/>
    <path d="M6 20v-6"/>
  </svg>
);

const CheckCircleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
    <path d="m9 12 2 2 4-4"/>
  </svg>
);

const PlayCircleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="10 8 16 12 10 16 10 8"/>
  </svg>
);

// Pyrefly particles data
const pyreflies = [
  { left: '10%', delay: '0s', duration: '12s' },
  { left: '20%', delay: '2s', duration: '14s' },
  { left: '30%', delay: '4s', duration: '16s' },
  { left: '40%', delay: '1s', duration: '13s' },
  { left: '50%', delay: '3s', duration: '15s' },
  { left: '60%', delay: '5s', duration: '11s' },
  { left: '70%', delay: '2.5s', duration: '17s' },
  { left: '80%', delay: '4.5s', duration: '14s' },
  { left: '90%', delay: '1.5s', duration: '12s' },
  { left: '15%', delay: '6s', duration: '18s' },
  { left: '35%', delay: '7s', duration: '13s' },
  { left: '55%', delay: '8s', duration: '15s' },
  { left: '75%', delay: '9s', duration: '16s' },
  { left: '85%', delay: '10s', duration: '14s' },
  { left: '25%', delay: '11s', duration: '17s' },
];

export default function Home() {
  useEffect(() => {
    // Start hero animations
    const timeout = setTimeout(() => {
      document.querySelectorAll('.hero .animate-fade-in').forEach(el => {
        (el as HTMLElement).style.animationPlayState = 'running';
      });
    }, 100);

    // Intersection observer for scroll animations
    const observerOptions = {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          (entry.target as HTMLElement).style.animationPlayState = 'running';
        }
      });
    }, observerOptions);

    document.querySelectorAll('.animate-fade-in').forEach(el => {
      (el as HTMLElement).style.animationPlayState = 'paused';
      observer.observe(el);
    });

    return () => {
      clearTimeout(timeout);
      observer.disconnect();
    };
  }, []);

  return (
    <>
      {/* Background */}
      <div className="bg-gradient" />

      {/* Pyrefly Particles */}
      <div className="pyreflies">
        {pyreflies.map((p, i) => (
          <div
            key={i}
            className="pyrefly"
            style={{
              left: p.left,
              animationDelay: p.delay,
              animationDuration: p.duration,
            }}
          />
        ))}
      </div>

      {/* Navigation */}
      <nav>
        <div className="nav-inner">
          <div className="nav-content glass">
            <div className="nav-logo">
              <Logo />
              <span className="font-display">gamify.it.com</span>
            </div>
            <div className="nav-links">
              <a href="#products">Realms</a>
              <a href="#features">Abilities</a>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="btn-primary nav-cta">
                    Sign In
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <a
                  href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-secondary nav-cta"
                >
                  Iron Quest
                </a>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-10 h-10"
                    }
                  }}
                />
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="hero">
        <div className="container">
          <div className="hero-content">
            <div className="hero-badge animate-fade-in" style={{ opacity: 0 }}>
              Testing
            </div>

            <h1 className="animate-fade-in delay-100" style={{ opacity: 0 }}>
              Transform Your <strong>Reality</strong><br />Into Adventure
            </h1>

            <p className="hero-subtitle animate-fade-in delay-200" style={{ opacity: 0 }}>
              Where everyday tasks become epic quests. Earn experience, unlock achievements, and level up your life through the power of play.
            </p>

            <div className="hero-buttons animate-fade-in delay-300" style={{ opacity: 0 }}>
              <a
                href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <PlayIcon />
                Start Your Journey
              </a>
              <a href="#products" className="btn-secondary">
                Explore Realms
              </a>
            </div>

            <div className="hero-stats animate-fade-in delay-400" style={{ opacity: 0 }}>
              <div className="hero-stat">
                <div className="hero-stat-value font-display">3</div>
                <div className="hero-stat-label">Realms</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value font-display">50+</div>
                <div className="hero-stat-label">Achievements</div>
              </div>
              <div className="hero-stat">
                <div className="hero-stat-value font-display">&infin;</div>
                <div className="hero-stat-label">Potential</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Products */}
      <section id="products" className="products">
        <div className="container">
          <div className="section-header">
            <p className="section-label font-display">Choose Your Path</p>
            <h2 className="section-title">Enter the <strong>Realms</strong></h2>
            <p className="section-subtitle">
              Each realm offers unique challenges and rewards. Where will your adventure begin?
            </p>
          </div>

          <div className="products-grid">
            {/* Iron Quest */}
            <div className="product-card glass-card">
              <div className="product-icon fire">
                <FireIcon />
              </div>
              <h3>Iron Quest</h3>
              <p className="product-domain">gamify.fitness</p>
              <p>
                Forge your legend through iron and sweat. Every workout becomes a battle, every rep a step toward greatness. Rise through the ranks of strength.
              </p>
              <div className="product-status live">Testing</div>
              <div className="product-cta">
                <a
                  href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary"
                >
                  Enter Realm
                </a>
              </div>
            </div>

            {/* Quest Log */}
            <div className="product-card glass-card">
              <div className="product-icon nature">
                <DocumentIcon />
              </div>
              <h3>Quest Log</h3>
              <p className="product-domain">gamify.today</p>
              <p>
                Transform mundane tasks into legendary quests. Defeat the procrastination dragon, collect productivity gems, and master your daily destiny.
              </p>
              <div className="product-status coming-soon">Coming Soon</div>
            </div>

            {/* World Map */}
            <div className="product-card glass-card">
              <div className="product-icon arcane">
                <CompassIcon />
              </div>
              <h3>World Map</h3>
              <p className="product-domain">gamify.travel</p>
              <p>
                Uncover hidden realms in your own neighborhood. Every location holds secrets, every journey earns experience. The world awaits your discovery.
              </p>
              <div className="product-status coming-soon">Coming Soon</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="features">
        <div className="container">
          <div className="section-header">
            <p className="section-label font-display">Power Up</p>
            <h2 className="section-title">Unlock Your <strong>Abilities</strong></h2>
            <p className="section-subtitle">Every action builds toward something greater</p>
          </div>

          <div className="features-grid">
            <div className="feature-card glass-card">
              <div className="feature-icon">
                <StarIcon />
              </div>
              <h4>Earn XP</h4>
              <p>Every action rewards experience points toward your next level</p>
            </div>

            <div className="feature-card glass-card">
              <div className="feature-icon">
                <MedalIcon />
              </div>
              <h4>Achievements</h4>
              <p>Unlock badges and trophies as you conquer new challenges</p>
            </div>

            <div className="feature-card glass-card">
              <div className="feature-icon">
                <ChartIcon />
              </div>
              <h4>Track Progress</h4>
              <p>Visualize your growth with beautiful stats and insights</p>
            </div>

            <div className="feature-card glass-card">
              <div className="feature-icon">
                <CheckCircleIcon />
              </div>
              <h4>Build Habits</h4>
              <p>Form lasting routines through the power of positive reinforcement</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta">
        <div className="container">
          <div className="cta-inner">
            <div className="cta-card glass-card">
              <h2>Ready to <strong>Level Up</strong>?</h2>
              <p>Your adventure awaits. Start with Iron Quest - completely free.</p>
              <a
                href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-primary"
              >
                <PlayCircleIcon />
                Begin Your Quest
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <Logo />
              <span className="font-display">gamify.it.com</span>
            </div>

            <div className="footer-links">
              <a
                href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
              >
                Iron Quest
              </a>
              <a href="#products">All Realms</a>
            </div>

            <p className="footer-copyright">
              &copy; {new Date().getFullYear()} gamify.it.com &middot; Level Up Your Life
            </p>
          </div>
        </div>
      </footer>
    </>
  );
}
