import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

// Form tips database - common cues for popular exercises
const FORM_TIPS: Record<string, string[]> = {
  "bench_press": [
    "Keep shoulder blades squeezed together and down",
    "Maintain a slight arch in your lower back",
    "Touch the bar to your mid-chest, not your neck",
    "Drive your feet into the floor for stability",
  ],
  "squat": [
    "Push your knees out over your toes",
    "Keep your chest up and core braced",
    "Sit back like you're sitting into a chair",
    "Drive through your heels on the way up",
  ],
  "deadlift": [
    "Keep the bar close to your body throughout the lift",
    "Push the floor away rather than pulling the bar up",
    "Lock out by squeezing your glutes at the top",
    "Never round your lower back",
  ],
  "overhead_press": [
    "Stack the bar directly over your midfoot",
    "Move your head back to allow the bar path to be straight",
    "Squeeze your glutes and core to stabilize",
    "Lock out with your head pushed through at the top",
  ],
  "barbell_row": [
    "Keep your back flat and parallel to the floor",
    "Pull the bar to your lower chest or upper abs",
    "Squeeze your shoulder blades together at the top",
    "Control the weight on the way down",
  ],
  "lat_pulldown": [
    "Pull with your elbows, not your hands",
    "Lean back slightly and pull to your upper chest",
    "Avoid using momentum or swinging",
    "Focus on squeezing your lats at the bottom",
  ],
  "bicep_curl": [
    "Keep your elbows pinned to your sides",
    "Don't swing the weight or use your back",
    "Control the negative portion of the rep",
    "Squeeze at the top of the movement",
  ],
  "tricep_pushdown": [
    "Keep your elbows locked in place at your sides",
    "Fully extend your arms at the bottom",
    "Don't lean forward excessively",
    "Control the weight on the way up",
  ],
  "leg_press": [
    "Don't lock out your knees at the top",
    "Keep your lower back pressed into the seat",
    "Control the descent, don't let the weight drop",
    "Push through your heels",
  ],
  "romanian_deadlift": [
    "Push your hips back, don't bend at the knees first",
    "Feel the stretch in your hamstrings",
    "Keep the bar close to your legs",
    "Maintain a neutral spine throughout",
  ],
};

// Analyze workout history for plateaus
function detectPlateaus(workouts: any[], records: Record<string, number>) {
  const plateaus: { exerciseId: string; exerciseName: string; weeks: number; currentMax: number }[] = [];

  // Group workouts by exercise
  const exerciseHistory: Record<string, { date: string; maxWeight: number }[]> = {};

  for (const workout of workouts) {
    for (const exercise of workout.exercises || []) {
      if (!exerciseHistory[exercise.id]) {
        exerciseHistory[exercise.id] = [];
      }

      const maxWeight = Math.max(...(exercise.sets || []).map((s: any) => s.weight || 0));
      if (maxWeight > 0) {
        exerciseHistory[exercise.id].push({
          date: workout.endTime || workout.startTime,
          maxWeight,
        });
      }
    }
  }

  // Check each exercise for plateaus (no PR in 4+ weeks)
  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

  for (const [exerciseId, history] of Object.entries(exerciseHistory)) {
    if (history.length < 4) continue; // Need enough data

    // Sort by date descending
    history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const currentMax = records[exerciseId] || 0;
    if (currentMax === 0) continue;

    // Find when the PR was set
    const prSession = history.find(h => h.maxWeight === currentMax);
    if (!prSession) continue;

    const prDate = new Date(prSession.date);
    const weeksSincePR = Math.floor((Date.now() - prDate.getTime()) / (7 * 24 * 60 * 60 * 1000));

    if (weeksSincePR >= 4) {
      // Find exercise name from recent workout
      let exerciseName = exerciseId;
      for (const workout of workouts) {
        const ex = workout.exercises?.find((e: any) => e.id === exerciseId);
        if (ex) {
          exerciseName = ex.name;
          break;
        }
      }

      plateaus.push({
        exerciseId,
        exerciseName,
        weeks: weeksSincePR,
        currentMax,
      });
    }
  }

  return plateaus.slice(0, 5); // Top 5 plateaus
}

