import { NextRequest, NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cityId = searchParams.get("cityId");

    const where: { user_id: string; city_id?: string } = { user_id: user.id };
    if (cityId) {
      where.city_id = cityId;
    }

    const neighborhoods = await prisma.travel_neighborhoods.findMany({
      where,
      include: {
        city: {
          select: { id: true, name: true, country: true },
        },
        locations: {
          select: { id: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return NextResponse.json(
      neighborhoods.map((n) => ({
        id: n.id,
        name: n.name,
        description: n.description,
        latitude: n.latitude,
        longitude: n.longitude,
        cityId: n.city_id,
        city: n.city,
        locationCount: n.locations.length,
      }))
    );
  } catch (error) {
    console.error("Error fetching neighborhoods:", error);
    return NextResponse.json({ error: "Failed to fetch neighborhoods" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { name, description, cityId, latitude, longitude } = body;

    if (!name || !cityId) {
      return NextResponse.json(
        { error: "Name and cityId are required" },
        { status: 400 }
      );
    }

    // Verify user owns the city
    const city = await prisma.travel_cities.findFirst({
      where: { id: cityId, user_id: user.id },
    });

    if (!city) {
      return NextResponse.json(
        { error: "City not found" },
        { status: 404 }
      );
    }

    // Check if neighborhood already exists
    const existing = await prisma.travel_neighborhoods.findFirst({
      where: {
        user_id: user.id,
        city_id: cityId,
        name,
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Neighborhood already exists in this city" },
        { status: 409 }
      );
    }

    const neighborhood = await prisma.travel_neighborhoods.create({
      data: {
        user_id: user.id,
        city_id: cityId,
        name,
        description,
        latitude,
        longitude,
      },
    });

    return NextResponse.json({
      id: neighborhood.id,
      name: neighborhood.name,
      description: neighborhood.description,
      latitude: neighborhood.latitude,
      longitude: neighborhood.longitude,
      cityId: neighborhood.city_id,
    });
  } catch (error) {
    console.error("Error creating neighborhood:", error);
    return NextResponse.json({ error: "Failed to create neighborhood" }, { status: 500 });
  }
}
