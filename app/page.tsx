'use client';

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
    <rect x="8" y="24" width="4" height="4" fill="#FFD93D"/>
    <rect x="20" y="24" width="4" height="4" fill="#FFD93D"/>
  </svg>
);

const Heart = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="8" height="8" fill="#FF6B6B"/>
    <rect x="20" y="8" width="8" height="8" fill="#FF6B6B"/>
    <rect x="12" y="8" width="8" height="4" fill="#FF6B6B"/>
    <rect x="4" y="16" width="24" height="4" fill="#FF6B6B"/>
    <rect x="8" y="20" width="16" height="4" fill="#FF6B6B"/>
    <rect x="12" y="24" width="8" height="4" fill="#FF6B6B"/>
    <rect x="8" y="8" width="4" height="4" fill="#FFB3B3"/>
  </svg>
);

const GameController = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 64 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="8" width="48" height="24" rx="4" fill="#4A5568"/>
    <rect x="12" y="12" width="8" height="8" fill="#2D3748"/>
    <rect x="14" y="18" width="4" height="6" fill="#718096"/>
    <rect x="10" y="14" width="6" height="4" fill="#718096"/>
    <rect x="44" y="12" width="6" height="6" rx="3" fill="#FF6B6B"/>
    <rect x="50" y="16" width="6" height="6" rx="3" fill="#7FD954"/>
    <rect x="26" y="18" width="12" height="4" rx="1" fill="#2D3748"/>
  </svg>
);

const Mushroom = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="4" width="16" height="4" fill="#FF6B6B"/>
    <rect x="4" y="8" width="24" height="8" fill="#FF6B6B"/>
    <rect x="8" y="8" width="4" height="4" fill="white"/>
    <rect x="20" y="8" width="4" height="4" fill="white"/>
    <rect x="12" y="16" width="8" height="4" fill="#F5DEB3"/>
    <rect x="10" y="20" width="12" height="4" fill="#F5DEB3"/>
    <rect x="12" y="24" width="8" height="4" fill="#F5DEB3"/>
  </svg>
);

const DumbbellIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="8" width="8" height="16" fill="#4A5568"/>
    <rect x="36" y="8" width="8" height="16" fill="#4A5568"/>
    <rect x="12" y="12" width="24" height="8" fill="#718096"/>
    <rect x="0" y="10" width="4" height="12" fill="#2D3748"/>
    <rect x="44" y="10" width="4" height="12" fill="#2D3748"/>
  </svg>
);

const ChecklistIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 40" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="4" y="4" width="24" height="32" fill="#F5F5F5"/>
    <rect x="8" y="10" width="4" height="4" fill="#7FD954"/>
    <rect x="14" y="10" width="10" height="4" fill="#4A5568"/>
    <rect x="8" y="18" width="4" height="4" fill="#7FD954"/>
    <rect x="14" y="18" width="10" height="4" fill="#4A5568"/>
    <rect x="8" y="26" width="4" height="4" fill="#E2E8F0"/>
    <rect x="14" y="26" width="10" height="4" fill="#CBD5E0"/>
  </svg>
);

const CompassIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="16" r="14" fill="#5CC9F5" stroke="#2D8AB5" strokeWidth="2"/>
    <polygon points="16,4 20,16 16,20 12,16" fill="#FF6B6B"/>
    <polygon points="16,28 12,16 16,12 20,16" fill="white"/>
    <circle cx="16" cy="16" r="3" fill="#FFD93D"/>
  </svg>
);

// Product Card Component
interface ProductCardProps {
  title: string;
  subtitle: string;
  description: string;
  icon: React.ReactNode;
  status: 'live' | 'coming-soon';
  url?: string;
  color: string;
  delay: string;
}

