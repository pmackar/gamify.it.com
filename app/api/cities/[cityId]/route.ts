import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ cityId: string }> }
) {
  try {
    const user = await requireAuth();
    const { cityId } = await params;

    // Get user's visited locations in this city
    const prismaUser = await prisma.user.findFirst({
      where: { email: user.email },
    });

    if (!prismaUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // cityId is actually the city name for now
    const locations = await prisma.userLocationData.findMany({
      where: {
        userId: prismaUser.id,
        visited: true,
        location: {
          city: cityId,
        },
      },
      include: {
        location: true,
      },
    });

    if (locations.length === 0) {
      return NextResponse.json({ error: "City not found" }, { status: 404 });
    }

    return NextResponse.json({
      city: cityId,
      locations: locations.map((l) => l.location),
      visitCount: locations.length,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching city:", error);
    return NextResponse.json({ error: "Failed to fetch city" }, { status: 500 });
  }
}
