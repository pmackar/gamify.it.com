import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get all achievements from definitions
  const achievements = ACHIEVEMENTS.map((a) => ({
    id: a.code,
    code: a.code,
    name: a.name,
    description: a.description,
    icon: a.icon,
    xpReward: a.xpReward,
    category: a.category,
    tier: a.tier,
  }));

  // Get user's unlocked achievements
  const userAchievements = await prisma.userAchievement.findMany({
    where: { userId: session.user.id },
    include: {
      achievement: true,
    },
    orderBy: { unlockedAt: "desc" },
  });

  return NextResponse.json({
    achievements,
    userAchievements,
  });
}