const ProductCard = ({ title, subtitle, description, icon, status, url, color, delay }: ProductCardProps) => (
  <div
    className={`glass-card rounded-3xl p-8 opacity-0 animate-slide-up ${delay}`}
    style={{ animationFillMode: 'forwards' }}
  >
    <div className={`w-20 h-20 ${color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
      {icon}
    </div>
    <h3 className="pixel-font text-lg text-gray-800 mb-2">{title}</h3>
    <p className="text-sm text-gray-600 mb-3 font-medium">{subtitle}</p>
    <p className="text-gray-700 mb-6 leading-relaxed">{description}</p>
    {status === 'live' ? (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="snes-btn inline-block px-6 py-3 text-white font-bold text-sm uppercase tracking-wide"
      >
        Play Now
      </a>
    ) : (
      <div className="question-block inline-block px-6 py-3 text-gray-800 font-bold text-sm uppercase tracking-wide cursor-default">
        Coming Soon
      </div>
    )}
  </div>
);

// Floating decoration component
const FloatingDecoration = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none">
    {/* Clouds */}
    <Cloud className="absolute w-24 h-12 top-20 left-10 animate-float opacity-80" />
    <Cloud className="absolute w-32 h-16 top-32 right-20 animate-float-slow opacity-70" />
    <Cloud className="absolute w-20 h-10 top-60 left-1/4 animate-float-reverse opacity-60" />
    <Cloud className="absolute w-28 h-14 top-16 right-1/3 animate-float opacity-75" />

    {/* Coins */}
    <Coin className="absolute w-8 h-8 top-40 right-32 animate-bounce-coin" />
    <Coin className="absolute w-6 h-6 top-72 left-20 animate-bounce-coin delay-300" />
    <Coin className="absolute w-10 h-10 bottom-40 right-16 animate-bounce-coin delay-500" />

    {/* Stars */}
    <Star className="absolute w-6 h-6 top-48 left-32 animate-sparkle" />
    <Star className="absolute w-8 h-8 top-24 right-48 animate-sparkle delay-200" />
    <Star className="absolute w-5 h-5 bottom-60 left-16 animate-sparkle delay-700" />

    {/* Hearts */}
    <Heart className="absolute w-8 h-8 top-56 right-24 animate-float-reverse delay-100" />
    <Heart className="absolute w-6 h-6 bottom-32 left-40 animate-float delay-500" />

    {/* Mushrooms */}
    <Mushroom className="absolute w-10 h-10 bottom-24 right-40 animate-pixel-pulse" />
    <Mushroom className="absolute w-8 h-8 bottom-48 left-24 animate-pixel-pulse delay-300" />
  </div>
);

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen relative">
      <FloatingDecoration />

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="glass-strong rounded-2xl px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <GameController className="w-10 h-6" />
              <span className="pixel-font text-sm text-gray-800">GAMIFY.IT</span>
            </div>
            <div className="hidden md:flex items-center gap-6">
              <a href="#products" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">Products</a>
              <a href="#about" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">About</a>
              <a
                href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                className="snes-btn-blue snes-btn px-4 py-2 text-white font-bold text-xs uppercase"
              >
                Try Iron Quest
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="min-h-screen flex items-center justify-center pt-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className={`mb-6 opacity-0 ${mounted ? 'animate-slide-up' : ''}`}
            style={{ animationFillMode: 'forwards' }}
          >
            <span className="pixel-font text-xs md:text-sm tracking-widest text-gray-700 bg-white/50 px-4 py-2 rounded-full">
              PRESS START TO BEGIN
            </span>
          </div>

          <h1
            className={`pixel-font text-3xl md:text-5xl lg:text-6xl text-gray-900 mb-6 leading-tight opacity-0 ${mounted ? 'animate-slide-up delay-100' : ''}`}
            style={{ animationFillMode: 'forwards' }}
          >
            TURN THE <span className="rainbow-text">MUNDANE</span>
            <br />
            INTO <span className="text-[#7FD954]">FUN</span>
          </h1>

          <p
            className={`text-xl md:text-2xl text-gray-700 mb-10 max-w-2xl mx-auto leading-relaxed opacity-0 ${mounted ? 'animate-slide-up delay-200' : ''}`}
            style={{ animationFillMode: 'forwards' }}
          >
            Level up your daily life with gamified apps.
            Earn XP, unlock achievements, and make every day an adventure.
          </p>

          <div
            className={`flex flex-col sm:flex-row gap-4 justify-center opacity-0 ${mounted ? 'animate-slide-up delay-300' : ''}`}
            style={{ animationFillMode: 'forwards' }}
          >
            <a
              href="#products"
              className="snes-btn px-8 py-4 text-white font-bold text-lg uppercase tracking-wide"
            >
              Explore Games
            </a>
            <a
              href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="snes-btn snes-btn-blue px-8 py-4 text-white font-bold text-lg uppercase tracking-wide"
            >
              Play Iron Quest
            </a>
          </div>

          {/* Scroll indicator */}
          <div
            className={`mt-16 opacity-0 ${mounted ? 'animate-slide-up delay-500' : ''}`}
            style={{ animationFillMode: 'forwards' }}
          >
            <div className="animate-bounce-coin">
              <Coin className="w-12 h-12 mx-auto" />
            </div>
            <p className="text-sm text-gray-600 mt-2">Scroll for more</p>
          </div>
        </div>
      </section>

      {/* Products Section */}
      <section id="products" className="py-24 px-6 relative">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="pixel-font text-2xl md:text-4xl text-gray-900 mb-4">
              SELECT YOUR GAME
            </h2>
            <p className="text-lg text-gray-700 max-w-2xl mx-auto">
              Choose your adventure and start leveling up your life today
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <ProductCard
              title="IRON QUEST"
              subtitle="gamify.fitness"
              description="Transform your workouts into epic quests. Track exercises, earn XP, and level up your strength. Every rep brings you closer to legendary status."
              icon={<DumbbellIcon className="w-12 h-8" />}
              status="live"
              url="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
              color="bg-gradient-to-br from-red-400 to-red-600"
              delay="delay-100"
            />

            <ProductCard
              title="QUEST LOG"
              subtitle="gamify.today"
              description="Turn your to-do list into a quest log. Complete tasks to earn gold, defeat the procrastination boss, and build productive habits."
              icon={<ChecklistIcon className="w-8 h-10" />}
              status="coming-soon"
              color="bg-gradient-to-br from-green-400 to-green-600"
              delay="delay-200"
            />

            <ProductCard
              title="WORLD MAP"
              subtitle="gamify.travel"
              description="Explore your local area like never before. Discover hidden locations, complete exploration achievements, and unlock your neighborhood's secrets."
              icon={<CompassIcon className="w-10 h-10" />}
              status="coming-soon"
              color="bg-gradient-to-br from-blue-400 to-blue-600"
              delay="delay-300"
            />
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
                  <Star className="w-10 h-10 animate-sparkle" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">1000+</p>
                <p className="text-gray-600 text-sm mt-1">XP Earned Daily</p>
              </div>
              <div>
                <div className="flex justify-center mb-3">
                  <Heart className="w-10 h-10 animate-pixel-pulse" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">3</p>
                <p className="text-gray-600 text-sm mt-1">Games Available</p>
              </div>
              <div>
                <div className="flex justify-center mb-3">
                  <Coin className="w-10 h-10 animate-bounce-coin" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">50+</p>
                <p className="text-gray-600 text-sm mt-1">Achievements</p>
              </div>
              <div>
                <div className="flex justify-center mb-3">
                  <Mushroom className="w-10 h-10 animate-float" />
                </div>
                <p className="pixel-font text-2xl text-gray-900">Infinite</p>
                <p className="text-gray-600 text-sm mt-1">Fun Potential</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-24 px-6 relative">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="pixel-font text-2xl md:text-4xl text-gray-900 mb-8">
            WHY GAMIFY?
          </h2>

          <div className="glass-card rounded-3xl p-8 md:p-12 text-left">
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="question-block w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-lg">
                  <span className="pixel-font text-lg">?</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Born from Boredom</h3>
                  <p className="text-gray-700">We were tired of boring apps that felt like chores. So we built ones that feel like games.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-green-400 to-green-600 w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-lg">
                  <span className="text-white text-2xl">+</span>
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Science-Backed Fun</h3>
                  <p className="text-gray-700">Gamification isn&apos;t just fun - it&apos;s proven to boost motivation, habit formation, and goal completion.</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="bg-gradient-to-br from-purple-400 to-purple-600 w-12 h-12 flex items-center justify-center flex-shrink-0 rounded-lg">
                  <Heart className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 text-lg mb-1">Made with Love</h3>
                  <p className="text-gray-700">Every pixel, every animation, every level-up sound is crafted to bring joy to your daily routine.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="glass-strong rounded-3xl p-12 relative overflow-hidden">
            {/* Background coins */}
            <Coin className="absolute w-16 h-16 -top-4 -left-4 opacity-30 animate-bounce-coin" />
            <Coin className="absolute w-12 h-12 -bottom-2 -right-2 opacity-30 animate-bounce-coin delay-300" />
            <Star className="absolute w-10 h-10 top-4 right-8 opacity-30 animate-sparkle" />

            <h2 className="pixel-font text-2xl md:text-3xl text-gray-900 mb-4 relative">
              READY TO PLAY?
            </h2>
            <p className="text-lg text-gray-700 mb-8 relative">
              Start your adventure today with Iron Quest - completely free!
            </p>
            <a
              href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app"
              target="_blank"
              rel="noopener noreferrer"
              className="snes-btn px-10 py-4 text-white font-bold text-xl uppercase tracking-wide inline-block relative"
            >
              Start Playing
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="glass rounded-3xl p-8">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <GameController className="w-10 h-6" />
                <span className="pixel-font text-xs text-gray-800">GAMIFY.IT</span>
              </div>

              <div className="flex flex-wrap justify-center gap-6 text-sm text-gray-700">
                <a href="https://iron-quest-78x1cvngy-peters-projects-5938774f.vercel.app" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 transition-colors">
                  Iron Quest
                </a>
                <span className="text-gray-400">gamify.today (Soon)</span>
                <span className="text-gray-400">gamify.travel (Soon)</span>
              </div>

              <p className="text-sm text-gray-600">
                {new Date().getFullYear()} Gamify.it - Level Up Your Life
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Ground decoration */}
      <div className="h-8 bg-gradient-to-b from-[#5cb33c] to-[#4a9c2d] relative">
        <div className="absolute inset-x-0 top-0 h-4 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzIiIGhlaWdodD0iMTYiIHZpZXdCb3g9IjAgMCAzMiAxNiIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSI4IiBmaWxsPSIjNjlkMzRkIi8+PHJlY3QgeD0iMTYiIHdpZHRoPSI4IiBoZWlnaHQ9IjgiIGZpbGw9IiM2OWQzNGQiLz48L3N2Zz4=')] bg-repeat-x opacity-30"></div>
      </div>
    </div>
  );
}
