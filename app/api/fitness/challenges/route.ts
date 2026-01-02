import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

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

// Get the start of the current week (Monday)
function getWeekStart(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const monday = new Date(now.setDate(diff));
  monday.setHours(0, 0, 0, 0);
  return monday;
}

// GET /api/fitness/challenges - Get active challenges and progress
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  const data = (fitnessData?.data as any) || {};
  const workouts = data.workouts || [];

  // Calculate weekly stats
  const weekStart = getWeekStart();
  const weeklyWorkouts = workouts.filter((w: any) => {
    const date = new Date(w.endTime || w.startTime);
    return date >= weekStart;
  });

  let weeklyVolume = 0;
  let weeklySets = 0;
  const workoutDays = new Set<string>();

  for (const workout of weeklyWorkouts) {
    const date = new Date(workout.endTime || workout.startTime)
      .toISOString()
      .split("T")[0];
    workoutDays.add(date);

    for (const exercise of workout.exercises || []) {
      for (const set of exercise.sets || []) {
        weeklySets++;
        weeklyVolume += (set.weight || 0) * (set.reps || 0);
      }
    }
  }

  // Get weekly challenge rotation based on week number
  const weekNumber = Math.floor(
    (new Date().getTime() - new Date("2024-01-01").getTime()) /
      (7 * 24 * 60 * 60 * 1000)
  );
  const challengeIndex = weekNumber % WEEKLY_CHALLENGES.length;
  const activeChallenge = WEEKLY_CHALLENGES[challengeIndex];

  // Calculate progress for active challenge
  let progress = 0;
  switch (activeChallenge.type) {
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

  const completed = progress >= activeChallenge.target;
  const progressPercent = Math.min(
    100,
    Math.round((progress / activeChallenge.target) * 100)
  );

  // Check if user has claimed this week's reward
  const claimedChallenges = data.claimedChallenges || {};
  const weekKey = weekStart.toISOString().split("T")[0];
  const claimed = claimedChallenges[weekKey] === activeChallenge.id;

  // Days until reset
  const nextMonday = new Date(weekStart);
  nextMonday.setDate(nextMonday.getDate() + 7);
  const daysUntilReset = Math.ceil(
    (nextMonday.getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)
  );

  return NextResponse.json({
    challenge: {
      ...activeChallenge,
      progress,
      progressPercent,
      completed,
      claimed,
      daysUntilReset,
    },
    weeklyStats: {
      workouts: weeklyWorkouts.length,
      volume: weeklyVolume,
      sets: weeklySets,
      days: workoutDays.size,
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
  const { challenge_id } = body;

  if (!challenge_id) {
    return NextResponse.json(
      { error: "challenge_id is required" },
      { status: 400 }
    );
  }

  // Verify challenge is completed and not claimed
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  const data = (fitnessData?.data as any) || {};
  const workouts = data.workouts || [];

  // Recalculate progress
  const weekStart = getWeekStart();
  const weeklyWorkouts = workouts.filter((w: any) => {
    const date = new Date(w.endTime || w.startTime);
    return date >= weekStart;
  });

  let weeklyVolume = 0;
  let weeklySets = 0;
  const workoutDays = new Set<string>();

  for (const workout of weeklyWorkouts) {
    const date = new Date(workout.endTime || workout.startTime)
      .toISOString()
      .split("T")[0];
    workoutDays.add(date);

    for (const exercise of workout.exercises || []) {
      for (const set of exercise.sets || []) {
        weeklySets++;
        weeklyVolume += (set.weight || 0) * (set.reps || 0);
      }
    }
  }

  const challenge = WEEKLY_CHALLENGES.find((c) => c.id === challenge_id);
  if (!challenge) {
    return NextResponse.json({ error: "Invalid challenge" }, { status: 400 });
  }

  let progress = 0;
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

  if (progress < challenge.target) {
    return NextResponse.json(
      { error: "Challenge not completed" },
      { status: 400 }
    );
  }

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
