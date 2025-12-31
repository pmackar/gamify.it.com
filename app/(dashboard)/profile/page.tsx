"use client";

import { useEffect, useState } from "react";
import {
  User,
  MapPin,
  Globe,
  Building2,
  Home,
  Star,
  Trophy,
  Flame,
  Calendar,
  TrendingUp,
  Heart,
  CheckSquare,
  Utensils,
  Coffee,
  Beer,
  Landmark,
  TreePine,
  ShoppingBag,
} from "lucide-react";
import XPBar from "@/components/ui/XPBar";
import Link from "next/link";

interface ProfileData {
  character: {
    name: string;
    email: string;
    avatar: string | null;
    level: number;
    xp: number;
    xpToNext: number;
    totalXPEarned: number;
    currentStreak: number;
    longestStreak: number;
    lastActive: string | null;
    memberSince: string;
    daysSinceJoining: number;
  };
  stats: {
    countries: number;
    cities: number;
    neighborhoods: number;
    locations: number;
    visits: number;
    visited: number;
    hotlist: number;
    reviews: number;
    avgRating: number | null;
  };
  locationsByType: Array<{ type: string; count: number }>;
  achievements: {
    unlocked: number;
    total: number;
    list: Array<{
      id: string;
      code: string;
      name: string;
      description: string;
      icon: string;
      tier: number;
      unlockedAt: string;
    }>;
  };
  recentVisits: Array<{
    id: string;
    date: string;
    rating: number | null;
    location: {
      id: string;
      name: string;
      type: string;
      city: { name: string };
    };
  }>;
  topLocations: Array<{
    id: string;
    name: string;
    type: string;
    avgRating: number;
    city: { name: string };
  }>;
}

const typeIcons: Record<string, React.ElementType> = {
  RESTAURANT: Utensils,
  CAFE: Coffee,
  BAR: Beer,
  ATTRACTION: Landmark,
  NATURE: TreePine,
  SHOP: ShoppingBag,
  MUSEUM: Landmark,
};

