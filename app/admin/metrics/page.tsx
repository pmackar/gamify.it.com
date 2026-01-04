import prisma from "@/lib/db";
import { TrendingUp, Users, Flame, Trophy, Target, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

async function getMetrics() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Get last 30 days of data for trends
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    // User metrics
    totalUsers,
    dau,
    mau,

    // Streak metrics
    streakDistribution,

    // Achievement metrics
    totalAchievements,
    completedAchievements,

    // XP metrics
    xpStats,

    // Daily login claims
    dailyClaimsToday,
    dailyClaimsWeek,

    // Recent signups by day
    recentSignups,
  ] = await Promise.all([
    prisma.profiles.count(),
    prisma.profiles.count({ where: { last_activity_date: { gte: today } } }),
    prisma.profiles.count({ where: { last_activity_date: { gte: thirtyDaysAgo } } }),

    // Streak distribution
    prisma.profiles.groupBy({
      by: ["current_streak"],
      _count: true,
      where: { current_streak: { gt: 0 } },
      orderBy: { current_streak: "asc" },
    }),

    // Achievement counts
    prisma.achievements.count(),
    prisma.user_achievements.count({ where: { is_completed: true } }),

    // XP stats
    prisma.profiles.aggregate({
      _sum: { total_xp: true },
      _avg: { total_xp: true },
      _max: { total_xp: true },
    }),

    // Daily login claims
    prisma.daily_login_claims.count({ where: { claim_date: today } }),
    prisma.daily_login_claims.count({ where: { claim_date: { gte: thirtyDaysAgo } } }),

    // Signups last 7 days
    prisma.$queryRaw`
      SELECT DATE(created_at) as date, COUNT(*)::int as count
      FROM profiles
      WHERE created_at >= ${thirtyDaysAgo}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
      LIMIT 7
    ` as Promise<{ date: Date; count: number }[]>,
  ]);

  // Process streak distribution into buckets
  const streakBuckets = {
    "1-3": 0,
    "4-7": 0,
    "8-14": 0,
    "15-30": 0,
    "30+": 0,
  };

  for (const s of streakDistribution) {
    const streak = s.current_streak;
    if (streak <= 3) streakBuckets["1-3"] += s._count;
    else if (streak <= 7) streakBuckets["4-7"] += s._count;
    else if (streak <= 14) streakBuckets["8-14"] += s._count;
    else if (streak <= 30) streakBuckets["15-30"] += s._count;
    else streakBuckets["30+"] += s._count;
  }

  const totalWithStreaks = Object.values(streakBuckets).reduce((a, b) => a + b, 0);

  return {
    dau,
    mau,
    dauMauRatio: mau > 0 ? ((dau / mau) * 100).toFixed(1) : "0",
    totalUsers,
    streakBuckets,
    totalWithStreaks,
    totalAchievements,
    completedAchievements,
    achievementRate:
      totalAchievements > 0
        ? ((completedAchievements / (totalAchievements * totalUsers)) * 100).toFixed(2)
        : "0",
    totalXP: xpStats._sum.total_xp || 0,
    avgXP: Math.round(xpStats._avg.total_xp || 0),
    maxXP: xpStats._max.total_xp || 0,
    dailyClaimsToday,
    dailyClaimsWeek,
    claimRate: dau > 0 ? ((dailyClaimsToday / dau) * 100).toFixed(1) : "0",
    recentSignups,
  };
}

export default async function MetricsPage() {
  const metrics = await getMetrics();

  return (
    <div>
      <h1
        className="text-xl mb-6"
        style={{
          fontFamily: "var(--font-pixel)",
          color: "var(--rpg-teal)",
          fontSize: "14px",
        }}
      >
        Platform Metrics
      </h1>

      {/* Stickiness */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Engagement Health
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                DAU/MAU Ratio
              </span>
              <TrendingUp size={16} style={{ color: "var(--rpg-teal)" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color:
                  parseFloat(metrics.dauMauRatio) >= 20
                    ? "var(--rpg-teal)"
                    : "#f59e0b",
              }}
            >
              {metrics.dauMauRatio}%
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              {parseFloat(metrics.dauMauRatio) >= 20
                ? "Healthy engagement"
                : "Below 20% target"}
            </p>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                Daily Login Claim Rate
              </span>
              <Clock size={16} style={{ color: "#a855f7" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "#a855f7" }}>
              {metrics.claimRate}%
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              {metrics.dailyClaimsToday} claims today
            </p>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                Users with Streaks
              </span>
              <Flame size={16} style={{ color: "#f97316" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "#f97316" }}>
              {metrics.totalWithStreaks}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              {((metrics.totalWithStreaks / metrics.totalUsers) * 100).toFixed(1)}%
              of users
            </p>
          </div>

          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                Achievement Rate
              </span>
              <Trophy size={16} style={{ color: "var(--rpg-gold)" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--rpg-gold)" }}>
              {metrics.achievementRate}%
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              {metrics.completedAchievements.toLocaleString()} unlocked
            </p>
          </div>
        </div>
      </section>

      {/* Streak Distribution */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Streak Distribution
        </h2>
        <div
          className="p-4 rounded-lg"
          style={{
            background: "var(--rpg-card)",
            border: "1px solid var(--rpg-border)",
          }}
        >
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(metrics.streakBuckets).map(([range, count]) => (
              <div key={range} className="text-center">
                <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
                  {range} days
                </p>
                <p
                  className="text-2xl font-bold"
                  style={{ color: "var(--rpg-text)" }}
                >
                  {count}
                </p>
                <div
                  className="h-2 rounded-full mt-2"
                  style={{ background: "var(--rpg-border)" }}
                >
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${
                        metrics.totalWithStreaks > 0
                          ? (count / metrics.totalWithStreaks) * 100
                          : 0
                      }%`,
                      background: "#f97316",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* XP Stats */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          XP Statistics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
              Total XP Earned
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--rpg-gold)" }}>
              {metrics.totalXP.toLocaleString()}
            </p>
          </div>
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
              Average XP per User
            </p>
            <p className="text-2xl font-bold" style={{ color: "var(--rpg-teal)" }}>
              {metrics.avgXP.toLocaleString()}
            </p>
          </div>
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
              Highest XP
            </p>
            <p className="text-2xl font-bold" style={{ color: "#a855f7" }}>
              {metrics.maxXP.toLocaleString()}
            </p>
          </div>
        </div>
      </section>

      {/* Recent Signups */}
      <section>
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Recent Signups (Last 7 Days)
        </h2>
        <div
          className="p-4 rounded-lg"
          style={{
            background: "var(--rpg-card)",
            border: "1px solid var(--rpg-border)",
          }}
        >
          <div className="grid grid-cols-7 gap-2">
            {metrics.recentSignups.map((day) => (
              <div key={day.date.toString()} className="text-center">
                <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
                  {new Date(day.date).toLocaleDateString("en-US", {
                    weekday: "short",
                  })}
                </p>
                <p
                  className="text-xl font-bold"
                  style={{ color: "var(--rpg-teal)" }}
                >
                  {day.count}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
