"use client";

import { useEffect, useState } from "react";
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
} from "lucide-react";
import XPBar from "@/components/ui/XPBar";

interface Stats {
  user: {
    level: number;
    xp: number;
    xpToNext: number;
    currentStreak: number;
    longestStreak: number;
  };
  counts: {
    cities: number;
    locations: number;
    visits: number;
    countries: number;
    recentVisits: number;
  };
  achievements: {
    unlocked: number;
    total: number;
  };
  topLocations: Array<{
    id: string;
    name: string;
    type: string;
    avgRating: number;
    city: { name: string; country: string };
  }>;
  character?: {
    name: string;
  };
}

export default function TravelDashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Failed to fetch stats:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div
          className="w-12 h-12 rounded"
          style={{
            border: '4px solid var(--rpg-border)',
            borderTop: '4px solid var(--rpg-teal)',
            animation: 'spin 1s linear infinite',
          }}
        />
        <style jsx>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1
          className="text-lg mb-2"
          style={{ color: 'var(--rpg-text)', textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}
        >
          Welcome back, Explorer!
        </h1>
        <p className="text-[0.55rem]" style={{ color: 'var(--rpg-muted)' }}>
          Ready to continue your adventure?
        </p>
      </div>

      {/* XP Progress Card */}
      <div
        className="rounded-lg p-6 mb-8"
        style={{
          background: 'var(--rpg-card)',
          border: '2px solid var(--rpg-border)',
          boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-[0.5rem] mb-1" style={{ color: 'var(--rpg-muted)' }}>Your Progress</p>
            <p className="text-xl" style={{ color: 'var(--rpg-gold)', textShadow: '0 0 10px var(--rpg-gold-glow)' }}>
              Level {stats?.user.level || 1}
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <XPBar
              level={stats?.user.level || 1}
              currentXP={stats?.user.xp || 0}
              xpToNext={stats?.user.xpToNext || 100}
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={<Building2 className="w-4 h-4" />}
          label="Cities"
          value={stats?.counts.cities || 0}
          color="teal"
          href="/travel/cities"
        />
        <StatCard
          icon={<MapPin className="w-4 h-4" />}
          label="Locations"
          value={stats?.counts.locations || 0}
          color="purple"
          href="/travel/locations"
        />
        <StatCard
          icon={<Globe className="w-4 h-4" />}
          label="Countries"
          value={stats?.counts.countries || 0}
          color="cyan"
          href="/travel/cities"
        />
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          label="Day Streak"
          value={stats?.user.currentStreak || 0}
          color="gold"
          href="/travel/profile"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/travel/locations/new"
          className="group rounded-lg p-5 transition-all"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: 'rgba(95, 191, 138, 0.2)', border: '2px solid var(--rpg-teal)' }}
            >
              <Plus className="w-5 h-5" style={{ color: 'var(--rpg-teal)' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-[0.65rem]" style={{ color: 'var(--rpg-text)' }}>Add New Location</h3>
              <p className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
                Log a place you've visited
              </p>
            </div>
            <ArrowRight className="w-4 h-4 transition-colors" style={{ color: 'var(--rpg-muted)' }} />
          </div>
        </Link>

        <Link
          href="/travel/map"
          className="group rounded-lg p-5 transition-all"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center gap-4">
            <div
              className="w-10 h-10 rounded flex items-center justify-center transition-transform group-hover:scale-110"
              style={{ background: 'rgba(255, 215, 0, 0.2)', border: '2px solid var(--rpg-gold)' }}
            >
              <Globe className="w-5 h-5" style={{ color: 'var(--rpg-gold)' }} />
            </div>
            <div className="flex-1">
              <h3 className="text-[0.65rem]" style={{ color: 'var(--rpg-text)' }}>View Map</h3>
              <p className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
                See all your travels
              </p>
            </div>
            <ArrowRight className="w-4 h-4 transition-colors" style={{ color: 'var(--rpg-muted)' }} />
          </div>
        </Link>
      </div>

      {/* Bottom Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Achievements Progress */}
        <div
          className="rounded-lg p-5"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[0.7rem] flex items-center gap-2" style={{ color: 'var(--rpg-text)' }}>
              <Trophy className="w-4 h-4" style={{ color: 'var(--rpg-gold)' }} />
              Achievements
            </h2>
            <Link
              href="/travel/achievements"
              className="text-[0.5rem] transition-colors"
              style={{ color: 'var(--rpg-teal)' }}
            >
              View all
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div
                className="h-3 rounded overflow-hidden"
                style={{ background: 'var(--rpg-border)', border: '2px solid var(--rpg-border-light)' }}
              >
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${
                      stats?.achievements
                        ? (stats.achievements.unlocked / stats.achievements.total) * 100
                        : 0
                    }%`,
                    background: 'linear-gradient(90deg, var(--rpg-gold) 0%, var(--rpg-teal) 100%)',
                  }}
                />
              </div>
            </div>
            <span className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
              {stats?.achievements.unlocked || 0} / {stats?.achievements.total || 0}
            </span>
          </div>
          <p className="mt-3 text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
            Keep exploring to unlock more achievements!
          </p>
        </div>

        {/* Top Rated Locations */}
        <div
          className="rounded-lg p-5"
          style={{
            background: 'var(--rpg-card)',
            border: '2px solid var(--rpg-border)',
            boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[0.7rem] flex items-center gap-2" style={{ color: 'var(--rpg-text)' }}>
              <TrendingUp className="w-4 h-4" style={{ color: 'var(--rpg-teal)' }} />
              Top Rated
            </h2>
            <Link
              href="/travel/locations"
              className="text-[0.5rem] transition-colors"
              style={{ color: 'var(--rpg-teal)' }}
            >
              View all
            </Link>
          </div>
          {stats?.topLocations && stats.topLocations.length > 0 ? (
            <div className="space-y-3">
              {stats.topLocations.slice(0, 3).map((location) => (
                <Link
                  key={location.id}
                  href={`/travel/locations/${location.id}`}
                  className="flex items-center justify-between py-2 transition-colors hover:opacity-80"
                  style={{ borderBottom: '1px solid var(--rpg-border)' }}
                >
                  <div>
                    <p className="text-[0.55rem]" style={{ color: 'var(--rpg-text)' }}>{location.name}</p>
                    <p className="text-[0.45rem]" style={{ color: 'var(--rpg-muted)' }}>
                      {location.city.name}, {location.city.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--rpg-gold)' }}>
                    <span className="text-[0.55rem]">
                      {location.avgRating?.toFixed(1)}
                    </span>
                    <span className="text-[0.45rem]">★</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>
              No rated locations yet. Start exploring!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "teal" | "purple" | "cyan" | "gold";
  href: string;
}) {
  const colors = {
    teal: { bg: 'rgba(95, 191, 138, 0.2)', border: 'var(--rpg-teal)', text: 'var(--rpg-teal)' },
    purple: { bg: 'rgba(168, 85, 247, 0.2)', border: 'var(--rpg-purple)', text: 'var(--rpg-purple)' },
    cyan: { bg: 'rgba(6, 182, 212, 0.2)', border: 'var(--rpg-cyan)', text: 'var(--rpg-cyan)' },
    gold: { bg: 'rgba(255, 215, 0, 0.2)', border: 'var(--rpg-gold)', text: 'var(--rpg-gold)' },
  };

  return (
    <Link
      href={href}
      className="rounded-lg p-4 block transition-all hover:scale-[1.02]"
      style={{
        background: 'var(--rpg-card)',
        border: '2px solid var(--rpg-border)',
        boxShadow: '0 4px 0 rgba(0, 0, 0, 0.3)',
      }}
    >
      <div
        className="w-8 h-8 rounded flex items-center justify-center mb-3"
        style={{ background: colors[color].bg, border: `2px solid ${colors[color].border}` }}
      >
        <span style={{ color: colors[color].text }}>{icon}</span>
      </div>
      <p className="text-lg" style={{ color: 'var(--rpg-gold)', textShadow: '0 0 8px var(--rpg-gold-glow)' }}>
        {value}
      </p>
      <p className="text-[0.5rem]" style={{ color: 'var(--rpg-muted)' }}>{label}</p>
    </Link>
  );
}
