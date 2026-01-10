import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuth, Errors } from "@/lib/api";

type LeaderboardMetric = "compliance" | "xp" | "streak" | "volume" | "workouts";

interface LeaderboardEntry {
  rank: number;
  athleteId: string;
  displayName: string | null;
  avatarUrl: string | null;
  value: number;
  unit: string;
  change?: number; // Change from previous period
}

// GET /api/fitness/coach/leaderboards - Get leaderboard data
export const GET = withCoachAuth(async (request, user) => {
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return Errors.forbidden("Not registered as a coach");
  }

  const { searchParams } = new URL(request.url);
  const metric = (searchParams.get("metric") || "compliance") as LeaderboardMetric;
  const period = searchParams.get("period") || "week"; // week, month, all
  const groupId = searchParams.get("groupId"); // Optional filter by group

  // Get all active athletes for this coach
  let athleteFilter: { athlete_id?: { in: string[] } } = {};

  if (groupId) {
    const groupMembers = await prisma.coaching_group_members.findMany({
      where: { group_id: groupId },
      select: { athlete_id: true },
    });
    athleteFilter = { athlete_id: { in: groupMembers.map((m) => m.athlete_id) } };
  }

  const relationships = await prisma.coaching_relationships.findMany({
    where: {
      coach_id: coach.id,
      status: "ACTIVE",
      ...athleteFilter,
    },
    include: {
      athlete: {
        select: {
          id: true,
          display_name: true,
          avatar_url: true,
          current_streak: true,
          total_xp: true,
        },
      },
    },
  });

  if (relationships.length === 0) {
    return NextResponse.json({ leaderboard: [], metric, period });
  }

  const athleteIds = relationships.map((r) => r.athlete_id);
  const now = new Date();
  const periodStart = getPeriodStart(period, now);

  let entries: LeaderboardEntry[] = [];

  switch (metric) {
    case "compliance":
      entries = await getComplianceLeaderboard(coach.id, athleteIds, relationships, periodStart);
      break;
    case "xp":
      entries = await getXPLeaderboard(athleteIds, relationships);
      break;
    case "streak":
      entries = getStreakLeaderboard(relationships);
      break;
    case "workouts":
      entries = await getWorkoutCountLeaderboard(coach.id, athleteIds, relationships, periodStart);
      break;
    case "volume":
      entries = await getVolumeLeaderboard(athleteIds, relationships, periodStart);
      break;
    default:
      entries = await getComplianceLeaderboard(coach.id, athleteIds, relationships, periodStart);
  }

  // Sort by value descending and assign ranks
  entries.sort((a, b) => b.value - a.value);
  entries.forEach((entry, idx) => {
    entry.rank = idx + 1;
  });

  return NextResponse.json({ leaderboard: entries, metric, period });
});

function getPeriodStart(period: string, now: Date): Date {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  switch (period) {
    case "week":
      const day = start.getDay();
      start.setDate(start.getDate() - day + (day === 0 ? -6 : 1)); // Monday
      break;
    case "month":
      start.setDate(1);
      break;
    case "all":
      start.setFullYear(2020); // Arbitrary old date
      break;
  }

  return start;
}

async function getComplianceLeaderboard(
  coachId: string,
  athleteIds: string[],
  relationships: any[],
  periodStart: Date
): Promise<LeaderboardEntry[]> {
  // Get all assignments for these athletes
  const assignments = await prisma.coaching_program_assignments.findMany({
    where: {
      relationship: {
        coach_id: coachId,
        athlete_id: { in: athleteIds },
      },
      status: "active",
    },
    include: {
      relationship: { select: { athlete_id: true } },
      completions: {
        where: {
          scheduled_date: { gte: periodStart },
        },
      },
    },
  });

  // Calculate compliance per athlete
  const athleteCompliance = new Map<string, { completed: number; total: number }>();

  for (const assignment of assignments) {
    const athleteId = assignment.relationship.athlete_id;
    if (!athleteCompliance.has(athleteId)) {
      athleteCompliance.set(athleteId, { completed: 0, total: 0 });
    }
    const data = athleteCompliance.get(athleteId)!;

    for (const completion of assignment.completions) {
      data.total++;
      if (completion.completed_at) {
        data.completed++;
      }
    }
  }

  return relationships.map((rel) => {
    const data = athleteCompliance.get(rel.athlete_id);
    const compliance = data && data.total > 0 ? Math.round((data.completed / data.total) * 100) : 0;

    return {
      rank: 0,
      athleteId: rel.athlete_id,
      displayName: rel.athlete.display_name,
      avatarUrl: rel.athlete.avatar_url,
      value: compliance,
      unit: "%",
    };
  });
}

