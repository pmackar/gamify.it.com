import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const user = await requireAuth();

    // Find the Prisma user by email for legacy data access
    const prismaUser = await prisma.user.findFirst({
      where: { email: user.email },
      select: {
        id: true,
        username: true,
        email: true,
        avatarUrl: true,
        bio: true,
        totalXp: true,
        level: true,
        createdAt: true,
      },
    });

    // Get stats from UserLocationData
    const stats = prismaUser
      ? await Promise.all([
          prisma.userLocationData.count({
            where: { userId: prismaUser.id, visited: true },
          }),
          prisma.review.count({
            where: { authorId: prismaUser.id },
          }),
          prisma.userAchievement.count({
            where: { userId: prismaUser.id, isCompleted: true },
          }),
        ])
      : [0, 0, 0];

    const [visitedCount, reviewsCount, achievementsCount] = stats;

    return NextResponse.json({
      character: {
        name: user.display_name || user.username || "Traveler",
        email: user.email,
        avatar: user.avatar_url,
        level: user.main_level || 1,
        xp: user.total_xp || 0,
        currentStreak: user.current_streak || 0,
        longestStreak: user.longest_streak || 0,
        memberSince: user.created_at,
      },
      stats: {
        locations: visitedCount,
        reviews: reviewsCount,
        achievements: achievementsCount,
      },
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
