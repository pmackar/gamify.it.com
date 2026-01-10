import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";
import { Prisma } from "@prisma/client";

// GET /api/fitness/athlete/live-session - Get current live session
export const GET = withAuth(async (_request, user) => {
  const session = await prisma.coaching_live_sessions.findFirst({
    where: { athlete_id: user.id, is_active: true },
  });

  return NextResponse.json({ session });
});

// POST /api/fitness/athlete/live-session - Start or update live session
export const POST = withAuth(async (request, user) => {
  // Get athlete's coaching relationship
  const relationship = await prisma.coaching_relationships.findFirst({
    where: { athlete_id: user.id, status: "ACTIVE" },
  });

  if (!relationship) {
    // No coach, no live session tracking
    return NextResponse.json({ session: null, hasCoach: false });
  }

  const body = await request.json();
  const { workoutName, currentData, action } = body;

  // Handle end session
  if (action === "end") {
    await prisma.coaching_live_sessions.updateMany({
      where: { athlete_id: user.id, is_active: true },
      data: { is_active: false },
    });
    return NextResponse.json({ session: null, ended: true });
  }

  // Find or create active session
  let session = await prisma.coaching_live_sessions.findFirst({
    where: { athlete_id: user.id, is_active: true },
  });

  if (session) {
    // Update existing session
    session = await prisma.coaching_live_sessions.update({
      where: { id: session.id },
      data: {
        workout_name: workoutName || session.workout_name,
        current_data: (currentData as Prisma.InputJsonValue) ?? session.current_data,
        last_activity: new Date(),
      },
    });
  } else {
    // Create new session
    session = await prisma.coaching_live_sessions.create({
      data: {
        athlete_id: user.id,
        coach_id: relationship.coach_id,
        workout_name: workoutName || null,
        current_data: (currentData as Prisma.InputJsonValue) ?? Prisma.JsonNull,
      },
    });
  }

  return NextResponse.json({ session, hasCoach: true });
});

// DELETE /api/fitness/athlete/live-session - End live session
export const DELETE = withAuth(async (_request, user) => {
  await prisma.coaching_live_sessions.updateMany({
    where: { athlete_id: user.id, is_active: true },
    data: { is_active: false },
  });

  return NextResponse.json({ success: true });
});
