import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const cityId = searchParams.get("cityId");

  const neighborhoods = await prisma.neighborhood.findMany({
    where: {
      userId: session.user.id,
      ...(cityId && { cityId }),
    },
    include: {
      city: {
        select: {
          id: true,
          name: true,
          country: true,
        },
      },
      _count: {
        select: {
          locations: true,
        },
      },
    },
    orderBy: { name: "asc" },
  });

  return NextResponse.json(neighborhoods);
}