async function getXPLeaderboard(
  athleteIds: string[],
  relationships: any[]
): Promise<LeaderboardEntry[]> {
  const appProfiles = await prisma.app_profiles.findMany({
    where: {
      user_id: { in: athleteIds },
      app_id: "fitness",
    },
  });

  const xpMap = new Map(appProfiles.map((p) => [p.user_id, p.xp || 0]));

  return relationships.map((rel) => ({
    rank: 0,
    athleteId: rel.athlete_id,
    displayName: rel.athlete.display_name,
    avatarUrl: rel.athlete.avatar_url,
    value: xpMap.get(rel.athlete_id) || 0,
    unit: "XP",
  }));
}

function getStreakLeaderboard(relationships: any[]): LeaderboardEntry[] {
  return relationships.map((rel) => ({
    rank: 0,
    athleteId: rel.athlete_id,
    displayName: rel.athlete.display_name,
    avatarUrl: rel.athlete.avatar_url,
    value: rel.athlete.current_streak || 0,
    unit: "days",
  }));
}

async function getWorkoutCountLeaderboard(
  coachId: string,
  athleteIds: string[],
  relationships: any[],
  periodStart: Date
): Promise<LeaderboardEntry[]> {
  const completions = await prisma.coaching_workout_completions.groupBy({
    by: ["assignment_id"],
    where: {
      assignment: {
        relationship: {
          coach_id: coachId,
          athlete_id: { in: athleteIds },
        },
      },
      completed_at: { gte: periodStart },
    },
    _count: { id: true },
  });

  // Get assignment -> athlete mapping
  const assignmentIds = completions.map((c) => c.assignment_id);
  const assignments = await prisma.coaching_program_assignments.findMany({
    where: { id: { in: assignmentIds } },
    include: { relationship: { select: { athlete_id: true } } },
  });

  const athleteWorkouts = new Map<string, number>();
  for (const completion of completions) {
    const assignment = assignments.find((a) => a.id === completion.assignment_id);
    if (assignment) {
      const athleteId = assignment.relationship.athlete_id;
      athleteWorkouts.set(athleteId, (athleteWorkouts.get(athleteId) || 0) + completion._count.id);
    }
  }

  return relationships.map((rel) => ({
    rank: 0,
    athleteId: rel.athlete_id,
    displayName: rel.athlete.display_name,
    avatarUrl: rel.athlete.avatar_url,
    value: athleteWorkouts.get(rel.athlete_id) || 0,
    unit: "workouts",
  }));
}

async function getVolumeLeaderboard(
  athleteIds: string[],
  relationships: any[],
  periodStart: Date
): Promise<LeaderboardEntry[]> {
  // Get fitness data for all athletes
  const fitnessData = await prisma.gamify_fitness_data.findMany({
    where: { user_id: { in: athleteIds } },
  });

  const athleteVolume = new Map<string, number>();
  const periodStartMs = periodStart.getTime();

  for (const fd of fitnessData) {
    const data = fd.data as any;
    if (!data?.workouts) continue;

    let volume = 0;
    for (const workout of data.workouts) {
      const workoutDate = new Date(workout.date || workout.startedAt);
      if (workoutDate.getTime() < periodStartMs) continue;

      for (const ex of workout.exercises || []) {
        for (const set of ex.sets || []) {
          if (set.weight && set.reps) {
            volume += set.weight * set.reps;
          }
        }
      }
    }

    athleteVolume.set(fd.user_id, volume);
  }

  return relationships.map((rel) => ({
    rank: 0,
    athleteId: rel.athlete_id,
    displayName: rel.athlete.display_name,
    avatarUrl: rel.athlete.avatar_url,
    value: athleteVolume.get(rel.athlete_id) || 0,
    unit: "lbs",
  }));
}
