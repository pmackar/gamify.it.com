import Link from "next/link";
import {
  MapPin,
  Building2,
  Globe,
  Flame,
  Trophy,
  Plus,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Lock,
} from "lucide-react";
import XPBar from "@/components/ui/XPBar";
import { DEMO_USER, DEMO_STATS } from "@/lib/travel-demo-data";

export default function TravelDemoPage() {
  return (
    <div className="min-h-screen" style={{ background: "var(--theme-bg)" }}>
      {/* Demo Banner */}
      <div
        className="sticky top-0 z-50 px-4 py-3"
        style={{
          background: "linear-gradient(135deg, rgba(95, 191, 138, 0.9) 0%, rgba(52, 199, 89, 0.9) 100%)",
          backdropFilter: "blur(8px)",
          borderBottom: "2px solid rgba(255, 255, 255, 0.2)",
        }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-white" />
            <span className="text-sm font-medium text-white">
              Demo Mode - Explore sample data
            </span>
          </div>
          <Link
            href="/login"
            className="flex items-center gap-1 px-3 py-1.5 rounded text-sm font-medium transition-all hover:scale-105"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              color: "white",
              border: "1px solid rgba(255, 255, 255, 0.3)",
            }}
          >
            Sign up to start your journey
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1
            className="text-xl md:text-2xl mb-2"
            style={{ color: "var(--rpg-text)", textShadow: "0 0 10px rgba(255, 255, 255, 0.3)" }}
          >
            Welcome, Demo Explorer!
          </h1>
          <p className="text-base" style={{ color: "var(--rpg-muted)" }}>
            This is what your travel dashboard could look like
          </p>
        </div>

        {/* XP Progress Card */}
        <div
          className="rounded-lg p-6 mb-8"
          style={{
            background: "var(--rpg-card)",
            border: "2px solid var(--rpg-border)",
            boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
          }}
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm mb-1" style={{ color: "var(--rpg-muted)" }}>Your Progress</p>
              <p className="text-2xl" style={{ color: "var(--rpg-gold)", textShadow: "0 0 10px var(--rpg-gold-glow)" }}>
                Level {DEMO_USER.level}
              </p>
            </div>
            <div className="flex-1 max-w-md">
              <XPBar
                level={DEMO_USER.level}
                currentXP={DEMO_USER.xp}
                xpToNext={DEMO_USER.xpToNext}
                size="lg"
              />
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <DemoStatCard
            icon={<Building2 className="w-4 h-4" />}
            label="Cities"
            value={DEMO_STATS.counts.cities}
            color="teal"
          />
          <DemoStatCard
            icon={<MapPin className="w-4 h-4" />}
            label="Locations"
            value={DEMO_STATS.counts.locations}
            color="purple"
          />
          <DemoStatCard
            icon={<Globe className="w-4 h-4" />}
            label="Countries"
            value={DEMO_STATS.counts.countries}
            color="cyan"
          />
          <DemoStatCard
            icon={<Flame className="w-4 h-4" />}
            label="Day Streak"
            value={DEMO_USER.currentStreak}
            color="gold"
          />
        </div>

        {/* Quick Actions */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <DemoActionCard
            icon={<Plus className="w-5 h-5" style={{ color: "var(--rpg-teal)" }} />}
            title="Add New Location"
            description="Log a place you've visited"
            iconBg="rgba(95, 191, 138, 0.2)"
            iconBorder="var(--rpg-teal)"
          />
          <DemoActionCard
            icon={<Globe className="w-5 h-5" style={{ color: "var(--rpg-gold)" }} />}
            title="View Map"
            description="See all your travels"
            iconBg="rgba(255, 215, 0, 0.2)"
            iconBorder="var(--rpg-gold)"
          />
        </div>

        {/* Bottom Section */}
        <div className="grid md:grid-cols-2 gap-6">
          {/* Achievements Progress */}
          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg flex items-center gap-2" style={{ color: "var(--rpg-text)" }}>
                <Trophy className="w-5 h-5" style={{ color: "var(--rpg-gold)" }} />
                Achievements
              </h2>
              <span className="text-sm flex items-center gap-1" style={{ color: "var(--rpg-muted)" }}>
                <Lock className="w-3 h-3" />
                Sign up
              </span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <div
                  className="h-3 rounded overflow-hidden"
                  style={{ background: "var(--rpg-border)", border: "2px solid var(--rpg-border-light)" }}
                >
                  <div
                    className="h-full"
                    style={{
                      width: `${(DEMO_STATS.achievements.unlocked / DEMO_STATS.achievements.total) * 100}%`,
                      background: "linear-gradient(90deg, var(--rpg-gold) 0%, var(--rpg-teal) 100%)",
                    }}
                  />
                </div>
              </div>
              <span className="text-sm font-medium" style={{ color: "var(--rpg-muted)" }}>
                {DEMO_STATS.achievements.unlocked} / {DEMO_STATS.achievements.total}
              </span>
            </div>
            <p className="mt-3 text-sm" style={{ color: "var(--rpg-muted)" }}>
              Keep exploring to unlock more achievements!
            </p>
          </div>

          {/* Top Rated Locations */}
          <div
            className="rounded-lg p-5"
            style={{
              background: "var(--rpg-card)",
              border: "2px solid var(--rpg-border)",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg flex items-center gap-2" style={{ color: "var(--rpg-text)" }}>
                <TrendingUp className="w-5 h-5" style={{ color: "var(--rpg-teal)" }} />
                Top Rated
              </h2>
              <span className="text-sm flex items-center gap-1" style={{ color: "var(--rpg-muted)" }}>
                <Lock className="w-3 h-3" />
                Sign up
              </span>
            </div>
            <div className="space-y-3">
              {DEMO_STATS.topLocations.map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between py-2"
                  style={{ borderBottom: "1px solid var(--rpg-border)" }}
                >
                  <div>
                    <p className="text-base" style={{ color: "var(--rpg-text)" }}>{location.name}</p>
                    <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                      {location.city.name}, {location.city.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" style={{ color: "var(--rpg-gold)" }}>
                    <span className="text-base font-medium">{location.avgRating?.toFixed(1)}</span>
                    <span className="text-sm">★</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div
          className="mt-8 rounded-lg p-6 text-center"
          style={{
            background: "linear-gradient(135deg, rgba(95, 191, 138, 0.1) 0%, rgba(255, 215, 0, 0.1) 100%)",
            border: "2px solid var(--rpg-border)",
          }}
        >
          <h3 className="text-lg mb-2" style={{ color: "var(--rpg-text)" }}>
            Ready to start your adventure?
          </h3>
          <p className="text-sm mb-4" style={{ color: "var(--rpg-muted)" }}>
            Sign up to track your travels, earn XP, and unlock achievements
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-medium transition-all hover:scale-105"
            style={{
              background: "linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-gold) 100%)",
              color: "#1a1a1a",
              boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3), 0 0 20px rgba(95, 191, 138, 0.3)",
            }}
          >
            <Sparkles className="w-4 h-4" />
            Start Your Journey
          </Link>
        </div>
      </div>
    </div>
  );
}

function DemoStatCard({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "teal" | "purple" | "cyan" | "gold";
}) {
  const colors = {
    teal: { bg: "rgba(95, 191, 138, 0.2)", border: "var(--rpg-teal)", text: "var(--rpg-teal)" },
    purple: { bg: "rgba(168, 85, 247, 0.2)", border: "var(--rpg-purple)", text: "var(--rpg-purple)" },
    cyan: { bg: "rgba(6, 182, 212, 0.2)", border: "var(--rpg-cyan)", text: "var(--rpg-cyan)" },
    gold: { bg: "rgba(255, 215, 0, 0.2)", border: "var(--rpg-gold)", text: "var(--rpg-gold)" },
  };

  return (
    <div
      className="rounded-lg p-4 block"
      style={{
        background: "var(--rpg-card)",
        border: "2px solid var(--rpg-border)",
        boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
      }}
    >
      <div
        className="w-8 h-8 rounded flex items-center justify-center mb-3"
        style={{ background: colors[color].bg, border: `2px solid ${colors[color].border}` }}
      >
        <span style={{ color: colors[color].text }}>{icon}</span>
      </div>
      <p className="text-2xl" style={{ color: "var(--rpg-gold)", textShadow: "0 0 8px var(--rpg-gold-glow)" }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>{label}</p>
    </div>
  );
}

function DemoActionCard({
  icon,
  title,
  description,
  iconBg,
  iconBorder,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  iconBg: string;
  iconBorder: string;
}) {
  return (
    <div
      className="rounded-lg p-5 opacity-80"
      style={{
        background: "var(--rpg-card)",
        border: "2px solid var(--rpg-border)",
        boxShadow: "0 4px 0 rgba(0, 0, 0, 0.3)",
      }}
    >
      <div className="flex items-center gap-4">
        <div
          className="w-10 h-10 rounded flex items-center justify-center"
          style={{ background: iconBg, border: `2px solid ${iconBorder}` }}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-base font-medium" style={{ color: "var(--rpg-text)" }}>{title}</h3>
          <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>{description}</p>
        </div>
        <div className="flex items-center gap-1" style={{ color: "var(--rpg-muted)" }}>
          <Lock className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
