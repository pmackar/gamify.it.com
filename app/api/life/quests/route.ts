import { NextResponse } from "next/server";
import { withAuth, Errors } from "@/lib/api";
import prisma from "@/lib/db";

// GET /api/life/quests - List user's quests
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status"); // ACTIVE, COMPLETED, etc.

  const quests = await prisma.life_quests.findMany({
    where: {
      user_id: user.id,
      ...(status ? { status: status as any } : {}),
    },
    include: {
      milestones: {
        orderBy: { sort_order: "asc" },
      },
      tasks: {
        where: { is_completed: false },
        take: 5,
        orderBy: { sort_order: "asc" },
      },
      template: {
        select: { name: true, icon: true },
      },
    },
    orderBy: { updated_at: "desc" },
  });

  return NextResponse.json({
    quests: quests.map((q) => ({
      id: q.id,
      title: q.title,
      description: q.description,
      questType: q.quest_type,
      journeyStage: q.journey_stage,
      status: q.status,
      progressPercent: q.progress_percent,
      targetCount: q.target_count,
      currentCount: q.current_count,
      countUnit: q.count_unit,
      startDate: q.start_date?.toISOString(),
      targetDate: q.target_date?.toISOString(),
      xpEarned: q.xp_earned,
      totalXpAvailable: q.total_xp_available,
      icon: q.quest_icon || q.template?.icon,
      storyHook: q.story_hook,
      aiGenerated: q.ai_generated,
      milestones: q.milestones.map((m) => ({
        id: m.id,
        title: m.title,
        journeyStage: m.journey_stage,
        isCompleted: m.is_completed,
        xpReward: m.xp_reward,
      })),
      pendingTasks: q.tasks.map((t) => ({
        id: t.id,
        title: t.title,
        dueDate: t.due_date?.toISOString(),
      })),
      createdAt: q.created_at.toISOString(),
    })),
  });
});

// POST /api/life/quests - Create new quest
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const {
    title,
    description,
    originalGoal,
    questType,
    targetCount,
    countUnit,
    startDate,
    targetDate,
    icon,
    storyHook,
    narratorType,
    milestones,
    totalXpAvailable,
    aiGenerated,
    templateId,
  } = body;

  if (!title || !questType) {
    return Errors.invalidInput("Title and quest type are required");
  }

  // Create the quest with milestones
  const quest = await prisma.life_quests.create({
    data: {
      user_id: user.id,
      title,
      description,
      original_goal: originalGoal || title,
      quest_type: questType,
      target_count: targetCount,
      count_unit: countUnit,
      start_date: startDate ? new Date(startDate) : new Date(),
      target_date: targetDate ? new Date(targetDate) : null,
      quest_icon: icon,
      story_hook: storyHook,
      narrator_type: narratorType,
      total_xp_available: totalXpAvailable || 1000,
      ai_generated: aiGenerated || false,
      template_id: templateId,
      status: "ACTIVE",
      milestones: milestones?.length
        ? {
            create: milestones.map((m: any, i: number) => ({
              title: m.title,
              description: m.description,
              journey_stage: m.journeyStage || "CALLING",
              sort_order: i,
              target_count: m.targetCount,
              xp_reward: m.xpReward || 100,
              bonus_xp: m.bonusXp || 0,
              mentor_message: m.mentorMessage,
              completion_message: m.completionMessage,
            })),
          }
        : undefined,
    },
    include: {
      milestones: true,
    },
  });

  // Award XP for starting a quest
  await prisma.app_profiles.upsert({
    where: {
      user_id_app_id: { user_id: user.id, app_id: "life" },
    },
    update: {
      xp: { increment: 25 },
    },
    create: {
      user_id: user.id,
      app_id: "life",
      xp: 25,
      level: 1,
    },
  });

  return NextResponse.json({
    quest: {
      id: quest.id,
      title: quest.title,
      status: quest.status,
      journeyStage: quest.journey_stage,
    },
    xpAwarded: 25,
  });
});
