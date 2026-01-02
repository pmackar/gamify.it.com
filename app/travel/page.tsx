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
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";
import { redirect } from "next/navigation";

async function getStats(userId: string) {
  const [
    citiesCount,
    locationsCount,
    visitsCount,
    achievementsCount,
    totalAchievements,
  ] = await Promise.all([
    prisma.travel_cities.count({
      where: { user_id: userId },
    }),
    prisma.travel_locations.count({
      where: { user_id: userId },
    }),
    prisma.travel_visits.count({
      where: { user_id: userId },
    }),
    prisma.user_achievements.count({
      where: {
        user_id: userId,
        is_completed: true,
        achievements: { app_id: 'travel' },
      },
    }),
    prisma.achievements.count({
      where: { app_id: 'travel' },
    }),
  ]);

  // Get unique countries
  const cities = await prisma.travel_cities.findMany({
    where: { user_id: userId },
    select: { country: true },
  });
  const uniqueCountries = new Set(cities.map((c) => c.country));

  // Get top rated locations
  const topLocations = await prisma.travel_locations.findMany({
    where: {
      user_id: userId,
      avg_rating: { not: null },
    },
    orderBy: { avg_rating: 'desc' },
    take: 3,
    include: {
      city: {
        select: { name: true, country: true },
      },
    },
  });

  return {
    counts: {
      cities: citiesCount,
      locations: locationsCount,
      visits: visitsCount,
      countries: uniqueCountries.size,
    },
    achievements: {
      unlocked: achievementsCount,
      total: totalAchievements,
    },
    topLocations: topLocations.map((loc) => ({
      id: loc.id,
      name: loc.name,
      type: loc.type,
      avgRating: loc.avg_rating,
      city: {
        name: loc.city.name,
        country: loc.city.country,
      },
    })),
  };
}

export default async function TravelDashboardPage() {
  const user = await getUser();
  if (!user) {
    redirect("/login");
  }

  const stats = await getStats(user.id);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Welcome Section */}
      <div className="mb-8">
        <h1
          className="text-xl md:text-2xl mb-2"
          style={{ color: 'var(--rpg-text)', textShadow: '0 0 10px rgba(255, 255, 255, 0.3)' }}
        >
          Welcome back, Explorer!
        </h1>
        <p className="text-base" style={{ color: 'var(--rpg-muted)' }}>
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
            <p className="text-sm mb-1" style={{ color: 'var(--rpg-muted)' }}>Your Progress</p>
            <p className="text-2xl" style={{ color: 'var(--rpg-gold)', textShadow: '0 0 10px var(--rpg-gold-glow)' }}>
              Level {user.travel.level}
            </p>
          </div>
          <div className="flex-1 max-w-md">
            <XPBar
              level={user.travel.level}
              currentXP={user.travel.xp}
              xpToNext={user.travel.xpToNext}
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
          value={stats.counts.cities}
          color="teal"
          href="/travel/cities"
        />
        <StatCard
          icon={<MapPin className="w-4 h-4" />}
          label="Locations"
          value={stats.counts.locations}
          color="purple"
          href="/travel/locations"
        />
        <StatCard
          icon={<Globe className="w-4 h-4" />}
          label="Countries"
          value={stats.counts.countries}
          color="cyan"
          href="/travel/cities"
        />
        <StatCard
          icon={<Flame className="w-4 h-4" />}
          label="Day Streak"
          value={user.currentStreak}
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
              <h3 className="text-base font-medium" style={{ color: 'var(--rpg-text)' }}>Add New Location</h3>
              <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
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
              <h3 className="text-base font-medium" style={{ color: 'var(--rpg-text)' }}>View Map</h3>
              <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
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
            <h2 className="text-lg flex items-center gap-2" style={{ color: 'var(--rpg-text)' }}>
              <Trophy className="w-5 h-5" style={{ color: 'var(--rpg-gold)' }} />
              Achievements
            </h2>
            <Link
              href="/travel/achievements"
              className="text-sm transition-colors"
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
                      stats.achievements.total > 0
                        ? (stats.achievements.unlocked / stats.achievements.total) * 100
                        : 0
                    }%`,
                    background: 'linear-gradient(90deg, var(--rpg-gold) 0%, var(--rpg-teal) 100%)',
                  }}
                />
              </div>
            </div>
            <span className="text-sm font-medium" style={{ color: 'var(--rpg-muted)' }}>
              {stats.achievements.unlocked} / {stats.achievements.total}
            </span>
          </div>
          <p className="mt-3 text-sm" style={{ color: 'var(--rpg-muted)' }}>
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
            <h2 className="text-lg flex items-center gap-2" style={{ color: 'var(--rpg-text)' }}>
              <TrendingUp className="w-5 h-5" style={{ color: 'var(--rpg-teal)' }} />
              Top Rated
            </h2>
            <Link
              href="/travel/locations"
              className="text-sm transition-colors"
              style={{ color: 'var(--rpg-teal)' }}
            >
              View all
            </Link>
          </div>
          {stats.topLocations.length > 0 ? (
            <div className="space-y-3">
              {stats.topLocations.map((location) => (
                <Link
                  key={location.id}
                  href={`/travel/locations/${location.id}`}
                  className="flex items-center justify-between py-2 transition-colors hover:opacity-80"
                  style={{ borderBottom: '1px solid var(--rpg-border)' }}
                >
                  <div>
                    <p className="text-base" style={{ color: 'var(--rpg-text)' }}>{location.name}</p>
                    <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
                      {location.city.name}, {location.city.country}
                    </p>
                  </div>
                  <div className="flex items-center gap-1" style={{ color: 'var(--rpg-gold)' }}>
                    <span className="text-base font-medium">
                      {location.avgRating?.toFixed(1)}
                    </span>
                    <span className="text-sm">★</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>
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
      <p className="text-2xl" style={{ color: 'var(--rpg-gold)', textShadow: '0 0 8px var(--rpg-gold-glow)' }}>
        {value}
      </p>
      <p className="text-sm" style={{ color: 'var(--rpg-muted)' }}>{label}</p>
    </Link>
  );
}
