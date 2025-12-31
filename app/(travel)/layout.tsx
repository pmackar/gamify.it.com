'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { UserButton, SignedIn, SignedOut, SignInButton } from '@clerk/nextjs';

export default function TravelLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  const navLinks = [
    { href: '/explore', label: 'Explore', icon: '🗺️' },
    { href: '/locations', label: 'Locations', icon: '📍' },
    { href: '/quests', label: 'Quests', icon: '⚔️' },
    { href: '/profile', label: 'Profile', icon: '👤' },
  ];

  return (
    <>
      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Press+Start+2P&display=swap');

        .travel-app {
          min-height: 100vh;
          background: #0a0a0a;
          font-family: 'Press Start 2P', monospace;
        }

        .travel-nav {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          z-index: 100;
          background: #1a1a1a;
          border-bottom: 2px solid #2a2a2a;
          padding: 0.75rem 1rem;
        }

        .travel-nav-inner {
          max-width: 1400px;
          margin: 0 auto;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .travel-nav-logo {
          font-size: 0.65rem;
          color: #FFD700;
          text-decoration: none;
          text-shadow: 0 0 8px rgba(255, 215, 0, 0.5);
        }

        .travel-nav-links {
          display: flex;
          gap: 0.5rem;
        }

        .travel-nav-link {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          padding: 0.5rem 0.75rem;
          font-size: 0.5rem;
          color: #888;
          text-decoration: none;
          border-radius: 4px;
          transition: all 0.2s;
        }

        .travel-nav-link:hover {
          color: #fff;
          background: #2a2a2a;
        }

        .travel-nav-link.active {
          color: #FFD700;
          background: #2a2a2a;
          box-shadow: 0 0 8px rgba(255, 215, 0, 0.3);
        }

        .travel-nav-icon {
          font-size: 0.9rem;
        }

        .travel-nav-auth {
          display: flex;
          align-items: center;
          gap: 1rem;
        }

        .travel-sign-in-btn {
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

        .travel-sign-in-btn:hover {
          transform: translateY(1px);
          box-shadow: 0 2px 0 #996600;
        }

        .travel-main {
          padding-top: 60px;
          min-height: 100vh;
        }

        @media (max-width: 768px) {
          .travel-nav-links {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            top: auto;
            background: #1a1a1a;
            border-top: 2px solid #2a2a2a;
            border-bottom: none;
            padding: 0.5rem;
            justify-content: space-around;
            z-index: 100;
          }

          .travel-nav-link {
            flex-direction: column;
            padding: 0.5rem;
            font-size: 0.4rem;
          }

          .travel-main {
            padding-bottom: 70px;
          }
        }
      `}</style>

      <div className="travel-app">
        <nav className="travel-nav">
          <div className="travel-nav-inner">
            <Link href="/" className="travel-nav-logo">
              gamify.travel
            </Link>

            <div className="travel-nav-links">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`travel-nav-link ${pathname === link.href ? 'active' : ''}`}
                >
                  <span className="travel-nav-icon">{link.icon}</span>
                  <span>{link.label}</span>
                </Link>
              ))}
            </div>

            <div className="travel-nav-auth">
              <SignedIn>
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: {
                        width: 32,
                        height: 32,
                      },
                    },
                  }}
                />
              </SignedIn>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="travel-sign-in-btn">Sign In</button>
                </SignInButton>
              </SignedOut>
            </div>
          </div>
        </nav>

        <main className="travel-main">{children}</main>
      </div>
    </>
  );
}
