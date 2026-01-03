'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

// Achievement data for showcase
const SHOWCASE_ACHIEVEMENTS = [
  { name: 'One Plate Club', icon: '🏋️', tier: 'Common', weight: '135 lbs', lift: 'Bench' },
  { name: 'Two Plate Warrior', icon: '🔥', tier: 'Rare', weight: '225 lbs', lift: 'Bench' },
  { name: 'Three Plate Beast', icon: '🦍', tier: 'Epic', weight: '315 lbs', lift: 'Squat' },
  { name: 'Four Plate Legend', icon: '⚡', tier: 'Epic', weight: '405 lbs', lift: 'Squat' },
  { name: 'Five Plate God', icon: '👑', tier: 'Legendary', weight: '495 lbs', lift: 'Deadlift' },
  { name: 'Iron Will', icon: '🔥', tier: 'Rare', weight: '7 days', lift: 'Streak' },
];

const TIER_COLORS: Record<string, string> = {
  Common: '#5fbf8a',
  Rare: '#5CC9F5',
  Epic: '#a855f7',
  Legendary: '#FFD700',
};

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

const PixelParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    const colors = ['#FFD700', '#FF6B6B', '#ffffff40'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 25; i++) {
      newParticles.push({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 100,
        size: Math.random() * 3 + 2,
        color: colors[Math.floor(Math.random() * colors.length)],
        speed: Math.random() * 20 + 15,
        opacity: Math.random() * 0.25 + 0.1,
        delay: Math.random() * 10,
      });
    }
    setParticles(newParticles);
  }, []);

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

// Interactive Demo Component
const InteractiveDemo = () => {
  const [weight, setWeight] = useState('135');
  const [reps, setReps] = useState('8');
  const [logged, setLogged] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showPR, setShowPR] = useState(false);

  const handleLog = () => {
    const w = parseInt(weight) || 135;
    const r = parseInt(reps) || 8;
    const xp = Math.round((w * r) / 10 * 3); // Tier 1 multiplier
    setXpEarned(xp);
    setLogged(true);
    setShowPR(w >= 135);

    // Reset after animation
    setTimeout(() => {
      setLogged(false);
      setShowPR(false);
    }, 3000);
  };

  return (
    <div className="demo-widget">
      <div className="demo-header">
        <span className="demo-label">TRY IT NOW</span>
        <span className="demo-exercise">Bench Press</span>
      </div>

      <div className="demo-inputs">
        <div className="demo-input-group">
          <input
            type="number"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="demo-input"
            disabled={logged}
          />
          <span className="demo-unit">lbs</span>
        </div>
        <span className="demo-x">×</span>
        <div className="demo-input-group">
          <input
            type="number"
            value={reps}
            onChange={(e) => setReps(e.target.value)}
            className="demo-input"
            disabled={logged}
          />
          <span className="demo-unit">reps</span>
        </div>
        <button
          onClick={handleLog}
          className={`demo-log-btn ${logged ? 'logged' : ''}`}
          disabled={logged}
        >
          {logged ? '✓' : 'LOG'}
        </button>
      </div>

      <div className={`demo-results ${logged ? 'show' : ''}`}>
        <div className="demo-xp-popup">
          <span className="xp-amount">+{xpEarned} XP</span>
          <span className="xp-label">earned!</span>
        </div>
        {showPR && (
          <div className="demo-pr-popup">
            <span className="pr-icon">🏆</span>
            <span className="pr-text">NEW PR!</span>
          </div>
        )}
      </div>
    </div>
  );
};

// Phone Mockup Component
const PhoneMockup = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="phone-mockup">
    <div className="phone-notch"></div>
    <div className="phone-screen">
      <div className="phone-status-bar">
        <span>9:41</span>
        <span>●●●●● 100%</span>
      </div>
      <div className="phone-content">
        {children}
      </div>
    </div>
    <div className="phone-label">{title}</div>
  </div>
);

