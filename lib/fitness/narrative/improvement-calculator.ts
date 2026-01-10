/**
 * Narrative Engine - Improvement Calculator
 *
 * Calculates relative improvement scores for comparing user vs rival performance
 * Win/loss determined by who improved MORE since last comparison
 */

import type {
  Workout,
  ImprovementSnapshot,
  ImprovementScore,
} from '@/lib/fitness/types';

// Score weights for composite calculation
const WEIGHTS = {
  volume: 0.40,
  consistency: 0.35,
  prs: 0.25,
};

/**
 * Get the start of the current week (Monday 00:00:00)
 */
export function getWeekStartDate(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day; // Adjust for Monday start
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + diff);
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get the start of the previous week
 */
export function getPreviousWeekStartDate(): Date {
  const currentWeekStart = getWeekStartDate();
  const previousWeekStart = new Date(currentWeekStart);
  previousWeekStart.setDate(currentWeekStart.getDate() - 7);
  return previousWeekStart;
}

/**
 * Filter workouts to those within a specific week
 */
export function getWorkoutsInWeek(workouts: Workout[], weekStart: Date): Workout[] {
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 7);

  return workouts.filter((w) => {
    const workoutDate = new Date(w.startTime);
    return workoutDate >= weekStart && workoutDate < weekEnd;
  });
}

/**
 * Calculate total volume from a list of workouts
 */
function calculateTotalVolume(workouts: Workout[]): number {
  return workouts.reduce((total, workout) => {
    return (
      total +
      workout.exercises.reduce((exTotal, exercise) => {
        return (
          exTotal +
          exercise.sets
            .filter((s) => !s.isWarmup)
            .reduce((setTotal, set) => setTotal + set.weight * set.reps, 0)
        );
      }, 0)
    );
  }, 0);
}

/**
 * Count PRs achieved in a set of workouts by comparing to records
 */
function countPRsInWorkouts(
  workouts: Workout[],
  currentRecords: Record<string, number>,
  previousRecords: Record<string, number>
): number {
  let prCount = 0;
  const seenExercises = new Set<string>();

  // Check each workout for exercises that beat previous records
  for (const workout of workouts) {
    for (const exercise of workout.exercises) {
      if (seenExercises.has(exercise.id)) continue;

      const maxWeight = Math.max(
        ...exercise.sets.filter((s) => !s.isWarmup).map((s) => s.weight),
        0
      );

      const previousRecord = previousRecords[exercise.id] || 0;
      const currentRecord = currentRecords[exercise.id] || 0;

      // Count as PR if current workout achieved a new record that beat previous
      if (maxWeight >= currentRecord && maxWeight > previousRecord) {
        prCount++;
        seenExercises.add(exercise.id);
      }
    }
  }

  return prCount;
}

/**
 * Calculate top exercise gains (exercises with most improvement)
 */
function calculateTopExerciseGains(
  currentWeekWorkouts: Workout[],
  previousWeekWorkouts: Workout[]
): Array<{ exercise: string; gain: number }> {
  const currentExerciseVolume: Record<string, { name: string; volume: number }> = {};
  const previousExerciseVolume: Record<string, number> = {};

  // Calculate current week volume per exercise
  for (const workout of currentWeekWorkouts) {
    for (const exercise of workout.exercises) {
      const volume = exercise.sets
        .filter((s) => !s.isWarmup)
        .reduce((sum, set) => sum + set.weight * set.reps, 0);

      if (!currentExerciseVolume[exercise.id]) {
        currentExerciseVolume[exercise.id] = { name: exercise.name, volume: 0 };
      }
      currentExerciseVolume[exercise.id].volume += volume;
    }
  }

  // Calculate previous week volume per exercise
  for (const workout of previousWeekWorkouts) {
    for (const exercise of workout.exercises) {
      const volume = exercise.sets
        .filter((s) => !s.isWarmup)
        .reduce((sum, set) => sum + set.weight * set.reps, 0);

      previousExerciseVolume[exercise.id] =
        (previousExerciseVolume[exercise.id] || 0) + volume;
    }
  }

  // Calculate gains
  const gains: Array<{ exercise: string; gain: number }> = [];

  for (const [id, data] of Object.entries(currentExerciseVolume)) {
    const previousVolume = previousExerciseVolume[id] || 0;
    if (previousVolume > 0) {
      const gainPercent = ((data.volume - previousVolume) / previousVolume) * 100;
      if (gainPercent > 0) {
        gains.push({ exercise: data.name, gain: gainPercent });
      }
    } else if (data.volume > 0) {
      // New exercise this week = 100% gain
      gains.push({ exercise: data.name, gain: 100 });
    }
  }

  // Sort by gain and return top 5
  return gains.sort((a, b) => b.gain - a.gain).slice(0, 5);
}

