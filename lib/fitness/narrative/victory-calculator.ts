/**
 * Narrative Engine - Victory Calculator
 *
 * Each personality type has unique victory conditions:
 * - Mirror: Beat your 4-week rolling average
 * - Rival: Win best 2 of 3 categories (volume, workouts, PRs)
 * - Mentor: Higher growth rate than mentor
 * - Nemesis: Composite score with wild swings
 */

import type {
  PhantomPersonality,
  ImprovementSnapshot,
} from '@/lib/fitness/types';

export interface VictoryResult {
  winner: 'user' | 'rival' | 'tie';
  winningMargin: number; // 0-100 representing how decisive
  dominantFactor: string; // What decided the outcome
  breakdown: CategoryBreakdown;
  narrative: string; // Flavor text for the result
}

export interface CategoryBreakdown {
  volume: { user: number; rival: number; winner: 'user' | 'rival' | 'tie' };
  workouts: { user: number; rival: number; winner: 'user' | 'rival' | 'tie' };
  prs: { user: number; rival: number; winner: 'user' | 'rival' | 'tie' };
  growthRate?: { user: number; rival: number; winner: 'user' | 'rival' | 'tie' };
}

export interface UserHistoricalStats {
  // Rolling 4-week averages for Mirror comparison
  avgVolume4Week: number;
  avgWorkouts4Week: number;
  avgPRs4Week: number;
  // Previous week stats for growth rate calculation
  previousWeekVolume: number;
  previousWeekWorkouts: number;
}

/**
 * Calculate victory based on personality type
 */
export function calculateVictory(
  personality: PhantomPersonality,
  userSnapshot: ImprovementSnapshot,
  rivalSnapshot: ImprovementSnapshot,
  userHistory?: UserHistoricalStats
): VictoryResult {
  switch (personality) {
    case 'mirror':
      return calculateMirrorVictory(userSnapshot, userHistory);
    case 'rival':
      return calculateRivalVictory(userSnapshot, rivalSnapshot);
    case 'mentor':
      return calculateMentorVictory(userSnapshot, rivalSnapshot);
    case 'nemesis':
      return calculateNemesisVictory(userSnapshot, rivalSnapshot);
    default:
      return calculateRivalVictory(userSnapshot, rivalSnapshot);
  }
}

/**
 * MIRROR: Beat your 4-week rolling average
 * "Did you live up to your potential this week?"
 */
function calculateMirrorVictory(
  userSnapshot: ImprovementSnapshot,
  userHistory?: UserHistoricalStats
): VictoryResult {
  // If no history, use last week as baseline
  const avgVolume = userHistory?.avgVolume4Week || userSnapshot.volumeLastWeek || 1;
  const avgWorkouts = userHistory?.avgWorkouts4Week || userSnapshot.workoutsLastWeek || 1;
  const avgPRs = userHistory?.avgPRs4Week || 0.5;

  // Calculate how user performed vs their average
  const volumeRatio = userSnapshot.volumeThisWeek / Math.max(avgVolume, 1);
  const workoutsRatio = userSnapshot.workoutsThisWeek / Math.max(avgWorkouts, 1);
  const prsRatio = userSnapshot.prsThisWeek / Math.max(avgPRs, 0.5);

  // Weighted composite (volume 40%, workouts 35%, PRs 25%)
  const userScore = volumeRatio * 0.4 + workoutsRatio * 0.35 + prsRatio * 0.25;
  const threshold = 1.0; // Need to beat 100% of average

  const breakdown: CategoryBreakdown = {
    volume: {
      user: userSnapshot.volumeThisWeek,
      rival: Math.round(avgVolume),
      winner: volumeRatio > 1.02 ? 'user' : volumeRatio < 0.98 ? 'rival' : 'tie',
    },
    workouts: {
      user: userSnapshot.workoutsThisWeek,
      rival: Math.round(avgWorkouts),
      winner: workoutsRatio > 1.02 ? 'user' : workoutsRatio < 0.98 ? 'rival' : 'tie',
    },
    prs: {
      user: userSnapshot.prsThisWeek,
      rival: Math.round(avgPRs),
      winner: prsRatio > 1.1 ? 'user' : prsRatio < 0.9 ? 'rival' : 'tie',
    },
  };

  // Determine winner
  let winner: 'user' | 'rival' | 'tie';
  let narrative: string;
  let dominantFactor: string;

  if (userScore > threshold + 0.05) {
    winner = 'user';
    narrative = 'You exceeded your potential this week!';
    dominantFactor = volumeRatio > workoutsRatio ? 'volume' : 'consistency';
  } else if (userScore < threshold - 0.05) {
    winner = 'rival';
    narrative = 'Your past self had the edge this time.';
    dominantFactor = volumeRatio < workoutsRatio ? 'volume' : 'consistency';
  } else {
    winner = 'tie';
    narrative = 'Right on track with your usual performance.';
    dominantFactor = 'consistency';
  }

  const winningMargin = Math.abs(userScore - threshold) * 100;

  return { winner, winningMargin, dominantFactor, breakdown, narrative };
}

