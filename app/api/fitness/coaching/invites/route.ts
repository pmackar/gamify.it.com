import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/fitness/coaching/invites - Get pending coaching invites for current user
export const GET = withAuth(async (_request, user) => {
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
});
