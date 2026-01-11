import prisma from "@/lib/db";
import {
  Dumbbell,
  TrendingUp,
  Users,
  Flame,
  Target,
  Clock,
  Activity,
  Award,
  BarChart3,
  Zap,
} from "lucide-react";

export const dynamic = "force-dynamic";

interface FitnessData {
  workouts?: Array<{
    id: string;
    date: string;
    exercises: Array<{
      sets: Array<{ reps: number; weight: number }>;
    }>;
  }>;
  records?: Record<string, number>;
}

async function getFitnessMetrics() {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
  const oneDayAgo = new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000);

  // Get all fitness data
  const allFitnessData = await prisma.gamify_fitness_data.findMany({
    select: {
      user_id: true,
      data: true,
      updated_at: true,
    },
  });

  // Get total users
  const totalUsers = await prisma.profiles.count();

  // Process fitness data
  let totalWorkouts = 0;
  let totalSets = 0;
  let totalVolume = 0;
  let usersWithWorkouts = 0;
  let usersActiveThisWeek = 0;
  let workoutsThisWeek = 0;
  let workoutDurations: number[] = [];
  let setsPerWorkout: number[] = [];

  // Retention tracking
  let usersActiveDay1 = 0;
  let usersActiveDay7 = 0;
  let usersActiveDay30 = 0;

  // Feature discovery
  let usersWithTemplates = 0;
  let usersWithPrograms = 0;
  let usersWithPRs = 0;

  for (const record of allFitnessData) {
    const data = record.data as FitnessData | null;
    if (!data?.workouts || data.workouts.length === 0) continue;

    usersWithWorkouts++;
    const workouts = data.workouts;
    totalWorkouts += workouts.length;

    // Check weekly activity
    const recentWorkouts = workouts.filter((w) => {
      const workoutDate = new Date(w.date);
      if (isNaN(workoutDate.getTime())) return false;
      return workoutDate >= sevenDaysAgo;
    });

    if (recentWorkouts.length > 0) {
      usersActiveThisWeek++;
      workoutsThisWeek += recentWorkouts.length;
    }

    // Calculate per-workout stats
    for (const workout of workouts) {
      let workoutSets = 0;
      let workoutVolume = 0;

      for (const exercise of workout.exercises || []) {
        for (const set of exercise.sets || []) {
          workoutSets++;
          totalSets++;
          workoutVolume += (set.weight || 0) * (set.reps || 0);
        }
      }

      setsPerWorkout.push(workoutSets);
      totalVolume += workoutVolume;
    }

    // PR tracking
    if (data.records && Object.keys(data.records).length > 0) {
      usersWithPRs++;
    }

    // Check retention based on update patterns
    if (record.updated_at) {
      const updateDate = new Date(record.updated_at);
      if (updateDate >= oneDayAgo) usersActiveDay1++;
      if (updateDate >= sevenDaysAgo) usersActiveDay7++;
      if (updateDate >= thirtyDaysAgo) usersActiveDay30++;
    }
  }

  // Calculate averages
  const avgWorkoutsPerUser = usersWithWorkouts > 0 ? totalWorkouts / usersWithWorkouts : 0;
  const avgWorkoutsPerWeek =
    usersActiveThisWeek > 0 ? workoutsThisWeek / usersActiveThisWeek : 0;
  const avgSetsPerWorkout =
    setsPerWorkout.length > 0
      ? setsPerWorkout.reduce((a, b) => a + b, 0) / setsPerWorkout.length
      : 0;
  const avgVolumePerWorkout = totalWorkouts > 0 ? totalVolume / totalWorkouts : 0;

  // Activation rate: users who logged at least one workout
  const activationRate = totalUsers > 0 ? (usersWithWorkouts / totalUsers) * 100 : 0;

  // Retention rates
  const d1Retention = usersWithWorkouts > 0 ? (usersActiveDay1 / usersWithWorkouts) * 100 : 0;
  const d7Retention = usersWithWorkouts > 0 ? (usersActiveDay7 / usersWithWorkouts) * 100 : 0;
  const d30Retention = usersWithWorkouts > 0 ? (usersActiveDay30 / usersWithWorkouts) * 100 : 0;

  // Get rivals data
  const rivalStats = await prisma.fitness_rivals.aggregate({
    _count: true,
  });

  const encounterStats = await prisma.fitness_encounters.aggregate({
    _count: true,
  });

  // Get workout trends by week
  const workoutsByWeek: { week: string; count: number }[] = [];
  const weekMap = new Map<string, number>();

  for (const record of allFitnessData) {
    const data = record.data as FitnessData | null;
    if (!data?.workouts) continue;

    for (const workout of data.workouts) {
      const date = new Date(workout.date);
      // Skip invalid dates
      if (isNaN(date.getTime())) continue;

      // Get week start (Monday)
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay() + 1);
      const weekKey = weekStart.toISOString().split("T")[0];

      weekMap.set(weekKey, (weekMap.get(weekKey) || 0) + 1);
    }
  }

  // Sort and get last 8 weeks
  const sortedWeeks = Array.from(weekMap.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8);

  for (const [week, count] of sortedWeeks) {
    workoutsByWeek.push({ week, count });
  }

  // Calculate workout frequency distribution
  const frequencyBuckets = {
    "0": 0,
    "1-2": 0,
    "3-4": 0,
    "5-6": 0,
    "7+": 0,
  };

  for (const record of allFitnessData) {
    const data = record.data as FitnessData | null;
    if (!data?.workouts) {
      frequencyBuckets["0"]++;
      continue;
    }

    // Count workouts in last 7 days
    const recentCount = data.workouts.filter((w) => {
      const workoutDate = new Date(w.date);
      if (isNaN(workoutDate.getTime())) return false;
      return workoutDate >= sevenDaysAgo;
    }).length;

    if (recentCount === 0) frequencyBuckets["0"]++;
    else if (recentCount <= 2) frequencyBuckets["1-2"]++;
    else if (recentCount <= 4) frequencyBuckets["3-4"]++;
    else if (recentCount <= 6) frequencyBuckets["5-6"]++;
    else frequencyBuckets["7+"]++;
  }

  return {
    // Core stats
    totalUsers,
    usersWithWorkouts,
    activationRate: activationRate.toFixed(1),
    totalWorkouts,
    totalSets,
    totalVolume: Math.round(totalVolume),

    // Weekly activity
    usersActiveThisWeek,
    workoutsThisWeek,
    avgWorkoutsPerWeek: avgWorkoutsPerWeek.toFixed(1),
    avgSetsPerWorkout: avgSetsPerWorkout.toFixed(1),
    avgVolumePerWorkout: Math.round(avgVolumePerWorkout),

    // Retention
    d1Retention: d1Retention.toFixed(1),
    d7Retention: d7Retention.toFixed(1),
    d30Retention: d30Retention.toFixed(1),

    // Feature usage
    usersWithPRs,
    prRate: usersWithWorkouts > 0 ? ((usersWithPRs / usersWithWorkouts) * 100).toFixed(1) : "0",

    // Narrative system
    totalRivals: rivalStats._count,
    totalEncounters: encounterStats._count,

    // Trends
    workoutsByWeek,
    frequencyBuckets,
  };
}

