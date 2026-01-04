import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";

// Calculate level and XP progress from total XP
function calculateLevelFromXP(totalXp: number) {
  let level = 1;
  let xpNeeded = 100;
  let cumulativeXP = 0;

  // Level up while we have enough XP
  while (cumulativeXP + xpNeeded <= totalXp) {
    cumulativeXP += xpNeeded;
    level++;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }

  return {
    level,
    xpInCurrentLevel: totalXp - cumulativeXP,
    xpToNextLevel: xpNeeded,
  };
}

// Calculate XP to next level for app profiles
function calculateAppXPToNext(level: number): number {
  let xpNeeded = 100;
  for (let i = 1; i < level; i++) {
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return xpNeeded;
}

export const GET = withAuth(async (_request, user) => {
  try {
    // Get stats from new schema
    const [locationsCount, achievementsCount, appProfiles] = await Promise.all([
      prisma.travel_locations.count({
        where: { user_id: user.id },
      }),
      prisma.user_achievements.count({
        where: { user_id: user.id, is_completed: true },
      }),
      prisma.app_profiles.findMany({
        where: { user_id: user.id },
      }),
    ]);

    const totalXp = user.totalXP || 0;
    // Always calculate level from total XP to ensure accuracy
    const { level, xpInCurrentLevel, xpToNextLevel } = calculateLevelFromXP(totalXp);

    // Build app XP map
    const apps: Record<string, { xp: number; level: number; xpToNext: number }> = {};
    for (const app of appProfiles) {
      apps[app.app_id] = {
        xp: app.xp || 0,
        level: app.level || 1,
        xpToNext: app.xp_to_next || calculateAppXPToNext(app.level || 1),
      };
    }

    // Count active apps (apps with any XP)
    const activeApps = appProfiles.filter(a => (a.xp || 0) > 0).length;

    return NextResponse.json({
      character: {
        name: user.name || "Traveler",
        email: user.email,
        avatar: user.image,
        level,
        xp: totalXp,
        xpInCurrentLevel,
        xpToNextLevel,
        currentStreak: user.currentStreak || 0,
        longestStreak: user.longestStreak || 0,
      },
      stats: {
        locations: locationsCount,
        achievements: achievementsCount,
        activeApps,
      },
      apps,
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return Errors.database("Failed to fetch profile");
  }
});
