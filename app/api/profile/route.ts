import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";
import { getMainLevelFromXP, getAppLevelXPRequired } from "@/lib/levels";

export const GET = withAuth(async (_request, user) => {
  try {
    // Get stats from new schema
    const [profile, locationsCount, achievementsCount, appProfiles] = await Promise.all([
      prisma.profiles.findUnique({
        where: { id: user.id },
        select: {
          display_name: true,
          avatar_url: true,
          total_xp: true,
          main_level: true,
          current_streak: true,
          longest_streak: true,
          streak_shields: true,
          last_activity_date: true,
        },
      }),
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

    const totalXp = profile?.total_xp || 0;
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
        name: profile?.display_name || "Traveler",
        email: user.email,
        avatar: profile?.avatar_url,
        level: mainLevelInfo.level,
        xp: totalXp,
        xpInCurrentLevel: mainLevelInfo.xpInLevel,
        xpToNextLevel: mainLevelInfo.xpToNext,
        currentStreak: profile?.current_streak || 0,
        longestStreak: profile?.longest_streak || 0,
        streakShields: profile?.streak_shields || 0,
        lastActivityDate: profile?.last_activity_date?.toISOString() || null,
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