export default async function FitnessMetricsPage() {
  const metrics = await getFitnessMetrics();

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
        Fitness Metrics
      </h1>

      {/* Acquisition & Activation */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Acquisition & Activation
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
                Total Fitness Users
              </span>
              <Users size={16} style={{ color: "var(--rpg-teal)" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--rpg-teal)" }}>
              {metrics.usersWithWorkouts}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              of {metrics.totalUsers} total users
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
                First Workout Rate
              </span>
              <Target size={16} style={{ color: "#22c55e" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color: parseFloat(metrics.activationRate) >= 60 ? "#22c55e" : "#f59e0b",
              }}
            >
              {metrics.activationRate}%
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              Target: 60%
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
                Total Workouts
              </span>
              <Dumbbell size={16} style={{ color: "#a855f7" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "#a855f7" }}>
              {metrics.totalWorkouts.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              {metrics.totalSets.toLocaleString()} sets logged
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
                Total Volume
              </span>
              <Zap size={16} style={{ color: "var(--rpg-gold)" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--rpg-gold)" }}>
              {(metrics.totalVolume / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              lbs lifted total
            </p>
          </div>
        </div>
      </section>

      {/* Engagement Metrics */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Engagement
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
                Weekly Active Users
              </span>
              <Activity size={16} style={{ color: "var(--rpg-teal)" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--rpg-teal)" }}>
              {metrics.usersActiveThisWeek}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              {metrics.workoutsThisWeek} workouts this week
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
                Workouts per Week
              </span>
              <TrendingUp size={16} style={{ color: "#22c55e" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color: parseFloat(metrics.avgWorkoutsPerWeek) >= 2.5 ? "#22c55e" : "#f59e0b",
              }}
            >
              {metrics.avgWorkoutsPerWeek}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              Target: 2.5+
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
                Sets per Workout
              </span>
              <BarChart3 size={16} style={{ color: "#a855f7" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color: parseFloat(metrics.avgSetsPerWorkout) >= 15 ? "#22c55e" : "#f59e0b",
              }}
            >
              {metrics.avgSetsPerWorkout}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              Target: 15+
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
                Avg Volume / Workout
              </span>
              <Dumbbell size={16} style={{ color: "var(--rpg-gold)" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--rpg-gold)" }}>
              {metrics.avgVolumePerWorkout.toLocaleString()}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              lbs per workout
            </p>
          </div>
        </div>
      </section>

      {/* Retention */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Retention
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                D1 Retention
              </span>
              <Flame size={16} style={{ color: "#f97316" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color: parseFloat(metrics.d1Retention) >= 40 ? "#22c55e" : "#f59e0b",
              }}
            >
              {metrics.d1Retention}%
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              Target: 40%+
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
                D7 Retention
              </span>
              <Flame size={16} style={{ color: "#f97316" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color: parseFloat(metrics.d7Retention) >= 25 ? "#22c55e" : "#f59e0b",
              }}
            >
              {metrics.d7Retention}%
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              Target: 25%+
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
                D30 Retention
              </span>
              <Flame size={16} style={{ color: "#f97316" }} />
            </div>
            <p
              className="text-3xl font-bold"
              style={{
                color: parseFloat(metrics.d30Retention) >= 15 ? "#22c55e" : "#f59e0b",
              }}
            >
              {metrics.d30Retention}%
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              Target: 15%+
            </p>
          </div>
        </div>
      </section>

      {/* Workout Frequency Distribution */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Workout Frequency (Last 7 Days)
        </h2>
        <div
          className="p-4 rounded-lg"
          style={{
            background: "var(--rpg-card)",
            border: "1px solid var(--rpg-border)",
          }}
        >
          <div className="grid grid-cols-5 gap-4">
            {Object.entries(metrics.frequencyBuckets).map(([range, count]) => {
              const total = Object.values(metrics.frequencyBuckets).reduce(
                (a, b) => a + b,
                0
              );
              const percentage = total > 0 ? (count / total) * 100 : 0;
              return (
                <div key={range} className="text-center">
                  <p className="text-xs mb-2" style={{ color: "var(--rpg-muted)" }}>
                    {range === "0" ? "No workouts" : `${range} workouts`}
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
                        width: `${percentage}%`,
                        background:
                          range === "0"
                            ? "#ef4444"
                            : range === "7+"
                              ? "#22c55e"
                              : "var(--rpg-teal)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Workout Trends */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Weekly Workout Trend
        </h2>
        <div
          className="p-4 rounded-lg"
          style={{
            background: "var(--rpg-card)",
            border: "1px solid var(--rpg-border)",
          }}
        >
          <div className="flex items-end justify-between h-32 gap-2">
            {metrics.workoutsByWeek.map((week) => {
              const maxCount = Math.max(
                ...metrics.workoutsByWeek.map((w) => w.count),
                1
              );
              const height = (week.count / maxCount) * 100;
              return (
                <div key={week.week} className="flex-1 flex flex-col items-center">
                  <div
                    className="w-full rounded-t"
                    style={{
                      height: `${height}%`,
                      minHeight: "4px",
                      background: "var(--rpg-teal)",
                    }}
                  />
                  <p
                    className="text-xs mt-2"
                    style={{ color: "var(--rpg-muted)", fontSize: "10px" }}
                  >
                    {new Date(week.week).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                  <p
                    className="text-xs font-bold"
                    style={{ color: "var(--rpg-text)" }}
                  >
                    {week.count}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Feature Usage & Narrative System */}
      <section className="mb-8">
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          Feature Usage
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div
            className="p-4 rounded-lg"
            style={{
              background: "var(--rpg-card)",
              border: "1px solid var(--rpg-border)",
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                Users with PRs
              </span>
              <Award size={16} style={{ color: "var(--rpg-gold)" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "var(--rpg-gold)" }}>
              {metrics.usersWithPRs}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              {metrics.prRate}% of active users
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
                Active Rivalries
              </span>
              <Users size={16} style={{ color: "#ef4444" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "#ef4444" }}>
              {metrics.totalRivals}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              phantom + friend rivals
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
                Total Encounters
              </span>
              <Dumbbell size={16} style={{ color: "#a855f7" }} />
            </div>
            <p className="text-3xl font-bold" style={{ color: "#a855f7" }}>
              {metrics.totalEncounters}
            </p>
            <p className="text-xs mt-1" style={{ color: "var(--rpg-muted)" }}>
              weekly showdowns completed
            </p>
          </div>
        </div>
      </section>

      {/* UX Health Targets */}
      <section>
        <h2
          className="text-sm font-medium mb-4"
          style={{ color: "var(--rpg-muted)" }}
        >
          UX Health Targets
        </h2>
        <div
          className="p-4 rounded-lg"
          style={{
            background: "var(--rpg-card)",
            border: "1px solid var(--rpg-border)",
          }}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Set Logging Speed
              </p>
              <p className="text-lg font-bold" style={{ color: "var(--rpg-teal)" }}>
                &lt;3 sec
              </p>
              <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                target
              </p>
            </div>
            <div className="text-center p-3 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Error Rate
              </p>
              <p className="text-lg font-bold" style={{ color: "var(--rpg-teal)" }}>
                &lt;1%
              </p>
              <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                target
              </p>
            </div>
            <div className="text-center p-3 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Task Completion
              </p>
              <p className="text-lg font-bold" style={{ color: "var(--rpg-teal)" }}>
                &gt;95%
              </p>
              <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                target
              </p>
            </div>
            <div className="text-center p-3 rounded" style={{ background: "rgba(0,0,0,0.2)" }}>
              <p className="text-xs mb-1" style={{ color: "var(--rpg-muted)" }}>
                Feature Discovery
              </p>
              <p className="text-lg font-bold" style={{ color: "var(--rpg-teal)" }}>
                Track
              </p>
              <p className="text-xs" style={{ color: "var(--rpg-muted)" }}>
                % using each feature
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
