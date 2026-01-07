"use client";

import { useState, useEffect, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { User } from "@supabase/supabase-js";

const QUEST_TYPES = [
  { icon: "📚", name: "Reading", example: '"Read 52 books this year"', color: "#60a5fa" },
  { icon: "🏆", name: "Achievement", example: '"Get an A in calculus"', color: "#fbbf24" },
  { icon: "💪", name: "Fitness", example: '"Run a marathon by December"', color: "#ef4444" },
  { icon: "🎓", name: "Learning", example: '"Learn Spanish fluently"', color: "#a78bfa" },
  { icon: "🗺️", name: "Collection", example: '"Visit every US National Park"', color: "#34d399" },
  { icon: "🔥", name: "Habit", example: '"Meditate daily for 100 days"', color: "#f97316" },
];

const JOURNEY_STAGES = [
  { name: "The Calling", percent: "0%", desc: "Accept your quest" },
  { name: "Threshold", percent: "25%", desc: "Cross into the unknown" },
  { name: "The Tests", percent: "50%", desc: "Face your challenges" },
  { name: "The Ordeal", percent: "75%", desc: "Survive the crucible" },
  { name: "The Reward", percent: "90%", desc: "Claim your prize" },
  { name: "The Return", percent: "100%", desc: "Master achieved" },
];

const FEATURES = [
  {
    icon: "✨",
    title: "AI Goal Decomposition",
    desc: "Tell us your goal and our AI breaks it into actionable milestones with smart scheduling",
  },
  {
    icon: "⚡",
    title: "Dynamic XP Rewards",
    desc: "Earn XP based on difficulty, time, and streaks. Critical hits give bonus XP!",
  },
  {
    icon: "👥",
    title: "Party Quests",
    desc: "Invite friends to join your quests for accountability and bonus XP",
  },
  {
    icon: "🚀",
    title: "Cross-App Integration",
    desc: "Link quests to Fitness, Travel, or Day Quest for automatic progress tracking",
  },
];

export default function LifeQuestsLanding() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [hasBetaAccess, setHasBetaAccess] = useState(false);
  const [typedText, setTypedText] = useState("");
  const [showCursor, setShowCursor] = useState(true);
  const [activeStage, setActiveStage] = useState(0);
  const fullText = "Turn any goal into an epic quest.";

  const particles = useMemo(() =>
    [...Array(30)].map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      delay: Math.random() * 10,
      duration: 15 + Math.random() * 20,
      size: Math.random() * 3 + 2,
      color: ['#a855f7', '#5fbf8a', '#ffd700', '#ff6b6b'][Math.floor(Math.random() * 4)],
    })),
  []);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      setUser(data.user);
      if (data.user) {
        const { data: subscription } = await supabase
          .from("user_subscriptions")
          .select("features")
          .eq("user_id", data.user.id)
          .eq("app_id", "life")
          .single();

        if (subscription?.features?.includes("life_beta_access")) {
          setHasBetaAccess(true);
        }
      }
    });
  }, []);

  useEffect(() => {
    let i = 0;
    const interval = setInterval(() => {
      if (i <= fullText.length) {
        setTypedText(fullText.slice(0, i));
        i++;
      } else {
        clearInterval(interval);
      }
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor((prev) => !prev), 530);
    return () => clearInterval(cursorInterval);
  }, []);

  useEffect(() => {
    const stageInterval = setInterval(() => setActiveStage((prev) => (prev + 1) % JOURNEY_STAGES.length), 2000);
    return () => clearInterval(stageInterval);
  }, []);

  const handleStart = () => {
    if (!hasBetaAccess) return;
    if (user) {
      router.push("/life/quests");
    } else {
      router.push("/login");
    }
  };

  return (
    <div className="life-landing">
      {/* CRT Effects */}
      <div className="crt-scanlines" />
      <div className="crt-vignette" />

      {/* Particles */}
      <div className="particles-container">
        {particles.map((p, i) => (
          <div
            key={i}
            className="particle"
            style={{
              left: `${p.left}%`,
              top: `${p.top}%`,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              animationDelay: `${p.delay}s`,
              animationDuration: `${p.duration}s`,
            }}
          />
        ))}
      </div>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-content">
          <span className="hero-badge">
            <span className="badge-icon">✨</span>
            AI-Powered Life Gamification
          </span>

          <h1 className="app-name">LIFE QUESTS</h1>

          <p className="hero-tagline">
            {typedText}
            <span className="typing-cursor" style={{ opacity: showCursor ? 1 : 0 }} />
          </p>

          <div className="hero-cta">
            {hasBetaAccess ? (
              <button onClick={handleStart} className="cta-button primary">
                <span className="cta-icon">⚡</span>
                Begin Your Journey
                <span className="cta-arrow">→</span>
              </button>
            ) : (
              <div className="cta-button disabled">
                <span className="cta-icon">🔒</span>
                Coming Soon
              </div>
            )}
            <p className="cta-subtext">
              {hasBetaAccess
                ? "Free tier includes 3 AI-generated quests per month"
                : "Life Quests is currently in private beta"}
            </p>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="content-section">
        <div className="section-header">
          <span className="section-label">// HOW IT WORKS</span>
          <h2 className="section-title">Transform Goals Into Adventures</h2>
        </div>

        <div className="steps-grid">
          <div className="step-card">
            <div className="step-number">1</div>
            <div className="step-icon">🎯</div>
            <h3 className="step-title">Speak Your Goal</h3>
            <p className="step-desc">Just type what you want to achieve in plain English</p>
          </div>

          <div className="step-connector">→</div>

          <div className="step-card">
            <div className="step-number">2</div>
            <div className="step-icon">✨</div>
            <h3 className="step-title">AI Creates Your Quest</h3>
            <p className="step-desc">Our AI decomposes your goal into milestones and XP rewards</p>
          </div>

          <div className="step-connector">→</div>

          <div className="step-card">
            <div className="step-number">3</div>
            <div className="step-icon">🚀</div>
            <h3 className="step-title">Live Your Adventure</h3>
            <p className="step-desc">Track progress through the Hero&apos;s Journey and earn XP</p>
          </div>
        </div>
      </section>

      {/* Quest Types */}
      <section className="content-section">
        <div className="section-header">
          <span className="section-label">// QUEST TYPES</span>
          <h2 className="section-title">Any Goal. Any Dream.</h2>
          <p className="section-subtitle">Life Quests adapts to whatever you want to achieve</p>
        </div>

        <div className="quest-types-grid">
          {QUEST_TYPES.map((type) => (
            <div key={type.name} className="quest-type-card" style={{ '--card-color': type.color } as React.CSSProperties}>
              <span className="quest-type-icon">{type.icon}</span>
              <h3 className="quest-type-name">{type.name}</h3>
              <p className="quest-type-example">{type.example}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Hero's Journey */}
      <section className="content-section">
        <div className="section-header">
          <span className="section-label">// THE NARRATIVE</span>
          <h2 className="section-title">The Hero&apos;s Journey</h2>
          <p className="section-subtitle">Every quest follows the ancient storytelling structure</p>
        </div>

        <div className="journey-timeline">
          <div className="journey-track">
            <div
              className="journey-progress"
              style={{ width: `${(activeStage / (JOURNEY_STAGES.length - 1)) * 100}%` }}
            />
          </div>
          <div className="journey-stages">
            {JOURNEY_STAGES.map((stage, i) => (
              <div key={stage.name} className={`journey-stage ${i <= activeStage ? 'active' : ''} ${i === activeStage ? 'current' : ''}`}>
                <div className="stage-dot">
                  {i <= activeStage ? '★' : '○'}
                </div>
                <span className="stage-name">{stage.name}</span>
                <span className="stage-desc">{stage.desc}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="journey-highlight">
          <span className="highlight-icon">👑</span>
          <h3 className="highlight-title">{JOURNEY_STAGES[activeStage].name}</h3>
          <p className="highlight-desc">{JOURNEY_STAGES[activeStage].desc}</p>
        </div>
      </section>

      {/* Features */}
      <section className="content-section">
        <div className="section-header">
          <span className="section-label">// FEATURES</span>
          <h2 className="section-title">Your Quest Toolkit</h2>
        </div>

        <div className="features-grid">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="feature-card">
              <span className="feature-icon">{feature.icon}</span>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Final CTA */}
      <section className="content-section final-cta">
        <h2 className="final-title">
          {hasBetaAccess
            ? "Ready to become the hero of your own story?"
            : "Life Quests is coming soon"}
        </h2>
        {hasBetaAccess ? (
          <button onClick={handleStart} className="cta-button primary large">
            <span className="cta-icon">👑</span>
            Start Your First Quest
            <span className="cta-arrow">→</span>
          </button>
        ) : (
          <div className="cta-button disabled large">
            <span className="cta-icon">🔒</span>
            Coming Soon
          </div>
        )}
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <p className="footer-text">
          Part of the{" "}
          <Link href="/" className="footer-link">gamify.it.com</Link>{" "}
          family
        </p>
      </footer>

      <style jsx>{`
        .life-landing {
          min-height: 100vh;
          background: linear-gradient(180deg, var(--theme-bg-base) 0%, #0f0a15 50%, var(--theme-bg-base) 100%);
          color: var(--theme-text-primary);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* CRT Effects */
        .crt-scanlines {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: repeating-linear-gradient(
            0deg,
            rgba(0, 0, 0, 0.06) 0px,
            rgba(0, 0, 0, 0.06) 1px,
            transparent 1px,
            transparent 3px
          );
          pointer-events: none;
          z-index: 1000;
        }

        .crt-vignette {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: radial-gradient(ellipse at center, transparent 0%, transparent 50%, rgba(0, 0, 0, 0.4) 100%);
          pointer-events: none;
          z-index: 999;
        }

        /* Particles */
        .particles-container {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          pointer-events: none;
          z-index: 1;
          overflow: hidden;
        }

        .particle {
          position: absolute;
          border-radius: 50%;
          opacity: 0.4;
          animation: float-up linear infinite;
        }

        @keyframes float-up {
          0% { transform: translateY(100vh) rotate(0deg); opacity: 0; }
          10% { opacity: 0.4; }
          90% { opacity: 0.4; }
          100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
        }

        /* Hero Section */
        .hero-section {
          position: relative;
          z-index: 2;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 6rem 1.5rem;
        }

        .hero-content {
          text-align: center;
          max-width: 800px;
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 1rem;
          background: rgba(168, 85, 247, 0.15);
          border: 1px solid var(--app-life);
          border-radius: 20px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--app-life);
          margin-bottom: 2rem;
        }

        .badge-icon {
          font-size: 0.8rem;
        }

        .app-name {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(1.5rem, 6vw, 3rem);
          color: var(--app-life);
          text-shadow: 0 0 40px var(--app-life-glow), 0 4px 0 rgba(168, 85, 247, 0.3);
          margin-bottom: 1.5rem;
          letter-spacing: 0.1em;
        }

        .hero-tagline {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.55rem;
          color: var(--theme-text-secondary);
          line-height: 2;
          margin-bottom: 2.5rem;
          min-height: 3rem;
        }

        .typing-cursor {
          display: inline-block;
          width: 0.5em;
          height: 1em;
          background: var(--app-life);
          margin-left: 0.2em;
          vertical-align: middle;
          animation: blink 0.8s step-end infinite;
        }

        @keyframes blink {
          50% { opacity: 0; }
        }

        .hero-cta {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 1rem;
        }

        .cta-button {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem 2rem;
          border-radius: 8px;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          text-decoration: none;
          transition: all 0.3s;
          border: 2px solid transparent;
        }

        .cta-button.primary {
          background: linear-gradient(135deg, var(--app-life) 0%, #7c3aed 100%);
          color: #000;
          box-shadow: 0 4px 0 rgba(0, 0, 0, 0.3), 0 0 30px var(--app-life-glow);
          cursor: pointer;
        }

        .cta-button.primary:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 0 rgba(0, 0, 0, 0.2), 0 0 50px var(--app-life-glow);
        }

        .cta-button.disabled {
          background: var(--theme-bg-card);
          color: var(--theme-text-muted);
          border-color: var(--theme-border);
          cursor: not-allowed;
        }

        .cta-button.large {
          padding: 1.25rem 2.5rem;
          font-size: 0.55rem;
        }

        .cta-icon {
          font-size: 1rem;
        }

        .cta-arrow {
          transition: transform 0.3s;
        }

        .cta-button:hover .cta-arrow {
          transform: translateX(4px);
        }

        .cta-subtext {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-text-muted);
        }

        /* Content Sections */
        .content-section {
          position: relative;
          z-index: 2;
          padding: 5rem 1.5rem;
          max-width: 1000px;
          margin: 0 auto;
        }

        .section-header {
          text-align: center;
          margin-bottom: 3rem;
        }

        .section-label {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--app-life);
          letter-spacing: 0.15em;
          display: block;
          margin-bottom: 1rem;
        }

        .section-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(0.8rem, 3vw, 1.2rem);
          color: var(--theme-text-primary);
          margin-bottom: 1rem;
          line-height: 1.6;
        }

        .section-subtitle {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--theme-text-muted);
          line-height: 2;
        }

        /* Steps Grid */
        .steps-grid {
          display: flex;
          align-items: flex-start;
          justify-content: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .step-card {
          background: var(--theme-bg-card);
          border: 2px solid var(--theme-border);
          border-radius: 12px;
          padding: 2rem 1.5rem 1.5rem;
          text-align: center;
          flex: 1;
          min-width: 200px;
          max-width: 280px;
          position: relative;
          transition: all 0.3s;
        }

        .step-card:hover {
          border-color: var(--app-life);
          box-shadow: 0 0 25px var(--app-life-glow);
          transform: translateY(-4px);
        }

        .step-number {
          position: absolute;
          top: -1rem;
          left: 50%;
          transform: translateX(-50%);
          width: 2rem;
          height: 2rem;
          background: linear-gradient(180deg, var(--app-life) 0%, #7c3aed 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: #000;
          box-shadow: 0 2px 0 rgba(0, 0, 0, 0.3);
        }

        .step-icon {
          font-size: 2.5rem;
          margin-bottom: 1rem;
        }

        .step-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--theme-text-primary);
          margin-bottom: 0.75rem;
        }

        .step-desc {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-text-muted);
          line-height: 2;
        }

        .step-connector {
          font-size: 1.5rem;
          color: var(--app-life);
          align-self: center;
          padding-top: 1rem;
        }

        @media (max-width: 768px) {
          .step-connector { display: none; }
          .steps-grid { flex-direction: column; align-items: center; }
          .step-card { max-width: 100%; }
        }

        /* Quest Types Grid */
        .quest-types-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 1rem;
        }

        .quest-type-card {
          background: var(--theme-bg-card);
          border: 2px solid color-mix(in srgb, var(--card-color) 30%, transparent);
          border-radius: 12px;
          padding: 1.25rem;
          text-align: center;
          transition: all 0.3s;
        }

        .quest-type-card:hover {
          border-color: var(--card-color);
          box-shadow: 0 0 20px color-mix(in srgb, var(--card-color) 30%, transparent);
          transform: translateY(-4px);
        }

        .quest-type-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.75rem;
        }

        .quest-type-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.45rem;
          color: var(--theme-text-primary);
          margin-bottom: 0.5rem;
        }

        .quest-type-example {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.3rem;
          color: var(--theme-text-muted);
          line-height: 1.8;
          font-style: italic;
        }

        /* Journey Timeline */
        .journey-timeline {
          position: relative;
          margin-bottom: 3rem;
        }

        .journey-track {
          height: 4px;
          background: var(--theme-border);
          border-radius: 2px;
          margin-bottom: 1.5rem;
          overflow: hidden;
        }

        .journey-progress {
          height: 100%;
          background: linear-gradient(90deg, var(--app-life), var(--theme-gold));
          box-shadow: 0 0 10px var(--app-life-glow);
          transition: width 0.5s;
        }

        .journey-stages {
          display: flex;
          justify-content: space-between;
        }

        .journey-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          width: 16%;
        }

        .stage-dot {
          width: 1.5rem;
          height: 1.5rem;
          border-radius: 50%;
          background: var(--theme-border);
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.6rem;
          color: var(--theme-text-muted);
          margin-bottom: 0.5rem;
          transition: all 0.3s;
        }

        .journey-stage.active .stage-dot {
          background: var(--theme-gold);
          color: #000;
        }

        .journey-stage.current .stage-dot {
          box-shadow: 0 0 15px var(--theme-gold-glow);
          transform: scale(1.2);
        }

        .stage-name {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.3rem;
          color: var(--theme-text-secondary);
          margin-bottom: 0.25rem;
          transition: color 0.3s;
        }

        .journey-stage.current .stage-name {
          color: var(--theme-gold);
        }

        .stage-desc {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.25rem;
          color: var(--theme-text-muted);
          display: none;
        }

        @media (min-width: 768px) {
          .stage-desc { display: block; }
        }

        .journey-highlight {
          background: var(--theme-bg-card);
          border: 2px solid var(--theme-gold);
          border-radius: 12px;
          padding: 1.5rem;
          text-align: center;
          max-width: 400px;
          margin: 0 auto;
          box-shadow: 0 0 30px var(--theme-gold-glow);
        }

        .highlight-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 0.75rem;
        }

        .highlight-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          color: var(--theme-gold);
          margin-bottom: 0.5rem;
        }

        .highlight-desc {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.4rem;
          color: var(--theme-text-muted);
        }

        /* Features Grid */
        .features-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 1.5rem;
        }

        .feature-card {
          background: var(--theme-bg-card);
          border: 2px solid var(--theme-border);
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.3s;
        }

        .feature-card:hover {
          border-color: var(--app-life);
          box-shadow: 0 0 20px var(--app-life-glow);
          transform: translateY(-4px);
        }

        .feature-icon {
          font-size: 2rem;
          display: block;
          margin-bottom: 1rem;
        }

        .feature-title {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
          color: var(--app-life);
          margin-bottom: 0.75rem;
        }

        .feature-desc {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-text-muted);
          line-height: 2;
        }

        /* Final CTA */
        .final-cta {
          text-align: center;
          padding: 6rem 1.5rem;
        }

        .final-title {
          font-family: 'Press Start 2P', monospace;
          font-size: clamp(0.7rem, 3vw, 1rem);
          color: var(--theme-text-primary);
          margin-bottom: 2rem;
          line-height: 1.8;
        }

        /* Footer */
        .landing-footer {
          position: relative;
          z-index: 2;
          padding: 2rem 1.5rem;
          text-align: center;
          border-top: 1px solid var(--theme-border);
        }

        .footer-text {
          font-family: 'Press Start 2P', monospace;
          font-size: 0.35rem;
          color: var(--theme-text-muted);
        }

        .footer-link {
          color: var(--app-life);
          text-decoration: none;
        }

        .footer-link:hover {
          text-decoration: underline;
        }
      `}</style>
    </div>
  );
}
