import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";
import { getMainLevelFromXP } from "@/lib/levels";

export const GET = withAuth(async (_request, user) => {
  try {
    // Fetch profile data using Prisma
    const profile = await prisma.profiles.findUnique({
      where: { id: user.id },
    });

    // Fetch app profiles
    const appProfiles = await prisma.app_profiles.findMany({
      where: { user_id: user.id },
    });

    // Fetch user achievements
    const userAchievements = await prisma.user_achievements.findMany({
      where: { user_id: user.id, is_completed: true },
      include: {
        achievements: true,
      },
    });

    const totalXP = profile?.total_xp || 0;
    const mainLevelInfo = getMainLevelFromXP(totalXP);
    const mainLevel = mainLevelInfo.level;
    const currentLevelXP = mainLevelInfo.xpInLevel;
    const xpToNext = mainLevelInfo.xpToNext;

    // Build app data with icons and colors
    const appData = [
      {
        id: "fitness",
        name: "Iron Quest",
        icon: "💪",
        color: "#FF6B6B",
        url: "/fitness",
        profile: appProfiles?.find((p) => p.app_id === "fitness"),
      },
      {
        id: "travel",
        name: "Explorer",
        icon: "✈️",
        color: "#5CC9F5",
        url: "/travel",
        profile: appProfiles?.find((p) => p.app_id === "travel"),
      },
      {
        id: "today",
        name: "Day Quest",
        icon: "✅",
        color: "#7FD954",
        url: "/today",
        profile: appProfiles?.find((p) => p.app_id === "today"),
      },
    ];

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        displayName: profile?.display_name || user.name || user.email?.split("@")[0],
        avatarUrl: profile?.avatar_url || user.image,
        username: profile?.username,
        bio: profile?.bio,
      },
      mainStats: {
        level: mainLevel,
        totalXP,
        currentLevelXP,
        xpToNext,
        currentStreak: profile?.current_streak || 0,
        longestStreak: profile?.longest_streak || 0,
      },
      apps: appData,
      achievements: {
        total: userAchievements?.length || 0,
        list:
          userAchievements?.map((ua) => ({
            id: ua.id,
            code: ua.achievements?.code,
            name: ua.achievements?.name,
            description: ua.achievements?.description,
            icon: ua.achievements?.icon,
            appId: ua.achievements?.app_id,
            completedAt: ua.completed_at,
            xpReward: ua.achievements?.xp_reward,
            tier: ua.achievements?.tier || 1,
            category: ua.achievements?.category || "general",
          })) || [],
      },
      memberSince: profile?.created_at || user.createdAt,
    });
  } catch (error) {
    console.error("Error fetching account:", error);
    return Errors.database("Failed to fetch account");
  }
});
