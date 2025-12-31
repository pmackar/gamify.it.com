'use client';

import { useState } from 'react';
import Link from 'next/link';

export default function TravelPage() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        * {
          box-sizing: border-box;
        }

        body {
          margin: 0;
          padding: 0;
          background: #0a0a0a;
        }

        .crt-wrapper {
          min-height: 100vh;
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

        .travel-page {
          min-height: 100vh;
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          padding: 2rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          animation: flicker 0.15s infinite;
        }

        .travel-content {
          width: 100%;
          max-width: 1000px;
        }

        .travel-logo {
          width: 64px;
          height: 64px;
          margin-bottom: 1rem;
          image-rendering: pixelated;
          filter: drop-shadow(0 0 8px rgba(255, 215, 0, 0.5));
        }

        .pixel-icon {
          width: 24px;
          height: 24px;
          image-rendering: pixelated;
        }

        .pixel-icon-sm {
          width: 20px;
          height: 20px;
          image-rendering: pixelated;
        }

        .travel-title {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
          font-weight: normal;
          letter-spacing: -1px;
          text-shadow: 0 0 10px rgba(255, 255, 255, 0.3);
        }

        .travel-hero {
          width: 100%;
          aspect-ratio: 16/9;
          background: #2a2a2a;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          overflow: hidden;
          position: relative;
          border: 3px solid #333;
          box-shadow:
            0 0 0 1px #1a1a1a,
            0 0 20px rgba(0, 0, 0, 0.5),
            inset 0 0 60px rgba(0, 0, 0, 0.3);
        }

        .travel-hero img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
        }

        .travel-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          width: 100%;
        }

        .travel-card {
          background: #2d2d2d;
          border-radius: 8px;
          padding: 1.5rem;
          border: 2px solid #3a3a3a;
          box-shadow:
            0 4px 0 #1a1a1a,
            0 0 20px rgba(0, 0, 0, 0.3);
        }

        .travel-card-header {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1rem;
        }

        .travel-card-header h2 {
          font-size: 1rem;
          font-weight: normal;
          margin: 0;
          text-shadow: 0 0 8px rgba(255, 255, 255, 0.2);
        }

        .travel-card p {
          font-size: 0.6rem;
          line-height: 2;
          color: #aaa;
          margin: 0;
        }

        .travel-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: #3a3a3a;
          border: 2px solid #4a4a4a;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.6rem;
          cursor: pointer;
          text-decoration: none;
          margin-top: 1rem;
          transition: all 0.1s;
          box-shadow: 0 4px 0 #222;
        }

        .travel-btn:hover {
          background: #4a4a4a;
          transform: translateY(2px);
          box-shadow: 0 2px 0 #222;
        }

        .travel-btn:active {
          transform: translateY(4px);
          box-shadow: none;
        }

        .game-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .game-list li {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 0.75rem 0;
          font-size: 0.6rem;
          border-bottom: 1px solid #3a3a3a;
        }

        .game-list li:last-child {
          border-bottom: none;
        }

        .game-list li a {
          color: #fff;
          text-decoration: none;
          transition: color 0.2s;
        }

        .game-list li a:hover {
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        .travel-form {
          display: flex;
          gap: 0.75rem;
          margin-top: 1rem;
        }

        .travel-input {
          flex: 1;
          padding: 0.875rem 1rem;
          background: #1a1a1a;
          border: 2px solid #3a3a3a;
          border-radius: 8px;
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.5rem;
        }

        .travel-input:focus {
          outline: none;
          border-color: #FFD700;
          box-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
        }

        .travel-input::placeholder {
          color: #555;
        }

        .travel-success {
          background: #1a3a1a;
          border: 2px solid #2a5a2a;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
          font-size: 0.55rem;
          color: #6f6;
          text-shadow: 0 0 8px rgba(102, 255, 102, 0.3);
        }

        .travel-back {
          display: inline-block;
          margin-top: 2rem;
          color: #666;
          text-decoration: none;
          font-size: 0.55rem;
          transition: color 0.2s;
        }

        .travel-back:hover {
          color: #FFD700;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        /* Pixel corners decoration */
        .pixel-border {
          position: relative;
        }

        .pixel-border::before,
        .pixel-border::after {
          content: '';
          position: absolute;
          width: 8px;
          height: 8px;
          background: #FFD700;
        }

        .pixel-border::before {
          top: -4px;
          left: -4px;
        }

        .pixel-border::after {
          bottom: -4px;
          right: -4px;
        }

        @media (max-width: 768px) {
          .travel-page {
            padding: 1rem;
          }

          .travel-title {
            font-size: 1.25rem;
          }

          .travel-cards {
            grid-template-columns: 1fr;
          }

          .travel-form {
            flex-direction: column;
          }

          .travel-btn {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>

      <div className="crt-wrapper">
        <div className="travel-page">
          <div className="travel-content">
            {/* Pixel Trophy Logo */}
            <img src="/travel/trophy.png" alt="Trophy" className="travel-logo" />

            <h1 className="travel-title">gamify.travel</h1>

            {/* Hero Image */}
            <div className="travel-hero pixel-border">
              <img src="/travel/splash.png" alt="Pixel art adventurers overlooking a fantasy landscape" />
            </div>

            {/* Cards */}
            <div className="travel-cards">
              {/* About Card */}
              <div className="travel-card">
                <div className="travel-card-header">
                  <img src="/travel/star.png" alt="" className="pixel-icon" />
                  <h2>About</h2>
                </div>
                <p>
                  Create your avatar, gain experience, level up, and
                  find achievements in a gamified version of our world.
                </p>

                {!submitted ? (
                  <form onSubmit={handleSubmit} className="travel-form">
                    <input
                      type="email"
                      className="travel-input"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <button type="submit" className="travel-btn">
                      <img src="/travel/star.png" alt="" className="pixel-icon-sm" />
                      Request Access
                    </button>
                  </form>
                ) : (
                  <div className="travel-success">
                    You&apos;re on the list! We&apos;ll be in touch.
                  </div>
                )}
              </div>

              {/* Current Games Card */}
              <div className="travel-card">
                <div className="travel-card-header">
                  <img src="/travel/star.png" alt="" className="pixel-icon" />
                  <h2>Current Games</h2>
                </div>
                <ul className="game-list">
                  <li>
                    <img src="/travel/crown.png" alt="" className="pixel-icon-sm" />
                    <a href="https://gamifytravel.vercel.app" target="_blank" rel="noopener noreferrer">
                      gamify.philly
                    </a>
                  </li>
                  <li>
                    <img src="/travel/chest.png" alt="" className="pixel-icon-sm" />
                    <a href="https://gamifytravel.vercel.app" target="_blank" rel="noopener noreferrer">
                      Secrets of the Schuylkill
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            <Link href="/" className="travel-back">
              &larr; Back to gamify.it
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