// Calculate training load and recommend deload
function analyzeTrainingLoad(workouts: any[]) {
  const now = new Date();
  const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const threeWeeksAgo = new Date(now.getTime() - 21 * 24 * 60 * 60 * 1000);
  const fourWeeksAgo = new Date(now.getTime() - 28 * 24 * 60 * 60 * 1000);

  const getWeekVolume = (start: Date, end: Date) => {
    return workouts
      .filter(w => {
        const date = new Date(w.endTime || w.startTime);
        return date >= start && date < end;
      })
      .reduce((total, workout) => {
        return total + workout.exercises.reduce((exTotal: number, ex: any) => {
          return exTotal + (ex.sets || []).reduce((setTotal: number, s: any) => {
            return setTotal + (s.weight || 0) * (s.reps || 0);
          }, 0);
        }, 0);
      }, 0);
  };

  const thisWeek = getWeekVolume(oneWeekAgo, now);
  const lastWeek = getWeekVolume(twoWeeksAgo, oneWeekAgo);
  const twoWeeksBack = getWeekVolume(threeWeeksAgo, twoWeeksAgo);
  const threeWeeksBack = getWeekVolume(fourWeeksAgo, threeWeeksAgo);

  const avgVolume = (lastWeek + twoWeeksBack + threeWeeksBack) / 3;
  const volumeIncrease = avgVolume > 0 ? ((thisWeek - avgVolume) / avgVolume) * 100 : 0;

  // Count consecutive training weeks
  let consecutiveWeeks = 0;
  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(now.getTime() - (i + 1) * 7 * 24 * 60 * 60 * 1000);
    const weekEnd = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const weekWorkouts = workouts.filter(w => {
      const date = new Date(w.endTime || w.startTime);
      return date >= weekStart && date < weekEnd;
    });
    if (weekWorkouts.length >= 2) {
      consecutiveWeeks++;
    } else {
      break;
    }
  }

  let recommendation: 'deload' | 'maintain' | 'push' | 'ramp_up' = 'maintain';
  let reason = '';

  if (consecutiveWeeks >= 6) {
    recommendation = 'deload';
    reason = `You've trained ${consecutiveWeeks} weeks straight. Consider a deload week to recover.`;
  } else if (volumeIncrease > 30) {
    recommendation = 'deload';
    reason = 'Your volume has spiked significantly. Consider backing off to prevent overtraining.';
  } else if (volumeIncrease < -20 && thisWeek > 0) {
    recommendation = 'ramp_up';
    reason = 'Your volume has dropped. Time to ramp back up progressively.';
  } else if (consecutiveWeeks >= 4 && volumeIncrease > 10) {
    recommendation = 'push';
    reason = 'Great momentum! Keep pushing, but listen to your body.';
  } else {
    recommendation = 'maintain';
    reason = 'Training load looks balanced. Keep up the good work!';
  }

  return {
    thisWeekVolume: thisWeek,
    avgRecentVolume: avgVolume,
    volumeChangePercent: Math.round(volumeIncrease),
    consecutiveWeeks,
    recommendation,
    reason,
  };
}

