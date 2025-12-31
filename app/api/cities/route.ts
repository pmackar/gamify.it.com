import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";
import { addXP, updateStreak, updateUserStats, calculateLocationXP } from "@/lib/gamification";
import { checkAchievements } from "@/lib/achievements";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const cities = await prisma.city.findMany({
    where: { userId: session.user.id },
    include: {
      _count: { select: { locations: true } },
    },
    orderBy: { lastVisited: "desc" },
  });

  return NextResponse.json(cities);
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();

  // Check if this is a new country
  const existingCountries = await prisma.city.findMany({
    where: { userId: session.user.id },
    select: { country: true },
    distinct: ["country"],
  });
  const isNewCountry = !existingCountries.some((c: { country: string }) => c.country === body.country);

  // Check if this city already exists
  const existingCity = await prisma.city.findUnique({
    where: {
      userId_name_country: {
        userId: session.user.id,
        name: body.name,
        country: body.country,
      },
    },
  });

  const isNewCity = !existingCity;

  const city = await prisma.city.upsert({
    where: {
      userId_name_country: {
        userId: session.user.id,
        name: body.name,
        country: body.country,
      },
    },
    update: {
      visitCount: { increment: 1 },
      lastVisited: new Date(),
      region: body.region || undefined,
      latitude: body.latitude || undefined,
      longitude: body.longitude || undefined,
    },
    create: {
      userId: session.user.id,
      name: body.name,
      country: body.country,
      region: body.region,
      countryCode: body.countryCode,
      latitude: body.latitude,
      longitude: body.longitude,
      firstVisited: new Date(),
      lastVisited: new Date(),
    },
  });

  // Award XP for new city/country
  let xpGained = 0;
  if (isNewCity) {
    const streak = await updateStreak(session.user.id);
    xpGained += calculateLocationXP("new_city", "OTHER", streak);
    if (isNewCountry) {
      xpGained += calculateLocationXP("new_country", "OTHER", streak);
    }
    await addXP(session.user.id, xpGained);
    await updateUserStats(session.user.id);
  }

  // Check for new achievements
  const newAchievements = await checkAchievements(session.user.id);

  return NextResponse.json({
    city,
    isNewCity,
    isNewCountry,
    xpGained,
    newAchievements,
  });
}
