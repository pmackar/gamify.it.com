import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withCoachAuthParams, Errors } from "@/lib/api";
import { sendNotification } from "@/lib/notifications";
import { form_check_status } from "@prisma/client";

// GET /api/fitness/coach/form-checks/[formCheckId] - Get single form check
export const GET = withCoachAuthParams<{ formCheckId: string }>(
  async (_request, user, { formCheckId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const formCheck = await prisma.coaching_form_checks.findFirst({
      where: { id: formCheckId, coach_id: coach.id },
      include: {
        athlete: {
          select: {
            id: true,
            display_name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    if (!formCheck) {
      return Errors.notFound("Form check not found");
    }

    return NextResponse.json({ formCheck });
  }
);

// PUT /api/fitness/coach/form-checks/[formCheckId] - Review form check
export const PUT = withCoachAuthParams<{ formCheckId: string }>(
  async (request, user, { formCheckId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
      include: {
        user: { select: { display_name: true } },
      },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const formCheck = await prisma.coaching_form_checks.findFirst({
      where: { id: formCheckId, coach_id: coach.id },
    });

    if (!formCheck) {
      return Errors.notFound("Form check not found");
    }

    const body = await request.json();
    const { status, feedback, feedbackVideoUrl, rating } = body;

    // Validate status
    const validStatuses: form_check_status[] = ["PENDING", "REVIEWED", "APPROVED", "NEEDS_WORK"];
    if (status && !validStatuses.includes(status)) {
      return Errors.invalidInput("Invalid status");
    }

    // Validate rating
    if (rating !== undefined && (rating < 1 || rating > 5)) {
      return Errors.invalidInput("Rating must be between 1 and 5");
    }

    const updated = await prisma.coaching_form_checks.update({
      where: { id: formCheckId },
      data: {
        status: status || formCheck.status,
        coach_feedback: feedback?.trim() || formCheck.coach_feedback,
        feedback_video_url: feedbackVideoUrl?.trim() || formCheck.feedback_video_url,
        rating: rating ?? formCheck.rating,
        reviewed_at: status && status !== "PENDING" ? new Date() : formCheck.reviewed_at,
      },
      include: {
        athlete: {
          select: {
            id: true,
            display_name: true,
            email: true,
            avatar_url: true,
          },
        },
      },
    });

    // Notify athlete if status changed from pending
    if (status && status !== "PENDING" && formCheck.status === "PENDING") {
      const coachName = coach.business_name || coach.user.display_name || "Your coach";
      const statusLabel =
        status === "APPROVED"
          ? "approved your form"
          : status === "NEEDS_WORK"
          ? "has feedback on your form"
          : "reviewed your form";

      sendNotification({
        recipientId: formCheck.athlete_id,
        senderId: user.id,
        type: "FORM_CHECK_READY",
        title: "Form Check Reviewed",
        body: `${coachName} ${statusLabel} for ${formCheck.exercise_name}`,
        data: { formCheckId, status, exerciseName: formCheck.exercise_name },
      }).catch(console.error);
    }

    return NextResponse.json({ formCheck: updated });
  }
);

// DELETE /api/fitness/coach/form-checks/[formCheckId] - Delete form check
export const DELETE = withCoachAuthParams<{ formCheckId: string }>(
  async (_request, user, { formCheckId }) => {
    const coach = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coach) {
      return Errors.forbidden("Not registered as a coach");
    }

    const formCheck = await prisma.coaching_form_checks.findFirst({
      where: { id: formCheckId, coach_id: coach.id },
    });

    if (!formCheck) {
      return Errors.notFound("Form check not found");
    }

    await prisma.coaching_form_checks.delete({
      where: { id: formCheckId },
    });

    return NextResponse.json({ success: true });
  }
);
