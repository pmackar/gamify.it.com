import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/share/achievement/[id] - Get shareable achievement data
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const userAchievement = await prisma.user_achievements.findUnique({
    where: { id },
    include: {
      achievements: true,
      profiles: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
          main_level: true,
          total_xp: true,
        },
      },
    },
  });

  if (!userAchievement) {
    return NextResponse.json(
      { error: "Achievement not found" },
      { status: 404 }
    );
  }

  // Only owner can share
  if (userAchievement.user_id !== user.id) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  const achievement = userAchievement.achievements;
  const profile = userAchievement.profiles;

  // Generate share URL
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://gamify.it.com";
  const shareUrl = `${baseUrl}/share/achievement/${id}`;

  return NextResponse.json({
    share: {
      type: "achievement",
      id,
      title: achievement.name,
      description: achievement.description,
      icon: achievement.icon || "🏆",
      xpReward: achievement.xp_reward,
      tier: achievement.tier,
      category: achievement.category,
      appId: achievement.app_id,
      completedAt: userAchievement.completed_at?.toISOString(),
      user: {
        displayName: profile.display_name || profile.username,
        avatarUrl: profile.avatar_url,
        level: profile.main_level,
      },
      shareUrl,
      socialText: `I just unlocked "${achievement.name}" on gamify.it.com! ${achievement.icon || "🏆"}`,
      ogImage: `${baseUrl}/api/og/achievement/${id}`,
    },
  });
}