/**
 * RIVAL: Best 2 of 3 categories
 * "Every category is a battle"
 */
function calculateRivalVictory(
  userSnapshot: ImprovementSnapshot,
  rivalSnapshot: ImprovementSnapshot
): VictoryResult {
  // Compare each category
  const volumeWinner = compareCategory(
    userSnapshot.volumeThisWeek,
    rivalSnapshot.volumeThisWeek,
    0.05 // 5% margin for tie
  );

  const workoutsWinner = compareCategory(
    userSnapshot.workoutsThisWeek,
    rivalSnapshot.workoutsThisWeek,
    0 // No margin - exact count
  );

  const prsWinner = compareCategory(
    userSnapshot.prsThisWeek,
    rivalSnapshot.prsThisWeek,
    0 // No margin - exact count
  );

  const breakdown: CategoryBreakdown = {
    volume: {
      user: userSnapshot.volumeThisWeek,
      rival: rivalSnapshot.volumeThisWeek,
      winner: volumeWinner,
    },
    workouts: {
      user: userSnapshot.workoutsThisWeek,
      rival: rivalSnapshot.workoutsThisWeek,
      winner: workoutsWinner,
    },
    prs: {
      user: userSnapshot.prsThisWeek,
      rival: rivalSnapshot.prsThisWeek,
      winner: prsWinner,
    },
  };

  // Count wins
  let userWins = 0;
  let rivalWins = 0;

  [volumeWinner, workoutsWinner, prsWinner].forEach((w) => {
    if (w === 'user') userWins++;
    else if (w === 'rival') rivalWins++;
  });

  // Determine overall winner (best 2 of 3)
  let winner: 'user' | 'rival' | 'tie';
  let narrative: string;
  let dominantFactor: string;

  if (userWins >= 2) {
    winner = 'user';
    narrative = `You won ${userWins} out of 3 battles!`;
    dominantFactor = volumeWinner === 'user' ? 'volume' : workoutsWinner === 'user' ? 'consistency' : 'PRs';
  } else if (rivalWins >= 2) {
    winner = 'rival';
    narrative = `Your rival took ${rivalWins} out of 3 categories.`;
    dominantFactor = volumeWinner === 'rival' ? 'volume' : workoutsWinner === 'rival' ? 'consistency' : 'PRs';
  } else {
    winner = 'tie';
    narrative = 'The battle was too close to call!';
    dominantFactor = 'none';
  }

  const totalUserScore = userSnapshot.volumeThisWeek + userSnapshot.workoutsThisWeek * 1000 + userSnapshot.prsThisWeek * 5000;
  const totalRivalScore = rivalSnapshot.volumeThisWeek + rivalSnapshot.workoutsThisWeek * 1000 + rivalSnapshot.prsThisWeek * 5000;
  const winningMargin = Math.abs(totalUserScore - totalRivalScore) / Math.max(totalUserScore, totalRivalScore) * 100;

  return { winner, winningMargin, dominantFactor, breakdown, narrative };
}

/**
 * MENTOR: Growth rate comparison
 * "Show me your growth"
 */
