'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';

// Pixel Art SVG Components
const Cloud = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="16" y="16" width="8" height="8" fill="white"/>
    <rect x="24" y="8" width="8" height="8" fill="white"/>
    <rect x="32" y="8" width="8" height="8" fill="white"/>
    <rect x="40" y="16" width="8" height="8" fill="white"/>
    <rect x="8" y="16" width="8" height="8" fill="white"/>
    <rect x="16" y="8" width="8" height="8" fill="white"/>
    <rect x="24" y="16" width="8" height="8" fill="white"/>
    <rect x="32" y="16" width="8" height="8" fill="white"/>
    <rect x="24" y="24" width="8" height="8" fill="white"/>
    <rect x="32" y="24" width="8" height="8" fill="white"/>
    <rect x="16" y="24" width="8" height="8" fill="white"/>
    <rect x="40" y="24" width="8" height="8" fill="white"/>
  </svg>
);

const Compass = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="#5CC9F5" stroke="#2D8AB5" strokeWidth="2"/>
    <polygon points="16,4 20,16 16,20 12,16" fill="#FF6B6B"/>
    <polygon points="16,28 12,16 16,12 20,16" fill="white"/>
    <circle cx="16" cy="16" r="3" fill="#FFD93D"/>
  </svg>
);

const MapPin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z" fill="#FF6B6B"/>
    <circle cx="12" cy="12" r="5" fill="white"/>
  </svg>
);

const Trophy = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="16" height="4" fill="#FFD93D"/>
    <rect x="6" y="8" width="20" height="12" fill="#FFD93D"/>
    <rect x="2" y="8" width="4" height="8" fill="#FFD93D"/>
    <rect x="26" y="8" width="4" height="8" fill="#FFD93D"/>
    <rect x="12" y="20" width="8" height="4" fill="#CC9900"/>
    <rect x="8" y="24" width="16" height="4" fill="#FFD93D"/>
  </svg>
);

const Globe = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="#5CC9F5"/>
    <ellipse cx="16" cy="16" rx="6" ry="14" stroke="#2D8AB5" strokeWidth="2" fill="none"/>
    <line x1="2" y1="16" x2="30" y2="16" stroke="#2D8AB5" strokeWidth="2"/>
    <path d="M4 10 Q16 8 28 10" stroke="#7FD954" strokeWidth="3" fill="none"/>
    <path d="M6 20 Q16 22 26 20" stroke="#7FD954" strokeWidth="3" fill="none"/>
  </svg>
);

const Coin = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="16" height="4" fill="#FFD93D"/>
    <rect x="4" y="8" width="24" height="4" fill="#FFD93D"/>
    <rect x="4" y="12" width="24" height="8" fill="#FFD93D"/>
    <rect x="4" y="20" width="24" height="4" fill="#FFD93D"/>
    <rect x="8" y="24" width="16" height="4" fill="#FFD93D"/>
    <rect x="12" y="8" width="4" height="4" fill="#FFF5B8"/>
    <rect x="12" y="12" width="4" height="8" fill="#CC9900"/>
    <rect x="16" y="12" width="4" height="8" fill="#FFF5B8"/>
  </svg>
);

