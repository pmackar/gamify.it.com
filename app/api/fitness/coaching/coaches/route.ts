import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/fitness/coaching/coaches - Get my coaches (as an athlete)
export const GET = withAuth(async (_request, user) => {
  const relationships = await prisma.coaching_relationships.findMany({
      where: {
        athlete_id: user.id,
        status: { in: ["ACTIVE", "PAUSED"] },
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
        assignments: {
          where: { status: "active" },
          include: {
            program: {
              select: {
                id: true,
                name: true,
                duration_weeks: true,
                goal: true,
              },
            },
          },
          take: 1,
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { accepted_at: "desc" },
    });

    const coaches = relationships.map((rel) => ({
      relationship_id: rel.id,
      status: rel.status,
      accepted_at: rel.accepted_at,
      coach: {
        id: rel.coach.id,
        business_name: rel.coach.business_name,
        specializations: rel.coach.specializations,
        bio: rel.coach.bio,
        is_verified: rel.coach.is_verified,
        user: rel.coach.user,
      },
      current_program: rel.assignments[0]?.program || null,
      current_assignment: rel.assignments[0] || null,
    }));

  return NextResponse.json({ coaches });
});
