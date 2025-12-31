import prisma from "@/lib/db";

// XP values for different actions
export const XP_VALUES = {
  // Location actions
  new_location: 50,
  new_city: 200,
  new_country: 500,

  // Visit actions
  visit: 25,
  visit_with_rating: 40,
  visit_with_review: 60,
  visit_with_photo: 75,

  // Type multipliers
  type_multipliers: {
    RESTAURANT: 1.0,
    BAR: 1.0,
    CAFE: 0.8,
    ATTRACTION: 1.5,
    HOTEL: 1.2,
    SHOP: 0.8,
    NATURE: 1.5,
    TRANSPORT: 0.5,
    MUSEUM: 1.5,
    BEACH: 1.2,
    NIGHTLIFE: 1.0,
    OTHER: 0.8,
  } as Record<string, number>,

  // Streak bonuses
  streak_multipliers: {
    3: 1.1,
    7: 1.25,
    14: 1.5,
    30: 2.0,
  } as Record<number, number>,
};

// Level scaling: Each level requires 1.5x more XP
export function calculateXPForLevel(level: number): number {
  let xpNeeded = 100;
  for (let i = 1; i < level; i++) {
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return xpNeeded;
}

export function calculateLocationXP(
  action: string,
  locationType: string,
  streakDays: number = 0
): number {
  const xpMap: Record<string, number> = {
    new_location: XP_VALUES.new_location,
    new_city: XP_VALUES.new_city,
    new_country: XP_VALUES.new_country,
    visit: XP_VALUES.visit,
    visit_with_rating: XP_VALUES.visit_with_rating,
    visit_with_review: XP_VALUES.visit_with_review,
    visit_with_photo: XP_VALUES.visit_with_photo,
  };
  const baseXP = xpMap[action] || 25;
  const typeMultiplier = XP_VALUES.type_multipliers[locationType] || 1.0;

  // Find applicable streak multiplier
  let streakMultiplier = 1.0;
  const streakThresholds = Object.keys(XP_VALUES.streak_multipliers)
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of streakThresholds) {
    if (streakDays >= threshold) {
      streakMultiplier = XP_VALUES.streak_multipliers[threshold];
      break;
    }
  }

  return Math.floor(baseXP * typeMultiplier * streakMultiplier);
}

// Add XP and handle level-ups
export async function addXP(userId: string, amount: number): Promise<{
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  xpToNext: number;
}> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { xp: true, level: true, xpToNext: true },
  });

  if (!user) throw new Error("User not found");

  let newXP = user.xp + amount;
  let newLevel = user.level;
  let xpToNext = user.xpToNext;
  let leveledUp = false;

  // Level up loop
  while (newXP >= xpToNext) {
    newXP -= xpToNext;
    newLevel++;
    xpToNext = Math.floor(xpToNext * 1.5);
    leveledUp = true;
  }

  await prisma.user.update({
    where: { id: userId },
    data: { xp: newXP, level: newLevel, xpToNext },
  });

  return { newXP, newLevel, leveledUp, xpToNext };
}

// Update streak
export async function updateStreak(userId: string): Promise<number> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { currentStreak: true, longestStreak: true, lastActiveDate: true },
  });

  if (!user) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newStreak = 1;

  if (user.lastActiveDate) {
    const lastActive = new Date(user.lastActiveDate);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no change
      return user.currentStreak;
    } else if (diffDays === 1) {
      // Consecutive day
      newStreak = user.currentStreak + 1;
    }
    // Otherwise streak resets to 1
  }

  await prisma.user.update({
    where: { id: userId },
    data: {
      currentStreak: newStreak,
      longestStreak: Math.max(newStreak, user.longestStreak),
      lastActiveDate: today,
    },
  });

  return newStreak;
}

// Update user stats
export async function updateUserStats(userId: string): Promise<void> {
  const [citiesCount, locationsCount, visitsCount] = await Promise.all([
    prisma.city.count({ where: { userId } }),
    prisma.location.count({ where: { userId } }),
    prisma.visit.count({ where: { userId } }),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalCities: citiesCount,
      totalLocations: locationsCount,
      totalVisits: visitsCount,
    },
  });
}
