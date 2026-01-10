import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// POST /api/fitness/coach/groups/[groupId]/members - Add members to group
export const POST = withCoachAuthParams<{ groupId: string }>(
  async (request, user, { groupId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const group = await prisma.coaching_groups.findFirst({
      where: { id: groupId, coach_id: coach.id },
    });

    if (!group) {
      return Errors.notFound("Group not found");
    }

    const body = await request.json();
    const { athleteIds } = body;

    if (!athleteIds?.length) {
      return Errors.invalidInput("athleteIds is required");
    }

    // Verify all athletes are coached by this coach
    const relationships = await prisma.coaching_relationships.findMany({
      where: {
        coach_id: coach.id,
        athlete_id: { in: athleteIds },
        status: "ACTIVE",
      },
    });

    const validAthleteIds = relationships.map((r) => r.athlete_id);

    // Get existing members to avoid duplicates
    const existingMembers = await prisma.coaching_group_members.findMany({
      where: { group_id: groupId },
      select: { athlete_id: true },
    });
    const existingIds = new Set(existingMembers.map((m) => m.athlete_id));

    // Filter to only new, valid athletes
    const newAthleteIds = validAthleteIds.filter((id) => !existingIds.has(id));

    if (newAthleteIds.length > 0) {
      await prisma.coaching_group_members.createMany({
        data: newAthleteIds.map((athleteId) => ({
          group_id: groupId,
          athlete_id: athleteId,
        })),
      });
    }

    return NextResponse.json({
      success: true,
      added: newAthleteIds.length,
      skipped: athleteIds.length - newAthleteIds.length,
    });
  }
);

// DELETE /api/fitness/coach/groups/[groupId]/members - Remove members from group
export const DELETE = withCoachAuthParams<{ groupId: string }>(
  async (request, user, { groupId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const group = await prisma.coaching_groups.findFirst({
      where: { id: groupId, coach_id: coach.id },
    });

    if (!group) {
      return Errors.notFound("Group not found");
    }

    const body = await request.json();
    const { athleteIds } = body;

    if (!athleteIds?.length) {
      return Errors.invalidInput("athleteIds is required");
    }

    const result = await prisma.coaching_group_members.deleteMany({
      where: {
        group_id: groupId,
        athlete_id: { in: athleteIds },
      },
    });

    return NextResponse.json({
      success: true,
      removed: result.count,
    });
  }
);
