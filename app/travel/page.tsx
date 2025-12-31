'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

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
const CompassIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
  </svg>
);

const MapPinIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
    <circle cx="12" cy="10" r="3"/>
  </svg>
);

const GlobeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const TrophyIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/>
    <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/>
    <path d="M4 22h16"/>
    <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/>
    <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/>
    <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/>
  </svg>
);

const StarIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);

// Floating location pins for background
const floatingPins = [
  { left: '8%', top: '20%', delay: '0s', size: 24 },
  { left: '15%', top: '60%', delay: '1.5s', size: 20 },
  { left: '25%', top: '35%', delay: '3s', size: 16 },
  { left: '75%', top: '25%', delay: '0.5s', size: 22 },
  { left: '85%', top: '55%', delay: '2s', size: 18 },
  { left: '70%', top: '70%', delay: '4s', size: 20 },
  { left: '45%', top: '15%', delay: '2.5s', size: 16 },
  { left: '55%', top: '75%', delay: '1s', size: 24 },
];

export default function TravelPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    // Animate elements on load
    const timeout = setTimeout(() => {
      document.querySelectorAll('.animate-fade-in').forEach(el => {
        (el as HTMLElement).style.animationPlayState = 'running';
      });
    }, 100);

    return () => clearTimeout(timeout);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Connect to email service
    setSubmitted(true);
  };

  return (
    <>
      <style jsx global>{`
        .travel-bg {
          position: fixed;
          inset: 0;
          background: linear-gradient(135deg, #0a1628 0%, #1a0a2e 50%, #0d1f2d 100%);
          z-index: -2;
        }

        .travel-bg::before {
          content: '';
          position: absolute;
          inset: 0;
          background:
            radial-gradient(ellipse at 20% 20%, rgba(16, 185, 129, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 80% 80%, rgba(59, 130, 246, 0.15) 0%, transparent 50%),
            radial-gradient(ellipse at 50% 50%, rgba(168, 85, 247, 0.1) 0%, transparent 60%);
        }

        .floating-pin {
          position: absolute;
          color: rgba(16, 185, 129, 0.3);
          animation: float-pin 8s ease-in-out infinite;
          z-index: -1;
        }

        @keyframes float-pin {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(5deg); opacity: 0.6; }
        }

        .travel-container {
          min-height: 100vh;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 2rem;
          position: relative;
        }

        .travel-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          padding: 1rem 2rem;
          display: flex;
          justify-content: space-between;
          align-items: center;
          z-index: 100;
        }

        .travel-nav-logo {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          text-decoration: none;
          color: white;
          font-family: var(--font-display);
          font-size: 1.1rem;
        }

        .travel-nav-logo svg {
          width: 32px;
          height: 32px;
        }

        .travel-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 24px;
          padding: 3rem;
          max-width: 600px;
          width: 100%;
          text-align: center;
        }

        .travel-icon {
          width: 80px;
          height: 80px;
          margin: 0 auto 1.5rem;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2));
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #10b981;
        }

        .travel-icon svg {
          width: 40px;
          height: 40px;
        }

        .travel-badge {
          display: inline-block;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.2), rgba(59, 130, 246, 0.2));
          border: 1px solid rgba(16, 185, 129, 0.3);
          padding: 0.5rem 1rem;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 600;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          color: #10b981;
          margin-bottom: 1.5rem;
        }

        .travel-title {
          font-family: var(--font-display);
          font-size: 2.5rem;
          font-weight: 700;
          margin-bottom: 0.5rem;
          background: linear-gradient(135deg, #fff 0%, #10b981 50%, #3b82f6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .travel-domain {
          font-size: 1rem;
          color: rgba(255, 255, 255, 0.5);
          margin-bottom: 1.5rem;
        }

        .travel-description {
          font-size: 1.1rem;
          line-height: 1.7;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 2rem;
        }

        .travel-features {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .travel-feature {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem;
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
          font-size: 0.9rem;
          color: rgba(255, 255, 255, 0.8);
        }

        .travel-feature svg {
          width: 20px;
          height: 20px;
          color: #10b981;
          flex-shrink: 0;
        }

        .travel-form {
          display: flex;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .travel-input {
          flex: 1;
          padding: 0.875rem 1.25rem;
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          color: white;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }

        .travel-input:focus {
          border-color: #10b981;
          background: rgba(255, 255, 255, 0.08);
        }

        .travel-input::placeholder {
          color: rgba(255, 255, 255, 0.4);
        }

        .travel-button {
          padding: 0.875rem 1.5rem;
          background: linear-gradient(135deg, #10b981 0%, #3b82f6 100%);
          border: none;
          border-radius: 12px;
          color: white;
          font-weight: 600;
          cursor: pointer;
          transition: transform 0.2s, box-shadow 0.2s;
          white-space: nowrap;
        }

        .travel-button:hover {
          transform: translateY(-2px);
          box-shadow: 0 10px 30px rgba(16, 185, 129, 0.3);
        }

        .travel-button:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .travel-success {
          background: rgba(16, 185, 129, 0.1);
          border: 1px solid rgba(16, 185, 129, 0.3);
          border-radius: 12px;
          padding: 1rem;
          color: #10b981;
          font-weight: 500;
        }

        .travel-disclaimer {
          font-size: 0.8rem;
          color: rgba(255, 255, 255, 0.4);
        }

        .travel-back {
          margin-top: 2rem;
          color: rgba(255, 255, 255, 0.5);
          text-decoration: none;
          font-size: 0.9rem;
          transition: color 0.2s;
        }

        .travel-back:hover {
          color: #10b981;
        }

        .animate-fade-in {
          animation: fadeInUp 0.8s ease forwards;
          animation-play-state: paused;
          opacity: 0;
        }

        .delay-100 { animation-delay: 0.1s; }
        .delay-200 { animation-delay: 0.2s; }
        .delay-300 { animation-delay: 0.3s; }
        .delay-400 { animation-delay: 0.4s; }

        @keyframes fadeInUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @media (max-width: 600px) {
          .travel-card {
            padding: 2rem 1.5rem;
          }
          .travel-title {
            font-size: 2rem;
          }
          .travel-features {
            grid-template-columns: 1fr;
          }
          .travel-form {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="travel-bg" />

      {/* Floating pins */}
      {floatingPins.map((pin, i) => (
        <div
          key={i}
          className="floating-pin"
          style={{
            left: pin.left,
            top: pin.top,
            animationDelay: pin.delay,
          }}
        >
          <svg width={pin.size} height={pin.size} viewBox="0 0 24 24" fill="currentColor">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3" fill="#0a1628"/>
          </svg>
        </div>
      ))}

      <nav className="travel-nav">
        <Link href="/" className="travel-nav-logo">
          <Logo />
          <span>gamify.it</span>
        </Link>
      </nav>

      <div className="travel-container">
        <div className="travel-card animate-fade-in">
          <div className="travel-icon animate-fade-in delay-100">
            <CompassIcon />
          </div>

          <div className="travel-badge animate-fade-in delay-100">
            Coming Soon
          </div>

          <h1 className="travel-title animate-fade-in delay-200">
            gamify.travel
          </h1>

          <p className="travel-domain animate-fade-in delay-200">
            Explorer &middot; Your World Awaits
          </p>

          <p className="travel-description animate-fade-in delay-300">
            Transform every journey into an adventure. Discover hidden gems in your neighborhood,
            earn XP for exploring new places, and unlock achievements as you map your world.
          </p>

          <div className="travel-features animate-fade-in delay-300">
            <div className="travel-feature">
              <MapPinIcon />
              <span>Discover Locations</span>
            </div>
            <div className="travel-feature">
              <StarIcon />
              <span>Earn Travel XP</span>
            </div>
            <div className="travel-feature">
              <CameraIcon />
              <span>Photo Quests</span>
            </div>
            <div className="travel-feature">
              <TrophyIcon />
              <span>Unlock Badges</span>
            </div>
          </div>

          <div className="animate-fade-in delay-400" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center' }}>
            <a
              href="https://gamifytravel.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="travel-button"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', textDecoration: 'none' }}
            >
              <CompassIcon className="w-5 h-5" />
              Preview App
            </a>
            <p className="travel-disclaimer">
              Early preview &middot; Full launch coming soon
            </p>
          </div>

          {!submitted ? (
            <>
              <form onSubmit={handleSubmit} className="travel-form animate-fade-in delay-400" style={{ marginTop: '1.5rem' }}>
                <input
                  type="email"
                  className="travel-input"
                  placeholder="Get notified at launch"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="travel-button" style={{ background: 'rgba(255,255,255,0.1)' }}>
                  Notify Me
                </button>
              </form>
            </>
          ) : (
            <div className="travel-success animate-fade-in" style={{ marginTop: '1.5rem' }}>
              You&apos;re on the list! We&apos;ll notify you when gamify.travel launches.
            </div>
          )}

          <Link href="/" className="travel-back animate-fade-in delay-400">
            &larr; Back to gamify.it
          </Link>
        </div>
      </div>
    </>
  );
}
