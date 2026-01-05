'use client';

import { useState, useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { RetroNavBar } from '@/components/RetroNavBar';
import { useAchievements } from '@/components/AchievementPopup';
import type { User } from '@supabase/supabase-js';

const videos = [
  '/8-bit city road/8-bit city road_front.mp4',
  '/8-bit city road/8-bit city road_side.mp4',
  '/8-bit city road/8-bit city road_back.mp4',
];

interface Particle { id: number; x: number; y: number; size: number; color: string; speed: number; opacity: number; delay: number; }

const PixelParticles = () => {
  const [particles, setParticles] = useState<Particle[]>([]);
  useEffect(() => {
    const colors = ['#FFD700', '#00ff00', '#ff6b6b', '#5CC9F5', '#a855f7'];
    const newParticles: Particle[] = [];
    for (let i = 0; i < 40; i++) {
      newParticles.push({ id: i, x: Math.random() * 100, y: Math.random() * 100, size: Math.random() * 3 + 2, color: colors[Math.floor(Math.random() * colors.length)], speed: Math.random() * 20 + 15, opacity: Math.random() * 0.4 + 0.15, delay: Math.random() * 10 });
    }
    setParticles(newParticles);
  }, []);
  return (
    <div className="particles-container">
      {particles.map((p) => (<div key={p.id} className="pixel-particle" style={{ left: `${p.x}%`, top: `${p.y}%`, width: `${p.size}px`, height: `${p.size}px`, backgroundColor: p.color, opacity: p.opacity, animationDuration: `${p.speed}s`, animationDelay: `${p.delay}s` }} />))}
    </div>
  );
};

const DumbbellIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="8" y="20" width="8" height="24" fill="#FF6B6B"/><rect x="16" y="16" width="8" height="32" fill="#CC5555"/><rect x="24" y="28" width="16" height="8" fill="#888"/><rect x="40" y="16" width="8" height="32" fill="#CC5555"/><rect x="48" y="20" width="8" height="24" fill="#FF6B6B"/></svg>);
const ChecklistIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="8" y="8" width="48" height="48" fill="#5CC9F5"/><rect x="12" y="12" width="40" height="40" fill="#2D8AB5"/><rect x="16" y="20" width="8" height="8" fill="#7FD954"/><rect x="28" y="20" width="20" height="8" fill="white"/><rect x="16" y="36" width="8" height="8" fill="white" opacity="0.6"/><rect x="28" y="36" width="20" height="8" fill="white" opacity="0.6"/></svg>);
const PlaneIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><rect x="28" y="8" width="8" height="16" fill="#5fbf8a"/><rect x="24" y="24" width="16" height="24" fill="#5fbf8a"/><rect x="8" y="28" width="16" height="8" fill="#4a9d70"/><rect x="40" y="28" width="16" height="8" fill="#4a9d70"/><rect x="20" y="48" width="8" height="8" fill="#4a9d70"/><rect x="36" y="48" width="8" height="8" fill="#4a9d70"/></svg>);
const LifeIcon = ({ className }: { className?: string }) => (<svg className={className} viewBox="0 0 64 64" fill="none"><path d="M32 56L12 36C4 28 4 16 14 12C24 8 32 18 32 18C32 18 40 8 50 12C60 16 60 28 52 36L32 56Z" fill="#a855f7"/><path d="M32 48L18 34C12 28 12 20 18 17C24 14 32 22 32 22C32 22 40 14 46 17C52 20 52 28 46 34L32 48Z" fill="#c084fc"/></svg>);

const XPBar = ({ current, max, color }: { current: number; max: number; color: string }) => (<div className="xp-bar-container"><div className="xp-bar-bg"><div className="xp-bar-fill" style={{ width: `${(current / max) * 100}%`, background: `linear-gradient(90deg, ${color} 0%, ${color}dd 100%)`, boxShadow: `0 0 8px ${color}60` }} /></div><span className="xp-bar-text">{current.toLocaleString()} / {max.toLocaleString()} XP</span></div>);

// Sample achievements for testing
const TEST_ACHIEVEMENTS = [
  { code: 'first_steps', name: 'First Steps', description: 'Log your first location', icon: 'footprints', xpReward: 100, category: 'exploration', tier: 1 },
  { code: 'explorer', name: 'Explorer', description: 'Visit 10 unique locations', icon: 'compass', xpReward: 250, category: 'exploration', tier: 2 },
  { code: 'globetrotter', name: 'Globetrotter', description: 'Visit 100 unique locations', icon: 'globe', xpReward: 1000, category: 'exploration', tier: 3 },
  { code: 'international', name: 'International', description: 'Visit 10 different countries', icon: 'earth', xpReward: 2000, category: 'exploration', tier: 4 },
];

// Profile data type
interface ProfileData {
  character: {
    name: string;
    level: number;
    xp: number;
    xpInCurrentLevel: number;
    xpToNextLevel: number;
    currentStreak: number;
  };
  stats: {
    achievements: number;
    activeApps: number;
  };
  apps: Record<string, { xp: number; level: number; xpToNext: number }>;
}

