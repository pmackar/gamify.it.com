import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ locationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { locationId } = await params;

  const location = await prisma.location.findFirst({
    where: {
      id: locationId,
      userId: session.user.id,
    },
    include: {
      city: {
        select: {
          id: true,
          name: true,
          country: true,
        },
      },
      visits: {
        orderBy: { date: "desc" },
        select: {
          id: true,
          date: true,
          overallRating: true,
          foodQuality: true,
          serviceRating: true,
          ambianceRating: true,
          valueRating: true,
          notes: true,
          highlights: true,
        },
      },
    },
  });

  if (!location) {
    return NextResponse.json({ error: "Location not found" }, { status: 404 });
  }

  return NextResponse.json(location);
}
