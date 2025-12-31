"use client";

import { useSession } from "next-auth/react";
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
}

export default function DashboardPage() {
  const { data: session } = useSession();
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
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {session?.user?.name?.split(" ")[0] || "Explorer"}!
        </h1>
        <p className="text-gray-400">
          Ready to continue your adventure?
        </p>
      </div>

      {/* XP Progress Card */}
      <div className="bg-gradient-to-r from-cyan-500/10 via-purple-500/10 to-pink-500/10 border border-gray-800 rounded-2xl p-6 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <p className="text-gray-400 text-sm mb-1">Your Progress</p>
            <p className="text-2xl font-bold text-white">
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
          icon={<Building2 className="w-5 h-5" />}
          label="Cities"
          value={stats?.counts.cities || 0}
          color="cyan"
        />
        <StatCard
          icon={<MapPin className="w-5 h-5" />}
          label="Locations"
          value={stats?.counts.locations || 0}
          color="purple"
        />
        <StatCard
          icon={<Globe className="w-5 h-5" />}
          label="Countries"
          value={stats?.counts.countries || 0}
          color="pink"
        />
        <StatCard
          icon={<Flame className="w-5 h-5" />}
          label="Day Streak"
          value={stats?.user.currentStreak || 0}
          color="orange"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Link
          href="/locations/new"
          className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-cyan-500/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
              <Plus className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Add New Location</h3>
              <p className="text-sm text-gray-400">
                Log a place you've visited
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-cyan-400 transition-colors" />
          </div>
        </Link>

        <Link
          href="/map"
          className="group bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:border-purple-500/50 transition-all"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
              <Globe className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">View Map</h3>
              <p className="text-sm text-gray-400">
                See all your travels
              </p>
            </div>
            <ArrowRight className="w-5 h-5 text-gray-600 group-hover:text-purple-400 transition-colors" />
          </div>
        </Link>
      </div>

      {/* Bottom Section */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Achievements Progress */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              Achievements
            </h2>
            <Link
              href="/achievements"
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              View all
            </Link>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-yellow-400 to-orange-500 transition-all duration-500"
                  style={{
                    width: `${
                      stats?.achievements
                        ? (stats.achievements.unlocked / stats.achievements.total) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
            <span className="text-sm text-gray-400">
              {stats?.achievements.unlocked || 0} / {stats?.achievements.total || 0}
            </span>
          </div>
          <p className="mt-3 text-sm text-gray-500">
            Keep exploring to unlock more achievements!
          </p>
        </div>

        {/* Top Rated Locations */}
        <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Top Rated
            </h2>
            <Link
              href="/locations"
              className="text-sm text-cyan-400 hover:text-cyan-300"
            >
              View all
            </Link>
          </div>
          {stats?.topLocations && stats.topLocations.length > 0 ? (
            <div className="space-y-3">
              {stats.topLocations.slice(0, 3).map((location) => (
                <div
                  key={location.id}
                  className="flex items-center justify-between"
                >
                  <div>
                    <p className="text-white text-sm">{location.name}</p>
                    <p className="text-xs text-gray-500">
                      {location.city.name}, {location.city.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-yellow-400">
                    <span className="text-sm font-medium">
                      {location.avgRating?.toFixed(1)}
                    </span>
                    <span className="text-xs">★</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">
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
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: "cyan" | "purple" | "pink" | "orange";
}) {
  const colors = {
    cyan: "bg-cyan-500/10 text-cyan-400",
    purple: "bg-purple-500/10 text-purple-400",
    pink: "bg-pink-500/10 text-pink-400",
    orange: "bg-orange-500/10 text-orange-400",
  };

  return (
    <div className="bg-gray-900/50 border border-gray-800 rounded-xl p-4">
      <div className={`w-10 h-10 rounded-lg ${colors[color]} flex items-center justify-center mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-bold text-white">{value}</p>
      <p className="text-sm text-gray-400">{label}</p>
    </div>
  );
}
