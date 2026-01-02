import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// Calculate XP progress within current level
function calculateXPProgress(totalXp: number, level: number) {
  let xpUsed = 0;
  let xpNeeded = 100;

  // Sum XP for all previous levels
  for (let i = 1; i < level; i++) {
    xpUsed += xpNeeded;
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }

  const xpInCurrentLevel = totalXp - xpUsed;
  const xpToNextLevel = xpNeeded;

  return { xpInCurrentLevel, xpToNextLevel };
}

// Calculate XP to next level for app profiles
function calculateAppXPToNext(level: number): number {
  let xpNeeded = 100;
  for (let i = 1; i < level; i++) {
    xpNeeded = Math.floor(xpNeeded * 1.5);
  }
  return xpNeeded;
}

export async function GET() {
  try {
    const user = await requireAuth();

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
    const level = user.mainLevel || 1;
    const { xpInCurrentLevel, xpToNextLevel } = calculateXPProgress(totalXp, level);

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
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch profile" },
      { status: 500 }
    );
  }
}
