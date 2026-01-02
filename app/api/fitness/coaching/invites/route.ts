import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/fitness/coaching/invites - Get pending coaching invites for current user
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const invites = await prisma.coaching_relationships.findMany({
      where: {
        athlete_id: user.id,
        status: "PENDING",
      },
      include: {
        coach: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                display_name: true,
                username: true,
                avatar_url: true,
                main_level: true,
              },
            },
          },
        },
      },
      orderBy: { invited_at: "desc" },
    });

    const formattedInvites = invites.map((invite) => ({
      id: invite.id,
      invited_at: invite.invited_at,
      coach: {
        id: invite.coach.id,
        business_name: invite.coach.business_name,
        specializations: invite.coach.specializations,
        bio: invite.coach.bio,
        is_verified: invite.coach.is_verified,
        user: invite.coach.user,
      },
    }));

    return NextResponse.json({ invites: formattedInvites });
  } catch (error) {
    console.error("Error fetching coaching invites:", error);
    return NextResponse.json(
      { error: "Failed to fetch invites" },
      { status: 500 }
    );
  }
}
