import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

// Daily challenges - rotate each day, non-exercise-specific
const DAILY_CHALLENGES = [
  {
    id: "daily_workout",
    name: "Daily Grind",
    description: "Complete at least 1 workout today",
    icon: "💪",
    type: "workouts",
    target: 1,
    xp_reward: 50,
  },
  {
    id: "daily_volume",
    name: "Heavy Lifter",
    description: "Lift 5,000 lbs total today",
    icon: "🏋️",
    type: "volume",
    target: 5000,
    xp_reward: 75,
  },
  {
    id: "daily_sets",
    name: "Set Stacker",
    description: "Complete 15 sets today",
    icon: "📊",
    type: "sets",
    target: 15,
    xp_reward: 60,
  },
  {
    id: "daily_pr_attempt",
    name: "Push Your Limits",
    description: "Log at least 3 working sets today",
    icon: "🔥",
    type: "working_sets",
    target: 3,
    xp_reward: 40,
  },
  {
    id: "daily_variety",
    name: "Mix It Up",
    description: "Train 3 different exercises today",
    icon: "🎯",
    type: "exercises",
    target: 3,
    xp_reward: 50,
  },
  {
    id: "daily_endurance",
    name: "Endurance Test",
    description: "Complete 20 total reps across all exercises",
    icon: "⏱️",
    type: "reps",
    target: 20,
    xp_reward: 45,
  },
  {
    id: "daily_dedication",
    name: "Dedicated Lifter",
    description: "Log 10 sets with proper weight tracking",
    icon: "📝",
    type: "tracked_sets",
    target: 10,
    xp_reward: 55,
  },
];

// Weekly challenges - rotate each week
const WEEKLY_CHALLENGES = [
  {
    id: "workout_warrior",
    name: "Workout Warrior",
    description: "Complete 5 workouts this week",
    icon: "🏆",
    type: "workouts",
    target: 5,
    xp_reward: 500,
  },
  {
    id: "volume_master",
    name: "Volume Master",
    description: "Lift 50,000 lbs total this week",
    icon: "💪",
    type: "volume",
    target: 50000,
    xp_reward: 750,
  },
  {
    id: "set_crusher",
    name: "Set Crusher",
    description: "Complete 100 sets this week",
    icon: "🔥",
    type: "sets",
    target: 100,
    xp_reward: 600,
  },
  {
    id: "consistency_king",
    name: "Consistency King",
    description: "Work out 4 different days this week",
    icon: "👑",
    type: "days",
    target: 4,
    xp_reward: 400,
  },
];

