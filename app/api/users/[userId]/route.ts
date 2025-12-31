import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ userId: string }>;
}

// GET /api/users/[userId] - Get public user profile
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { userId } = await params;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      image: true,
      level: true,
      xp: true,
      xpToNext: true,
      profilePublic: true,
      createdAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If profile is private, return limited info
  if (!user.profilePublic) {
    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        image: user.image,
        level: user.level,
        profilePublic: false,
      },
      stats: null,
      visitedLocations: [],
    });
  }

  // Get user stats
  const [visitedCount, reviewCount, questCount] = await Promise.all([
    prisma.userLocationData.count({
      where: { userId, visited: true },
    }),
    prisma.review.count({
      where: { authorId: userId, status: "APPROVED" },
    }),
    prisma.quest.count({
      where: { userId, status: "COMPLETED" },
    }),
  ]);

  // Get user's visited locations (public)
  const visitedLocations = await prisma.userLocationData.findMany({
    where: {
      userId,
      visited: true,
    },
    include: {
      location: {
        select: {
          id: true,
          name: true,
          type: true,
          latitude: true,
          longitude: true,
          city: {
            select: { id: true, name: true, country: true },
          },
        },
      },
    },
    orderBy: { lastVisitedAt: "desc" },
    take: 20,
  });

  return NextResponse.json({
    user: {
      id: user.id,
      name: user.name,
      image: user.image,
      level: user.level,
      xp: user.xp,
      xpToNext: user.xpToNext,
      profilePublic: user.profilePublic,
      createdAt: user.createdAt,
    },
    stats: {
      visitedCount,
      reviewCount,
      questCount,
    },
    visitedLocations: visitedLocations.map((vl) => ({
      ...vl.location,
      visitedAt: vl.lastVisitedAt,
    })),
  });
}
