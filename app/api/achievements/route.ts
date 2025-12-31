import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";
import { ACHIEVEMENTS } from "@/lib/achievements";

export async function GET() {
  try {
    const user = await requireAuth();

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

    // Get user's unlocked achievements from Prisma (legacy data)
    // Note: During migration, we lookup by email to find the Prisma user
    const prismaUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    const userAchievements = prismaUser
      ? await prisma.userAchievement.findMany({
          where: { userId: prismaUser.id },
          include: {
            achievement: true,
          },
          orderBy: { completedAt: "desc" },
        })
      : [];

    return NextResponse.json({
      achievements,
      userAchievements,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching achievements:", error);
    return NextResponse.json(
      { error: "Failed to fetch achievements" },
      { status: 500 }
    );
  }
}
