import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ neighborhoodId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { neighborhoodId } = await params;

  const neighborhood = await prisma.neighborhood.findFirst({
    where: {
      id: neighborhoodId,
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
      locations: {
        select: {
          id: true,
          name: true,
          type: true,
          avgRating: true,
          visited: true,
          hotlist: true,
        },
        orderBy: { name: "asc" },
      },
    },
  });

  if (!neighborhood) {
    return NextResponse.json({ error: "Neighborhood not found" }, { status: 404 });
  }

  return NextResponse.json(neighborhood);
}
