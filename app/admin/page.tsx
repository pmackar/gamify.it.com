import Link from "next/link";
import prisma from "@/lib/db";
import {
  Users,
  TrendingUp,
  Flame,
  Trophy,
  MapPin,
  Dumbbell,
  CheckSquare,
  Globe,
  Calendar,
  Activity,
} from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalUsers,
    dau,
    wau,
    mau,
    newUsersWeek,
    activeStreaks,
    totalXP,
    travelActiveWeek,
    fitnessActiveWeek,
    todayActiveWeek,
    pendingReviews,
    totalLocations,
    totalVisits,
    totalQuests,
  ] = await Promise.all([
    // Total users
    prisma.profiles.count(),

    // DAU - users active today
    prisma.profiles.count({
      where: { last_activity_date: { gte: today } },
    }),

    // WAU - users active in last 7 days
    prisma.profiles.count({
      where: { last_activity_date: { gte: sevenDaysAgo } },
    }),

    // MAU - users active in last 30 days
    prisma.profiles.count({
      where: { last_activity_date: { gte: thirtyDaysAgo } },
    }),

    // New users this week
    prisma.profiles.count({
      where: { created_at: { gte: sevenDaysAgo } },
    }),

    // Users with active streaks
    prisma.profiles.count({
      where: { current_streak: { gt: 0 } },
    }),

    // Total XP earned (sum)
    prisma.profiles.aggregate({
      _sum: { total_xp: true },
    }),

    // Travel app active users (7d)
    prisma.app_profiles.count({
      where: {
        app_id: "travel",
        updated_at: { gte: sevenDaysAgo },
      },
    }),

    // Fitness app active users (7d)
    prisma.gamify_fitness_data.count({
      where: { updated_at: { gte: sevenDaysAgo } },
    }),

    // Today app active users (7d)
    prisma.gamify_today_data.count({
      where: { updated_at: { gte: sevenDaysAgo } },
    }),

    // Pending reviews for moderation
    prisma.travel_reviews.count({
      where: { status: "PENDING" },
    }),

    // Total locations
    prisma.travel_locations.count(),

    // Total visits
    prisma.travel_visits.count(),

    // Total quests
    prisma.travel_quests.count(),
  ]);

  // Calculate DAU/MAU ratio (stickiness)
  const stickiness = mau > 0 ? ((dau / mau) * 100).toFixed(1) : "0";

  return {
    totalUsers,
    dau,
    wau,
    mau,
    newUsersWeek,
    activeStreaks,
    totalXP: totalXP._sum.total_xp || 0,
    stickiness,
    travelActiveWeek,
    fitnessActiveWeek,
    todayActiveWeek,
    pendingReviews,
    totalLocations,
    totalVisits,
    totalQuests,
  };
}