/**
 * Build an improvement snapshot from workout data
 */
export function buildImprovementSnapshot(
  currentWeekWorkouts: Workout[],
  previousWeekWorkouts: Workout[],
  currentRecords: Record<string, number>,
  previousRecords: Record<string, number>,
  targetWorkoutsPerWeek: number = 4
): ImprovementSnapshot {
  const volumeThisWeek = calculateTotalVolume(currentWeekWorkouts);
  const volumeLastWeek = calculateTotalVolume(previousWeekWorkouts);
  const workoutsThisWeek = currentWeekWorkouts.length;
  const workoutsLastWeek = previousWeekWorkouts.length;
  const prsThisWeek = countPRsInWorkouts(
    currentWeekWorkouts,
    currentRecords,
    previousRecords
  );

  // Consistency: how close to target workouts (0-100)
  const consistencyScore = Math.min(
    100,
    (workoutsThisWeek / targetWorkoutsPerWeek) * 100
  );

  const topExerciseGains = calculateTopExerciseGains(
    currentWeekWorkouts,
    previousWeekWorkouts
  );

  return {
    volumeThisWeek,
    volumeLastWeek,
    workoutsThisWeek,
    workoutsLastWeek,
    prsThisWeek,
    consistencyScore,
    topExerciseGains,
  };
}

/**
 * Calculate improvement score from a snapshot
 * Returns scores normalized to 0-100 scale
 */
export function calculateImprovementScore(
  snapshot: ImprovementSnapshot
): ImprovementScore {
  // Volume change as percentage (capped at +/- 100%)
  let volumeChange = 0;
  if (snapshot.volumeLastWeek > 0) {
    volumeChange =
      ((snapshot.volumeThisWeek - snapshot.volumeLastWeek) /
        snapshot.volumeLastWeek) *
      100;
  } else if (snapshot.volumeThisWeek > 0) {
    volumeChange = 100; // First week with volume = max improvement
  }
  volumeChange = Math.max(-100, Math.min(100, volumeChange));

  // Normalize to 0-100 scale (50 = no change, 100 = +100%, 0 = -100%)
  const volumeScore = (volumeChange + 100) / 2;

  // Consistency score is already 0-100
  const consistencyScore = snapshot.consistencyScore;

  // PR score: each PR adds 20 points, max 100
  const prScore = Math.min(100, snapshot.prsThisWeek * 20);

  // Composite score (weighted average)
  const compositeScore =
    volumeScore * WEIGHTS.volume +
    consistencyScore * WEIGHTS.consistency +
    prScore * WEIGHTS.prs;

  return {
    volumeChange,
    consistencyScore,
    prScore,
    compositeScore,
  };
}

/**
 * Determine winner between user and rival scores
 */
export function determineWinner(
  userScore: ImprovementScore,
  rivalScore: ImprovementScore
): { winner: 'user' | 'rival' | 'tie'; margin: number; dominantFactor: string } {
  const userComposite = userScore.compositeScore;
  const rivalComposite = rivalScore.compositeScore;

  // Margin of victory
  const margin = Math.abs(userComposite - rivalComposite);

  // Ties require being within 5 points
  if (margin < 5) {
    return { winner: 'tie', margin, dominantFactor: 'none' };
  }

  const winner = userComposite > rivalComposite ? 'user' : 'rival';

  // Determine dominant factor (what contributed most to the win)
  const winnerScore = winner === 'user' ? userScore : rivalScore;
  const loserScore = winner === 'user' ? rivalScore : userScore;

  const volumeDiff =
    (winnerScore.volumeChange + 100) / 2 - (loserScore.volumeChange + 100) / 2;
  const consistencyDiff =
    winnerScore.consistencyScore - loserScore.consistencyScore;
  const prDiff = winnerScore.prScore - loserScore.prScore;

  let dominantFactor = 'volume';
  let maxDiff = volumeDiff * WEIGHTS.volume;

  if (consistencyDiff * WEIGHTS.consistency > maxDiff) {
    dominantFactor = 'consistency';
    maxDiff = consistencyDiff * WEIGHTS.consistency;
  }

  if (prDiff * WEIGHTS.prs > maxDiff) {
    dominantFactor = 'prs';
  }

  return { winner, margin, dominantFactor };
}
