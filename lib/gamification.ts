import prisma from "@/lib/db";

// XP values for different actions
export const XP_VALUES = {
  // Location actions
  new_location: 50,
  new_city: 200,
  new_country: 500,

  // Visit actions
  visit: 25,
  first_visit: 50,
  visit_with_rating: 40,
  visit_with_review: 60,
  visit_with_photo: 75,

  // Quest completion
  quest_complete_base: 100,        // Base XP for completing a quest
  quest_complete_per_item: 15,     // XP per item completed
  party_bonus_multiplier: 1.25,    // 25% bonus for party completion
  party_member_bonus: 50,          // Extra XP for each party member

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

// Calculate level from cumulative total XP
export function calculateLevelFromTotalXP(totalXP: number): { level: number; xpInLevel: number; xpToNext: number } {
  let level = 1;
  let xpNeeded = 100;
  let cumulativeXP = 0;

  while (cumulativeXP + xpNeeded <= totalXP) {
    cumulativeXP += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }

  return {
    level,
    xpInLevel: totalXP - cumulativeXP,
    xpToNext: xpNeeded,
  };
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
    first_visit: XP_VALUES.first_visit,
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

// Check for active XP boost and return multiplier
export async function getActiveXPBoost(userId: string): Promise<{
  active: boolean;
  multiplier: number;
  expiresAt: Date | null;
}> {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { xp_boost_multiplier: true, xp_boost_expires_at: true },
  });

  if (!profile || !profile.xp_boost_expires_at || !profile.xp_boost_multiplier) {
    return { active: false, multiplier: 1.0, expiresAt: null };
  }

  const now = new Date();
  if (profile.xp_boost_expires_at > now) {
    return {
      active: true,
      multiplier: profile.xp_boost_multiplier,
      expiresAt: profile.xp_boost_expires_at,
    };
  }

  // Boost has expired, clear it
  await prisma.profiles.update({
    where: { id: userId },
    data: { xp_boost_multiplier: 1.0, xp_boost_expires_at: null },
  });

  return { active: false, multiplier: 1.0, expiresAt: null };
}

// Add XP to travel app profile and handle level-ups
export async function addXP(userId: string, amount: number): Promise<{
  newXP: number;
  newLevel: number;
  leveledUp: boolean;
  xpToNext: number;
  boostApplied: boolean;
  boostMultiplier: number;
}> {
  // Check for active XP boost
  const boost = await getActiveXPBoost(userId);
  const boostedAmount = Math.floor(amount * boost.multiplier);

  // Get or create travel app profile
  let appProfile = await prisma.app_profiles.findUnique({
    where: {
      user_id_app_id: {
        user_id: userId,
        app_id: 'travel',
      },
    },
  });

  if (!appProfile) {
    appProfile = await prisma.app_profiles.create({
      data: {
        user_id: userId,
        app_id: 'travel',
        xp: 0,
        level: 1,
        xp_to_next: 100,
        stats: {},
      },
    });
  }

  let newXP = (appProfile.xp || 0) + boostedAmount;
  let newLevel = appProfile.level || 1;
  let xpToNext = appProfile.xp_to_next || 100;
  let leveledUp = false;

  // Level up loop
  while (newXP >= xpToNext) {
    newXP -= xpToNext;
    newLevel++;
    xpToNext = Math.floor(xpToNext * 1.5);
    leveledUp = true;
  }

  await prisma.app_profiles.update({
    where: { id: appProfile.id },
    data: { xp: newXP, level: newLevel, xp_to_next: xpToNext },
  });

  // Also update global profile XP and recalculate main_level
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { total_xp: true },
  });

  const newTotalXP = (profile?.total_xp || 0) + boostedAmount;
  const globalLevelInfo = calculateLevelFromTotalXP(newTotalXP);

  await prisma.profiles.update({
    where: { id: userId },
    data: {
      total_xp: newTotalXP,
      main_level: globalLevelInfo.level,
    },
  });

  return {
    newXP,
    newLevel,
    leveledUp,
    xpToNext,
    boostApplied: boost.active,
    boostMultiplier: boost.multiplier,
  };
}

// Update streak
export async function updateStreak(userId: string): Promise<number> {
  const profile = await prisma.profiles.findUnique({
    where: { id: userId },
    select: { current_streak: true, longest_streak: true, last_activity_date: true },
  });

  if (!profile) return 0;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  let newStreak = 1;

  if (profile.last_activity_date) {
    const lastActive = new Date(profile.last_activity_date);
    lastActive.setHours(0, 0, 0, 0);

    const diffDays = Math.floor((today.getTime() - lastActive.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      // Same day, no change
      return profile.current_streak || 1;
    } else if (diffDays === 1) {
      // Consecutive day
      newStreak = (profile.current_streak || 0) + 1;
    }
    // Otherwise streak resets to 1
  }

  await prisma.profiles.update({
    where: { id: userId },
    data: {
      current_streak: newStreak,
      longest_streak: Math.max(newStreak, profile.longest_streak || 0),
      last_activity_date: today,
    },
  });

  return newStreak;
}

// Update user stats
export async function updateUserStats(userId: string): Promise<void> {
  const [citiesCount, locationsCount, visitsCount] = await Promise.all([
    prisma.travel_cities.count({ where: { user_id: userId } }),
    prisma.travel_locations.count({ where: { user_id: userId } }),
    prisma.travel_visits.count({ where: { user_id: userId } }),
  ]);

  // Get unique countries
  const cities = await prisma.travel_cities.findMany({
    where: { user_id: userId },
    select: { country: true },
  });
  const countriesCount = new Set(cities.map(c => c.country)).size;

  // Update app profile stats
  await prisma.app_profiles.updateMany({
    where: {
      user_id: userId,
      app_id: 'travel',
    },
    data: {
      stats: {
        totalCities: citiesCount,
        totalLocations: locationsCount,
        totalVisits: visitsCount,
        totalCountries: countriesCount,
      },
    },
  });
}
