import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { addXP, updateStreak, updateUserStats, calculateLocationXP } from "@/lib/gamification";
import { checkAchievements } from "@/lib/achievements";
import { LocationType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");
  const type = searchParams.get("type") as LocationType | null;
  const noNeighborhood = searchParams.get("noNeighborhood") === "true";

  const where: {
    userId: string;
    cityId?: string;
    type?: LocationType;
    neighborhoodId?: null;
  } = { userId: session.user.id };

  if (cityId) where.cityId = cityId;
  if (type) where.type = type;
  if (noNeighborhood) where.neighborhoodId = null;

  const locations = await prisma.location.findMany({
    where,
    include: {
      city: { select: { name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
      _count: { select: { visits: true, photos: true } },
    },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json(locations);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Validate required fields
  if (!body.name || !body.type || !body.cityId || body.latitude === undefined || body.longitude === undefined) {
    return NextResponse.json(
      { error: "Missing required fields: name, type, cityId, latitude, longitude" },
      { status: 400 }
    );
  }

  // Create location
  const location = await prisma.location.create({
    data: {
      userId: session.user.id,
      cityId: body.cityId,
      name: body.name,
      type: body.type,
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      description: body.description,
      website: body.website,
      phone: body.phone,
      priceLevel: body.priceLevel,
      tags: body.tags || [],
    },
    include: {
      city: { select: { name: true, country: true } },
    },
  });

  // Update city location count
  await prisma.city.update({
    where: { id: body.cityId },
    data: { locationCount: { increment: 1 } },
  });

  // Calculate and award XP
  const streak = await updateStreak(session.user.id);
  const xpGained = calculateLocationXP("new_location", body.type, streak);
  const xpResult = await addXP(session.user.id, xpGained);

  // Update user stats
  await updateUserStats(session.user.id);

  // Check for new achievements
  const newAchievements = await checkAchievements(session.user.id);

  return NextResponse.json({
    location,
    xpGained,
    leveledUp: xpResult.leveledUp,
    newLevel: xpResult.newLevel,
    newAchievements,
  });
}
