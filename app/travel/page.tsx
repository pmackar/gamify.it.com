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

        .travel-page {
          min-height: 100vh;
          background: #1a1a1a;
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          padding: 2rem;
        }

        .travel-logo {
          width: 64px;
          height: 64px;
          margin-bottom: 1rem;
          image-rendering: pixelated;
        }

        .travel-title {
          font-size: 1.75rem;
          margin-bottom: 1.5rem;
          font-weight: normal;
          letter-spacing: -1px;
        }

        .travel-hero {
          width: 100%;
          max-width: 1200px;
          aspect-ratio: 16/9;
          background: #2a2a2a;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          overflow: hidden;
          position: relative;
        }

        .travel-hero img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          image-rendering: pixelated;
        }

        .travel-hero-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(180deg,
            #87CEEB 0%,
            #87CEEB 40%,
            #8B7355 40%,
            #A0826D 60%,
            #6B8E23 80%,
            #228B22 100%
          );
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
        }

        .travel-hero-placeholder::after {
          content: '';
          position: absolute;
          bottom: 20%;
          left: 50%;
          transform: translateX(-50%);
          width: 200px;
          height: 100px;
          background: #DAA520;
          clip-path: polygon(20% 100%, 50% 0%, 80% 100%);
        }

        .travel-cards {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5rem;
          max-width: 1200px;
        }

        .travel-card {
          background: #2d2d2d;
          border-radius: 8px;
          padding: 1.5rem;
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
        }

        .star-icon {
          color: #FFD700;
          font-size: 1.25rem;
        }

        .travel-card p {
          font-size: 0.65rem;
          line-height: 1.8;
          color: #ccc;
          margin: 0;
        }

        .travel-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.75rem;
          background: #3a3a3a;
          border: none;
          border-radius: 8px;
          padding: 1rem 1.25rem;
          color: #fff;
          font-family: 'Press Start 2P', monospace;
          font-size: 0.65rem;
          cursor: pointer;
          text-decoration: none;
          margin-top: 1rem;
          transition: background 0.2s;
        }

        .travel-btn:hover {
          background: #4a4a4a;
        }

        .game-list {
          list-style: none;
          padding: 0;
          margin: 0;
        }

        .game-list li {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0;
          font-size: 0.65rem;
        }

        .game-list li a {
          color: #fff;
          text-decoration: none;
        }

        .game-list li a:hover {
          text-decoration: underline;
        }

        .game-icon {
          font-size: 1rem;
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
          font-size: 0.55rem;
        }

        .travel-input:focus {
          outline: none;
          border-color: #FFD700;
        }

        .travel-input::placeholder {
          color: #666;
        }

        .travel-success {
          background: #2a4a2a;
          border: 2px solid #4a8a4a;
          border-radius: 8px;
          padding: 1rem;
          margin-top: 1rem;
          font-size: 0.6rem;
          color: #8f8;
        }

        .travel-back {
          display: inline-block;
          margin-top: 2rem;
          color: #888;
          text-decoration: none;
          font-size: 0.6rem;
        }

        .travel-back:hover {
          color: #FFD700;
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
        }
      `}</style>

      <div className="travel-page">
        {/* Pixel Trophy Logo */}
        <svg className="travel-logo" viewBox="0 0 64 64" fill="none">
          <rect x="20" y="8" width="24" height="4" fill="#FFD700"/>
          <rect x="16" y="12" width="32" height="4" fill="#FFD700"/>
          <rect x="12" y="16" width="40" height="20" fill="#FFD700"/>
          <rect x="16" y="16" width="32" height="16" fill="#FFA500"/>
          <rect x="8" y="20" width="8" height="12" fill="#FFD700"/>
          <rect x="48" y="20" width="8" height="12" fill="#FFD700"/>
          <rect x="16" y="36" width="32" height="4" fill="#FFD700"/>
          <rect x="24" y="40" width="16" height="8" fill="#FFD700"/>
          <rect x="20" y="48" width="24" height="4" fill="#8B4513"/>
          <rect x="16" y="52" width="32" height="4" fill="#8B4513"/>
        </svg>

        <h1 className="travel-title">gamify.travel</h1>

        {/* Hero Image Placeholder */}
        <div className="travel-hero">
          <div className="travel-hero-placeholder">
            {/* Pixel art landscape will go here - for now using CSS gradient */}
          </div>
        </div>

        {/* Cards */}
        <div className="travel-cards">
          {/* About Card */}
          <div className="travel-card">
            <div className="travel-card-header">
              <span className="star-icon">&#9733;</span>
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
                  <span className="star-icon">&#9733;</span>
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
              <span className="star-icon">&#9733;</span>
              <h2>Current Games</h2>
            </div>
            <ul className="game-list">
              <li>
                <span className="game-icon">&#127759;</span>
                <a href="https://gamifytravel.vercel.app" target="_blank" rel="noopener noreferrer">
                  gamify.philly
                </a>
              </li>
              <li>
                <span className="game-icon">&#128506;</span>
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
    </>
  );
}
