import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { addXP, updateStreak, updateUserStats, calculateLocationXP } from "@/lib/gamification";
import { checkAchievements } from "@/lib/achievements";

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/locations/[id]/user-data - Get user's data for this location
export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: locationId } = await params;

  const userLocationData = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: session.user.id,
        locationId,
      },
    },
  });

  if (!userLocationData) {
    // Return default values if no record exists
    return NextResponse.json({
      hotlist: false,
      visited: false,
      personalRating: null,
      notes: null,
      visitCount: 0,
      firstVisitedAt: null,
      lastVisitedAt: null,
    });
  }

  return NextResponse.json(userLocationData);
}

// POST /api/locations/[id]/user-data - Update user's data for this location
export async function POST(request: NextRequest, { params }: RouteParams) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: locationId } = await params;
  const body = await request.json();

  // Verify location exists
  const location = await prisma.location.findUnique({
    where: { id: locationId },
    select: { id: true, type: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Get existing user data
  const existingData = await prisma.userLocationData.findUnique({
    where: {
      userId_locationId: {
        userId: session.user.id,
        locationId,
      },
    },
  });

  const wasVisited = existingData?.visited ?? false;
  const newVisited = body.visited ?? wasVisited;
  const isFirstVisit = !wasVisited && newVisited;

  // Upsert user location data
  const userLocationData = await prisma.userLocationData.upsert({
    where: {
      userId_locationId: {
        userId: session.user.id,
        locationId,
      },
    },
    update: {
      ...(body.hotlist !== undefined && { hotlist: body.hotlist }),
      ...(body.visited !== undefined && { visited: body.visited }),
      ...(body.personalRating !== undefined && { personalRating: body.personalRating }),
      ...(body.notes !== undefined && { notes: body.notes }),
      // Update visit timestamps if marking as visited
      ...(isFirstVisit && {
        firstVisitedAt: new Date(),
        lastVisitedAt: new Date(),
        visitCount: { increment: 1 },
      }),
    },
    create: {
      userId: session.user.id,
      locationId,
      hotlist: body.hotlist ?? false,
      visited: body.visited ?? false,
      personalRating: body.personalRating ?? null,
      notes: body.notes ?? null,
      visitCount: body.visited ? 1 : 0,
      firstVisitedAt: body.visited ? new Date() : null,
      lastVisitedAt: body.visited ? new Date() : null,
    },
  });

  // Award XP for first visit
  let xpGained = 0;
  let xpResult = { leveledUp: false, newLevel: 0 };
  let newAchievements: unknown[] = [];

  if (isFirstVisit) {
    // Update location's total visits count
    await prisma.location.update({
      where: { id: locationId },
      data: { totalVisits: { increment: 1 } },
    });

    // Award XP
    const streak = await updateStreak(session.user.id);
    xpGained = calculateLocationXP("first_visit", location.type, streak);
    xpResult = await addXP(session.user.id, xpGained);

    // Update user stats
    await updateUserStats(session.user.id);

    // Check for new achievements
    newAchievements = await checkAchievements(session.user.id);
  }

  return NextResponse.json({
    ...userLocationData,
    xpGained,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    newAchievements,
  });
}