export default async function AdminDashboard() {
  const stats = await getStats();

  const overviewCards = [
    {
      label: "Total Users",
      value: stats.totalUsers.toLocaleString(),
      icon: Users,
      color: "#5fbf8a",
      href: "/admin/users",
    },
    {
      label: "DAU",
      value: stats.dau.toLocaleString(),
      subtext: "Active today",
      icon: Activity,
      color: "#06b6d4",
    },
    {
      label: "WAU",
      value: stats.wau.toLocaleString(),
      subtext: "Last 7 days",
      icon: Calendar,
      color: "#a855f7",
    },
    {
      label: "MAU",
      value: stats.mau.toLocaleString(),
      subtext: "Last 30 days",
      icon: TrendingUp,
      color: "#FFD700",
    },
  ];

  const engagementCards = [
    {
      label: "DAU/MAU Ratio",
      value: `${stats.stickiness}%`,
      subtext: stats.stickiness >= "20" ? "Healthy" : "Needs work",
      icon: TrendingUp,
      color: stats.stickiness >= "20" ? "#5fbf8a" : "#f59e0b",
    },
    {
      label: "Active Streaks",
      value: stats.activeStreaks.toLocaleString(),
      subtext: `${((stats.activeStreaks / stats.totalUsers) * 100).toFixed(1)}% of users`,
      icon: Flame,
      color: "#f97316",
    },
    {
      label: "New Users (7d)",
      value: stats.newUsersWeek.toLocaleString(),
      icon: Users,
      color: "#22c55e",
    },
    {
      label: "Total XP Earned",
      value: stats.totalXP.toLocaleString(),
      icon: Trophy,
      color: "#FFD700",
    },
  ];

  const appCards = [
    {
      label: "Travel",
      value: stats.travelActiveWeek,
      subtext: "Active this week",
      icon: MapPin,
      color: "#5fbf8a",
      stats: [
        { label: "Locations", value: stats.totalLocations },
        { label: "Visits", value: stats.totalVisits },
        { label: "Quests", value: stats.totalQuests },
      ],
    },
    {
      label: "Fitness",
      value: stats.fitnessActiveWeek,
      subtext: "Active this week",
      icon: Dumbbell,
      color: "#FF6B6B",
    },
    {
      label: "Today",
      value: stats.todayActiveWeek,
      subtext: "Active this week",
      icon: CheckSquare,
      color: "#5CC9F5",
    },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1
          className="text-xl"
          style={{
            fontFamily: "var(--font-pixel)",
            color: "var(--rpg-teal)",
            fontSize: "14px",
          }}
        >
          Dashboard
        </h1>
        {stats.pendingReviews > 0 && (
          <Link
            href="/admin/moderation"
            className="flex items-center gap-2 px-4 py-2 rounded-lg"
            style={{
              background: "rgba(239, 68, 68, 0.2)",
              border: "1px solid #ef4444",
              color: "#ef4444",
            }}
          >
            <span className="text-sm font-medium">
              {stats.pendingReviews} pending reviews
            </span>
          </Link>
        )}
      </div>

      {/* Overview Section */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          User Overview
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {overviewCards.map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-lg"
              style={{
                background: "var(--rpg-card)",
                border: "1px solid var(--rpg-border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  {card.label}
                </span>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
              <p
                className="text-2xl font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </p>
              {card.subtext && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  {card.subtext}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Engagement Section */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Engagement Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {engagementCards.map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-lg"
              style={{
                background: "var(--rpg-card)",
                border: "1px solid var(--rpg-border)",
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className="text-xs font-medium"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  {card.label}
                </span>
                <card.icon size={16} style={{ color: card.color }} />
              </div>
              <p
                className="text-2xl font-bold"
                style={{ color: card.color }}
              >
                {card.value}
              </p>
              {card.subtext && (
                <p
                  className="text-xs mt-1"
                  style={{ color: "var(--rpg-muted)" }}
                >
                  {card.subtext}
                </p>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Per-App Section */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          App Activity (7 days)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {appCards.map((card) => (
            <div
              key={card.label}
              className="p-4 rounded-lg"
              style={{
                background: "var(--rpg-card)",
                border: "1px solid var(--rpg-border)",
              }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center"
                  style={{ background: `${card.color}20` }}
                >
                  <card.icon size={20} style={{ color: card.color }} />
                </div>
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--rpg-text)" }}
                  >
                    {card.label}
                  </p>
                  <p
                    className="text-xs"
                    style={{ color: "var(--rpg-muted)" }}
                  >
                    {card.subtext}
                  </p>
                </div>
              </div>
              <p
                className="text-3xl font-bold"
                style={{ color: card.color }}
              >
                {card.value.toLocaleString()}
              </p>
              {card.stats && (
                <div className="mt-3 pt-3 border-t" style={{ borderColor: "var(--rpg-border)" }}>
                  <div className="grid grid-cols-3 gap-2">
                    {card.stats.map((stat) => (
                      <div key={stat.label}>
                        <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                          {stat.label}
                        </p>
                        <p className="text-sm font-medium" style={{ color: "var(--rpg-text)" }}>
                          {stat.value.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Quick Actions */}
      <section>
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            href="/admin/users"
            className="flex items-center gap-3 p-4 rounded-lg transition-colors"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <Users size={24} style={{ color: "var(--rpg-teal)" }} />
            <div>
              <p className="font-medium" style={{ color: "var(--rpg-text)" }}>
                User Management
              </p>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Search and manage users
              </p>
            </div>
          </Link>
          <Link
            href="/admin/metrics"
            className="flex items-center gap-3 p-4 rounded-lg transition-colors"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <TrendingUp size={24} style={{ color: "var(--rpg-gold)" }} />
            <div>
              <p className="font-medium" style={{ color: "var(--rpg-text)" }}>
                Deep Metrics
              </p>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Detailed analytics
              </p>
            </div>
          </Link>
          <Link
            href="/admin/moderation"
            className="flex items-center gap-3 p-4 rounded-lg transition-colors"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <Globe size={24} style={{ color: "var(--rpg-purple)" }} />
            <div>
              <p className="font-medium" style={{ color: "var(--rpg-text)" }}>
                Moderation
              </p>
              <p className="text-sm" style={{ color: "var(--rpg-muted)" }}>
                Review content
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
