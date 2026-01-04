import { NextResponse } from "next/server";
import { z } from "zod";
import { withAuthParams, Errors } from "@/lib/api";
import prisma from "@/lib/db";

const CreateGoalSchema = z.object({
  type: z.string().min(1),
  title: z.string().min(1).max(100),
  description: z.string().max(500).optional(),
  target: z.number().int().min(1),
  period: z.enum(["day", "week", "month"]).optional(),
  deadline: z.string().datetime().optional(),
});

const UpdateGoalSchema = z.object({
  goalId: z.string().uuid(),
  progress: z.number().int().min(0),
});

const DeleteGoalSchema = z.object({
  goalId: z.string().uuid(),
});

// GET /api/accountability/[id]/goals - Get partnership goals
export const GET = withAuthParams<{ id: string }>(
  async (_request, user, { id }) => {
    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
      include: {
        goals: {
          orderBy: { created_at: "desc" },
        },
      },
    });

    if (!partnership) {
      return Errors.notFound("Partnership not found");
    }

    // Check if user is part of partnership
    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
    }

    const isRequester = partnership.requester_id === user.id;

    return NextResponse.json({
      goals: partnership.goals.map((g) => ({
        id: g.id,
        type: g.type,
        title: g.title,
        description: g.description,
        target: g.target,
        currentUser: isRequester ? g.current_user1 : g.current_user2,
        currentPartner: isRequester ? g.current_user2 : g.current_user1,
        period: g.period,
        deadline: g.deadline?.toISOString(),
        active: g.active,
        createdAt: g.created_at.toISOString(),
      })),
    });
  }
);

// POST /api/accountability/[id]/goals - Add a new goal
export const POST = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const partnership = await prisma.accountability_partnerships.findUnique({
      where: { id },
    });

    if (!partnership) {
      return Errors.notFound("Partnership not found");
    }

    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
    }

    if (partnership.status !== "ACTIVE") {
      return Errors.invalidInput("Partnership is not active");
    }

    const body = await request.json();
    const parsed = CreateGoalSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Type, title, and target are required");
    }

    const { type, title, description, target, period, deadline } = parsed.data;

    const goal = await prisma.partnership_goals.create({
      data: {
        partnership_id: id,
        type,
        title,
        description,
        target,
        period: period || "week",
        deadline: deadline ? new Date(deadline) : null,
      },
    });

    return NextResponse.json({
      goal: {
        id: goal.id,
        type: goal.type,
        title: goal.title,
        target: goal.target,
        period: goal.period,
      },
    });
  }
);

// PUT /api/accountability/[id]/goals - Update goal progress
export const PUT = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const body = await request.json();
    const parsed = UpdateGoalSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Goal ID and progress are required");
    }

    const { goalId, progress } = parsed.data;

    const goal = await prisma.partnership_goals.findUnique({
      where: { id: goalId },
      include: { partnership: true },
    });

    if (!goal) {
      return Errors.notFound("Goal not found");
    }

    if (goal.partnership_id !== id) {
      return Errors.invalidInput("Goal mismatch");
    }

    const partnership = goal.partnership;
    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
    }

    // Update the correct user's progress
    const isRequester = partnership.requester_id === user.id;
    const updateData = isRequester
      ? { current_user1: progress }
      : { current_user2: progress };

    await prisma.partnership_goals.update({
      where: { id: goalId },
      data: updateData,
    });

    return NextResponse.json({ success: true, progress });
  }
);

// DELETE /api/accountability/[id]/goals - Deactivate a goal
export const DELETE = withAuthParams<{ id: string }>(
  async (request, user, { id }) => {
    const body = await request.json();
    const parsed = DeleteGoalSchema.safeParse(body);

    if (!parsed.success) {
      return Errors.invalidInput("Goal ID is required");
    }

    const { goalId } = parsed.data;

    const goal = await prisma.partnership_goals.findUnique({
      where: { id: goalId },
      include: { partnership: true },
    });

    if (!goal) {
      return Errors.notFound("Goal not found");
    }

    if (goal.partnership_id !== id) {
      return Errors.invalidInput("Goal mismatch");
    }

    const partnership = goal.partnership;
    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return Errors.forbidden("Not authorized");
    }

    await prisma.partnership_goals.update({
      where: { id: goalId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  }
);
