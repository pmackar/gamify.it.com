import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// GET /api/accountability/[id]/goals - Get partnership goals
export async function GET(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const partnership = await prisma.accountability_partnerships.findUnique({
    where: { id },
    include: {
      goals: {
        orderBy: { created_at: "desc" },
      },
    },
  });

  if (!partnership) {
    return NextResponse.json(
      { error: "Partnership not found" },
      { status: 404 }
    );
  }

  // Check if user is part of partnership
  if (
    partnership.requester_id !== user.id &&
    partnership.partner_id !== user.id
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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

// POST /api/accountability/[id]/goals - Add a new goal
export async function POST(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  const partnership = await prisma.accountability_partnerships.findUnique({
    where: { id },
  });

  if (!partnership) {
    return NextResponse.json(
      { error: "Partnership not found" },
      { status: 404 }
    );
  }

  if (
    partnership.requester_id !== user.id &&
    partnership.partner_id !== user.id
  ) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  if (partnership.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "Partnership is not active" },
      { status: 400 }
    );
  }

  try {
    const body = await request.json();
    const { type, title, description, target, period, deadline } = body;

    if (!type || !title || !target) {
      return NextResponse.json(
        { error: "Type, title, and target are required" },
        { status: 400 }
      );
    }

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
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { error: "Failed to create goal" },
      { status: 500 }
    );
  }
}

// PUT /api/accountability/[id]/goals - Update goal progress
export async function PUT(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { goalId, progress } = body;

    if (!goalId || progress === undefined) {
      return NextResponse.json(
        { error: "Goal ID and progress are required" },
        { status: 400 }
      );
    }

    const goal = await prisma.partnership_goals.findUnique({
      where: { id: goalId },
      include: { partnership: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (goal.partnership_id !== id) {
      return NextResponse.json({ error: "Goal mismatch" }, { status: 400 });
    }

    const partnership = goal.partnership;
    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
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
  } catch (error) {
    console.error("Error updating goal:", error);
    return NextResponse.json(
      { error: "Failed to update goal" },
      { status: 500 }
    );
  }
}

// DELETE /api/accountability/[id]/goals - Deactivate a goal
export async function DELETE(request: NextRequest, context: RouteContext) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;

  try {
    const body = await request.json();
    const { goalId } = body;

    if (!goalId) {
      return NextResponse.json(
        { error: "Goal ID is required" },
        { status: 400 }
      );
    }

    const goal = await prisma.partnership_goals.findUnique({
      where: { id: goalId },
      include: { partnership: true },
    });

    if (!goal) {
      return NextResponse.json({ error: "Goal not found" }, { status: 404 });
    }

    if (goal.partnership_id !== id) {
      return NextResponse.json({ error: "Goal mismatch" }, { status: 400 });
    }

    const partnership = goal.partnership;
    if (
      partnership.requester_id !== user.id &&
      partnership.partner_id !== user.id
    ) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    await prisma.partnership_goals.update({
      where: { id: goalId },
      data: { active: false },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting goal:", error);
    return NextResponse.json(
      { error: "Failed to delete goal" },
      { status: 500 }
    );
  }
}
