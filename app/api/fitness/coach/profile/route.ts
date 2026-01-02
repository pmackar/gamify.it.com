import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/fitness/coach/profile - Get current user's coach profile
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            display_name: true,
            username: true,
            avatar_url: true,
            main_level: true,
            total_xp: true,
          },
        },
        athletes: {
          where: { status: "ACTIVE" },
          select: { id: true },
        },
      },
    });

    if (!coachProfile) {
      return NextResponse.json(
        { error: "Not registered as a coach" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      coach: {
        ...coachProfile,
        athlete_count: coachProfile.athletes.length,
      },
    });
  } catch (error) {
    console.error("Error fetching coach profile:", error);
    return NextResponse.json(
      { error: "Failed to fetch coach profile" },
      { status: 500 }
    );
  }
}

// PUT /api/fitness/coach/profile - Update coach profile
export async function PUT(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return NextResponse.json(
        { error: "Not registered as a coach" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const { business_name, specializations, bio, max_athletes } = body;

    const updated = await prisma.coach_profiles.update({
      where: { id: coachProfile.id },
      data: {
        ...(business_name !== undefined && { business_name }),
        ...(specializations !== undefined && { specializations }),
        ...(bio !== undefined && { bio }),
        ...(max_athletes !== undefined && { max_athletes }),
        updated_at: new Date(),
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            display_name: true,
            username: true,
            avatar_url: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      coach: updated,
    });
  } catch (error) {
    console.error("Error updating coach profile:", error);
    return NextResponse.json(
      { error: "Failed to update coach profile" },
      { status: 500 }
    );
  }
}
