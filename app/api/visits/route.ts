import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { addXP, updateStreak, updateUserStats, calculateLocationXP } from "@/lib/gamification";
import { checkAchievements } from "@/lib/achievements";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const locationId = searchParams.get("locationId");
  const limit = parseInt(searchParams.get("limit") || "50");

  const where: {
    userId: string;
    locationId?: string;
  } = { userId: session.user.id };

  if (locationId) where.locationId = locationId;

  const visits = await prisma.visit.findMany({
    where,
    include: {
      location: {
        select: {
          name: true,
          type: true,
          city: { select: { name: true, country: true } },
        },
      },
      photos: { select: { id: true, url: true, caption: true } },
    },
    orderBy: { date: "desc" },
    take: limit,
  });

  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Validate required fields
  if (!body.locationId || !body.date) {
    return NextResponse.json(
      { error: "Missing required fields: locationId, date" },
      { status: 400 }
    );
  }

  // Get location for XP calculation
  const location = await prisma.location.findUnique({
    where: { id: body.locationId },
    select: { type: true },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  // Determine XP action type based on what's included
  let action = "visit";
  if (body.notes && body.notes.length > 50) {
    action = "visit_with_review";
  } else if (body.overallRating) {
    action = "visit_with_rating";
  }
  // Photo bonus will be added separately when photos are uploaded

  // Calculate XP
  const streak = await updateStreak(session.user.id);
  const xpGained = calculateLocationXP(action, location.type, streak);

  // Create visit
  const visit = await prisma.visit.create({
    data: {
      userId: session.user.id,
      locationId: body.locationId,
      date: new Date(body.date),
      overallRating: body.overallRating,
      foodQuality: body.foodQuality,
      serviceRating: body.serviceRating,
      ambianceRating: body.ambianceRating,
      valueRating: body.valueRating,
      notes: body.notes,
      highlights: body.highlights || [],
      xpEarned: xpGained,
    },
    include: {
      location: {
        select: {
          name: true,
          type: true,
          city: { select: { name: true, country: true } },
        },
      },
    },
  });

  // Update location's average rating
  if (body.overallRating) {
    const locationVisits = await prisma.visit.findMany({
      where: {
        locationId: body.locationId,
        overallRating: { not: null },
      },
      select: { overallRating: true },
    });

    const avgRating =
      locationVisits.reduce((sum: number, v: { overallRating: number | null }) => sum + (v.overallRating || 0), 0) /
      locationVisits.length;

    await prisma.location.update({
      where: { id: body.locationId },
      data: {
        avgRating,
        ratingCount: locationVisits.length,
      },
    });
  }

  // Award XP
  const xpResult = await addXP(session.user.id, xpGained);

  // Update user stats
  await updateUserStats(session.user.id);

  // Check for new achievements
  const newAchievements = await checkAchievements(session.user.id);

  return NextResponse.json({
    visit,
    xpGained,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    newAchievements,
  });
}
