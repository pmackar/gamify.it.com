import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";
import { sendNotification } from "@/lib/notifications";

// Helper to get start of current week (Monday)
function getWeekStart(date: Date = new Date()): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Sunday
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

// GET /api/fitness/athlete/check-ins - Get athlete's check-ins
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const limit = parseInt(searchParams.get("limit") || "10");

  // Get athlete's coaching relationship
  const relationship = await prisma.coaching_relationships.findFirst({
    where: { athlete_id: user.id, status: "ACTIVE" },
  });

  if (!relationship) {
    return NextResponse.json({ checkIns: [], hasCoach: false });
  }

  const checkIns = await prisma.coaching_check_ins.findMany({
    where: { athlete_id: user.id },
    orderBy: { week_of: "desc" },
    take: limit,
  });

  // Check if this week's check-in exists
  const weekStart = getWeekStart();
  const thisWeekCheckIn = checkIns.find(
    (c) => new Date(c.week_of).getTime() === weekStart.getTime()
  );

  return NextResponse.json({
    checkIns,
    hasCoach: true,
    coachId: relationship.coach_id,
    thisWeekSubmitted: !!thisWeekCheckIn,
  });
});

// POST /api/fitness/athlete/check-ins - Submit weekly check-in
export const POST = withAuth(async (request, user) => {
  // Get athlete's coaching relationship
  const relationship = await prisma.coaching_relationships.findFirst({
    where: { athlete_id: user.id, status: "ACTIVE" },
    include: {
      coach: {
        select: { user_id: true },
      },
      athlete: {
        select: { display_name: true },
      },
    },
  });

  if (!relationship) {
    return Errors.forbidden("You don't have an active coach");
  }

  const body = await request.json();
  const {
    energy_level,
    sleep_quality,
    stress_level,
    soreness_level,
    motivation,
    wins,
    challenges,
    questions,
  } = body;

  const weekStart = getWeekStart();

  // Upsert the check-in (allows updating if already submitted)
  const checkIn = await prisma.coaching_check_ins.upsert({
    where: {
      athlete_id_coach_id_week_of: {
        athlete_id: user.id,
        coach_id: relationship.coach_id,
        week_of: weekStart,
      },
    },
    update: {
      energy_level,
      sleep_quality,
      stress_level,
      soreness_level,
      motivation,
      wins: wins?.trim() || null,
      challenges: challenges?.trim() || null,
      questions: questions?.trim() || null,
    },
    create: {
      athlete_id: user.id,
      coach_id: relationship.coach_id,
      week_of: weekStart,
      energy_level,
      sleep_quality,
      stress_level,
      soreness_level,
      motivation,
      wins: wins?.trim() || null,
      challenges: challenges?.trim() || null,
      questions: questions?.trim() || null,
    },
  });

  // Notify coach of new check-in
  const athleteName = relationship.athlete.display_name || "An athlete";
  sendNotification({
    recipientId: relationship.coach.user_id,
    senderId: user.id,
    type: "CHECK_IN_DUE", // Reusing this type for check-in submitted
    title: "Check-In Submitted",
    body: `${athleteName} submitted their weekly check-in`,
    data: { checkInId: checkIn.id },
  }).catch(console.error);

  return NextResponse.json({ checkIn });
});