export default function FitnessLandingPage() {
  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/fitness`
      }
    });
  };

  return (
    <div className="landing-wrapper">
      <PixelParticles />

      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          <div className="hero-badge">
            <span className="badge-icon">🎮</span>
            <span className="badge-text">RPG FITNESS TRACKER</span>
          </div>

          <h1 className="hero-title">
            Your Gym is Now<br />
            <span className="title-accent">a Dungeon.</span>
          </h1>

          <p className="hero-tagline">
            Every rep is XP. Every workout is a quest.<br />
            Every PR is a boss defeated.
          </p>

          <div className="hero-cta">
            <Link href="/fitness?try=true" className="cta-primary">
              Start Your Quest
            </Link>
            <button onClick={handleLogin} className="cta-secondary">
              Sign Up Free
            </button>
          </div>

          <div className="scroll-indicator">
            <span>See how it works</span>
            <div className="scroll-arrow">↓</div>
          </div>
        </section>

        {/* Stats Bar */}
        <section className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">10K+</span>
            <span className="stat-label">Sets Logged</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">500+</span>
            <span className="stat-label">PRs Hit</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">60+</span>
            <span className="stat-label">Exercises</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">∞</span>
            <span className="stat-label">Levels</span>
          </div>
        </section>

        {/* How It Works */}
        <section className="how-section">
          <div className="section-header">
            <span className="section-label">// HOW IT WORKS</span>
            <h2 className="section-title">Three Steps to Level Up</h2>
          </div>

          <div className="steps-grid">
            <div className="step-card">
              <div className="step-number">1</div>
              <div className="step-icon">📝</div>
              <h3 className="step-title">Log Your Sets</h3>
              <p className="step-desc">Type naturally: "bench 185 x 8" and watch it log instantly</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">2</div>
              <div className="step-icon">⚡</div>
              <h3 className="step-title">Earn XP</h3>
              <p className="step-desc">Every set awards XP based on weight, reps, and exercise tier</p>
            </div>
            <div className="step-arrow">→</div>
            <div className="step-card">
              <div className="step-number">3</div>
              <div className="step-icon">🎖️</div>
              <h3 className="step-title">Level Up</h3>
              <p className="step-desc">Unlock achievements, hit milestones, become legendary</p>
            </div>
          </div>
        </section>

        {/* Interactive Demo */}
        <section className="demo-section">
          <div className="section-header">
            <span className="section-label">// TRY IT</span>
            <h2 className="section-title">Feel the Dopamine Hit</h2>
            <p className="section-subtitle">Log a fake set. See what happens.</p>
          </div>

          <InteractiveDemo />
        </section>

        {/* App Preview */}
        <section className="preview-section">
          <div className="section-header">
            <span className="section-label">// THE APP</span>
            <h2 className="section-title">Built for Lifters</h2>
            <p className="section-subtitle">Command palette interface. No tapping through menus.</p>
          </div>

          <div className="preview-grid">
            <PhoneMockup title="Command Input">
              <div className="mock-workout">
                <div className="mock-exercise-header">
                  <span className="mock-exercise-name">BENCH PRESS</span>
                  <span className="mock-pr-badge">PR: 225</span>
                </div>
                <div className="mock-sets">
                  <div className="mock-set">135 × 10</div>
                  <div className="mock-set">185 × 8</div>
                  <div className="mock-set active">205 × 6 <span className="mock-xp">+62 XP</span></div>
                </div>
                <div className="mock-input">
                  <span className="mock-cursor">|</span> 225 x 5
                </div>
              </div>
            </PhoneMockup>

            <PhoneMockup title="Achievement Unlock">
              <div className="mock-achievement">
                <div className="mock-achievement-glow"></div>
                <div className="mock-achievement-icon">🔥</div>
                <div className="mock-achievement-title">TWO PLATE WARRIOR</div>
                <div className="mock-achievement-desc">Bench Press 225 lbs</div>
                <div className="mock-achievement-xp">+1,000 XP</div>
                <div className="mock-achievement-tier">RARE</div>
              </div>
            </PhoneMockup>

            <PhoneMockup title="Level Progress">
              <div className="mock-profile">
                <div className="mock-level-badge">
                  <span className="mock-lvl">LVL</span>
                  <span className="mock-level-num">23</span>
                </div>
                <div className="mock-xp-bar">
                  <div className="mock-xp-fill" style={{ width: '67%' }}></div>
                </div>
                <div className="mock-xp-text">2,340 / 3,500 XP</div>
                <div className="mock-stats">
                  <div className="mock-stat">
                    <span className="mock-stat-val">47</span>
                    <span className="mock-stat-label">Workouts</span>
                  </div>
                  <div className="mock-stat">
                    <span className="mock-stat-val">12</span>
                    <span className="mock-stat-label">PRs</span>
                  </div>
                  <div className="mock-stat">
                    <span className="mock-stat-val">8</span>
                    <span className="mock-stat-label">Badges</span>
                  </div>
                </div>
              </div>
            </PhoneMockup>
          </div>
        </section>

        {/* Achievement Showcase */}
        <section className="achievements-section">
          <div className="section-header">
            <span className="section-label">// ACHIEVEMENTS</span>
            <h2 className="section-title">Collect Them All</h2>
            <p className="section-subtitle">From Common to Legendary. Which will you unlock first?</p>
          </div>

          <div className="achievements-grid">
            {SHOWCASE_ACHIEVEMENTS.map((achievement, index) => (
              <div
                key={index}
                className="achievement-card"
                style={{ '--tier-color': TIER_COLORS[achievement.tier] } as React.CSSProperties}
              >
                <div className="achievement-icon">{achievement.icon}</div>
                <div className="achievement-info">
                  <span className="achievement-name">{achievement.name}</span>
                  <span className="achievement-req">{achievement.lift} {achievement.weight}</span>
                </div>
                <span
                  className="achievement-tier"
                  style={{ color: TIER_COLORS[achievement.tier] }}
                >
                  {achievement.tier}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Founder Story */}
        <section className="story-section">
          <div className="story-card">
            <div className="story-quote">"</div>
            <h2 className="story-title">Why I Built This</h2>
            <div className="story-content">
              <p>
                I&apos;ve been lifting for years, but I kept falling off the wagon.
                Every fitness app felt like a chore—just another place to log data
                that nobody cared about.
              </p>
              <p>
                Then I realized: I never quit playing video games. The XP, the levels,
                the achievements—they kept me coming back. What if the gym felt the same way?
              </p>
              <p>
                Iron Quest is the app I wished existed. Every PR feels like defeating a boss.
                Every workout streak is a combo multiplier. The gym isn&apos;t a chore anymore.
                It&apos;s the best game I&apos;ve ever played.
              </p>
            </div>
            <div className="story-author">
              <div className="author-avatar">PM</div>
              <div className="author-info">
                <span className="author-name">Pete</span>
                <span className="author-title">Creator of Iron Quest</span>
              </div>
            </div>
          </div>
        </section>

        {/* Final CTA */}
        <section className="final-cta-section">
          <h2 className="final-title">Ready to Level Up?</h2>
          <p className="final-subtitle">Your first quest awaits. No credit card required.</p>
          <div className="final-buttons">
            <Link href="/fitness?try=true" className="cta-primary large">
              Start Playing Free
            </Link>
            <button onClick={handleLogin} className="cta-secondary large">
              Create Account
            </button>
          </div>
        </section>

        {/* Footer */}
        <footer className="landing-footer">
          <p className="footer-tagline">Life&apos;s not a game... but it should be!</p>
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

        .landing-content {
          position: relative;
          z-index: 2;
          font-family: var(--font-body);
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
          padding: 6rem 1.5rem 4rem;
          position: relative;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--app-fitness-glow);
          border: 1px solid var(--app-fitness);
          border-radius: 20px;
          padding: 0.5rem 1rem;
          margin-bottom: 2rem;
        }

        .badge-icon { font-size: 1rem; }
        .badge-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--app-fitness);
          letter-spacing: 0.1em;
        }

        .hero-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(1.5rem, 6vw, 3rem);
          color: var(--theme-text-primary);
          line-height: 1.4;
          margin-bottom: 1.5rem;
        }

        .title-accent {
          color: var(--app-fitness);
          text-shadow: 0 0 40px var(--app-fitness-glow);
        }

        .hero-tagline {
          font-size: clamp(0.9rem, 2.5vw, 1.1rem);
          color: var(--theme-text-secondary);
          line-height: 1.8;
          margin-bottom: 3rem;
          max-width: 500px;
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .cta-primary {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          padding: 1.25rem 2.5rem;
          background: linear-gradient(180deg, var(--app-fitness) 0%, var(--app-fitness-dark) 100%);
          border: none;
          border-radius: 8px;
          color: var(--theme-text-primary);
          cursor: pointer;
          text-decoration: none;
          transition: all 0.2s;
          box-shadow: 0 4px 0 var(--app-fitness-dark), 0 0 30px var(--app-fitness-glow);
        }

        .cta-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 6px 0 var(--app-fitness-dark), 0 0 40px var(--app-fitness-glow);
        }

        .cta-primary:active {
          transform: translateY(2px);
          box-shadow: 0 2px 0 var(--app-fitness-dark);
        }

        .cta-secondary {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 1rem 2rem;
          background: transparent;
          border: 2px solid var(--theme-border);
          border-radius: 8px;
          color: var(--theme-text-secondary);
          cursor: pointer;
          transition: all 0.2s;
        }

        .cta-secondary:hover {
          border-color: var(--app-fitness);
          color: var(--app-fitness);
        }

        .cta-primary.large { font-size: 0.65rem; padding: 1.5rem 3rem; }
        .cta-secondary.large { font-size: 0.55rem; padding: 1.25rem 2.5rem; }

        .scroll-indicator {
          position: absolute;
          bottom: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--theme-text-muted);
          font-size: 0.75rem;
          animation: bounce 2s ease-in-out infinite;
        }

        .scroll-arrow { font-size: 1.25rem; }

        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(8px); }
        }

        /* Stats Bar */
        .stats-bar {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 2rem;
          padding: 2rem;
          background: var(--app-fitness-glow);
          border-top: 1px solid var(--app-fitness-border);
          border-bottom: 1px solid var(--app-fitness-border);
          flex-wrap: wrap;
        }

        .stat-item { text-align: center; }
        .stat-value {
          display: block;
          font-family: 'Press Start 2P', monospace;
          font-size: 1.25rem;
          color: var(--app-fitness);
          margin-bottom: 0.25rem;
        }
        .stat-label {
          font-size: 0.7rem;
          color: var(--theme-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }
        .stat-divider {
          width: 1px;
          height: 40px;
          background: var(--theme-border);
        }

        /* Section Styling */
        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--app-fitness);
          letter-spacing: 0.2em;
          margin-bottom: 1rem;
          display: block;
        }

        .section-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(1rem, 3vw, 1.5rem);
          color: var(--theme-text-primary);
          margin-bottom: 0.75rem;
          line-height: 1.4;
        }

        .section-subtitle {
          font-size: 0.9rem;
          color: var(--theme-text-muted);
        }

        /* How It Works */
        .how-section {
          padding: 5rem 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .steps-grid {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .step-card {
          background: var(--theme-bg-card);
          border: 1px solid var(--theme-border);
          border-radius: 12px;
          padding: 2rem 1.5rem;
          text-align: center;
          width: 220px;
          position: relative;
          transition: all 0.3s;
        }

        .step-card:hover {
          border-color: var(--app-fitness);
          transform: translateY(-4px);
          box-shadow: 0 10px 30px var(--app-fitness-glow);
        }

        .step-number {
          position: absolute;
          top: -12px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--app-fitness);
          color: var(--theme-bg-base);
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          width: 24px;
          height: 24px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .step-icon { font-size: 2rem; margin-bottom: 1rem; }
        .step-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: var(--theme-text-primary);
          margin-bottom: 0.75rem;
        }
        .step-desc {
          font-size: 0.8rem;
          color: var(--theme-text-muted);
          line-height: 1.6;
        }

        .step-arrow {
          font-size: 1.5rem;
          color: var(--theme-border);
        }

        /* Demo Section */
        .demo-section {
          padding: 5rem 1.5rem;
          background: var(--app-fitness-glow);
        }

        .demo-widget {
          max-width: 400px;
          margin: 0 auto;
          background: var(--theme-bg-elevated);
          border: 2px solid var(--theme-border);
          border-radius: 16px;
          padding: 1.5rem;
          box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
        }

        .demo-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .demo-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--app-fitness);
          letter-spacing: 0.1em;
        }

        .demo-exercise {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--theme-text-primary);
        }

        .demo-inputs {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .demo-input-group {
          display: flex;
          align-items: center;
          gap: 0.25rem;
          background: var(--theme-bg-base);
          border: 1px solid var(--theme-border);
          border-radius: 8px;
          padding: 0.5rem 0.75rem;
        }

        .demo-input {
          width: 50px;
          background: transparent;
          border: none;
          color: var(--theme-text-primary);
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          text-align: center;
          outline: none;
        }

        .demo-input::-webkit-inner-spin-button { -webkit-appearance: none; }

        .demo-unit {
          font-size: 0.65rem;
          color: var(--theme-text-muted);
        }

        .demo-x {
          color: var(--theme-text-muted);
          font-size: 1rem;
        }

        .demo-log-btn {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(180deg, var(--app-fitness) 0%, var(--app-fitness-dark) 100%);
          border: none;
          border-radius: 8px;
          color: var(--theme-text-primary);
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 3px 0 var(--app-fitness-darker);
        }

        .demo-log-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 5px 0 var(--app-fitness-darker);
        }

        .demo-log-btn:disabled {
          opacity: 0.7;
          cursor: default;
        }

        .demo-log-btn.logged {
          background: linear-gradient(180deg, var(--color-success) 0%, var(--color-success-dark) 100%);
          box-shadow: 0 3px 0 var(--color-success-darker);
        }

        .demo-results {
          display: flex;
          gap: 1rem;
          justify-content: center;
          min-height: 50px;
          align-items: center;
          opacity: 0;
          transform: translateY(10px);
          transition: all 0.3s;
        }

        .demo-results.show {
          opacity: 1;
          transform: translateY(0);
        }

        .demo-xp-popup {
          background: var(--color-legendary-glow);
          border: 1px solid var(--color-legendary);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: popIn 0.3s ease-out;
        }

        .xp-amount {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: var(--color-legendary);
        }

        .xp-label {
          font-size: 0.7rem;
          color: var(--theme-text-secondary);
        }

        .demo-pr-popup {
          background: var(--app-fitness-glow);
          border: 1px solid var(--app-fitness);
          border-radius: 8px;
          padding: 0.5rem 1rem;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          animation: popIn 0.3s ease-out 0.1s backwards;
        }

        .pr-icon { font-size: 1rem; }
        .pr-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--app-fitness);
        }

        @keyframes popIn {
          from { transform: scale(0.8); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }

        /* Preview Section */
        .preview-section {
          padding: 5rem 1.5rem;
          max-width: 1100px;
          margin: 0 auto;
        }

        .preview-grid {
          display: flex;
          justify-content: center;
          gap: 2rem;
          flex-wrap: wrap;
        }

        .phone-mockup {
          width: 200px;
          text-align: center;
        }

        .phone-screen {
          background: var(--theme-bg-base);
          border: 3px solid var(--theme-border);
          border-radius: 24px;
          padding: 0.5rem;
          position: relative;
          overflow: hidden;
        }

        .phone-notch {
          width: 80px;
          height: 20px;
          background: var(--theme-border);
          border-radius: 0 0 12px 12px;
          margin: 0 auto 0.5rem;
        }

        .phone-status-bar {
          display: flex;
          justify-content: space-between;
          padding: 0 0.5rem 0.5rem;
          font-size: 0.5rem;
          color: var(--theme-text-muted);
        }

        .phone-content {
          min-height: 280px;
          padding: 0.5rem;
        }

        .phone-label {
          margin-top: 1rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          color: var(--theme-text-muted);
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        /* Mock Workout Screen */
        .mock-workout { font-size: 0.6rem; }
        .mock-exercise-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 0.75rem;
        }
        .mock-exercise-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          color: var(--app-fitness);
        }
        .mock-pr-badge {
          background: var(--color-legendary-glow);
          border: 1px solid var(--color-legendary);
          border-radius: 4px;
          padding: 0.2rem 0.4rem;
          font-size: 0.4rem;
          color: var(--color-legendary);
        }
        .mock-sets {
          display: flex;
          flex-direction: column;
          gap: 0.4rem;
          margin-bottom: 0.75rem;
        }
        .mock-set {
          background: var(--theme-bg-elevated);
          border: 1px solid var(--theme-border);
          border-radius: 6px;
          padding: 0.5rem;
          color: var(--theme-text-secondary);
          display: flex;
          justify-content: space-between;
        }
        .mock-set.active {
          border-color: var(--app-fitness);
          color: var(--theme-text-primary);
        }
        .mock-xp {
          color: var(--color-legendary);
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
        }
        .mock-input {
          background: var(--theme-bg-deep);
          border: 2px solid var(--app-fitness);
          border-radius: 8px;
          padding: 0.6rem;
          color: var(--theme-text-primary);
        }
        .mock-cursor {
          color: var(--app-fitness);
          animation: blink 1s infinite;
        }

        @keyframes blink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }

        /* Mock Achievement Screen */
        .mock-achievement {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          position: relative;
          padding: 1rem;
        }
        .mock-achievement-glow {
          position: absolute;
          width: 100px;
          height: 100px;
          background: radial-gradient(circle, var(--app-fitness-glow) 0%, transparent 70%);
          animation: pulse 2s ease-in-out infinite;
        }
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.5; }
          50% { transform: scale(1.2); opacity: 1; }
        }
        .mock-achievement-icon {
          font-size: 2.5rem;
          margin-bottom: 0.75rem;
          position: relative;
        }
        .mock-achievement-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          color: var(--theme-text-primary);
          margin-bottom: 0.25rem;
          text-align: center;
        }
        .mock-achievement-desc {
          font-size: 0.5rem;
          color: var(--theme-text-muted);
          margin-bottom: 0.5rem;
        }
        .mock-achievement-xp {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--color-legendary);
          margin-bottom: 0.5rem;
        }
        .mock-achievement-tier {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--tier-rare);
          letter-spacing: 0.2em;
        }

        /* Mock Profile Screen */
        .mock-profile {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 0.5rem;
        }
        .mock-level-badge {
          background: linear-gradient(180deg, var(--color-legendary) 0%, var(--color-legendary-dark) 100%);
          border: 2px solid var(--color-legendary-border);
          border-radius: 12px;
          padding: 0.75rem 1rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          margin-bottom: 0.75rem;
          box-shadow: 0 3px 0 var(--color-legendary-shadow);
        }
        .mock-lvl {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-bg-base);
        }
        .mock-level-num {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.25rem;
          color: var(--theme-bg-base);
        }
        .mock-xp-bar {
          width: 100%;
          height: 8px;
          background: var(--theme-border);
          border-radius: 4px;
          overflow: hidden;
          margin-bottom: 0.25rem;
        }
        .mock-xp-fill {
          height: 100%;
          background: linear-gradient(90deg, var(--app-fitness), var(--color-legendary));
          border-radius: 4px;
        }
        .mock-xp-text {
          font-size: 0.5rem;
          color: var(--theme-text-muted);
          margin-bottom: 1rem;
        }
        .mock-stats {
          display: flex;
          gap: 1rem;
        }
        .mock-stat { text-align: center; }
        .mock-stat-val {
          display: block;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: var(--app-fitness);
        }
        .mock-stat-label {
          font-size: 0.4rem;
          color: var(--theme-text-muted);
        }

        /* Achievements Section */
        .achievements-section {
          padding: 5rem 1.5rem;
          background: var(--color-legendary-glow);
        }

        .achievements-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .achievement-card {
          background: var(--theme-bg-card);
          border: 1px solid var(--theme-border);
          border-radius: 12px;
          padding: 1rem 1.25rem;
          display: flex;
          align-items: center;
          gap: 1rem;
          transition: all 0.3s;
        }

        .achievement-card:hover {
          border-color: var(--tier-color);
          transform: translateX(4px);
          box-shadow: -4px 0 0 var(--tier-color);
        }

        .achievement-icon { font-size: 1.5rem; }
        .achievement-info { flex: 1; }
        .achievement-name {
          display: block;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--theme-text-primary);
          margin-bottom: 0.25rem;
        }
        .achievement-req {
          font-size: 0.7rem;
          color: var(--theme-text-muted);
        }
        .achievement-tier {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          letter-spacing: 0.1em;
        }

        /* Story Section */
        .story-section {
          padding: 5rem 1.5rem;
          max-width: 700px;
          margin: 0 auto;
        }

        .story-card {
          background: linear-gradient(180deg, var(--app-fitness-glow) 0%, transparent 100%);
          border: 1px solid var(--theme-border);
          border-radius: 16px;
          padding: 3rem 2rem;
          position: relative;
        }

        .story-quote {
          position: absolute;
          top: 1rem;
          left: 1.5rem;
          font-family: Georgia, serif;
          font-size: 4rem;
          color: var(--app-fitness);
          opacity: 0.3;
          line-height: 1;
        }

        .story-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.8rem;
          color: var(--app-fitness);
          margin-bottom: 1.5rem;
          text-align: center;
        }

        .story-content {
          font-size: 0.95rem;
          color: var(--theme-text-secondary);
          line-height: 1.8;
        }

        .story-content p {
          margin-bottom: 1rem;
        }

        .story-content p:last-child {
          margin-bottom: 0;
        }

        .story-author {
          display: flex;
          align-items: center;
          gap: 1rem;
          margin-top: 2rem;
          padding-top: 1.5rem;
          border-top: 1px solid var(--theme-border);
        }

        .author-avatar {
          width: 48px;
          height: 48px;
          background: linear-gradient(135deg, var(--app-fitness), var(--color-legendary));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: var(--theme-bg-base);
        }

        .author-info {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
        }

        .author-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          color: var(--theme-text-primary);
        }

        .author-title {
          font-size: 0.75rem;
          color: var(--theme-text-muted);
        }

        /* Final CTA */
        .final-cta-section {
          padding: 5rem 1.5rem;
          text-align: center;
        }

        .final-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(1rem, 3vw, 1.5rem);
          color: var(--theme-text-primary);
          margin-bottom: 0.75rem;
        }

        .final-subtitle {
          font-size: 0.9rem;
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
          padding: 3rem 1.5rem;
          text-align: center;
          border-top: 1px solid var(--theme-border-light);
        }

        .footer-tagline {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--theme-text-muted);
          margin-bottom: 0.75rem;
        }

        .footer-text {
          font-size: 0.7rem;
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
            padding: 5rem 1rem 3rem;
          }

          .stats-bar {
            gap: 1rem;
            padding: 1.5rem 1rem;
          }

          .stat-divider {
            display: none;
          }

          .stat-value {
            font-size: 1rem;
          }

          .steps-grid {
            flex-direction: column;
          }

          .step-arrow {
            transform: rotate(90deg);
          }

          .step-card {
            width: 100%;
            max-width: 300px;
          }

          .preview-grid {
            gap: 2rem;
          }

          .phone-mockup {
            width: 180px;
          }

          .story-card {
            padding: 2rem 1.5rem;
          }

          .story-quote {
            font-size: 3rem;
          }
        }

        @media (max-width: 480px) {
          .demo-inputs {
            flex-wrap: wrap;
            justify-content: center;
          }

          .achievements-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
