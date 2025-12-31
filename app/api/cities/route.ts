import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

// Note: City model may need to be updated to use Location model
// This is a stub for now to fix auth migration

export async function GET() {
  try {
    const user = await requireAuth();

    // Get unique cities from user's visited locations
    const prismaUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    if (!prismaUser) {
      return NextResponse.json([]);
    }

    // Get distinct cities from user's location data
    const cities = await prisma.userLocationData.findMany({
      where: {
        userId: prismaUser.id,
        visited: true,
      },
      include: {
        location: {
          select: {
            city: true,
            state: true,
            country: true,
          },
        },
      },
    });

    // Group by city
    type CityData = { city: string; state: string | null; country: string };
    const uniqueCities = cities.reduce((acc: CityData[], ul) => {
      const city = ul.location.city;
      if (city && !acc.find((c: CityData) => c.city === city && c.country === ul.location.country)) {
        acc.push({
          city: city,
          state: ul.location.state,
          country: ul.location.country,
        });
      }
      return acc;
    }, []);

    return NextResponse.json(uniqueCities);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching cities:", error);
    return NextResponse.json({ error: "Failed to fetch cities" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    // This endpoint needs to be refactored to work with the Location model
    // For now, return a placeholder response
    return NextResponse.json({
      message: "City creation needs to be refactored to use Location model",
      city: body.name,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating city:", error);
    return NextResponse.json({ error: "Failed to create city" }, { status: 500 });
  }
}
