import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// GET /api/life/quests/[questId] - Get quest details
export async function GET(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questId } = await params;

  const quest = await prisma.life_quests.findUnique({
    where: { id: questId },
    include: {
      milestones: {
        orderBy: { sort_order: "asc" },
        include: {
          tasks: {
            orderBy: { sort_order: "asc" },
          },
        },
      },
      tasks: {
        where: { milestone_id: null },
        orderBy: { sort_order: "asc" },
      },
      logs: {
        orderBy: { log_date: "desc" },
        take: 10,
      },
      template: {
        select: { name: true, icon: true },
      },
    },
  });

  if (!quest) {
    return NextResponse.json({ error: "Quest not found" }, { status: 404 });
  }

  // Verify ownership
  if (quest.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  return NextResponse.json({
    quest: {
      id: quest.id,
      title: quest.title,
      description: quest.description,
      originalGoal: quest.original_goal,
      questType: quest.quest_type,
      journeyStage: quest.journey_stage,
      narratorType: quest.narrator_type,
      storyHook: quest.story_hook,
      icon: quest.quest_icon || quest.template?.icon,
      status: quest.status,
      progressPercent: quest.progress_percent,
      targetCount: quest.target_count,
      currentCount: quest.current_count,
      countUnit: quest.count_unit,
      startDate: quest.start_date?.toISOString(),
      targetDate: quest.target_date?.toISOString(),
      xpEarned: quest.xp_earned,
      totalXpAvailable: quest.total_xp_available,
      aiGenerated: quest.ai_generated,
      createdAt: quest.created_at.toISOString(),
      completedAt: quest.completed_at?.toISOString(),
      milestones: quest.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        journeyStage: m.journey_stage,
        sortOrder: m.sort_order,
        isCompleted: m.is_completed,
        completedAt: m.completed_at?.toISOString(),
        targetCount: m.target_count,
        currentCount: m.current_count,
        xpReward: m.xp_reward,
        bonusXp: m.bonus_xp,
        mentorMessage: m.mentor_message,
        completionMessage: m.completion_message,
        tasks: m.tasks.map((t) => ({
          id: t.id,
          title: t.title,
          description: t.description,
          difficulty: t.difficulty,
          estimatedMinutes: t.estimated_minutes,
          dueDate: t.due_date?.toISOString(),
          isRecurring: t.is_recurring,
          isCompleted: t.is_completed,
          completedAt: t.completed_at?.toISOString(),
          targetCount: t.target_count,
          currentCount: t.current_count,
          xpValue: t.xp_value,
          xpEarned: t.xp_earned,
          criticalHit: t.critical_hit,
        })),
      })),
      standaloneTasks: quest.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        description: t.description,
        difficulty: t.difficulty,
        isCompleted: t.is_completed,
        xpValue: t.xp_value,
      })),
      recentLogs: quest.logs.map((l) => ({
        id: l.id,
        date: l.log_date.toISOString(),
        countAdded: l.count_added,
        notes: l.notes,
        xpEarned: l.xp_earned,
      })),
    },
  });
}

// PATCH /api/life/quests/[questId] - Update quest
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questId } = await params;
  const body = await request.json();

  // Verify ownership
  const quest = await prisma.life_quests.findUnique({
    where: { id: questId },
    select: { user_id: true },
  });

  if (!quest || quest.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  const { status, currentCount, progressPercent } = body;

  // Calculate journey stage based on progress
  let journeyStage: string | undefined;
  const progress = progressPercent ?? 0;
  if (progress === 0) journeyStage = "CALLING";
  else if (progress < 25) journeyStage = "THRESHOLD";
  else if (progress < 50) journeyStage = "TESTS";
  else if (progress < 75) journeyStage = "ORDEAL";
  else if (progress < 100) journeyStage = "REWARD";
  else journeyStage = "RETURN";

  const updatedQuest = await prisma.life_quests.update({
    where: { id: questId },
    data: {
      status: status as any,
      current_count: currentCount,
      progress_percent: progressPercent,
      journey_stage: journeyStage as any,
      completed_at: status === "COMPLETED" ? new Date() : undefined,
      updated_at: new Date(),
    },
  });

  return NextResponse.json({
    quest: {
      id: updatedQuest.id,
      status: updatedQuest.status,
      journeyStage: updatedQuest.journey_stage,
      progressPercent: updatedQuest.progress_percent,
    },
  });
}

// DELETE /api/life/quests/[questId] - Delete/abandon quest
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questId } = await params;

  // Verify ownership
  const quest = await prisma.life_quests.findUnique({
    where: { id: questId },
    select: { user_id: true },
  });

  if (!quest || quest.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  await prisma.life_quests.delete({
    where: { id: questId },
  });

  return NextResponse.json({ success: true });
}
