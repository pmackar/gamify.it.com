import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// POST /api/fitness/coach/register - Register as a coach
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if already a coach
    const existingCoach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (existingCoach) {
      return NextResponse.json(
        { error: "Already registered as a coach", coach: existingCoach },
        { status: 400 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { business_name, specializations, bio } = body;

    // Create coach profile
    const coachProfile = await prisma.coach_profiles.create({
      data: {
        user_id: user.id,
        business_name: business_name || null,
        specializations: specializations || [],
        bio: bio || null,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            display_name: true,
            avatar_url: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      coach: coachProfile,
    });
  } catch (error) {
    console.error("Error registering as coach:", error);
    return NextResponse.json(
      { error: "Failed to register as coach" },
      { status: 500 }
    );
  }
}
