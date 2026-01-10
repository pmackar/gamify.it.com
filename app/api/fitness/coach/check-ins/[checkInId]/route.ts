import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";

// GET /api/fitness/coach/check-ins/[checkInId] - Get check-in details
export const GET = withCoachAuthParams<{ checkInId: string }>(
  async (_request, user, { checkInId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const checkIn = await prisma.coaching_check_ins.findFirst({
      where: { id: checkInId, coach_id: coach.id },
      include: {
        athlete: {
          select: {
            id: true,
            display_name: true,
            avatar_url: true,
            email: true,
          },
        },
      },
    });

    if (!checkIn) {
      return Errors.notFound("Check-in not found");
    }

    return NextResponse.json({ checkIn });
  }
);

// PUT /api/fitness/coach/check-ins/[checkInId] - Add coach notes/review
export const PUT = withCoachAuthParams<{ checkInId: string }>(
  async (request, user, { checkInId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const checkIn = await prisma.coaching_check_ins.findFirst({
      where: { id: checkInId, coach_id: coach.id },
    });

    if (!checkIn) {
      return Errors.notFound("Check-in not found");
    }

    const body = await request.json();
    const { coach_notes } = body;

    const updated = await prisma.coaching_check_ins.update({
      where: { id: checkInId },
      data: {
        coach_notes: coach_notes?.trim() || null,
        reviewed_at: new Date(),
      },
    });

    return NextResponse.json({ checkIn: updated });
  }
);