// Get the start of the current week (Monday) in user's timezone
function getWeekStart(timezoneOffset?: number): Date {
  const now = new Date();
  // Apply timezone offset if provided (offset is in minutes, negative for ahead of UTC)
  if (timezoneOffset !== undefined) {
    now.setMinutes(now.getMinutes() + now.getTimezoneOffset() - timezoneOffset);
  }
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// Get the start of current day in user's timezone
function getDayStart(timezoneOffset?: number): Date {
  const now = new Date();
  // Apply timezone offset if provided (offset is in minutes, negative for ahead of UTC)
  if (timezoneOffset !== undefined) {
    now.setMinutes(now.getMinutes() + now.getTimezoneOffset() - timezoneOffset);
  }
  now.setHours(0, 0, 0, 0);
  return now;
}

// Get day key for a date (YYYY-MM-DD format in user's local time)
function getDayKey(date: Date, timezoneOffset?: number): string {
  const d = new Date(date);
  if (timezoneOffset !== undefined) {
    d.setMinutes(d.getMinutes() + d.getTimezoneOffset() - timezoneOffset);
  }
  return d.toISOString().split("T")[0];
}

// GET /api/fitness/challenges - Get active challenges and progress
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get timezone offset from query params (in minutes, e.g., -300 for EST)
  const url = new URL(request.url);
  const tzOffset = url.searchParams.get("tz");
  const timezoneOffset = tzOffset ? parseInt(tzOffset, 10) : undefined;

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  const data = (fitnessData?.data as any) || {};
  const workouts = data.workouts || [];

  // Calculate time boundaries
  const weekStart = getWeekStart(timezoneOffset);
  const dayStart = getDayStart(timezoneOffset);
  const todayKey = getDayKey(new Date(), timezoneOffset);

  // Filter workouts for this week
  const weeklyWorkouts = workouts.filter((w: any) => {
    const date = new Date(w.endTime || w.startTime);
    return date >= weekStart;
  });

  // Filter workouts for today
  const dailyWorkouts = workouts.filter((w: any) => {
    const workoutDate = new Date(w.endTime || w.startTime);
    return getDayKey(workoutDate, timezoneOffset) === todayKey;
  });

  // Calculate weekly stats
  let weeklyVolume = 0;
  let weeklySets = 0;
  const workoutDays = new Set<string>();

  for (const workout of weeklyWorkouts) {
    const date = getDayKey(new Date(workout.endTime || workout.startTime), timezoneOffset);
    workoutDays.add(date);

    for (const exercise of workout.exercises || []) {
      for (const set of exercise.sets || []) {
        weeklySets++;
        weeklyVolume += (set.weight || 0) * (set.reps || 0);
      }
    }
  }

  // Calculate daily stats
  let dailyVolume = 0;
  let dailySets = 0;
  let dailyWorkingSets = 0;
  let dailyReps = 0;
  let dailyTrackedSets = 0;
  const dailyExercises = new Set<string>();

  for (const workout of dailyWorkouts) {
    for (const exercise of workout.exercises || []) {
      dailyExercises.add(exercise.id);
      for (const set of exercise.sets || []) {
        dailySets++;
        dailyReps += set.reps || 0;
        if (set.weight && set.weight > 0) {
          dailyTrackedSets++;
          dailyVolume += (set.weight || 0) * (set.reps || 0);
        }
        if (!set.isWarmup) {
          dailyWorkingSets++;
        }
      }
    }
  }

  // ===== DAILY CHALLENGE =====
  // Get daily challenge rotation based on day number since epoch
  const daysSinceEpoch = Math.floor(dayStart.getTime() / (24 * 60 * 60 * 1000));
  const dailyChallengeIndex = daysSinceEpoch % DAILY_CHALLENGES.length;
  const activeDailyChallenge = DAILY_CHALLENGES[dailyChallengeIndex];

  // Calculate progress for daily challenge
  let dailyProgress = 0;
  switch (activeDailyChallenge.type) {
    case "workouts":
      dailyProgress = dailyWorkouts.length;
      break;
    case "volume":
      dailyProgress = dailyVolume;
      break;
    case "sets":
      dailyProgress = dailySets;
      break;
    case "working_sets":
      dailyProgress = dailyWorkingSets;
      break;
    case "exercises":
      dailyProgress = dailyExercises.size;
      break;
    case "reps":
      dailyProgress = dailyReps;
      break;
    case "tracked_sets":
      dailyProgress = dailyTrackedSets;
      break;
  }

  const dailyCompleted = dailyProgress >= activeDailyChallenge.target;
  const dailyProgressPercent = Math.min(
    100,
    Math.round((dailyProgress / activeDailyChallenge.target) * 100)
  );

  // Check if user has claimed today's reward
  const claimedDailyChallenges = data.claimedDailyChallenges || {};
  const dailyClaimed = claimedDailyChallenges[todayKey] === activeDailyChallenge.id;

  // Calculate hours until midnight reset
  const now = new Date();
  const tomorrow = new Date(dayStart);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const hoursUntilReset = Math.ceil(
    (tomorrow.getTime() - now.getTime()) / (60 * 60 * 1000)
  );

  // ===== WEEKLY CHALLENGE =====
  // Get weekly challenge rotation based on week number
  const weekNumber = Math.floor(
    (new Date().getTime() - new Date("2024-01-01").getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  const weeklyChallengeIndex = weekNumber % WEEKLY_CHALLENGES.length;
  const activeWeeklyChallenge = WEEKLY_CHALLENGES[weeklyChallengeIndex];

  // Calculate progress for weekly challenge
  let weeklyProgress = 0;
  switch (activeWeeklyChallenge.type) {
    case "workouts":
      weeklyProgress = weeklyWorkouts.length;
      break;
    case "volume":
      weeklyProgress = weeklyVolume;
      break;
    case "sets":
      weeklyProgress = weeklySets;
      break;
    case "days":
      weeklyProgress = workoutDays.size;
      break;
  }

  const weeklyCompleted = weeklyProgress >= activeWeeklyChallenge.target;
  const weeklyProgressPercent = Math.min(
    100,
    Math.round((weeklyProgress / activeWeeklyChallenge.target) * 100)
  );

  // Check if user has claimed this week's reward
  const claimedChallenges = data.claimedChallenges || {};
  const weekKey = weekStart.toISOString().split("T")[0];
  const weeklyClaimed = claimedChallenges[weekKey] === activeWeeklyChallenge.id;

  // Days until weekly reset
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const daysUntilReset = Math.ceil(
    (nextMonday.getTime() - now.getTime()) / (24 * 60 * 60 * 1000)
  );

  return NextResponse.json({
    // Keep backward compatibility with "challenge" field for weekly
    challenge: {
      ...activeWeeklyChallenge,
      progress: weeklyProgress,
      progressPercent: weeklyProgressPercent,
      completed: weeklyCompleted,
      claimed: weeklyClaimed,
      daysUntilReset,
    },
    // New daily challenge field
    dailyChallenge: {
      ...activeDailyChallenge,
      progress: dailyProgress,
      progressPercent: dailyProgressPercent,
      completed: dailyCompleted,
      claimed: dailyClaimed,
      hoursUntilReset,
    },
    weeklyStats: {
      workouts: weeklyWorkouts.length,
      volume: weeklyVolume,
      sets: weeklySets,
      days: workoutDays.size,
    },
    dailyStats: {
      workouts: dailyWorkouts.length,
      volume: dailyVolume,
      sets: dailySets,
      workingSets: dailyWorkingSets,
      reps: dailyReps,
      exercises: dailyExercises.size,
      trackedSets: dailyTrackedSets,
    },
  });
}

// POST /api/fitness/challenges - Claim challenge reward
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { challenge_id, type, tz } = body;

  if (!challenge_id) {
    return NextResponse.json(
      { error: "challenge_id is required" },
      { status: 400 }
    );
  }

  const timezoneOffset = tz !== undefined ? parseInt(tz, 10) : undefined;
  const isDaily = type === "daily";

  // Verify challenge is completed and not claimed
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  const data = (fitnessData?.data as any) || {};
  const workouts = data.workouts || [];

  // Calculate time boundaries
  const weekStart = getWeekStart(timezoneOffset);
  const dayStart = getDayStart(timezoneOffset);
  const todayKey = getDayKey(new Date(), timezoneOffset);

  // Find the challenge
  const challenge = isDaily
    ? DAILY_CHALLENGES.find((c) => c.id === challenge_id)
    : WEEKLY_CHALLENGES.find((c) => c.id === challenge_id);

  if (!challenge) {
    return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
  }

  // Calculate progress based on challenge type
  let progress = 0;

  if (isDaily) {
    // Filter workouts for today
    const dailyWorkouts = workouts.filter((w: any) => {
      const workoutDate = new Date(w.endTime || w.startTime);
      return getDayKey(workoutDate, timezoneOffset) === todayKey;
    });

    let dailyVolume = 0;
    let dailySets = 0;
    let dailyWorkingSets = 0;
    let dailyReps = 0;
    let dailyTrackedSets = 0;
    const dailyExercises = new Set<string>();

    for (const workout of dailyWorkouts) {
      for (const exercise of workout.exercises || []) {
        dailyExercises.add(exercise.id);
        for (const set of exercise.sets || []) {
          dailySets++;
          dailyReps += set.reps || 0;
          if (set.weight && set.weight > 0) {
            dailyTrackedSets++;
            dailyVolume += (set.weight || 0) * (set.reps || 0);
          }
          if (!set.isWarmup) {
            dailyWorkingSets++;
          }
        }
      }
    }

    switch (challenge.type) {
      case "workouts":
        progress = dailyWorkouts.length;
        break;
      case "volume":
        progress = dailyVolume;
        break;
      case "sets":
        progress = dailySets;
        break;
      case "working_sets":
        progress = dailyWorkingSets;
        break;
      case "exercises":
        progress = dailyExercises.size;
        break;
      case "reps":
        progress = dailyReps;
        break;
      case "tracked_sets":
        progress = dailyTrackedSets;
        break;
    }
  } else {
    // Weekly challenge - filter workouts for this week
    const weeklyWorkouts = workouts.filter((w: any) => {
      const date = new Date(w.endTime || w.startTime);
      return date >= weekStart;
    });

    let weeklyVolume = 0;
    let weeklySets = 0;
    const workoutDays = new Set<string>();

    for (const workout of weeklyWorkouts) {
      const date = getDayKey(new Date(workout.endTime || workout.startTime), timezoneOffset);
      workoutDays.add(date);

      for (const exercise of workout.exercises || []) {
        for (const set of exercise.sets || []) {
          weeklySets++;
          weeklyVolume += (set.weight || 0) * (set.reps || 0);
        }
      }
    }

    switch (challenge.type) {
      case "workouts":
        progress = weeklyWorkouts.length;
        break;
      case "volume":
        progress = weeklyVolume;
        break;
      case "sets":
        progress = weeklySets;
        break;
      case "days":
        progress = workoutDays.size;
        break;
    }
  }

  if (progress < challenge.target) {
    return NextResponse.json(
      { error: "Challenge not completed" },
      { status: 400 }
    );
  }

  // Check if already claimed
  if (isDaily) {
    const claimedDailyChallenges = data.claimedDailyChallenges || {};
    if (claimedDailyChallenges[todayKey] === challenge_id) {
      return NextResponse.json(
        { error: "Already claimed" },
        { status: 400 }
      );
    }

    // Mark as claimed and award XP
    claimedDailyChallenges[todayKey] = challenge_id;

    await prisma.gamify_fitness_data.update({
      where: { user_id: user.id },
      data: {
        data: {
          ...data,
          claimedDailyChallenges,
          profile: {
            ...data.profile,
            xp: (data.profile?.xp || 0) + challenge.xp_reward,
          },
        },
      },
    });
  } else {
    const weekKey = weekStart.toISOString().split("T")[0];
    const claimedChallenges = data.claimedChallenges || {};

    if (claimedChallenges[weekKey] === challenge_id) {
      return NextResponse.json(
        { error: "Already claimed" },
        { status: 400 }
      );
    }

    // Mark as claimed and award XP
    claimedChallenges[weekKey] = challenge_id;

    await prisma.gamify_fitness_data.update({
      where: { user_id: user.id },
      data: {
        data: {
          ...data,
          claimedChallenges,
          profile: {
            ...data.profile,
            xp: (data.profile?.xp || 0) + challenge.xp_reward,
          },
        },
      },
    });
  }

  // Award XP to unified profile
  await prisma.app_profiles.upsert({
    where: {
      user_id_app_id: { user_id: user.id, app_id: "fitness" },
    },
    update: {
      xp: { increment: challenge.xp_reward },
    },
    create: {
      user_id: user.id,
      app_id: "fitness",
      xp: challenge.xp_reward,
      level: 1,
    },
  });

  return NextResponse.json({
    success: true,
    xp_awarded: challenge.xp_reward,
  });
}
