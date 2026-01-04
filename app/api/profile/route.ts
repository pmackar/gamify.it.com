import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";
import { getMainLevelFromXP, getAppLevelXPRequired } from "@/lib/levels";

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
    // Calculate main level from total XP (uses steeper 2x curve from 250)
    const mainLevelInfo = getMainLevelFromXP(totalXp);

    // Build app XP map
    const apps: Record<string, { xp: number; level: number; xpToNext: number }> = {};
    for (const app of appProfiles) {
      apps[app.app_id] = {
        xp: app.xp || 0,
        level: app.level || 1,
        xpToNext: app.xp_to_next || getAppLevelXPRequired(app.level || 1),
      };
    }

    // Count active apps (apps with any XP)
    const activeApps = appProfiles.filter(a => (a.xp || 0) > 0).length;

    return NextResponse.json({
      character: {
        name: user.name || "Traveler",
        email: user.email,
        avatar: user.image,
        level: mainLevelInfo.level,
        xp: totalXp,
        xpInCurrentLevel: mainLevelInfo.xpInLevel,
        xpToNextLevel: mainLevelInfo.xpToNext,
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
