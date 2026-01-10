import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth, Errors } from "@/lib/api";
import { sendNotification } from "@/lib/notifications";

// GET /api/fitness/athlete/form-checks - List athlete's form checks
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // pending, reviewed, approved, needs_work
  const limit = parseInt(searchParams.get("limit") || "20");

  // Get athlete's coaching relationship
  const relationship = await prisma.coaching_relationships.findFirst({
    where: { athlete_id: user.id, status: "ACTIVE" },
  });

  if (!relationship) {
    return NextResponse.json({ formChecks: [], hasCoach: false });
  }

  const formChecks = await prisma.coaching_form_checks.findMany({
    where: {
      athlete_id: user.id,
      ...(status ? { status: status.toUpperCase() as any } : {}),
    },
    orderBy: { created_at: "desc" },
    take: limit,
    include: {
      coach: {
        select: {
          business_name: true,
          user: {
            select: {
              display_name: true,
              avatar_url: true,
            },
          },
        },
      },
    },
  });

  return NextResponse.json({
    formChecks,
    hasCoach: true,
    coachId: relationship.coach_id,
  });
});

// POST /api/fitness/athlete/form-checks - Submit new form check
export const POST = withAuth(async (request, user) => {
  // Get athlete's coaching relationship
  const relationship = await prisma.coaching_relationships.findFirst({
    where: { athlete_id: user.id, status: "ACTIVE" },
    include: {
      coach: {
        select: {
          id: true,
          user_id: true,
          business_name: true,
        },
      },
      athlete: {
        select: {
          display_name: true,
        },
      },
    },
  });

  if (!relationship) {
    return Errors.forbidden("You don't have an active coach");
  }

  const body = await request.json();
  const { exerciseName, videoUrl, thumbnailUrl, notes } = body;

  if (!exerciseName?.trim()) {
    return Errors.invalidInput("Exercise name is required");
  }

  if (!videoUrl?.trim()) {
    return Errors.invalidInput("Video URL is required");
  }

  // Validate URL format
  try {
    new URL(videoUrl);
  } catch {
    return Errors.invalidInput("Invalid video URL format");
  }

  const formCheck = await prisma.coaching_form_checks.create({
    data: {
      athlete_id: user.id,
      coach_id: relationship.coach.id,
      exercise_name: exerciseName.trim(),
      video_url: videoUrl.trim(),
      thumbnail_url: thumbnailUrl?.trim() || null,
      athlete_notes: notes?.trim() || null,
    },
  });

  // Notify coach
  const athleteName = relationship.athlete.display_name || "An athlete";
  sendNotification({
    recipientId: relationship.coach.user_id,
    senderId: user.id,
    type: "FORM_CHECK_READY", // Using existing type for form check submitted
    title: "Form Check Submitted",
    body: `${athleteName} submitted a form check for ${exerciseName}`,
    data: { formCheckId: formCheck.id, exerciseName },
  }).catch(console.error);

  return NextResponse.json({ formCheck });
});