// Logged-in Dashboard Component
function Dashboard({ user }: { user: User }) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const displayName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'Player';
  const { showAchievement } = useAchievements();

  useEffect(() => {
    fetch('/api/profile')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) setProfile(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const testAchievement = () => {
    const randomAchievement = TEST_ACHIEVEMENTS[Math.floor(Math.random() * TEST_ACHIEVEMENTS.length)];
    showAchievement(randomAchievement);
  };

  // Get app XP with defaults
  const getAppXP = (appId: string) => {
    const app = profile?.apps?.[appId];
    return {
      xp: app?.xp || 0,
      xpToNext: app?.xpToNext || 100,
    };
  };

  const fitnessXP = getAppXP('fitness');
  const todayXP = getAppXP('today');
  const travelXP = getAppXP('travel');

  return (
    <>
      <RetroNavBar />
      <div className="dashboard-wrapper">
        <PixelParticles />
        <div className="dashboard-content" style={{ paddingTop: 'var(--content-top, 100px)' }}>
          {/* Welcome Header */}
          <section className="welcome-section">
            <div className="welcome-card">
              <div className="welcome-avatar">
                {user.user_metadata?.avatar_url ? (
                  <img src={user.user_metadata.avatar_url} alt={displayName} />
                ) : (
                  <div className="avatar-placeholder">{displayName.charAt(0).toUpperCase()}</div>
                )}
                <div className="level-badge">
                  {loading ? '...' : `LVL ${profile?.character?.level || 1}`}
                </div>
              </div>
              <div className="welcome-info">
                <p className="welcome-label">WELCOME BACK</p>
                <h1 className="welcome-name">{displayName}</h1>
                <div className="xp-display">
                  <span className="xp-value">
                    {loading ? '...' : (profile?.character?.xp || 0).toLocaleString()}
                  </span>
                  <span className="xp-label">TOTAL XP</span>
                </div>
              </div>
            </div>
          </section>

          {/* Games Grid */}
          <section className="games-section">
            <div className="section-header">
              <p className="section-label">// SELECT YOUR QUEST</p>
              <h2 className="section-title shimmer-text">Choose Your Adventure</h2>
            </div>
            <div className="games-grid">
              <a href="/fitness" className="game-card fitness">
                <span className="game-card-badge test">TEST</span>
                <DumbbellIcon className="game-icon" />
                <h3 className="game-name">IRON QUEST</h3>
                <p className="game-tagline">Turn every rep into XP</p>
                <XPBar current={fitnessXP.xp} max={fitnessXP.xpToNext} color="#FF6B6B" />
                <p className="game-domain">/fitness</p>
              </a>
              <a href="/today" className="game-card tasks">
                <span className="game-card-badge test">TEST</span>
                <ChecklistIcon className="game-icon" />
                <h3 className="game-name">DAY QUEST</h3>
                <p className="game-tagline">Conquer your daily missions</p>
                <XPBar current={todayXP.xp} max={todayXP.xpToNext} color="#5CC9F5" />
                <p className="game-domain">/today</p>
              </a>
              <a href="/travel" className="game-card travel">
                <span className="game-card-badge test">TEST</span>
                <PlaneIcon className="game-icon" />
                <h3 className="game-name">EXPLORER</h3>
                <p className="game-tagline">Map your adventures</p>
                <XPBar current={travelXP.xp} max={travelXP.xpToNext} color="#5fbf8a" />
                <p className="game-domain">/travel</p>
              </a>
              <div className="game-card life" style={{ cursor: 'default', opacity: 0.7 }}>
                <span className="game-card-badge coming-soon">SOON</span>
                <LifeIcon className="game-icon" />
                <h3 className="game-name">LIFE TRACKER</h3>
                <p className="game-tagline">Gamify everything else</p>
                <XPBar current={0} max={100} color="#a855f7" />
                <p className="game-domain">gamify.life</p>
              </div>
            </div>
          </section>

          {/* Quick Stats */}
          <section className="stats-section">
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#FF6B6B' }}>
                  {loading ? '...' : profile?.character?.currentStreak || 0}
                </div>
                <div className="stat-label">DAY STREAK</div>
              </div>
              <div className="stat-card">
                <div className="stat-value" style={{ color: '#5CC9F5' }}>
                  {loading ? '...' : profile?.stats?.activeApps || 0}
                </div>
                <div className="stat-label">GAMES ACTIVE</div>
              </div>
              <div className="stat-card" onClick={testAchievement} style={{ cursor: 'pointer' }}>
                <div className="stat-value" style={{ color: '#5fbf8a' }}>
                  {loading ? '...' : profile?.stats?.achievements || 0}
                </div>
                <div className="stat-label">ACHIEVEMENTS</div>
                <div style={{ fontSize: '0.3rem', color: '#666', marginTop: '0.5rem' }}>CLICK TO TEST</div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}

// Splash/Intro for non-logged-in users
function SplashIntro() {
  const [typedText, setTypedText] = useState('');
  const [showSecondLine, setShowSecondLine] = useState(false);
  const [secondLineText, setSecondLineText] = useState('');
  const [blinkDots, setBlinkDots] = useState(true);
  const [introComplete, setIntroComplete] = useState(false);
  const [showLoginButton, setShowLoginButton] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  const [showVideo, setShowVideo] = useState(false);
  const [crtFlash, setCrtFlash] = useState(false);
  const primaryVideoRef = useRef<HTMLVideoElement>(null);
  const secondaryVideoRef = useRef<HTMLVideoElement>(null);
  const [primaryActive, setPrimaryActive] = useState(true);
  const firstLine = "Life's not a game";
  const secondLine = "but it should be!";

  const handleLogin = () => {
    window.location.href = '/login';
  };

  useEffect(() => { videos.forEach((src) => { const video = document.createElement('video'); video.preload = 'auto'; video.src = src; video.load(); }); }, []);
  useEffect(() => { if (primaryVideoRef.current) { primaryVideoRef.current.src = videos[0]; primaryVideoRef.current.load(); } if (secondaryVideoRef.current) { secondaryVideoRef.current.src = videos[1]; secondaryVideoRef.current.load(); } }, []);
  useEffect(() => { if (!showVideo) return; const cycleInterval = setInterval(() => { const nextIdx = (currentVideoIndex + 1) % videos.length; const nextVideo = primaryActive ? secondaryVideoRef.current : primaryVideoRef.current; if (nextVideo) { nextVideo.src = videos[nextIdx]; nextVideo.load(); nextVideo.play().catch(() => {}); } setPrimaryActive(!primaryActive); setCurrentVideoIndex(nextIdx); }, 15000); return () => clearInterval(cycleInterval); }, [showVideo, currentVideoIndex, primaryActive]);
  useEffect(() => { let charIndex = 0; let dotBlinks = 0; const typeFirstLine = setInterval(() => { if (charIndex < firstLine.length) { setTypedText(firstLine.slice(0, charIndex + 1)); charIndex++; } else { clearInterval(typeFirstLine); const blinkInterval = setInterval(() => { dotBlinks++; setBlinkDots((prev) => !prev); if (dotBlinks >= 6) { clearInterval(blinkInterval); setShowSecondLine(true); let secondCharIndex = 0; const typeSecondLine = setInterval(() => { if (secondCharIndex < secondLine.length) { setSecondLineText(secondLine.slice(0, secondCharIndex + 1)); secondCharIndex++; } else { clearInterval(typeSecondLine); setShowLoginButton(true); setTimeout(() => { setCrtFlash(true); setTimeout(() => { setShowVideo(true); primaryVideoRef.current?.play().catch(() => {}); setCrtFlash(false); setIntroComplete(true); }, 300); }, 500); } }, 80); } }, 300); } }, 100); return () => clearInterval(typeFirstLine); }, []);

  return (
    <div className="crt-wrapper">
      <PixelParticles />
      <div className="page-content">
        <section className="crt-intro" style={{ paddingTop: 'var(--content-top)' }}>
          <div className="video-background">
            <video ref={primaryVideoRef} className={`video-primary ${showVideo && primaryActive ? 'active' : ''}`} muted loop playsInline preload="auto" />
            <video ref={secondaryVideoRef} className={`video-secondary ${showVideo && !primaryActive ? 'active' : ''}`} muted loop playsInline preload="auto" />
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
                {secondLineText.length < secondLine.length && <span className="typing-cursor" />}
              </div>
            )}
            <button
              className={`player-login-btn ${showLoginButton ? 'visible' : ''}`}
              onClick={handleLogin}
            >
              Player 1: Start Your Adventure
            </button>
          </div>
          <div className={`scroll-hint ${introComplete ? 'visible' : ''}`}>
            SCROLL TO BEGIN
            <span className="scroll-arrow">&#9660;</span>
          </div>
        </section>

        <section className="retro-section section-visible">
          <div className="section-header">
            <p className="section-label">// SELECT YOUR QUEST</p>
            <h2 className="section-title shimmer-text">Choose Your Adventure</h2>
            <p className="section-subtitle">Each app gamifies a different aspect of your life. Complete quests, earn XP, and level up across all domains.</p>
          </div>
          <div className="games-grid">
            <a href="/fitness" className="game-card fitness">
              <span className="game-card-badge test">TEST</span>
              <DumbbellIcon className="game-icon" />
              <h3 className="game-name">IRON QUEST</h3>
              <p className="game-tagline">Turn every rep into XP</p>
              <XPBar current={4250} max={5000} color="#FF6B6B" />
              <p className="game-domain">/fitness</p>
            </a>
            <a href="/today" className="game-card tasks">
              <span className="game-card-badge test">TEST</span>
              <ChecklistIcon className="game-icon" />
              <h3 className="game-name">DAY QUEST</h3>
              <p className="game-tagline">Conquer your daily missions</p>
              <XPBar current={6800} max={10000} color="#5CC9F5" />
              <p className="game-domain">/today</p>
            </a>
            <a href="/travel" className="game-card travel">
              <span className="game-card-badge test">TEST</span>
              <PlaneIcon className="game-icon" />
              <h3 className="game-name">EXPLORER</h3>
              <p className="game-tagline">Map your adventures</p>
              <XPBar current={0} max={3000} color="#5fbf8a" />
              <p className="game-domain">/travel</p>
            </a>
            <div className="game-card life" style={{ cursor: 'default', opacity: 0.7 }}>
              <span className="game-card-badge coming-soon">SOON</span>
              <LifeIcon className="game-icon" />
              <h3 className="game-name">LIFE TRACKER</h3>
              <p className="game-tagline">Gamify everything else</p>
              <XPBar current={0} max={1000} color="#a855f7" />
              <p className="game-domain">gamify.life</p>
            </div>
          </div>
        </section>

        {/* Core Features Section */}
        <section className="retro-section section-visible">
          <div className="section-header">
            <p className="section-label">// CORE FEATURES</p>
            <h2 className="section-title shimmer-text">Your Adventure Toolkit</h2>
            <p className="section-subtitle">Everything you need to turn life into the ultimate RPG</p>
          </div>
          <div className="core-features-grid">
            <div className="core-feature-card">
              <div className="core-feature-icon">&#x1F5FA;&#xFE0F;</div>
              <h3 className="core-feature-title">QUESTS</h3>
              <p className="core-feature-desc">Create epic multi-step adventures. Travel quests to visit every national park. Fitness quests to hit PRs. Life quests to learn new skills.</p>
              <div className="core-feature-tag">Available Now</div>
            </div>
            <div className="core-feature-card">
              <div className="core-feature-icon">&#x1F9ED;</div>
              <h3 className="core-feature-title">HERO&apos;S JOURNEY</h3>
              <p className="core-feature-desc">Your life goals follow the classic narrative arc. From the Call to Adventure through trials and transformation to the Ultimate Reward.</p>
              <div className="core-feature-tag">Life Quests</div>
            </div>
            <div className="core-feature-card">
              <div className="core-feature-icon">&#x1F331;</div>
              <h3 className="core-feature-title">SEASONS</h3>
              <p className="core-feature-desc">12-week seasons with unique themes and challenges. Compete on leaderboards, earn seasonal rewards, and start fresh each cycle.</p>
              <div className="core-feature-tag coming">Coming Soon</div>
            </div>
            <div className="core-feature-card">
              <div className="core-feature-icon">&#x1F91D;</div>
              <h3 className="core-feature-title">FRIENDS & PARTIES</h3>
              <p className="core-feature-desc">Add friends, form quest parties, and tackle challenges together. See who visited that restaurant first. Compete on fitness leaderboards.</p>
              <div className="core-feature-tag">Available Now</div>
            </div>
            <div className="core-feature-card">
              <div className="core-feature-icon">&#x1F3C5;</div>
              <h3 className="core-feature-title">ACHIEVEMENTS</h3>
              <p className="core-feature-desc">Unlock badges from Common to Legendary tier. First Steps, Century Club, Globe Trotter, Iron Champion — hundreds to collect.</p>
              <div className="core-feature-tag">Available Now</div>
            </div>
            <div className="core-feature-card">
              <div className="core-feature-icon">&#x2728;</div>
              <h3 className="core-feature-title">UNIFIED XP</h3>
              <p className="core-feature-desc">Every app feeds into one global level. Hit the gym, check off tasks, explore new places — all XP counts toward your character.</p>
              <div className="core-feature-tag">Available Now</div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section className="retro-section section-visible how-it-works-section">
          <div className="section-header">
            <p className="section-label">// HOW IT WORKS</p>
            <h2 className="section-title shimmer-text">Level Up Your Life</h2>
          </div>
          <div className="how-it-works-flow">
            <div className="flow-step">
              <div className="flow-number">1</div>
              <div className="flow-content">
                <h3 className="flow-title">PICK YOUR GAMES</h3>
                <p className="flow-desc">Choose which aspects of life to gamify — fitness, daily tasks, travel, or all of them.</p>
              </div>
            </div>
            <div className="flow-connector">&#x2192;</div>
            <div className="flow-step">
              <div className="flow-number">2</div>
              <div className="flow-content">
                <h3 className="flow-title">COMPLETE ACTIONS</h3>
                <p className="flow-desc">Log workouts, check off tasks, visit new places. Every action earns XP.</p>
              </div>
            </div>
            <div className="flow-connector">&#x2192;</div>
            <div className="flow-step">
              <div className="flow-number">3</div>
              <div className="flow-content">
                <h3 className="flow-title">WATCH YOURSELF GROW</h3>
                <p className="flow-desc">Level up, unlock achievements, climb leaderboards, and become the hero of your own story.</p>
              </div>
            </div>
          </div>
        </section>

        {/* XP Ecosystem Section */}
        <section className="retro-section section-visible">
          <div className="section-header">
            <p className="section-label">// THE ECOSYSTEM</p>
            <h2 className="section-title shimmer-text">One Character, Many Worlds</h2>
            <p className="section-subtitle">All your progress connects to a single profile</p>
          </div>
          <div className="ecosystem-visual-large">
            <div className="eco-apps-row">
              <div className="eco-app-bubble fitness">
                <span className="eco-app-icon">&#x1F4AA;</span>
                <span className="eco-app-name">Iron Quest</span>
                <span className="eco-app-xp">+50 XP/workout</span>
              </div>
              <div className="eco-app-bubble today">
                <span className="eco-app-icon">&#x2705;</span>
                <span className="eco-app-name">Day Quest</span>
                <span className="eco-app-xp">+10 XP/task</span>
              </div>
              <div className="eco-app-bubble travel">
                <span className="eco-app-icon">&#x2708;&#xFE0F;</span>
                <span className="eco-app-name">Explorer</span>
                <span className="eco-app-xp">+25 XP/location</span>
              </div>
            </div>
            <div className="eco-flow-lines">
              <div className="eco-line left"></div>
              <div className="eco-line center"></div>
              <div className="eco-line right"></div>
            </div>
            <div className="eco-profile-hub">
              <div className="eco-hub-badge">
                <span className="eco-hub-lvl">LVL</span>
                <span className="eco-hub-num">42</span>
              </div>
              <div className="eco-hub-info">
                <span className="eco-hub-name">YOUR PROFILE</span>
                <span className="eco-hub-total">125,000 Total XP</span>
              </div>
            </div>
            <div className="eco-multipliers">
              <div className="eco-multiplier">
                <span className="eco-mult-icon">&#x1F525;</span>
                <span className="eco-mult-text">30-day streak = 2x XP</span>
              </div>
              <div className="eco-multiplier">
                <span className="eco-mult-icon">&#x1F389;</span>
                <span className="eco-mult-text">Seasonal events = Bonus XP</span>
              </div>
            </div>
          </div>
        </section>

        {/* Roadmap Section */}
        <section className="retro-section section-visible roadmap-section">
          <div className="section-header">
            <p className="section-label">// ROADMAP</p>
            <h2 className="section-title shimmer-text">What&apos;s Coming Next</h2>
            <p className="section-subtitle">We&apos;re building the ultimate life RPG — here&apos;s what&apos;s ahead</p>
          </div>
          <div className="roadmap-timeline">
            <div className="roadmap-phase current">
              <div className="phase-marker">
                <div className="phase-dot active"></div>
                <div className="phase-line"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">NOW</div>
                <h3 className="phase-title">Foundation</h3>
                <ul className="phase-items">
                  <li className="phase-item done">&#x2713; Iron Quest (Fitness Tracking)</li>
                  <li className="phase-item done">&#x2713; Day Quest (Daily Tasks)</li>
                  <li className="phase-item done">&#x2713; Explorer (Travel Logging)</li>
                  <li className="phase-item done">&#x2713; Friends & Social Features</li>
                  <li className="phase-item done">&#x2713; Travel Quests System</li>
                  <li className="phase-item done">&#x2713; Achievements & Badges</li>
                </ul>
              </div>
            </div>
            <div className="roadmap-phase">
              <div className="phase-marker">
                <div className="phase-dot"></div>
                <div className="phase-line"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">PHASE 1</div>
                <h3 className="phase-title">Social & Competitive</h3>
                <ul className="phase-items">
                  <li className="phase-item">Seasons with Leaderboards</li>
                  <li className="phase-item">Party Quests (Group Challenges)</li>
                  <li className="phase-item">Activity Feed & Notifications</li>
                  <li className="phase-item">Friend Suggestions</li>
                  <li className="phase-item">Progressive Opt-In Onboarding</li>
                </ul>
              </div>
            </div>
            <div className="roadmap-phase">
              <div className="phase-marker">
                <div className="phase-dot"></div>
                <div className="phase-line"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">PHASE 2</div>
                <h3 className="phase-title">Life Quests & AI</h3>
                <ul className="phase-items">
                  <li className="phase-item">Life Quests (Hero&apos;s Journey)</li>
                  <li className="phase-item">AI Quest Generation</li>
                  <li className="phase-item">Habit Tracking Integration</li>
                  <li className="phase-item">Personal Coaching Insights</li>
                </ul>
              </div>
            </div>
            <div className="roadmap-phase">
              <div className="phase-marker">
                <div className="phase-dot"></div>
              </div>
              <div className="phase-content">
                <div className="phase-label">FUTURE</div>
                <h3 className="phase-title">The Full RPG</h3>
                <ul className="phase-items">
                  <li className="phase-item">Character Customization</li>
                  <li className="phase-item">Skill Trees & Specializations</li>
                  <li className="phase-item">Guild System</li>
                  <li className="phase-item">Virtual Rewards & Loot</li>
                  <li className="phase-item">API for Third-Party Apps</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className="retro-section section-visible">
          <div className="about-content">
            <p className="section-label">// THE PHILOSOPHY</p>
            <h2 className="section-title shimmer-text" style={{ marginBottom: '2rem' }}>Why Gamify?</h2>
            <p className="about-text">We believe <span className="about-highlight">life should feel like an adventure</span>. Our suite of apps transforms mundane tasks into epic quests, boring routines into rewarding challenges, and everyday accomplishments into <span className="about-highlight">legendary achievements</span>.</p>
            <p className="about-text">Whether you&apos;re hitting the gym, checking off your to-do list, or exploring new places — every action earns XP that contributes to your <span className="about-highlight">unified profile</span>.</p>
            <p className="about-text">Built by people who love <span className="about-highlight">RPGs, productivity systems, and the science of motivation</span>. We&apos;re on a mission to make self-improvement actually fun.</p>
          </div>
        </section>

        <footer className="retro-footer section-visible">
          <p className="footer-tagline shimmer-text">Life&apos;s not a game... but it should be!</p>
          <p className="footer-text">&copy; {new Date().getFullYear()} GAMIFY.IT.COM — ALL RIGHTS RESERVED</p>
        </footer>
      </div>
    </div>
  );
}