function calculateMentorVictory(
  userSnapshot: ImprovementSnapshot,
  rivalSnapshot: ImprovementSnapshot
): VictoryResult {
  // Calculate growth rates (% improvement from last week)
  const userVolumeGrowth = calculateGrowthRate(
    userSnapshot.volumeThisWeek,
    userSnapshot.volumeLastWeek
  );
  const rivalVolumeGrowth = calculateGrowthRate(
    rivalSnapshot.volumeThisWeek,
    rivalSnapshot.volumeLastWeek
  );

  const userWorkoutGrowth = calculateGrowthRate(
    userSnapshot.workoutsThisWeek,
    userSnapshot.workoutsLastWeek
  );
  const rivalWorkoutGrowth = calculateGrowthRate(
    rivalSnapshot.workoutsThisWeek,
    rivalSnapshot.workoutsLastWeek
  );

  // PRs are a bonus - having any PR is growth
  const userPRBonus = userSnapshot.prsThisWeek > 0 ? 10 + userSnapshot.prsThisWeek * 5 : 0;
  const rivalPRBonus = rivalSnapshot.prsThisWeek > 0 ? 10 + rivalSnapshot.prsThisWeek * 5 : 0;

  // Composite growth score
  const userGrowthScore = userVolumeGrowth * 0.5 + userWorkoutGrowth * 0.3 + userPRBonus * 0.2;
  const rivalGrowthScore = rivalVolumeGrowth * 0.5 + rivalWorkoutGrowth * 0.3 + rivalPRBonus * 0.2;

  const breakdown: CategoryBreakdown = {
    volume: {
      user: userSnapshot.volumeThisWeek,
      rival: rivalSnapshot.volumeThisWeek,
      winner: userVolumeGrowth > rivalVolumeGrowth + 2 ? 'user' : rivalVolumeGrowth > userVolumeGrowth + 2 ? 'rival' : 'tie',
    },
    workouts: {
      user: userSnapshot.workoutsThisWeek,
      rival: rivalSnapshot.workoutsThisWeek,
      winner: userWorkoutGrowth > rivalWorkoutGrowth + 2 ? 'user' : rivalWorkoutGrowth > userWorkoutGrowth + 2 ? 'rival' : 'tie',
    },
    prs: {
      user: userSnapshot.prsThisWeek,
      rival: rivalSnapshot.prsThisWeek,
      winner: userSnapshot.prsThisWeek > rivalSnapshot.prsThisWeek ? 'user' : rivalSnapshot.prsThisWeek > userSnapshot.prsThisWeek ? 'rival' : 'tie',
    },
    growthRate: {
      user: Math.round(userGrowthScore * 10) / 10,
      rival: Math.round(rivalGrowthScore * 10) / 10,
      winner: userGrowthScore > rivalGrowthScore + 1 ? 'user' : rivalGrowthScore > userGrowthScore + 1 ? 'rival' : 'tie',
    },
  };

  // Determine winner based on growth rate
  let winner: 'user' | 'rival' | 'tie';
  let narrative: string;
  let dominantFactor: string;

  if (userGrowthScore > rivalGrowthScore + 2) {
    winner = 'user';
    narrative = 'Your growth impressed me. Well done.';
    dominantFactor = 'growth';
  } else if (rivalGrowthScore > userGrowthScore + 2) {
    winner = 'rival';
    narrative = 'Keep pushing. Growth takes time.';
    dominantFactor = 'growth';
  } else {
    winner = 'tie';
    narrative = 'We grew together this week.';
    dominantFactor = 'growth';
  }

  const winningMargin = Math.abs(userGrowthScore - rivalGrowthScore);

  return { winner, winningMargin, dominantFactor, breakdown, narrative };
}

/**
 * NEMESIS: Composite score with wild swings (±30%)
 * "Fortune favors the bold"
 */
