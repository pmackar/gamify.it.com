'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import localFont from 'next/font/local';

const stormGust = localFont({
  src: '../public/Fonts/Storm Gust.woff2',
  display: 'swap',
  variable: '--font-storm-gust',
});

// Stats interface
interface FitnessStats {
  setsLogged: string;
  prsHit: string;
  exercises: number;
  levels: string;
}

// Story content interface
interface StoryContent {
  title: string;
  paragraphs: string[];
  authorName: string;
  authorTitle: string;
  authorInitials: string;
}

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

// Interactive Demo Component - Command Bar Style (matches in-app UI)
const InteractiveDemo = () => {
  const [command, setCommand] = useState('');
  const [logged, setLogged] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [showPR, setShowPR] = useState(false);
  const [loggedSet, setLoggedSet] = useState({ weight: 0, reps: 0 });
  const [sets, setSets] = useState<{ weight: number; reps: number; xp: number }[]>([]);

  const parseCommand = (cmd: string) => {
    // Parse commands like "135 x 8", "135x8", "135 8"
    const match = cmd.match(/(\d+)\s*[x×*\s]\s*(\d+)/i);
    if (match) {
      return { weight: parseInt(match[1]), reps: parseInt(match[2]) };
    }
    return null;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseCommand(command);
    if (!parsed || logged) return;

    const xp = Math.round((parsed.weight * parsed.reps) / 10 * 3);
    setXpEarned(xp);
    setLoggedSet(parsed);
    setLogged(true);
    setShowPR(parsed.weight >= 185);
    setSets(prev => [...prev, { ...parsed, xp }]);

    // Reset after animation
    setTimeout(() => {
      setLogged(false);
      setShowPR(false);
      setCommand('');
    }, 2500);
  };

  return (
    <div className="demo-widget">
      {/* Exercise Header - like in-app */}
      <div className="demo-exercise-header">
        <span className="demo-exercise-icon">🏋️</span>
        <span className="demo-exercise-name">BENCH PRESS</span>
        <span className="demo-pr-badge">PR: 185</span>
      </div>

      {/* Previous sets display */}
      <div className="demo-sets-list">
        {sets.length === 0 ? (
          <div className="demo-set-placeholder">Your sets will appear here</div>
        ) : (
          sets.slice(-3).map((set, i) => (
            <div key={i} className="demo-set-row">
              <span className="demo-set-num">Set {sets.length - (sets.slice(-3).length - 1 - i)}</span>
              <span className="demo-set-data">{set.weight} × {set.reps}</span>
              <span className="demo-set-xp">+{set.xp} XP</span>
            </div>
          ))
        )}
      </div>

      {/* Command Input - matches in-app command bar */}
      <form onSubmit={handleSubmit} className="demo-command-bar">
        <input
          type="text"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Type: 135 x 8"
          className="demo-command-input"
          disabled={logged}
        />
        <button
          type="submit"
          className={`demo-log-btn ${logged ? 'logged' : ''}`}
          disabled={logged || !parseCommand(command)}
        >
          {logged ? '✓' : 'LOG'}
        </button>
      </form>

      {/* Results popup */}
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
  const [stats, setStats] = useState<FitnessStats>({
    setsLogged: '0',
    prsHit: '0',
    exercises: 60,
    levels: '∞',
  });
  const [story, setStory] = useState<StoryContent>({
    title: 'Why I Built This',
    paragraphs: [
      "I've been lifting for years, but I kept falling off the wagon. Every fitness app felt like a chore—just another place to log data that nobody cared about.",
      "Then I realized: I never quit playing video games. The XP, the levels, the achievements—they kept me coming back. What if the gym felt the same way?",
      "Reptura is the app I wished existed. Every PR feels like defeating a boss. Every workout streak is a combo multiplier. The gym isn't a chore anymore. It's the best game I've ever played."
    ],
    authorName: 'Pete',
    authorTitle: 'Creator of Reptura',
    authorInitials: 'PM',
  });

  // Video loop flash effect
  const videoRef = useRef<HTMLVideoElement>(null);
  const flashRef = useRef<HTMLDivElement>(null);
  const appNameRef = useRef<HTMLDivElement>(null);
  const [loopFlash, setLoopFlash] = useState(false);

  // Magic link signup
  const [showSignup, setShowSignup] = useState(false);
  const [signupEmail, setSignupEmail] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupSent, setSignupSent] = useState(false);

  const triggerLoopFlash = useCallback(() => {
    setLoopFlash(true);
    setTimeout(() => setLoopFlash(false), 150);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      // Trigger flash when video is about to loop (last 0.15s)
      if (video.duration - video.currentTime < 0.15) {
        triggerLoopFlash();
      }
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    return () => video.removeEventListener('timeupdate', handleTimeUpdate);
  }, [triggerLoopFlash]);

  // Fetch real stats from API
  useEffect(() => {
    fetch('/api/fitness/stats')
      .then(res => res.json())
      .then(data => {
        setStats({
          setsLogged: data.setsLogged || '0',
          prsHit: data.prsHit || '0',
          exercises: data.exercises || 60,
          levels: data.levels || '∞',
        });
      })
      .catch(err => console.error('Failed to fetch stats:', err));
  }, []);

  // Load story content from markdown
  useEffect(() => {
    fetch('/api/content/fitness-story')
      .then(res => res.json())
      .then(data => {
        if (data.content) {
          setStory(data.content);
        }
      })
      .catch(err => console.error('Failed to fetch story:', err));
  }, []);

  const handleLogin = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/fitness`
      }
    });
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signupEmail) return;
    setSignupLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: signupEmail,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback?next=/fitness`,
      },
    });
    setSignupLoading(false);
    if (!error) {
      setSignupSent(true);
    }
  };

  return (
    <div className={`landing-wrapper ${stormGust.variable}`}>
      <PixelParticles />

      <div className="landing-content">
        {/* Hero Section */}
        <section className="hero-section">
          {/* Video Background */}
          <div className="hero-video-container">
            <video
              ref={videoRef}
              className="hero-video"
              autoPlay
              loop
              muted
              playsInline
            >
              <source src="/Assets/waterfall-hero.mp4" type="video/mp4" />
            </video>
            <div className="hero-video-overlay" />
            <div className="crt-scanlines" />
            <div className="crt-vignette" />
            <div className={`static-zap ${loopFlash ? 'active' : ''}`} />
            <div className={`lightning-flash ${loopFlash ? 'loop-flash' : ''}`} ref={flashRef} />
          </div>

          <div className="hero-content">
            <div className="hero-badge">
              <span className="badge-icon">🎮</span>
              <span className="badge-text">RPG FITNESS TRACKER</span>
            </div>

            <div className={`app-name ${stormGust.className} ${loopFlash ? 'inverted' : ''}`} ref={appNameRef}>REPTURA</div>

            <p className="hero-tagline">
              Every rep is part of your adventure.
            </p>

            <div className="hero-cta">
              {!showSignup ? (
                <button onClick={() => setShowSignup(true)} className="cta-primary">
                  Start Your Quest
                </button>
              ) : signupSent ? (
                <div className="signup-success">
                  <span className="success-icon">✉️</span>
                  <span className="success-text">Check your email for the magic link!</span>
                </div>
              ) : (
                <form onSubmit={handleMagicLink} className="signup-form">
                  <input
                    type="email"
                    placeholder="Enter your email"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="signup-input"
                    autoFocus
                    required
                  />
                  <button type="submit" disabled={signupLoading} className="cta-primary">
                    {signupLoading ? 'Sending...' : 'Send Magic Link'}
                  </button>
                </form>
              )}
            </div>

            <div className="scroll-indicator">
              <span>See how it works</span>
              <div className="scroll-arrow">↓</div>
            </div>
          </div>
        </section>

        {/* Stats Bar - Real Data */}
        <section className="stats-bar">
          <div className="stat-item">
            <span className="stat-value">{stats.setsLogged}</span>
            <span className="stat-label">Sets Logged</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">{stats.prsHit}</span>
            <span className="stat-label">PRs Hit</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">{stats.exercises}+</span>
            <span className="stat-label">Exercises</span>
          </div>
          <div className="stat-divider"></div>
          <div className="stat-item">
            <span className="stat-value">{stats.levels}</span>
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

        {/* Coming Soon - Rivals & Narrative */}
        <section className="coming-soon-section">
          <div className="section-header">
            <span className="section-label">// COMING SOON</span>
            <h2 className="section-title">The Next Chapter</h2>
            <p className="section-subtitle">Rivals that adapt. Stories that unfold.</p>
          </div>

          <div className="coming-soon-grid">
            {/* Rival System Card */}
            <div className="coming-soon-card rival-card">
              <div className="card-badge">IN DEVELOPMENT</div>
              <div className="card-icon">⚔️</div>
              <h3 className="card-title">Rival System</h3>
              <p className="card-desc">
                Not against a leaderboard. Against rivals that know you.
              </p>
              <div className="rival-types">
                <div className="rival-type">
                  <span className="rival-icon">👤</span>
                  <span className="rival-name">Mirror</span>
                  <span className="rival-desc">Matches your pace</span>
                </div>
                <div className="rival-type">
                  <span className="rival-icon">🎯</span>
                  <span className="rival-name">Rival</span>
                  <span className="rival-desc">Always one step ahead</span>
                </div>
                <div className="rival-type">
                  <span className="rival-icon">🏆</span>
                  <span className="rival-name">Mentor</span>
                  <span className="rival-desc">Shows what&apos;s possible</span>
                </div>
                <div className="rival-type">
                  <span className="rival-icon">💀</span>
                  <span className="rival-name">Nemesis</span>
                  <span className="rival-desc">Unpredictable chaos</span>
                </div>
              </div>
              <div className="friend-rival-callout">
                <span className="callout-icon">👥</span>
                <span className="callout-text">Set any friend as your rival and compete head-to-head</span>
              </div>
              <div className="card-features">
                <span className="feature-tag">AI Phantoms</span>
                <span className="feature-tag">Friend Rivals</span>
                <span className="feature-tag">Weekly Showdowns</span>
              </div>
            </div>

            {/* Narrative Card */}
            <div className="coming-soon-card narrative-card">
              <div className="card-badge">IN DEVELOPMENT</div>
              <div className="card-icon">📖</div>
              <h3 className="card-title">Your Story</h3>
              <p className="card-desc">
                Every workout writes the next chapter of your legend.
              </p>
              <div className="journey-stages">
                <div className="journey-stage-item active">
                  <span className="stage-marker">I</span>
                  <span className="stage-label">The Calling</span>
                </div>
                <div className="journey-connector">→</div>
                <div className="journey-stage-item">
                  <span className="stage-marker">II</span>
                  <span className="stage-label">The Tests</span>
                </div>
                <div className="journey-connector">→</div>
                <div className="journey-stage-item">
                  <span className="stage-marker">III</span>
                  <span className="stage-label">The Ordeal</span>
                </div>
                <div className="journey-connector">→</div>
                <div className="journey-stage-item">
                  <span className="stage-marker">IV</span>
                  <span className="stage-label">The Return</span>
                </div>
              </div>
              <div className="narrative-details">
                <div className="narrative-detail">
                  <span className="detail-icon">🎭</span>
                  <span className="detail-text">Personalized story beats based on your progress</span>
                </div>
                <div className="narrative-detail">
                  <span className="detail-icon">⚡</span>
                  <span className="detail-text">Dramatic moments when you hit PRs or milestones</span>
                </div>
                <div className="narrative-detail">
                  <span className="detail-icon">🗡️</span>
                  <span className="detail-text">Rival encounters woven into your journey</span>
                </div>
              </div>
              <div className="card-features">
                <span className="feature-tag">Hero&apos;s Journey</span>
                <span className="feature-tag">Story Beats</span>
                <span className="feature-tag">5 Chapters</span>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section className="roadmap-section">
          <div className="section-header">
            <span className="section-label">// ROADMAP</span>
            <h2 className="section-title">Built & Building</h2>
            <p className="section-subtitle">What&apos;s done and what&apos;s coming next</p>
          </div>

          <div className="roadmap-timeline">
            <div className="roadmap-phase current">
              <div className="phase-marker">
                <div className="phase-dot active"></div>
                <div className="phase-line"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">SHIPPED</div>
                <h3 className="phase-title">Core Features</h3>
                <ul className="phase-items">
                  <li className="phase-item done">✓ Rest Timer & Warmup Sets</li>
                  <li className="phase-item done">✓ Progress Charts & 1RM Tracking</li>
                  <li className="phase-item done">✓ Supersets & Plate Calculator</li>
                  <li className="phase-item done">✓ Program Builder</li>
                  <li className="phase-item done">✓ Social Challenges & Leaderboards</li>
                  <li className="phase-item done">✓ AI Coaching Tips</li>
                </ul>
              </div>
            </div>

            <div className="roadmap-phase">
              <div className="phase-marker">
                <div className="phase-dot"></div>
                <div className="phase-line"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">NEXT UP</div>
                <h3 className="phase-title">Rivals & Narrative</h3>
                <ul className="phase-items">
                  <li className="phase-item">AI Phantom Rivals</li>
                  <li className="phase-item">Friend Head-to-Head</li>
                  <li className="phase-item">Weekly Showdowns</li>
                  <li className="phase-item">Hero&apos;s Journey Story</li>
                </ul>
              </div>
            </div>

            <div className="roadmap-phase">
              <div className="phase-marker">
                <div className="phase-dot"></div>
                <div className="phase-line"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">PHASE 6</div>
                <h3 className="phase-title">Coaching Platform</h3>
                <ul className="phase-items">
                  <li className="phase-item">Coach Dashboard & Analytics</li>
                  <li className="phase-item">Assign Programs to Athletes</li>
                  <li className="phase-item">Real-time Workout Monitoring</li>
                  <li className="phase-item">In-app Messaging</li>
                  <li className="phase-item">Progress Reports & Insights</li>
                </ul>
              </div>
            </div>

            <div className="roadmap-phase">
              <div className="phase-marker">
                <div className="phase-dot"></div>
                <div className="phase-line"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">PHASE 7</div>
                <h3 className="phase-title">Integrations</h3>
                <ul className="phase-items">
                  <li className="phase-item">Strava Sync</li>
                  <li className="phase-item">Garmin Connect</li>
                  <li className="phase-item">Apple Watch App</li>
                </ul>
              </div>
            </div>

            <div className="roadmap-phase">
              <div className="phase-marker">
                <div className="phase-dot"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">FUTURE</div>
                <h3 className="phase-title">Exploring</h3>
                <ul className="phase-items">
                  <li className="phase-item">Body Composition</li>
                  <li className="phase-item">Nutrition Tracking</li>
                  <li className="phase-item">Smart Equipment</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Founder Story */}
        <section className="story-section">
          <div className="story-card">
            <div className="story-quote">&ldquo;</div>
            <h2 className="story-title">{story.title}</h2>
            <div className="story-content">
              {story.paragraphs.map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
            <div className="story-author">
              <div className="author-avatar">{story.authorInitials}</div>
              <div className="author-info">
                <span className="author-name">{story.authorName}</span>
                <span className="author-title">{story.authorTitle}</span>
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

      <style jsx global>{`
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
          overflow: hidden;
        }

        /* Video Background */
        .hero-video-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 0;
        }

        .hero-video {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .hero-video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(
            180deg,
            rgba(10, 10, 10, 0.7) 0%,
            rgba(10, 10, 10, 0.5) 50%,
            rgba(10, 10, 10, 0.9) 100%
          );
        }

        /* CRT Scanlines */
        .crt-scanlines {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.15) 0px,
            rgba(0, 0, 0, 0.15) 1px,
            transparent 1px,
            transparent 2px
          );
          pointer-events: none;
          z-index: 3;
          animation: scanline-flicker 0.1s infinite;
        }

        @keyframes scanline-flicker {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.98; }
        }

        /* CRT Vignette */
        .crt-vignette {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: radial-gradient(
            ellipse at center,
            transparent 0%,
            transparent 60%,
            rgba(0, 0, 0, 0.4) 100%
          );
          pointer-events: none;
          z-index: 3;
        }

        /* CRT Screen Flicker */
        .hero-video-container {
          animation: crt-flicker 4s infinite;
        }

        @keyframes crt-flicker {
          0%, 100% { filter: brightness(1) contrast(1); }
          50% { filter: brightness(1.02) contrast(1.01); }
          75% { filter: brightness(0.98) contrast(1); }
        }

        /* Static Zap Effect */
        .static-zap {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          pointer-events: none;
          z-index: 4;
          background:
            repeating-linear-gradient(
              0deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            ),
            repeating-linear-gradient(
              90deg,
              transparent,
              transparent 2px,
              rgba(255, 255, 255, 0.03) 2px,
              rgba(255, 255, 255, 0.03) 4px
            );
          background-size: 4px 4px;
        }

        .static-zap.active {
          opacity: 1;
          animation: static-noise 0.15s steps(4);
          background-color: rgba(255, 255, 255, 0.1);
        }

        @keyframes static-noise {
          0% { background-position: 0 0; filter: contrast(2) brightness(1.5); }
          25% { background-position: -2px 2px; filter: contrast(1.5) brightness(1.2); }
          50% { background-position: 2px -2px; filter: contrast(2.5) brightness(1.8); }
          75% { background-position: -1px -1px; filter: contrast(1.8) brightness(1.3); }
          100% { background-position: 1px 1px; filter: contrast(2) brightness(1.5); }
        }

        /* Lightning Flash Effect */
        .lightning-flash {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: white;
          opacity: 0;
          pointer-events: none;
          animation: lightning 8s infinite;
          z-index: 2;
        }

        .lightning-flash.loop-flash {
          animation: none;
          opacity: 0.4;
        }

        @keyframes lightning {
          0%, 100% { opacity: 0; }
          /* First strike */
          20% { opacity: 0; }
          20.5% { opacity: 0.25; }
          21% { opacity: 0.05; }
          21.5% { opacity: 0.3; }
          22% { opacity: 0; }
          /* Second strike */
          60% { opacity: 0; }
          60.3% { opacity: 0.2; }
          60.6% { opacity: 0.03; }
          61% { opacity: 0.28; }
          61.3% { opacity: 0; }
        }

        .hero-content {
          position: relative;
          z-index: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: var(--app-fitness-glow);
          border: 1px solid var(--app-fitness);
          border-radius: 20px;
          padding: 0.5rem 1rem;
          margin-bottom: 1rem;
        }

        .badge-icon { font-size: 1rem; }
        .badge-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--app-fitness);
          letter-spacing: 0.1em;
        }

        .app-name {
          font-family: var(--font-storm-gust), 'Press Start 2P', monospace;
          font-size: clamp(4.3rem, 17.3vw, 10rem);
          color: var(--app-fitness);
          line-height: 1;
          margin-bottom: 0.5rem;
          text-transform: uppercase;
          letter-spacing: 0.02em;
          text-shadow: 0 0 60px var(--app-fitness-glow), 0 4px 0 var(--app-fitness-darker);
          animation: lightning-text 8s infinite;
          transition: color 0.05s, text-shadow 0.05s;
        }

        .app-name.inverted {
          color: #fff;
          text-shadow: 0 0 40px rgba(255,255,255,0.6), 0 4px 0 var(--app-fitness-darker);
          animation: none;
        }

        @keyframes lightning-text {
          0%, 100% {
            color: var(--app-fitness);
            text-shadow: 0 0 60px var(--app-fitness-glow), 0 4px 0 var(--app-fitness-darker);
          }
          /* First strike - subtle flash */
          20%, 22% {
            color: var(--app-fitness);
            text-shadow: 0 0 60px var(--app-fitness-glow), 0 4px 0 var(--app-fitness-darker);
          }
          20.5%, 21.5% {
            color: #fff;
            text-shadow: 0 0 40px rgba(255,255,255,0.5), 0 4px 0 var(--app-fitness-darker);
          }
          21% {
            color: var(--app-fitness);
            text-shadow: 0 0 60px var(--app-fitness-glow), 0 4px 0 var(--app-fitness-darker);
          }
          /* Second strike - subtle flash */
          60%, 61.3% {
            color: var(--app-fitness);
            text-shadow: 0 0 60px var(--app-fitness-glow), 0 4px 0 var(--app-fitness-darker);
          }
          60.3%, 61% {
            color: #fff;
            text-shadow: 0 0 40px rgba(255,255,255,0.5), 0 4px 0 var(--app-fitness-darker);
          }
          60.6% {
            color: var(--app-fitness);
            text-shadow: 0 0 60px var(--app-fitness-glow), 0 4px 0 var(--app-fitness-darker);
          }
        }

        .hero-tagline {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          color: var(--theme-text-secondary);
          line-height: 2;
          margin-bottom: 3rem;
          max-width: 500px;
          letter-spacing: 0.02em;
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

        .signup-form {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
          width: 100%;
          max-width: 400px;
        }

        .signup-input {
          width: 100%;
          padding: 1rem 1.5rem;
          font-size: 1rem;
          background: rgba(0, 0, 0, 0.5);
          border: 2px solid var(--theme-border);
          border-radius: 8px;
          color: var(--theme-text-primary);
          text-align: center;
          outline: none;
          transition: border-color 0.2s;
        }

        .signup-input:focus {
          border-color: var(--app-fitness);
        }

        .signup-input::placeholder {
          color: var(--theme-text-muted);
        }

        .signup-success {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.75rem;
          padding: 1.5rem 2rem;
          background: rgba(95, 191, 138, 0.15);
          border: 1px solid rgba(95, 191, 138, 0.3);
          border-radius: 12px;
        }

        .success-icon {
          font-size: 2rem;
        }

        .success-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #5fbf8a;
          text-align: center;
        }

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

        /* Command Bar Style Demo */
        .demo-exercise-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--theme-border);
        }

        .demo-exercise-icon {
          font-size: 1.5rem;
        }

        .demo-exercise-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: var(--app-fitness);
          flex: 1;
        }

        .demo-pr-badge {
          background: var(--color-legendary-glow);
          border: 1px solid var(--color-legendary);
          border-radius: 6px;
          padding: 0.35rem 0.6rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--color-legendary);
        }

        .demo-sets-list {
          min-height: 90px;
          margin-bottom: 1rem;
        }

        .demo-set-placeholder {
          color: var(--theme-text-muted);
          font-size: 0.75rem;
          text-align: center;
          padding: 2rem 1rem;
          border: 1px dashed var(--theme-border);
          border-radius: 8px;
        }

        .demo-set-row {
          display: flex;
          align-items: center;
          padding: 0.6rem 0.75rem;
          background: var(--theme-bg-base);
          border: 1px solid var(--theme-border);
          border-radius: 8px;
          margin-bottom: 0.5rem;
        }

        .demo-set-num {
          font-size: 0.65rem;
          color: var(--theme-text-muted);
          width: 50px;
        }

        .demo-set-data {
          flex: 1;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          color: var(--theme-text-primary);
        }

        .demo-set-xp {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          color: var(--color-legendary);
        }

        .demo-command-bar {
          display: flex;
          gap: 0.5rem;
        }

        .demo-command-input {
          flex: 1;
          background: var(--theme-bg-deep);
          border: 2px solid var(--app-fitness);
          border-radius: 8px;
          padding: 0.75rem 1rem;
          color: var(--theme-text-primary);
          font-family: inherit;
          font-size: 0.9rem;
          outline: none;
          transition: all 0.2s;
        }

        .demo-command-input::placeholder {
          color: var(--theme-text-muted);
        }

        .demo-command-input:focus {
          box-shadow: 0 0 0 3px var(--app-fitness-glow);
        }

        .demo-command-input:disabled {
          opacity: 0.6;
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

        /* Coming Soon Section */
        .coming-soon-section {
          padding: 5rem 1.5rem;
          max-width: 900px;
          margin: 0 auto;
        }

        .coming-soon-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          margin-top: 2rem;
        }

        @media (min-width: 768px) {
          .coming-soon-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        .coming-soon-card {
          background: var(--theme-bg-card);
          border: 2px solid var(--theme-border);
          border-radius: 16px;
          padding: 2rem;
          position: relative;
          overflow: hidden;
          transition: all 0.3s ease;
        }

        .coming-soon-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--app-fitness), var(--color-legendary));
          opacity: 0.5;
        }

        .coming-soon-card:hover {
          border-color: var(--app-fitness);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(157, 78, 221, 0.2);
        }

        .card-badge {
          position: absolute;
          top: 1rem;
          right: 1rem;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--app-fitness);
          background: var(--app-fitness-glow);
          padding: 0.35rem 0.5rem;
          border-radius: 4px;
          border: 1px solid var(--app-fitness);
          letter-spacing: 0.05em;
        }

        .card-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .card-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: var(--theme-text-primary);
          margin-bottom: 0.75rem;
        }

        .card-desc {
          font-size: 0.9rem;
          color: var(--theme-text-muted);
          line-height: 1.6;
          margin-bottom: 1.5rem;
        }

        /* Rival Types */
        .rival-types {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .rival-type {
          display: flex;
          flex-direction: column;
          gap: 0.25rem;
          padding: 0.75rem;
          background: var(--theme-bg-elevated);
          border: 1px solid var(--theme-border);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .rival-type:hover {
          border-color: var(--app-fitness);
          background: var(--app-fitness-glow);
        }

        .rival-icon {
          font-size: 1.25rem;
        }

        .rival-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--theme-text-primary);
        }

        .rival-desc {
          font-size: 0.65rem;
          color: var(--theme-text-muted);
        }

        .friend-rival-callout {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 1rem;
          background: linear-gradient(135deg, rgba(255, 107, 107, 0.15) 0%, rgba(255, 107, 107, 0.05) 100%);
          border: 1px solid rgba(255, 107, 107, 0.3);
          border-radius: 8px;
          margin-bottom: 1.5rem;
        }

        .callout-icon {
          font-size: 1.25rem;
        }

        .callout-text {
          font-size: 0.75rem;
          color: var(--app-fitness);
          font-weight: 500;
        }

        /* Journey Stages */
        .journey-stages {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          flex-wrap: wrap;
          margin-bottom: 1.5rem;
        }

        .journey-stage-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.35rem;
          padding: 0.5rem 0.75rem;
          background: var(--theme-bg-elevated);
          border: 1px solid var(--theme-border);
          border-radius: 8px;
          transition: all 0.2s ease;
        }

        .journey-stage-item.active {
          border-color: var(--app-fitness);
          background: var(--app-fitness-glow);
        }

        .journey-stage-item.active .stage-marker {
          color: var(--app-fitness);
          text-shadow: 0 0 10px var(--app-fitness);
        }

        .stage-marker {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--theme-text-muted);
        }

        .stage-label {
          font-size: 0.55rem;
          color: var(--theme-text-muted);
          white-space: nowrap;
        }

        .journey-connector {
          color: var(--theme-border);
          font-size: 0.8rem;
        }

        /* Narrative Details */
        .narrative-details {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
          padding: 1rem;
          background: var(--theme-bg-elevated);
          border: 1px solid var(--theme-border);
          border-radius: 8px;
        }

        .narrative-detail {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .detail-icon {
          font-size: 1rem;
          flex-shrink: 0;
        }

        .detail-text {
          font-size: 0.75rem;
          color: var(--theme-text-secondary);
          line-height: 1.4;
        }

        /* Feature Tags */
        .card-features {
          display: flex;
          flex-wrap: wrap;
          gap: 0.5rem;
        }

        .feature-tag {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-text-muted);
          background: var(--theme-bg-elevated);
          padding: 0.4rem 0.6rem;
          border-radius: 4px;
          border: 1px solid var(--theme-border);
        }

        /* Roadmap Timeline */
        .roadmap-section {
          padding: 5rem 1.5rem;
          max-width: 800px;
          margin: 0 auto;
        }

        .roadmap-timeline {
          max-width: 600px;
          margin: 0 auto;
        }

        .roadmap-phase {
          display: flex;
          gap: 1.5rem;
          margin-bottom: 0;
        }

        .phase-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 20px;
          flex-shrink: 0;
        }

        .phase-dot {
          width: 16px;
          height: 16px;
          border-radius: 50%;
          background: var(--theme-bg-elevated);
          border: 2px solid var(--theme-border);
          transition: all 0.3s ease;
        }

        .phase-dot.active {
          background: var(--app-fitness);
          border-color: var(--app-fitness);
          box-shadow: 0 0 15px var(--app-fitness-glow);
        }

        .phase-line {
          width: 2px;
          flex: 1;
          background: linear-gradient(180deg, var(--theme-border), var(--theme-border-light));
          margin-top: 0.5rem;
        }

        .phase-content {
          flex: 1;
          padding-bottom: 2.5rem;
        }

        .phase-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--app-fitness);
          margin-bottom: 0.5rem;
          letter-spacing: 0.1em;
        }

        .phase-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.65rem;
          color: var(--theme-text-primary);
          margin-bottom: 1rem;
        }

        .phase-items {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .phase-item {
          font-size: 0.45rem;
          color: var(--theme-text-muted);
          font-family: 'Press Start 2P', monospace;
          line-height: 2.2;
          padding-left: 0.5rem;
        }

        .phase-item.done {
          color: var(--color-success);
        }

        .roadmap-phase:hover .phase-dot:not(.active) {
          border-color: var(--app-fitness);
          background: var(--app-fitness-glow);
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
