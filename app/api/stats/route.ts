import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get user with stats
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
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

  // Get location type breakdown
  const locationsByType = await prisma.location.groupBy({
    by: ["type"],
    where: { userId: session.user.id },
    _count: true,
  });

  // Get recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentVisits = await prisma.visit.count({
    where: {
      userId: session.user.id,
      date: { gte: thirtyDaysAgo },
    },
  });

  // Get achievements count
  const achievements = await prisma.userAchievement.count({
    where: { userId: session.user.id },
  });

  const totalAchievements = await prisma.achievement.count();

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
      city: { select: { name: true, country: true } },
    },
    orderBy: { avgRating: "desc" },
    take: 5,
  });

  // Get visit history for chart (last 12 months)
  const twelveMonthsAgo = new Date();
  twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12);

  const visitHistory = await prisma.visit.findMany({
    where: {
      userId: session.user.id,
      date: { gte: twelveMonthsAgo },
    },
    select: {
      date: true,
    },
    orderBy: { date: "asc" },
  });

  // Group visits by month
  const visitsByMonth: Record<string, number> = {};
  visitHistory.forEach((visit: { date: Date }) => {
    const monthKey = `${visit.date.getFullYear()}-${String(visit.date.getMonth() + 1).padStart(2, "0")}`;
    visitsByMonth[monthKey] = (visitsByMonth[monthKey] || 0) + 1;
  });

  return NextResponse.json({
    user: {
      level: user.level,
      xp: user.xp,
      xpToNext: user.xpToNext,
      currentStreak: user.currentStreak,
      longestStreak: user.longestStreak,
      memberSince: user.createdAt,
    },
    counts: {
      cities: user.totalCities,
      locations: user.totalLocations,
      visits: user.totalVisits,
      countries: countries.length,
      recentVisits,
    },
    achievements: {
      unlocked: achievements,
      total: totalAchievements,
    },
    locationsByType: locationsByType.map((l: { type: string; _count: number }) => ({
      type: l.type,
      count: l._count,
    })),
    topLocations,
    visitsByMonth,
  });
}
