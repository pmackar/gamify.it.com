import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Note: Not filtering by user_id (personal app)
    const cities = await prisma.travel_cities.findMany({
      include: {
        locations: {
          select: { id: true },
        },
        neighborhoods: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      cities.map((city) => ({
        id: city.id,
        name: city.name,
        country: city.country,
        region: city.region,
        countryCode: city.country_code,
        latitude: city.latitude,
        longitude: city.longitude,
        firstVisited: city.first_visited,
        lastVisited: city.last_visited,
        visitCount: city.visit_count,
        notes: city.notes,
        locationCount: city.locations.length,
        neighborhoods: city.neighborhoods.map((n) => ({
          id: n.id,
          name: n.name,
        })),
      }))
    );
  } catch (error) {
    console.error("Error fetching cities:", error);
    return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, country, region, countryCode, latitude, longitude, notes } = body;

    if (!name || !country) {
      return NextResponse.json(
        { error: "Name and country are required" },
        { status: 400 }
      );
    }

    // Check if city already exists for this user
    const existing = await prisma.travel_cities.findFirst({
      where: {
        user_id: user.id,
        name,
        country,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "City already exists" },
        { status: 409 }
      );
    }

    const city = await prisma.travel_cities.create({
      data: {
        user_id: user.id,
        name,
        country,
        region,
        country_code: countryCode,
        latitude,
        longitude,
        notes,
        first_visited: new Date(),
      },
    });

    return NextResponse.json({
      id: city.id,
      name: city.name,
      country: city.country,
      region: city.region,
      countryCode: city.country_code,
      latitude: city.latitude,
      longitude: city.longitude,
      notes: city.notes,
    });
  } catch (error) {
    console.error("Error creating city:", error);
    return NextResponse.json({ error: "Failed to create city" }, { status: 500 });
  }
}