function calculateNemesisVictory(
  userSnapshot: ImprovementSnapshot,
  rivalSnapshot: ImprovementSnapshot
): VictoryResult {
  // Standard composite calculation
  const userBase = calculateCompositeScore(userSnapshot);
  const rivalBase = calculateCompositeScore(rivalSnapshot);

  // Apply chaos factor to rival (±30% swing)
  const chaosFactor = 0.7 + Math.random() * 0.6; // 0.7 to 1.3
  const rivalScore = rivalBase * chaosFactor;

  const breakdown: CategoryBreakdown = {
    volume: {
      user: userSnapshot.volumeThisWeek,
      rival: Math.round(rivalSnapshot.volumeThisWeek * chaosFactor),
      winner: userSnapshot.volumeThisWeek > rivalSnapshot.volumeThisWeek * chaosFactor ? 'user' : 'rival',
    },
    workouts: {
      user: userSnapshot.workoutsThisWeek,
      rival: Math.round(rivalSnapshot.workoutsThisWeek * chaosFactor),
      winner: userSnapshot.workoutsThisWeek > rivalSnapshot.workoutsThisWeek * chaosFactor ? 'user' : 'rival',
    },
    prs: {
      user: userSnapshot.prsThisWeek,
      rival: rivalSnapshot.prsThisWeek,
      winner: userSnapshot.prsThisWeek > rivalSnapshot.prsThisWeek ? 'user' : rivalSnapshot.prsThisWeek > userSnapshot.prsThisWeek ? 'rival' : 'tie',
    },
  };

  // Determine winner
  let winner: 'user' | 'rival' | 'tie';
  let narrative: string;
  let dominantFactor: string;

  const margin = Math.abs(userBase - rivalScore) / Math.max(userBase, rivalScore) * 100;

  if (userBase > rivalScore * 1.05) {
    winner = 'user';
    if (chaosFactor < 0.85) {
      narrative = 'They stumbled this week. You capitalized!';
    } else if (chaosFactor > 1.15) {
      narrative = 'Even at their best, you prevailed!';
    } else {
      narrative = 'A hard-fought victory in the chaos!';
    }
    dominantFactor = margin > 20 ? 'dominance' : 'edge';
  } else if (rivalScore > userBase * 1.05) {
    winner = 'rival';
    if (chaosFactor > 1.15) {
      narrative = 'They went beast mode this week!';
    } else if (chaosFactor < 0.85) {
      narrative = 'Even on an off week, they edged you out.';
    } else {
      narrative = 'The chaos favored your nemesis this time.';
    }
    dominantFactor = margin > 20 ? 'dominance' : 'edge';
  } else {
    winner = 'tie';
    narrative = 'Neither could break the other!';
    dominantFactor = 'stalemate';
  }

  return { winner, winningMargin: margin, dominantFactor, breakdown, narrative };
}

// Helper functions

function compareCategory(
  userValue: number,
  rivalValue: number,
  tieMargin: number
): 'user' | 'rival' | 'tie' {
  const diff = userValue - rivalValue;
  const threshold = rivalValue * tieMargin;

  if (diff > threshold) return 'user';
  if (diff < -threshold) return 'rival';
  return 'tie';
}

function calculateGrowthRate(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 50 : 0; // 50% bonus for going from 0
  return ((current - previous) / previous) * 100;
}

function calculateCompositeScore(snapshot: ImprovementSnapshot): number {
  // Normalize and weight: volume (40%), workouts (35%), PRs (25%)
  const volumeScore = snapshot.volumeThisWeek / 10000; // Normalize to ~1-10 range
  const workoutScore = snapshot.workoutsThisWeek; // 0-7 typically
  const prScore = snapshot.prsThisWeek * 2; // Boost PR importance

  return volumeScore * 40 + workoutScore * 35 + prScore * 25;
}

/**
 * Get victory condition description for a personality
 */
export function getVictoryDescription(personality: PhantomPersonality): {
  condition: string;
  strategy: string;
  tagline: string;
} {
  switch (personality) {
    case 'mirror':
      return {
        condition: 'Beat your 4-week average',
        strategy: 'Stay consistent and keep improving week over week',
        tagline: 'Can you beat who you were?',
      };
    case 'rival':
      return {
        condition: 'Win 2 of 3 categories',
        strategy: 'Focus on winnable categories - a clutch PR can swing the battle',
        tagline: 'Every category is a battle',
      };
    case 'mentor':
      return {
        condition: 'Higher growth rate',
        strategy: 'Focus on improvement percentage, not raw numbers',
        tagline: 'Show me your growth',
      };
    case 'nemesis':
      return {
        condition: 'Composite score (with chaos)',
        strategy: 'Stay consistent - chaos favors the prepared',
        tagline: 'Fortune favors the bold',
      };
  }
}
