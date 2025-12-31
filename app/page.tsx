import Link from "next/link";
import { getUser } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Compass,
  MapPin,
  Trophy,
  Globe,
  Flame,
  ArrowRight,
  Star,
} from "lucide-react";

export default async function LandingPage() {
  const user = await getUser();

  // Redirect to dashboard if already logged in
  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Background gradient */}
      <div className="fixed inset-0 bg-gradient-to-br from-cyan-500/5 via-purple-500/5 to-pink-500/5 pointer-events-none" />

      {/* Navigation */}
      <nav className="relative z-10 border-b border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <Compass className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-lg text-white">gamify.travel</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="https://gamify.it.com"
                className="text-gray-400 hover:text-white text-sm"
              >
                gamify.it.com
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg text-sm font-medium transition-colors border border-gray-700"
              >
                Login
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="relative z-10 py-20 sm:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-cyan-400 text-sm mb-8">
            <Star className="w-4 h-4" />
            Part of the gamify.it ecosystem
          </div>

          <h1 className="text-4xl sm:text-6xl font-bold text-white mb-6 leading-tight">
            Turn Your Travels Into
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-400 to-pink-400">
              Epic Adventures
            </span>
          </h1>

          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-10">
            Track your travels, earn XP, unlock achievements, and level up your
            adventures. Every city, every location, every experience becomes
            part of your journey.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/login"
              className="flex items-center gap-2 px-8 py-4 bg-cyan-500 hover:bg-cyan-600 text-white rounded-xl font-medium transition-colors"
            >
              Start Your Journey
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="#features"
              className="px-8 py-4 text-gray-400 hover:text-white transition-colors"
            >
              Learn More
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="relative z-10 py-20 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-white mb-4">
              Level Up Your Travel Experience
            </h2>
            <p className="text-gray-400 max-w-2xl mx-auto">
              Every journey becomes an opportunity to grow, explore, and achieve
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <FeatureCard
              icon={<MapPin className="w-6 h-6" />}
              title="Track Locations"
              description="Log every restaurant, bar, attraction, and hidden gem you discover"
              color="cyan"
            />
            <FeatureCard
              icon={<Globe className="w-6 h-6" />}
              title="Interactive Map"
              description="See your travels visualized on a beautiful world map"
              color="purple"
            />
            <FeatureCard
              icon={<Trophy className="w-6 h-6" />}
              title="Earn Achievements"
              description="Unlock badges for milestones like visiting 10 cities or 5 countries"
              color="yellow"
            />
            <FeatureCard
              icon={<Flame className="w-6 h-6" />}
              title="Build Streaks"
              description="Log locations daily to build streaks and earn bonus XP"
              color="orange"
            />
          </div>
        </div>
      </section>

      {/* Stats Preview */}
      <section className="relative z-10 py-20 border-t border-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
              <p className="text-4xl font-bold text-cyan-400 mb-2">25+</p>
              <p className="text-gray-400">Achievements to Unlock</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
              <p className="text-4xl font-bold text-purple-400 mb-2">12</p>
              <p className="text-gray-400">Location Types to Track</p>
            </div>
            <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-8">
              <p className="text-4xl font-bold text-pink-400 mb-2">&infin;</p>
              <p className="text-gray-400">Adventures Awaiting</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="relative z-10 py-20 border-t border-gray-800/50">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to Start Your Adventure?
          </h2>
          <p className="text-gray-400 mb-8">
            Join gamify.travel and transform how you experience the world
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-cyan-500 to-purple-500 hover:from-cyan-600 hover:to-purple-600 text-white rounded-xl font-medium transition-all"
          >
            Sign Up
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-gray-800/50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-cyan-400 to-purple-500 flex items-center justify-center">
                <Compass className="w-4 h-4 text-white" />
              </div>
              <span className="text-sm text-gray-400">gamify.travel</span>
            </div>
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <Link href="https://gamify.it.com" className="hover:text-white">
                gamify.it.com
              </Link>
              <span>&copy; {new Date().getFullYear()}</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  color,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: "cyan" | "purple" | "yellow" | "orange";
}) {
  const colors = {
    cyan: "bg-cyan-500/10 text-cyan-400",
    purple: "bg-purple-500/10 text-purple-400",
    yellow: "bg-yellow-500/10 text-yellow-400",
    orange: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
      <div className={`w-12 h-12 rounded-lg ${colors[color]} flex items-center justify-center mb-4`}>
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">{title}</h3>
      <p className="text-gray-400 text-sm">{description}</p>
    </div>
  );
}