const Star = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="12" y="0" width="8" height="8" fill="#FFD93D"/>
    <rect x="8" y="8" width="16" height="8" fill="#FFD93D"/>
    <rect x="0" y="12" width="32" height="8" fill="#FFD93D"/>
    <rect x="4" y="20" width="8" height="8" fill="#FFD93D"/>
    <rect x="20" y="20" width="8" height="8" fill="#FFD93D"/>
  </svg>
);

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden" style={{ background: 'linear-gradient(180deg, #87ceeb 0%, #5cc9f5 30%, #7fd954 70%, #5cb33c 100%)' }}>
      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <Cloud className="absolute w-24 h-12 top-20 left-10 animate-float opacity-80" />
        <Cloud className="absolute w-32 h-16 top-32 right-20 animate-float-slow opacity-70" />
        <Cloud className="absolute w-20 h-10 top-60 left-1/4 animate-float-reverse opacity-60" />
        <Cloud className="absolute w-28 h-14 top-16 right-1/3 animate-float opacity-75" />

        <Coin className="absolute w-8 h-8 top-40 right-32 animate-bounce-coin" />
        <Coin className="absolute w-6 h-6 top-72 left-20 animate-bounce-coin delay-300" />
        <Coin className="absolute w-10 h-10 bottom-40 right-16 animate-bounce-coin delay-500" />

        <Star className="absolute w-6 h-6 top-48 left-32 animate-sparkle" />
        <Star className="absolute w-8 h-8 top-24 right-48 animate-sparkle delay-200" />
        <Star className="absolute w-5 h-5 bottom-60 left-16 animate-sparkle delay-700" />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="glass-strong rounded-2xl px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Compass className="w-10 h-10" />
              <span className="pixel-font text-sm text-gray-800">GAMIFY.TRAVEL</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="snes-btn px-6 py-2 text-white font-bold text-xs uppercase"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div className={`mb-6 ${mounted ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
            <span className="pixel-font text-xs md:text-sm tracking-widest text-gray-700 bg-white/50 px-4 py-2 rounded-full">
              TURN YOUR TRAVELS INTO AN ADVENTURE
            </span>
          </div>

          <h1 className={`pixel-font text-3xl md:text-5xl lg:text-6xl text-gray-900 mb-6 leading-tight ${mounted ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}>
            EXPLORE THE <span className="text-[#5CC9F5]">WORLD</span>
            <br />
            EARN <span className="text-[#FFD93D]">XP</span>
          </h1>

          <p className={`text-xl md:text-2xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed ${mounted ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.6s', animationFillMode: 'forwards' }}>
            Track every restaurant, bar, and hidden gem you discover.
            Unlock achievements, build streaks, and level up your adventures.
          </p>

          <div className={`flex flex-col sm:flex-row gap-4 justify-center ${mounted ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}>
            <Link
              href="/login"
              className="snes-btn px-8 py-4 text-white font-bold text-lg uppercase tracking-wide"
            >
              Start Exploring
            </Link>
          </div>

          <div className={`mt-16 ${mounted ? 'animate-fade-in' : 'opacity-0'}`} style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
            <div className="animate-bounce-coin">
              <Compass className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-sm text-gray-600 mt-2">Scroll for more</p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="pixel-font text-2xl md:text-4xl text-gray-900 mb-4">HOW IT WORKS</h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Every journey becomes an opportunity to grow and achieve
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="glass-card rounded-3xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <MapPin className="w-12 h-12" />
              </div>
              <h3 className="pixel-font text-sm text-gray-800 mb-2">TRACK LOCATIONS</h3>
              <p className="text-gray-700 text-sm">Log every restaurant, bar, cafe, and attraction you visit</p>
            </div>

            <div className="glass-card rounded-3xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Globe className="w-12 h-12" />
              </div>
              <h3 className="pixel-font text-sm text-gray-800 mb-2">EXPLORE MAPS</h3>
              <p className="text-gray-700 text-sm">See your travels visualized on an interactive world map</p>
            </div>

            <div className="glass-card rounded-3xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Trophy className="w-12 h-12" />
              </div>
              <h3 className="pixel-font text-sm text-gray-800 mb-2">EARN ACHIEVEMENTS</h3>
              <p className="text-gray-700 text-sm">Unlock badges for milestones like visiting 10 cities</p>
            </div>

            <div className="glass-card rounded-3xl p-8 text-center">
              <div className="w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Coin className="w-12 h-12" />
              </div>
              <h3 className="pixel-font text-sm text-gray-800 mb-2">LEVEL UP</h3>
              <p className="text-gray-700 text-sm">Earn XP for every check-in and watch your level grow</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="glass-strong rounded-3xl p-8 md:p-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <div className="flex justify-center mb-3">
                  <MapPin className="w-10 h-10" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">12</p>
                <p className="text-gray-600 text-sm mt-1">Location Types</p>
              </div>
              <div>
                <div className="flex justify-center mb-3">
                  <Trophy className="w-10 h-10 animate-pixel-pulse" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">25+</p>
                <p className="text-gray-600 text-sm mt-1">Achievements</p>
              </div>
              <div>
                <div className="flex justify-center mb-3">
                  <Coin className="w-10 h-10 animate-bounce-coin" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">100</p>
                <p className="text-gray-600 text-sm mt-1">Levels to Reach</p>
              </div>
              <div>
                <div className="flex justify-center mb-3">
                  <Globe className="w-10 h-10 animate-float" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">∞</p>
                <p className="text-gray-600 text-sm mt-1">Places to Explore</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-strong rounded-3xl p-12 relative overflow-hidden">
            <Star className="absolute w-16 h-16 -top-4 -left-4 opacity-30 animate-sparkle" />
            <Coin className="absolute w-12 h-12 -bottom-2 -right-2 opacity-30 animate-bounce-coin delay-300" />

            <h2 className="pixel-font text-2xl md:text-3xl text-gray-900 mb-4 relative">
              READY TO EXPLORE?
            </h2>
            <p className="text-lg text-gray-700 mb-8 relative">
              Sign up now and start turning your travels into adventures!
            </p>
            <Link
              href="/login"
              className="snes-btn px-10 py-4 text-white font-bold text-xl uppercase tracking-wide inline-block relative"
            >
              Get Started
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-3xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <Compass className="w-8 h-8" />
                <span className="pixel-font text-xs text-gray-800">GAMIFY.TRAVEL</span>
              </div>
              <p className="text-sm text-gray-600">
                Part of the <a href="https://gamify.it.com" className="text-gray-800 hover:underline">gamify.it</a> ecosystem
              </p>
              <p className="text-sm text-gray-600">{new Date().getFullYear()} Gamify.travel</p>
            </div>
          </div>
        </div>
      </footer>

      {/* Grass Bottom */}
      <div className="h-8 bg-gradient-to-b from-[#5cb33c] to-[#4a9c2d] relative">
        <div className="absolute inset-x-0 top-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAzMiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNjlkMzRkIi8+PHJlY3QgeD0iMTYiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM2OWQzNGQiLz48L3N2Zz4=')] bg-repeat-x opacity-30" />
      </div>
    </div>
  );
}