// PWA Login Screen
function PWALogin({ user, onContinue }: { user: User | null; onContinue: () => void }) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'sent' | 'code'>('email');
  const [error, setError] = useState('');
  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Player';

  const handleSendLink = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    setLoading(true);
    setError('');
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOtp({
        email: email.toLowerCase().trim(),
        options: {
          shouldCreateUser: true,
          emailRedirectTo: `${window.location.origin}/auth/callback`
        }
      });
      if (error) {
        setError(error.message);
      } else {
        setStep('sent');
      }
    } catch (err) {
      console.error('sendLink catch:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
    setLoading(false);
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code || code.length !== 6) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`/api/auth/transfer-code?code=${code}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Invalid code');
        setCode('');
      } else {
        // Set the session using the tokens
        const supabase = createClient();
        const { error } = await supabase.auth.setSession({
          access_token: data.accessToken,
          refresh_token: data.refreshToken,
        });
        if (error) {
          setError(error.message);
        } else {
          // Reload to pick up the session
          window.location.reload();
        }
      }
    } catch (err) {
      console.error('verifyCode catch:', err);
      setError(`Network error: ${err instanceof Error ? err.message : 'Unknown'}`);
    }
    setLoading(false);
  };

  return (
    <div className="pwa-login">
      <PixelParticles />
      <div className="pwa-login-content">
        <div className="pwa-logo">G</div>
        <h1 className="pwa-title">GAMIFY.IT</h1>
        <p className="pwa-subtitle">Life&apos;s not a game...<br />but it should be!</p>

        {user ? (
          <div className="pwa-login-form">
            <p className="pwa-welcome">Welcome back,</p>
            <p className="pwa-welcome-name">{displayName}</p>
            <button className="pwa-continue-btn" onClick={onContinue}>
              Continue
            </button>
          </div>
        ) : step === 'sent' ? (
          <div className="pwa-login-form">
            <div className="pwa-sent-header">
              <div className="pwa-sent-icon">✉️</div>
              <p className="pwa-sent-text">Check your email!</p>
              <p className="pwa-sent-email">{email}</p>
              <p className="pwa-sent-hint">Click the link, then enter the 6-digit code shown on the page.</p>
            </div>
            <button className="pwa-code-btn" onClick={() => setStep('code')}>
              I have a code
            </button>
            <button className="pwa-back-btn" onClick={() => { setStep('email'); setError(''); }}>
              ← Use different email
            </button>
          </div>
        ) : step === 'code' ? (
          <div className="pwa-login-form">
            <p className="pwa-code-label">Enter the 6-digit code:</p>
            <form onSubmit={handleVerifyCode}>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                className="pwa-input pwa-code-input"
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                autoFocus
              />
              {error && <p className="pwa-error">{error}</p>}
              <button type="submit" className="pwa-submit-btn" disabled={loading || code.length !== 6}>
                {loading ? 'Verifying...' : 'Verify Code'}
              </button>
            </form>
            <button className="pwa-back-btn" onClick={() => { setStep('sent'); setCode(''); setError(''); }}>
              ← Back
            </button>
          </div>
        ) : (
          <div className="pwa-login-form">
            <form onSubmit={handleSendLink}>
              <input
                type="email"
                className="pwa-input"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              {error && <p className="pwa-error">{error}</p>}
              <button type="submit" className="pwa-submit-btn" disabled={loading}>
                {loading ? 'Sending...' : 'Send Magic Link'}
              </button>
            </form>
            <button className="pwa-code-btn" onClick={() => setStep('code')}>
              I already have a code
            </button>
          </div>
        )}
      </div>

      <style jsx>{`
        .pwa-login {
          min-height: 100vh;
          min-height: 100dvh;
          background: linear-gradient(180deg, #0a0a0a 0%, #121218 50%, #0a0a0a 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          padding-top: calc(2rem + env(safe-area-inset-top, 0px));
          position: relative;
        }
        .pwa-login-content {
          text-align: center;
          z-index: 10;
          width: 100%;
          max-width: 320px;
        }
        .pwa-logo {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, #1a1a2e 0%, #0a0a0a 100%);
          border-radius: 20px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Press Start 2P', monospace;
          font-size: 2.5rem;
          background: linear-gradient(135deg, #ff6b6b, #ffd700, #5fbf8a);
          -webkit-background-clip: text;
          background-clip: text;
          -webkit-text-fill-color: transparent;
          border: 2px solid rgba(255, 255, 255, 0.1);
        }
        .pwa-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 1.25rem;
          color: #fff;
          margin-bottom: 0.75rem;
        }
        .pwa-subtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #888;
          line-height: 2;
          margin-bottom: 2.5rem;
        }
        .pwa-login-form {
          display: flex;
          flex-direction: column;
          gap: 1rem;
        }
        .pwa-google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.75rem;
          width: 100%;
          padding: 1rem;
          background: #fff;
          border: none;
          border-radius: 12px;
          font-family: -apple-system, BlinkMacSystemFont, sans-serif;
          font-size: 1rem;
          font-weight: 500;
          color: #333;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pwa-google-btn:hover {
          background: #f5f5f5;
          transform: translateY(-2px);
        }
        .pwa-divider {
          display: flex;
          align-items: center;
          gap: 1rem;
          color: #555;
          font-size: 0.75rem;
        }
        .pwa-divider::before,
        .pwa-divider::after {
          content: '';
          flex: 1;
          height: 1px;
          background: rgba(255, 255, 255, 0.1);
        }
        .pwa-input {
          width: 100%;
          padding: 1rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          font-size: 1rem;
          color: #fff;
          outline: none;
          transition: all 0.2s;
        }
        .pwa-input:focus {
          border-color: #FFD700;
          box-shadow: 0 0 0 3px rgba(255, 215, 0, 0.1);
        }
        .pwa-input::placeholder {
          color: #666;
        }
        .pwa-submit-btn {
          width: 100%;
          padding: 1rem;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          border: none;
          border-radius: 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: #1a1a1a;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pwa-submit-btn:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(255, 215, 0, 0.3);
        }
        .pwa-submit-btn:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }
        .pwa-sent-header {
          text-align: center;
          margin-bottom: 1.5rem;
        }
        .pwa-sent-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }
        .pwa-sent-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: #5fbf8a;
          margin-bottom: 0.5rem;
        }
        .pwa-sent-email {
          font-size: 0.85rem;
          color: #FFD700;
          word-break: break-all;
          margin-bottom: 1rem;
        }
        .pwa-sent-hint {
          font-size: 0.7rem;
          color: #888;
          line-height: 1.6;
        }
        .pwa-error {
          font-size: 0.7rem;
          color: #ff6b6b;
          text-align: center;
          margin: 0.5rem 0;
        }
        .pwa-back-btn {
          background: none;
          border: none;
          color: #666;
          font-size: 0.75rem;
          margin-top: 1.5rem;
          cursor: pointer;
          transition: color 0.2s;
        }
        .pwa-back-btn:hover {
          color: #888;
        }
        .pwa-code-btn {
          background: transparent;
          border: 1px solid rgba(255, 215, 0, 0.3);
          border-radius: 10px;
          padding: 0.75rem 1rem;
          font-size: 0.85rem;
          color: #FFD700;
          cursor: pointer;
          transition: all 0.2s;
          margin-top: 1rem;
          width: 100%;
        }
        .pwa-code-btn:hover {
          background: rgba(255, 215, 0, 0.1);
          border-color: rgba(255, 215, 0, 0.5);
        }
        .pwa-code-label {
          font-size: 0.85rem;
          color: #aaa;
          margin-bottom: 1rem;
        }
        .pwa-code-input {
          text-align: center;
          font-size: 1.5rem !important;
          letter-spacing: 0.5rem;
          font-family: 'SF Mono', monospace !important;
        }
        .pwa-welcome {
          font-size: 0.75rem;
          color: #888;
          margin-bottom: 0.5rem;
        }
        .pwa-welcome-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.9rem;
          color: #FFD700;
          margin-bottom: 2rem;
          text-shadow: 0 0 15px rgba(255, 215, 0, 0.5);
        }
        .pwa-continue-btn {
          width: 100%;
          padding: 1.25rem;
          background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
          border: none;
          border-radius: 12px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.7rem;
          color: #1a1a1a;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pwa-continue-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(255, 215, 0, 0.4);
        }
      `}</style>
    </div>
  );
}

// Detect PWA mode synchronously (safe for SSR)
const getIsPWA = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
};

export default function LandingPage() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [isPWA] = useState(getIsPWA);
  const [showLaunch, setShowLaunch] = useState(getIsPWA);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setUser(session?.user ?? null);
        setAuthChecked(true);
        if (window.location.hash || window.location.search.includes('code=')) {
          window.history.replaceState({}, '', window.location.pathname);
        }
      })
      .catch((err) => {
        console.error('getSession error:', err);
        setAuthChecked(true); // Don't block on error
      });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Show loading state while checking auth (skip for PWA - show launch screen immediately)
  if (!authChecked && !isPWA) {
    return (
      <>
        <style jsx global>{`
          body { background: var(--theme-bg-base); }
        `}</style>
        <div className="min-h-screen-safe" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--theme-bg-base)' }}>
          <div style={{ width: '40px', height: '40px', border: '3px solid var(--theme-border)', borderTopColor: 'var(--theme-gold)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </>
    );
  }

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: var(--theme-bg-base); overflow-x: hidden; }

        /* Particles */
        .particles-container { position: fixed; top: 0; left: 0; right: 0; bottom: 0; pointer-events: none; z-index: 1; overflow: hidden; }
        .pixel-particle { position: absolute; image-rendering: pixelated; animation: float-up linear infinite; }
        @keyframes float-up { 0% { transform: translateY(100vh) rotate(0deg); opacity: 0; } 10% { opacity: 1; } 90% { opacity: 1; } 100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; } }

        /* CRT Effects */
        .crt-wrapper { background: linear-gradient(180deg, var(--theme-bg-base) 0%, var(--theme-bg-elevated) 50%, var(--theme-bg-base) 100%); position: relative; overflow: hidden; min-height: 100vh; min-height: 100dvh; }
        .crt-wrapper::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.08) 0px, rgba(0,0,0,0.08) 1px, transparent 1px, transparent 3px); pointer-events: none; z-index: 1000; }
        .crt-wrapper::after { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0,0,0,0.5) 100%); pointer-events: none; z-index: 999; }

        /* Dashboard Wrapper */
        .dashboard-wrapper { background: linear-gradient(180deg, var(--theme-bg-base) 0%, var(--theme-bg-elevated) 50%, var(--theme-bg-base) 100%); position: relative; min-height: 100vh; min-height: 100dvh; }
        .dashboard-wrapper::before { content: ''; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,0.03) 0px, rgba(0,0,0,0.03) 1px, transparent 1px, transparent 3px); pointer-events: none; z-index: 1000; }
        .dashboard-content { position: relative; z-index: 2; padding-top: var(--content-top, 100px); padding-left: 2rem; padding-right: 2rem; padding-bottom: 4rem; max-width: 1100px; margin: 0 auto; font-family: 'Press Start 2P', monospace; }

        /* Welcome Section */
        .welcome-section { margin-bottom: 3rem; }
        .welcome-card { background: var(--theme-bg-card); backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px); border: 1px solid var(--theme-border-light); border-radius: 20px; padding: 2rem; display: flex; align-items: center; gap: 2rem; box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2); }
        .welcome-avatar { position: relative; flex-shrink: 0; }
        .welcome-avatar img { width: 80px; height: 80px; border-radius: 16px; border: 3px solid var(--theme-gold); box-shadow: 0 0 30px var(--theme-gold-glow); }
        .welcome-avatar .avatar-placeholder { width: 80px; height: 80px; border-radius: 16px; border: 3px solid var(--theme-gold); background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%); display: flex; align-items: center; justify-content: center; font-size: 1.5rem; color: #1a1a1a; box-shadow: 0 0 30px var(--theme-gold-glow); }
        .level-badge { position: absolute; bottom: -8px; right: -8px; background: linear-gradient(180deg, #FFD700 0%, #FFA500 100%); border: 2px solid #CC8800; border-radius: 8px; padding: 0.3rem 0.5rem; font-size: 0.45rem; color: #1a1a1a; font-weight: bold; box-shadow: 0 2px 0 #996600; }
        .welcome-info { flex: 1; }
        .welcome-label { font-size: 0.4rem; color: var(--app-travel); letter-spacing: 0.2em; margin-bottom: 0.5rem; }
        .welcome-name { font-size: clamp(0.9rem, 3vw, 1.4rem); color: var(--theme-text-primary); margin-bottom: 1rem; }
        .xp-display { display: inline-flex; align-items: baseline; gap: 0.75rem; background: var(--theme-bg-tertiary); border: 1px solid var(--theme-border); border-radius: 10px; padding: 0.6rem 1rem; }
        .xp-value { font-size: 1rem; color: var(--theme-gold); }
        .xp-label { font-size: 0.35rem; color: var(--theme-text-muted); }

        /* Games Section */
        .games-section { margin-bottom: 3rem; }

        /* Stats Section */
        .stats-section { margin-bottom: 2rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; }
        .stat-card { background: var(--theme-bg-card); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); border: 1px solid var(--theme-border); border-radius: 12px; padding: 1.25rem; text-align: center; transition: all 0.3s ease; }
        .stat-card:hover { border-color: var(--theme-gold); box-shadow: 0 0 20px var(--theme-gold-glow); }
        .stat-value { font-size: 1.5rem; margin-bottom: 0.5rem; }
        .stat-label { font-size: 0.45rem; color: var(--theme-text-secondary); }

        /* Shared Styles */
        @keyframes subtle-flicker { 0%, 100% { opacity: 1; } 50% { opacity: 0.985; } }
        @keyframes cursor-blink { 0%, 50% { opacity: 1; } 51%, 100% { opacity: 0; } }
        .page-content { color: #fff; font-family: 'Press Start 2P', monospace; animation: subtle-flicker 4s infinite; position: relative; z-index: 2; }
        .crt-intro { min-height: 100vh; min-height: 100dvh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 2rem; position: relative; overflow: hidden; }
        .video-background { position: absolute; top: 0; left: 0; width: 100%; height: 100%; z-index: 0; overflow: hidden; background: #0a0a0a; }
        .video-background video { position: absolute; top: 50%; left: 50%; min-width: 100%; min-height: 100%; width: auto; height: auto; transform: translate(-50%, -50%); object-fit: cover; transition: opacity 1s ease; }
        .video-primary, .video-secondary { opacity: 0; }
        .video-primary.active, .video-secondary.active { opacity: 0.5; }
        .video-flash { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: white; z-index: 10; pointer-events: none; opacity: 0; }
        .video-flash.active { animation: crtFlash 0.4s ease-out forwards; }
        @keyframes crtFlash { 0% { opacity: 0; } 15% { opacity: 0.9; } 30% { opacity: 0.7; } 100% { opacity: 0; } }
        .video-overlay { position: absolute; top: 0; left: 0; width: 100%; height: 100%; background: radial-gradient(ellipse at center, transparent 0%, rgba(0,0,0,0.8) 100%), linear-gradient(180deg, rgba(0,0,0,0.3) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.5) 100%); z-index: 1; }
        .crt-screen { max-width: 95vw; text-align: center; position: relative; z-index: 2; }
        .typing-line { white-space: nowrap; font-size: clamp(0.6rem, 2.5vw, 1.8rem); line-height: 1.8; }
        .typing-line-first { color: #00ff00; text-shadow: 0 0 10px rgba(0,255,0,0.8), 0 0 20px rgba(0,255,0,0.5), 0 0 40px rgba(0,255,0,0.3); }
        .typing-line-second { display: block; margin-top: 0.5rem; background: linear-gradient(90deg, #fff 0%, #fff 35%, #ff6b6b 42%, #FFD700 50%, #00ff00 58%, #fff 65%, #fff 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: rgb-shimmer 4s ease-in-out infinite; filter: drop-shadow(0 0 10px rgba(255,215,0,0.5)); }
        .typing-cursor { display: inline-block; width: 0.5em; height: 1em; background: currentColor; margin-left: 0.15em; animation: cursor-blink 0.8s infinite; vertical-align: middle; box-shadow: 0 0 10px currentColor; }
        .dots { color: #00ff00; text-shadow: 0 0 10px rgba(0,255,0,0.5); transition: opacity 0.15s; }
        .player-login-btn { margin-top: 2.5rem; padding: 1rem 2rem; background: transparent; border: 2px solid var(--theme-gold); border-radius: 8px; font-family: 'Press Start 2P', monospace; font-size: clamp(0.45rem, 1.5vw, 0.65rem); color: var(--theme-gold); cursor: pointer; opacity: 0; transform: translateY(20px); transition: all 0.5s ease; pointer-events: none; position: relative; overflow: hidden; }
        .player-login-btn.visible { opacity: 1; transform: translateY(0); pointer-events: auto; animation: pulse-border 2s ease-in-out infinite; }
        .player-login-btn:hover { background: var(--theme-gold); color: #1a1a1a; box-shadow: 0 0 30px var(--theme-gold-glow), 0 0 60px var(--theme-gold-glow); transform: scale(1.05); }
        .player-login-btn:active { transform: scale(0.98); }
        @keyframes pulse-border { 0%, 100% { box-shadow: 0 0 10px var(--theme-gold-glow); } 50% { box-shadow: 0 0 25px var(--theme-gold-glow), 0 0 40px var(--theme-gold-glow); } }
        .scroll-hint { position: absolute; bottom: 2rem; left: 50%; transform: translateX(-50%); font-size: 0.45rem; color: #666; opacity: 0; transition: opacity 0.5s; text-align: center; }
        .scroll-hint.visible { opacity: 1; animation: pulse-glow 2s infinite; }
        @keyframes pulse-glow { 0%, 100% { text-shadow: 0 0 5px rgba(255,215,0,0.3); } 50% { text-shadow: 0 0 15px rgba(255,215,0,0.6); color: #888; } }
        .scroll-arrow { display: block; margin-top: 0.75rem; font-size: 1rem; animation: bounce 2s infinite; }
        @keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
        .section-hidden { opacity: 0; visibility: hidden; transform: translateY(30px); }
        .section-visible { opacity: 1; visibility: visible; transform: translateY(0); transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1); }
        .retro-section { padding: 6rem 2rem; max-width: 1200px; margin: 0 auto; position: relative; }
        .section-header { text-align: center; margin-bottom: 4rem; }
        .section-label { font-size: 0.45rem; color: var(--app-travel); margin-bottom: 1rem; font-family: 'Press Start 2P', monospace; letter-spacing: 0.2em; }
        .section-title { font-size: clamp(1.1rem, 4vw, 1.8rem); margin-bottom: 1.5rem; font-family: 'Press Start 2P', monospace; line-height: 1.6; color: var(--theme-text-primary); }
        @keyframes rgb-shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
        .shimmer-text { background: linear-gradient(90deg, var(--theme-text-primary) 0%, var(--theme-text-primary) 35%, var(--app-fitness) 42%, var(--theme-gold) 50%, var(--app-travel) 58%, var(--theme-text-primary) 65%, var(--theme-text-primary) 100%); background-size: 200% 100%; -webkit-background-clip: text; background-clip: text; -webkit-text-fill-color: transparent; animation: rgb-shimmer 4s ease-in-out infinite; }
        .section-subtitle { font-size: 0.55rem; color: var(--theme-text-muted); line-height: 2.2; max-width: 800px; margin: 0 auto; font-family: 'Press Start 2P', monospace; }
        .games-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
        .game-card { background: linear-gradient(180deg, var(--theme-bg-tertiary) 0%, var(--theme-bg-card) 100%); border: 2px solid var(--theme-border-light); border-radius: 16px; padding: 1.5rem 1.25rem 1.25rem; text-align: center; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); text-decoration: none; display: block; box-shadow: 0 4px 0 rgba(0,0,0,0.2), 0 8px 30px rgba(0,0,0,0.15); position: relative; overflow: hidden; }
        .game-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: linear-gradient(90deg, transparent, var(--card-color, var(--theme-gold)), transparent); opacity: 0; transition: opacity 0.3s ease; }
        .game-card::after { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: radial-gradient(circle at 50% 0%, var(--card-glow, rgba(255,215,0,0.1)) 0%, transparent 60%); opacity: 0; transition: opacity 0.3s ease; pointer-events: none; }
        .game-card:hover { transform: translateY(-8px); border-color: var(--card-color, var(--theme-gold)); box-shadow: 0 12px 0 rgba(0,0,0,0.15), 0 20px 40px rgba(0,0,0,0.2), 0 0 40px var(--card-glow, rgba(255,215,0,0.15)); }
        .game-card:hover::before, .game-card:hover::after { opacity: 1; }
        .game-card.fitness { --card-color: var(--app-fitness); --card-glow: var(--app-fitness-glow); }
        .game-card.tasks { --card-color: var(--app-today); --card-glow: var(--app-today-glow); }
        .game-card.travel { --card-color: var(--app-travel); --card-glow: var(--app-travel-glow); }
        .game-card.life { --card-color: var(--app-life); --card-glow: var(--app-life-glow); }
        .game-card-badge { position: absolute; top: 0.7rem; right: 0.7rem; font-size: 0.31rem; padding: 0.22rem 0.44rem; background: rgba(95,191,138,0.2); border: 1px solid var(--app-travel); border-radius: 4px; color: var(--app-travel); font-family: 'Press Start 2P', monospace; }
        .game-card-badge.coming-soon { background: rgba(168,85,247,0.2); border-color: var(--app-life); color: var(--app-life); }
        .game-card-badge.test { background: rgba(255,193,7,0.2); border-color: #ffc107; color: #ffc107; }
        .game-icon { width: 64px; height: 64px; margin: 0 auto 1rem; transition: all 0.3s ease; filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3)); }
        .game-card:hover .game-icon { transform: scale(1.1) translateY(-4px); filter: drop-shadow(0 8px 16px rgba(0,0,0,0.4)); }
        .game-name { font-size: 0.7rem; color: var(--theme-text-primary); margin-bottom: 0.5rem; font-family: 'Press Start 2P', monospace; }
        .game-tagline { font-size: 0.5rem; color: var(--theme-text-secondary); margin-bottom: 1rem; font-family: 'Press Start 2P', monospace; line-height: 1.8; }
        .xp-bar-container { margin-top: 0.5rem; }
        .xp-bar-bg { height: 6px; background: var(--theme-bg-base); border: 1px solid var(--theme-border); border-radius: 3px; overflow: hidden; }
        .xp-bar-fill { height: 100%; border-radius: 2px; transition: width 0.5s ease-out; }
        .xp-bar-text { display: block; margin-top: 0.4rem; font-size: 0.35rem; color: var(--theme-text-muted); font-family: 'Press Start 2P', monospace; }
        .game-domain { font-size: 0.4rem; color: var(--theme-text-muted); margin-top: 0.75rem; font-family: 'Press Start 2P', monospace; transition: color 0.2s ease; }
        .game-card:hover .game-domain { color: var(--theme-text-secondary); }
        .features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem; max-width: 1000px; margin: 0 auto; }
        .feature-card { background: linear-gradient(180deg, var(--theme-bg-card) 0%, var(--theme-bg-elevated) 100%); border: 1px solid var(--theme-border); border-radius: 12px; padding: 1.75rem; transition: all 0.3s ease; }
        .feature-card:hover { border-color: var(--theme-border-light); transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
        .feature-icon { font-size: 1.75rem; margin-bottom: 0.75rem; }
        .feature-title { font-size: 0.5rem; color: var(--theme-gold); margin-bottom: 0.6rem; font-family: 'Press Start 2P', monospace; }
        .feature-desc { font-size: 0.5rem; color: var(--theme-text-muted); line-height: 2; font-family: 'Press Start 2P', monospace; }
        .about-content { max-width: 900px; margin: 0 auto; text-align: center; }
        .about-text { font-size: 0.55rem; color: var(--theme-text-secondary); line-height: 2.2; font-family: 'Press Start 2P', monospace; margin-bottom: 1.5rem; }
        .about-highlight { color: var(--theme-gold); }
        .total-xp-display { display: inline-flex; align-items: center; gap: 0.75rem; background: linear-gradient(180deg, var(--theme-bg-tertiary) 0%, var(--theme-bg-card) 100%); border: 2px solid var(--theme-border-light); border-radius: 12px; padding: 1rem 1.75rem; margin-top: 1.25rem; box-shadow: 0 4px 0 rgba(0,0,0,0.15); }
        .total-xp-label { font-size: 0.4rem; color: var(--theme-text-muted); }
        .total-xp-value { font-size: 0.8rem; color: var(--theme-gold); }

        /* Core Features Grid */
        .core-features-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 1.5rem; max-width: 1100px; margin: 0 auto; }
        .core-feature-card { background: linear-gradient(180deg, var(--theme-bg-card) 0%, var(--theme-bg-elevated) 100%); border: 1px solid var(--theme-border); border-radius: 16px; padding: 1.75rem; transition: all 0.3s ease; position: relative; overflow: hidden; }
        .core-feature-card:hover { border-color: var(--theme-gold); transform: translateY(-4px); box-shadow: 0 10px 30px rgba(0,0,0,0.2), 0 0 20px var(--theme-gold-glow); }
        .core-feature-icon { font-size: 2.5rem; margin-bottom: 1rem; }
        .core-feature-title { font-size: 0.65rem; color: var(--theme-gold); margin-bottom: 0.75rem; font-family: 'Press Start 2P', monospace; }
        .core-feature-desc { font-size: 0.45rem; color: var(--theme-text-secondary); line-height: 2; font-family: 'Press Start 2P', monospace; margin-bottom: 1rem; }
        .core-feature-tag { display: inline-block; font-size: 0.35rem; padding: 0.3rem 0.6rem; background: rgba(95,191,138,0.2); border: 1px solid var(--app-travel); border-radius: 4px; color: var(--app-travel); font-family: 'Press Start 2P', monospace; }
        .core-feature-tag.coming { background: rgba(168,85,247,0.2); border-color: var(--app-life); color: var(--app-life); }

        /* How It Works Flow */
        .how-it-works-section { background: linear-gradient(180deg, transparent 0%, rgba(255,215,0,0.02) 50%, transparent 100%); }
        .how-it-works-flow { display: flex; align-items: flex-start; justify-content: center; gap: 1rem; flex-wrap: wrap; max-width: 1000px; margin: 0 auto; }
        .flow-step { background: var(--theme-bg-card); border: 2px solid var(--theme-border); border-radius: 16px; padding: 1.5rem; text-align: center; flex: 1; min-width: 220px; max-width: 280px; transition: all 0.3s ease; }
        .flow-step:hover { border-color: var(--theme-gold); box-shadow: 0 0 25px var(--theme-gold-glow); }
        .flow-number { width: 48px; height: 48px; background: linear-gradient(180deg, var(--theme-gold) 0%, #E6A000 100%); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 1.2rem; color: #1a1a1a; font-family: 'Press Start 2P', monospace; margin: 0 auto 1rem; box-shadow: 0 3px 0 #996600; }
        .flow-content { }
        .flow-title { font-size: 0.55rem; color: var(--theme-text-primary); margin-bottom: 0.75rem; font-family: 'Press Start 2P', monospace; }
        .flow-desc { font-size: 0.45rem; color: var(--theme-text-muted); line-height: 1.9; font-family: 'Press Start 2P', monospace; }
        .flow-connector { font-size: 1.5rem; color: var(--theme-gold); align-self: center; padding-top: 1rem; }
        @media (max-width: 768px) { .flow-connector { display: none; } .how-it-works-flow { flex-direction: column; align-items: center; } .flow-step { max-width: 100%; } }

        /* Ecosystem Visual */
        .ecosystem-visual-large { max-width: 700px; margin: 0 auto; text-align: center; }
        .eco-apps-row { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; margin-bottom: 1.5rem; }
        .eco-app-bubble { background: var(--theme-bg-card); border: 2px solid var(--theme-border); border-radius: 16px; padding: 1.25rem 1.5rem; display: flex; flex-direction: column; align-items: center; gap: 0.5rem; transition: all 0.3s ease; min-width: 140px; }
        .eco-app-bubble:hover { transform: translateY(-4px); }
        .eco-app-bubble.fitness { border-color: var(--app-fitness); } .eco-app-bubble.fitness:hover { box-shadow: 0 0 20px var(--app-fitness-glow); }
        .eco-app-bubble.today { border-color: var(--app-today); } .eco-app-bubble.today:hover { box-shadow: 0 0 20px var(--app-today-glow); }
        .eco-app-bubble.travel { border-color: var(--app-travel); } .eco-app-bubble.travel:hover { box-shadow: 0 0 20px var(--app-travel-glow); }
        .eco-app-icon { font-size: 1.75rem; }
        .eco-app-name { font-size: 0.45rem; color: var(--theme-text-primary); font-family: 'Press Start 2P', monospace; }
        .eco-app-xp { font-size: 0.35rem; color: var(--theme-text-muted); font-family: 'Press Start 2P', monospace; }
        .eco-flow-lines { display: flex; justify-content: center; gap: 4rem; margin-bottom: 1rem; }
        .eco-line { width: 2px; height: 40px; background: linear-gradient(180deg, var(--theme-border-light), var(--theme-gold)); }
        .eco-profile-hub { display: flex; align-items: center; justify-content: center; gap: 1.25rem; background: linear-gradient(180deg, var(--theme-bg-tertiary) 0%, var(--theme-bg-card) 100%); border: 2px solid var(--theme-gold); border-radius: 16px; padding: 1.25rem 2rem; margin: 0 auto 1.5rem; max-width: 320px; box-shadow: 0 0 30px var(--theme-gold-glow); }
        .eco-hub-badge { width: 60px; height: 60px; background: linear-gradient(180deg, var(--theme-gold) 0%, #E6A000 100%); border: 2px solid #CC8800; border-radius: 12px; display: flex; flex-direction: column; align-items: center; justify-content: center; box-shadow: 0 3px 0 #996600; }
        .eco-hub-lvl { font-size: 0.35rem; color: #1a1a1a; font-family: 'Press Start 2P', monospace; }
        .eco-hub-num { font-size: 1rem; color: #1a1a1a; font-family: 'Press Start 2P', monospace; }
        .eco-hub-info { text-align: left; }
        .eco-hub-name { display: block; font-size: 0.4rem; color: var(--theme-text-muted); font-family: 'Press Start 2P', monospace; margin-bottom: 0.25rem; }
        .eco-hub-total { display: block; font-size: 0.55rem; color: var(--theme-gold); font-family: 'Press Start 2P', monospace; }
        .eco-multipliers { display: flex; justify-content: center; gap: 1.5rem; flex-wrap: wrap; }
        .eco-multiplier { display: flex; align-items: center; gap: 0.5rem; background: var(--theme-bg-card); border: 1px solid var(--theme-border); border-radius: 8px; padding: 0.6rem 1rem; }
        .eco-mult-icon { font-size: 1rem; }
        .eco-mult-text { font-size: 0.4rem; color: var(--theme-text-secondary); font-family: 'Press Start 2P', monospace; }

        /* Roadmap Timeline */
        .roadmap-section { }
        .roadmap-timeline { max-width: 700px; margin: 0 auto; }
        .roadmap-phase { display: flex; gap: 1.5rem; margin-bottom: 0; }
        .phase-marker { display: flex; flex-direction: column; align-items: center; width: 20px; flex-shrink: 0; }
        .phase-dot { width: 16px; height: 16px; border-radius: 50%; background: var(--theme-bg-elevated); border: 2px solid var(--theme-border); transition: all 0.3s ease; }
        .phase-dot.active { background: var(--theme-gold); border-color: var(--theme-gold); box-shadow: 0 0 15px var(--theme-gold-glow); }
        .phase-line { width: 2px; flex: 1; background: linear-gradient(180deg, var(--theme-border), var(--theme-border-light)); margin-top: 0.5rem; }
        .phase-content { flex: 1; padding-bottom: 2.5rem; }
        .phase-label { font-size: 0.4rem; color: var(--theme-gold); font-family: 'Press Start 2P', monospace; margin-bottom: 0.5rem; letter-spacing: 0.1em; }
        .phase-title { font-size: 0.65rem; color: var(--theme-text-primary); font-family: 'Press Start 2P', monospace; margin-bottom: 1rem; }
        .phase-items { list-style: none; padding: 0; margin: 0; }
        .phase-item { font-size: 0.45rem; color: var(--theme-text-muted); font-family: 'Press Start 2P', monospace; line-height: 2.2; padding-left: 0.5rem; }
        .phase-item.done { color: var(--app-travel); }
        .roadmap-phase.current .phase-content { }
        .roadmap-phase:hover .phase-dot:not(.active) { border-color: var(--theme-gold); background: rgba(255,215,0,0.2); }

        .retro-footer { padding: 4rem 2rem; text-align: center; border-top: 1px solid var(--theme-border); background: linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.1) 100%); }
        .footer-tagline { font-size: 0.5rem; margin-bottom: 1.25rem; }
        .footer-text { font-size: 0.38rem; color: var(--theme-text-muted); font-family: 'Press Start 2P', monospace; }

        /* ===== LIGHT MODE POLISH ===== */
        :global(html.light) .crt-wrapper::before,
        :global(html.light) .dashboard-wrapper::before { background: repeating-linear-gradient(0deg, rgba(0,0,0,0.02) 0px, rgba(0,0,0,0.02) 1px, transparent 1px, transparent 3px); }
        :global(html.light) .crt-wrapper::after { background: radial-gradient(ellipse at center, transparent 0%, transparent 60%, rgba(0,0,0,0.08) 100%); }
        :global(html.light) .welcome-card { box-shadow: 0 4px 20px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.06); }
        :global(html.light) .game-card { box-shadow: 0 2px 0 rgba(0,0,0,0.05), 0 4px 20px rgba(0,0,0,0.06); }
        :global(html.light) .game-card:hover { box-shadow: 0 8px 0 rgba(0,0,0,0.04), 0 12px 30px rgba(0,0,0,0.1), 0 0 30px var(--card-glow); }
        :global(html.light) .stat-card { box-shadow: 0 2px 10px rgba(0,0,0,0.04); }
        :global(html.light) .feature-card:hover { box-shadow: 0 8px 24px rgba(0,0,0,0.08); }
        :global(html.light) .pixel-particle { opacity: 0.4 !important; }

        @media (max-width: 768px) {
          .games-grid { gap: 1rem; }
          .game-card { padding: 1.25rem 1rem 1rem; }
          .game-icon { width: 48px; height: 48px; }
          .game-name { font-size: 0.6rem; }
          .retro-section { padding: 4rem 1.25rem; }
          .welcome-card { flex-direction: column; text-align: center; gap: 1.5rem; }
          .stats-grid { grid-template-columns: 1fr; }
          .dashboard-content { padding-top: var(--content-top, 90px); padding-left: 1rem; padding-right: 1rem; padding-bottom: 2rem; }
        }
      `}</style>

      {/* PWA login hidden for now */}
      {user ? (
        <Dashboard user={user} />
      ) : (
        <SplashIntro />
      )}
    </>
  );
}