// Get personalized insights
function getPersonalizedInsights(workouts: any[], profile: any) {
  const insights: { type: 'tip' | 'warning' | 'achievement'; icon: string; title: string; message: string }[] = [];

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const recentWorkouts = workouts.filter(w => {
    const date = new Date(w.endTime || w.startTime);
    return date >= sevenDaysAgo;
  });

  // Check workout frequency
  if (recentWorkouts.length === 0) {
    insights.push({
      type: 'warning',
      icon: '⚠️',
      title: 'Time to Train',
      message: "You haven't worked out in a week. Get back in the gym to maintain your gains!",
    });
  } else if (recentWorkouts.length >= 5) {
    insights.push({
      type: 'achievement',
      icon: '🔥',
      title: 'On Fire!',
      message: `${recentWorkouts.length} workouts this week! Make sure you're recovering properly.`,
    });
  }

  // Check for muscle group imbalances
  const muscleGroups: Record<string, number> = {};
  for (const workout of recentWorkouts) {
    for (const ex of workout.exercises || []) {
      const muscle = ex.muscle || 'other';
      muscleGroups[muscle] = (muscleGroups[muscle] || 0) + 1;
    }
  }

  const pushCount = (muscleGroups['chest'] || 0) + (muscleGroups['triceps'] || 0) + (muscleGroups['shoulders'] || 0);
  const pullCount = (muscleGroups['back'] || 0) + (muscleGroups['biceps'] || 0);
  const legCount = (muscleGroups['quads'] || 0) + (muscleGroups['hamstrings'] || 0) + (muscleGroups['glutes'] || 0) + (muscleGroups['calves'] || 0);

  if (pushCount > 0 && pullCount === 0) {
    insights.push({
      type: 'tip',
      icon: '💡',
      title: 'Balance Your Training',
      message: "You've been pushing but not pulling. Add some back and bicep work.",
    });
  }

  if (legCount === 0 && recentWorkouts.length >= 3) {
    insights.push({
      type: 'warning',
      icon: '🦵',
      title: "Don't Skip Leg Day",
      message: "No leg exercises this week. Lower body training is crucial for overall strength.",
    });
  }

  // Progressive overload tip
  if (profile.totalWorkouts > 10 && profile.totalWorkouts % 5 === 0) {
    insights.push({
      type: 'tip',
      icon: '📈',
      title: 'Progressive Overload',
      message: 'Try adding 2.5-5 lbs to your main lifts this week to keep progressing.',
    });
  }

  return insights.slice(0, 4);
}

// GET /api/fitness/ai-coach - Get AI coaching insights
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const exerciseId = searchParams.get("exercise");

  // Get user's fitness data
  const fitnessData = await prisma.gamify_fitness_data.findUnique({
    where: { user_id: user.id },
  });

  const data = (fitnessData?.data as any) || {};
  const workouts = data.workouts || [];
  const records = data.records || {};
  const profile = data.profile || {};

  if (exerciseId) {
    // Get form tips for specific exercise
    const tips = FORM_TIPS[exerciseId] || [];

    // Get exercise history for this specific lift
    const exerciseHistory: { date: string; maxWeight: number; totalSets: number; totalVolume: number }[] = [];

    for (const workout of workouts) {
      const exercise = workout.exercises?.find((e: any) => e.id === exerciseId);
      if (exercise && exercise.sets?.length > 0) {
        const maxWeight = Math.max(...exercise.sets.map((s: any) => s.weight || 0));
        const totalSets = exercise.sets.length;
        const totalVolume = exercise.sets.reduce((sum: number, s: any) => sum + (s.weight || 0) * (s.reps || 0), 0);

        exerciseHistory.push({
          date: workout.endTime || workout.startTime,
          maxWeight,
          totalSets,
          totalVolume,
        });
      }
    }

    // Sort by date
    exerciseHistory.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    return NextResponse.json({
      exerciseId,
      tips,
      pr: records[exerciseId] || 0,
      history: exerciseHistory.slice(-10), // Last 10 sessions
      sessions: exerciseHistory.length,
    });
  }

  // General coaching overview
  const plateaus = detectPlateaus(workouts, records);
  const trainingLoad = analyzeTrainingLoad(workouts);
  const insights = getPersonalizedInsights(workouts, profile);

  return NextResponse.json({
    plateaus,
    trainingLoad,
    insights,
    totalWorkouts: workouts.length,
    level: profile.level || 1,
  });
}