const typeColors: Record<string, string> = {
  RESTAURANT: "text-orange-400",
  BAR: "text-purple-400",
  CAFE: "text-amber-400",
  ATTRACTION: "text-cyan-400",
  HOTEL: "text-blue-400",
  SHOP: "text-pink-400",
  NATURE: "text-green-400",
  MUSEUM: "text-indigo-400",
  BEACH: "text-teal-400",
  NIGHTLIFE: "text-fuchsia-400",
  OTHER: "text-gray-400",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/profile");
        if (res.ok) {
          setProfile(await res.json());
        }
      } catch (error) {
        console.error("Failed to fetch profile:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-400" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <p className="text-gray-400">Failed to load profile</p>
      </div>
    );
  }

  const { character, stats, locationsByType, achievements, recentVisits, topLocations } = profile;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Character Header */}
      <div
        className="rounded-xl p-6 mb-6"
        style={{
          background: "var(--rpg-card)",
          border: "2px solid var(--rpg-border)",
        }}
      >
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6">
          {/* Avatar */}
          <div className="relative">
            {character.avatar ? (
              <img
                src={character.avatar}
                alt={character.name}
                className="w-24 h-24 rounded-lg"
                style={{ border: "3px solid var(--rpg-teal)" }}
              />
            ) : (
              <div
                className="w-24 h-24 rounded-lg flex items-center justify-center"
                style={{
                  background: "linear-gradient(135deg, var(--rpg-teal) 0%, var(--rpg-gold) 100%)",
                  border: "3px solid var(--rpg-teal-dark)",
                }}
              >
                <User className="w-12 h-12" style={{ color: "var(--rpg-bg-dark)" }} />
              </div>
            )}
            <div
              className="absolute -bottom-2 -right-2 px-3 py-1 rounded font-bold text-sm"
              style={{
                background: "var(--rpg-gold)",
                color: "var(--rpg-bg-dark)",
                border: "2px solid var(--rpg-gold-dark)",
              }}
            >
              LVL {character.level}
            </div>
          </div>

          {/* Name & XP */}
          <div className="flex-1">
            <h1
              className="text-2xl mb-1"
              style={{ color: "var(--rpg-teal)", textShadow: "0 0 10px var(--rpg-teal-glow)" }}
            >
              {character.name}
            </h1>
            <p className="text-sm mb-4" style={{ color: "var(--rpg-muted)" }}>
              {character.email}
            </p>
            <div className="max-w-md">
              <XPBar
                level={character.level}
                currentXP={character.xp}
                xpToNext={character.xpToNext}
                size="md"
              />
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--rpg-muted)" }}>
              {character.totalXPEarned.toLocaleString()} Total XP Earned
            </p>
          </div>

          {/* Streak */}
          <div className="text-center">
            <div
              className="flex items-center gap-2 px-4 py-2 rounded-lg"
              style={{ background: "var(--rpg-bg-dark)", border: "2px solid var(--rpg-border)" }}
            >
              <Flame className="w-6 h-6" style={{ color: "var(--rpg-gold)" }} />
              <div>
                <p className="text-2xl font-bold" style={{ color: "var(--rpg-gold)" }}>
                  {character.currentStreak}
                </p>
                <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                  Day Streak
                </p>
              </div>
            </div>
            <p className="text-xs mt-2" style={{ color: "var(--rpg-muted)" }}>
              Best: {character.longestStreak} days
            </p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 mb-6">
        <StatCard icon={Globe} label="Countries" value={stats.countries} color="var(--rpg-cyan)" href="/cities" />
        <StatCard icon={Building2} label="Cities" value={stats.cities} color="var(--rpg-purple)" href="/cities" />
        <StatCard icon={Home} label="Neighborhoods" value={stats.neighborhoods} color="var(--rpg-teal)" href="/neighborhoods" />
        <StatCard icon={MapPin} label="Locations" value={stats.locations} color="var(--rpg-gold)" href="/locations" />
        <StatCard icon={CheckSquare} label="Visited" value={stats.visited} color="#22c55e" href="/locations?visited=true" />
        <StatCard icon={Heart} label="Hotlist" value={stats.hotlist} color="#ef4444" href="/locations?hotlist=true" />
        <StatCard icon={Star} label="Reviews" value={stats.reviews} color="#f59e0b" href="/stats" />
        <StatCard
          icon={TrendingUp}
          label="Avg Rating"
          value={stats.avgRating ? stats.avgRating.toFixed(1) : "-"}
          color="#a855f7"
        />
        <StatCard icon={Calendar} label="Days Active" value={character.daysSinceJoining} color="var(--rpg-muted)" />
        <StatCard
          icon={Trophy}
          label="Achievements"
          value={`${achievements.unlocked}/${achievements.total}`}
          color="var(--rpg-gold)"
          href="/achievements"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Location Types */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--rpg-card)", border: "2px solid var(--rpg-border)" }}
        >
          <h2
            className="text-lg mb-4"
            style={{ color: "var(--rpg-teal)", textShadow: "0 0 10px var(--rpg-teal-glow)" }}
          >
            Exploration Breakdown
          </h2>
          <div className="space-y-3">
            {locationsByType
              .sort((a, b) => b.count - a.count)
              .map((item) => {
                const Icon = typeIcons[item.type] || MapPin;
                const colorClass = typeColors[item.type] || "text-gray-400";
                const maxCount = Math.max(...locationsByType.map((l) => l.count));
                const percentage = (item.count / maxCount) * 100;

                return (
                  <Link
                    key={item.type}
                    href={`/locations?type=${item.type.toLowerCase()}`}
                    className="flex items-center gap-3 p-2 -mx-2 rounded-lg transition-colors hover:bg-gray-800/50"
                  >
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span style={{ color: "var(--rpg-text)" }}>
                          {item.type.charAt(0) + item.type.slice(1).toLowerCase()}
                        </span>
                        <span style={{ color: "var(--rpg-muted)" }}>{item.count}</span>
                      </div>
                      <div
                        className="h-2 rounded-full overflow-hidden"
                        style={{ background: "var(--rpg-border)" }}
                      >
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${percentage}%`,
                            background: `linear-gradient(90deg, var(--rpg-teal) 0%, var(--rpg-gold) 100%)`,
                          }}
                        />
                      </div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </div>

        {/* Achievements */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--rpg-card)", border: "2px solid var(--rpg-border)" }}
        >
          <div className="flex items-center justify-between mb-4">
            <h2
              className="text-lg"
              style={{ color: "var(--rpg-teal)", textShadow: "0 0 10px var(--rpg-teal-glow)" }}
            >
              Achievements
            </h2>
            <Link
              href="/achievements"
              className="text-sm"
              style={{ color: "var(--rpg-gold)" }}
            >
              View All →
            </Link>
          </div>
          {achievements.list.length > 0 ? (
            <div className="space-y-3">
              {achievements.list.slice(0, 5).map((achievement) => (
                <div
                  key={achievement.id}
                  className="flex items-center gap-3 p-3 rounded-lg"
                  style={{ background: "var(--rpg-bg-dark)", border: "1px solid var(--rpg-border)" }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
                    style={{
                      background: "linear-gradient(135deg, var(--rpg-gold) 0%, var(--rpg-gold-dark) 100%)",
                    }}
                  >
                    {achievement.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate" style={{ color: "var(--rpg-text)" }}>
                      {achievement.name}
                    </p>
                    <p className="text-xs truncate" style={{ color: "var(--rpg-muted)" }}>
                      {achievement.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: "var(--rpg-muted)" }}>
              No achievements unlocked yet. Keep exploring!
            </p>
          )}
        </div>

        {/* Top Rated Locations */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--rpg-card)", border: "2px solid var(--rpg-border)" }}
        >
          <h2
            className="text-lg mb-4"
            style={{ color: "var(--rpg-teal)", textShadow: "0 0 10px var(--rpg-teal-glow)" }}
          >
            Top Rated Spots
          </h2>
          {topLocations.length > 0 ? (
            <div className="space-y-3">
              {topLocations.map((location, index) => {
                const Icon = typeIcons[location.type] || MapPin;
                const colorClass = typeColors[location.type] || "text-gray-400";

                return (
                  <Link
                    key={location.id}
                    href={`/locations/${location.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                    style={{
                      background: "var(--rpg-bg-dark)",
                      border: "1px solid var(--rpg-border)",
                    }}
                  >
                    <div
                      className="w-8 h-8 rounded flex items-center justify-center font-bold"
                      style={{
                        background: index === 0 ? "var(--rpg-gold)" : "var(--rpg-border)",
                        color: index === 0 ? "var(--rpg-bg-dark)" : "var(--rpg-muted)",
                      }}
                    >
                      {index + 1}
                    </div>
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--rpg-text)" }}>
                        {location.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                        {location.city.name}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" style={{ color: "var(--rpg-gold)" }} />
                      <span style={{ color: "var(--rpg-gold)" }}>{location.avgRating.toFixed(1)}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: "var(--rpg-muted)" }}>
              No rated locations yet
            </p>
          )}
        </div>

        {/* Recent Visits */}
        <div
          className="rounded-xl p-5"
          style={{ background: "var(--rpg-card)", border: "2px solid var(--rpg-border)" }}
        >
          <h2
            className="text-lg mb-4"
            style={{ color: "var(--rpg-teal)", textShadow: "0 0 10px var(--rpg-teal-glow)" }}
          >
            Recent Adventures
          </h2>
          {recentVisits.length > 0 ? (
            <div className="space-y-3">
              {recentVisits.map((visit) => {
                const Icon = typeIcons[visit.location.type] || MapPin;
                const colorClass = typeColors[visit.location.type] || "text-gray-400";

                return (
                  <Link
                    key={visit.id}
                    href={`/locations/${visit.location.id}`}
                    className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                    style={{
                      background: "var(--rpg-bg-dark)",
                      border: "1px solid var(--rpg-border)",
                    }}
                  >
                    <Icon className={`w-5 h-5 ${colorClass}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: "var(--rpg-text)" }}>
                        {visit.location.name}
                      </p>
                      <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                        {visit.location.city.name} • {new Date(visit.date).toLocaleDateString()}
                      </p>
                    </div>
                    {visit.rating && (
                      <div className="flex items-center gap-1">
                        <Star className="w-4 h-4 fill-current" style={{ color: "var(--rpg-gold)" }} />
                        <span style={{ color: "var(--rpg-gold)" }}>{visit.rating}</span>
                      </div>
                    )}
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="text-center py-8" style={{ color: "var(--rpg-muted)" }}>
              No visits recorded yet
            </p>
          )}
        </div>
      </div>

      {/* Member Since */}
      <div className="text-center mt-8">
        <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
          Member since {new Date(character.memberSince).toLocaleDateString("en-US", {
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  color: string;
  href?: string;
}) {
  const content = (
    <>
      <Icon className="w-5 h-5 mx-auto mb-2" style={{ color }} />
      <p className="text-xl font-bold" style={{ color }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
        {label}
      </p>
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="rounded-lg p-4 text-center transition-all hover:scale-105"
        style={{
          background: "var(--rpg-card)",
          border: "2px solid var(--rpg-border)",
        }}
      >
        {content}
      </Link>
    );
  }

  return (
    <div
      className="rounded-lg p-4 text-center"
      style={{ background: "var(--rpg-card)", border: "2px solid var(--rpg-border)" }}
    >
      {content}
    </div>
  );
}
