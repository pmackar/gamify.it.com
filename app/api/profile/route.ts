import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user with all stats
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      level: true,
      xp: true,
      xpToNext: true,
      totalCities: true,
      totalLocations: true,
      totalVisits: true,
      currentStreak: true,
      longestStreak: true,
      lastActiveDate: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get countries count
  const countries = await prisma.city.findMany({
    where: { userId: session.user.id },
    select: { country: true },
    distinct: ["country"],
  });

  // Get neighborhoods count
  const neighborhoodsCount = await prisma.neighborhood.count({
    where: { userId: session.user.id },
  });

  // Get location type breakdown
  const locationsByType = await prisma.location.groupBy({
    by: ["type"],
    where: { userId: session.user.id },
    _count: true,
  });

  // Get visited vs hotlist counts
  const visitedCount = await prisma.location.count({
    where: { userId: session.user.id, visited: true },
  });

  const hotlistCount = await prisma.location.count({
    where: { userId: session.user.id, hotlist: true },
  });

  // Get ratings stats
  const ratingsStats = await prisma.visit.aggregate({
    where: {
      userId: session.user.id,
      overallRating: { not: null },
    },
    _avg: { overallRating: true },
    _count: { overallRating: true },
  });

  // Get achievements
  const achievements = await prisma.userAchievement.findMany({
    where: { userId: session.user.id },
    include: {
      achievement: true,
    },
    orderBy: { unlockedAt: "desc" },
  });

  const totalAchievements = await prisma.achievement.count();

  // Get recent visits (last 5)
  const recentVisits = await prisma.visit.findMany({
    where: { userId: session.user.id },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          type: true,
          city: { select: { name: true } },
        },
      },
    },
    orderBy: { date: "desc" },
    take: 5,
  });

  // Get top rated locations
  const topLocations = await prisma.location.findMany({
    where: {
      userId: session.user.id,
      avgRating: { not: null },
    },
    select: {
      id: true,
      name: true,
      type: true,
      avgRating: true,
      city: { select: { name: true } },
    },
    orderBy: { avgRating: "desc" },
    take: 5,
  });

  // Calculate total XP earned (sum of all XP from level ups)
  const totalXPEarned = calculateTotalXP(user.level, user.xp);

  // Calculate days since joining
  const daysSinceJoining = Math.floor(
    (Date.now() - new Date(user.createdAt).getTime()) / (1000 * 60 * 60 * 24)
  );

  return NextResponse.json({
    character: {
      name: user.name || "Traveler",
      email: user.email,
      avatar: user.image,
      level: user.level,
      xp: user.xp,
      xpToNext: user.xpToNext,
      totalXPEarned,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      lastActive: user.lastActiveDate,
      memberSince: user.createdAt,
      daysSinceJoining,
    },
    stats: {
      countries: countries.length,
      cities: user.totalCities,
      neighborhoods: neighborhoodsCount,
      locations: user.totalLocations,
      visits: user.totalVisits,
      visited: visitedCount,
      hotlist: hotlistCount,
      reviews: ratingsStats._count.overallRating,
      avgRating: ratingsStats._avg.overallRating,
    },
    locationsByType: locationsByType.map((l) => ({
      type: l.type,
      count: l._count,
    })),
    achievements: {
      unlocked: achievements.length,
      total: totalAchievements,
      list: achievements.map((ua) => ({
        id: ua.achievement.id,
        code: ua.achievement.code,
        name: ua.achievement.name,
        description: ua.achievement.description,
        icon: ua.achievement.icon,
        tier: ua.achievement.tier,
        unlockedAt: ua.unlockedAt,
      })),
    },
    recentVisits: recentVisits.map((v) => ({
      id: v.id,
      date: v.date,
      rating: v.overallRating,
      location: v.location,
    })),
    topLocations,
  });
}

// Calculate total XP earned across all levels
function calculateTotalXP(level: number, currentXP: number): number {
  let total = currentXP;
  let xpRequired = 100;

  for (let i = 1; i < level; i++) {
    total += xpRequired;
    xpRequired = Math.floor(xpRequired * 1.5);
  }

  return total;
}
