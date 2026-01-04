import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

interface RouteParams {
  params: Promise<{ questId: string }>;
}

// POST /api/life/quests/[questId]/log - Log progress for counting quests
export async function POST(request: NextRequest, { params }: RouteParams) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { questId } = await params;
  const body = await request.json();
  const { countAdded, notes } = body;

  if (!countAdded || countAdded < 1) {
    return NextResponse.json({ error: "Count must be at least 1" }, { status: 400 });
  }

  // Verify ownership and get quest
  const quest = await prisma.life_quests.findUnique({
    where: { id: questId },
    include: {
      milestones: {
        orderBy: { sort_order: "asc" },
      },
    },
  });

  if (!quest || quest.user_id !== user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  if (quest.status !== "ACTIVE") {
    return NextResponse.json({ error: "Quest is not active" }, { status: 400 });
  }

  // Calculate XP
  const baseXP = 15;
  const criticalHit = Math.random() < 0.1; // 10% chance
  const xpEarned = criticalHit ? baseXP * 2 * countAdded : baseXP * countAdded;

  // Update quest progress
  const newCount = quest.current_count + countAdded;
  const newProgress = quest.target_count
    ? Math.min(100, Math.floor((newCount / quest.target_count) * 100))
    : quest.progress_percent;

  // Determine journey stage based on progress
  let journeyStage = quest.journey_stage;
  if (newProgress === 0) journeyStage = "CALLING";
  else if (newProgress < 25) journeyStage = "THRESHOLD";
  else if (newProgress < 50) journeyStage = "TESTS";
  else if (newProgress < 75) journeyStage = "ORDEAL";
  else if (newProgress < 100) journeyStage = "REWARD";
  else journeyStage = "RETURN";

  // Check for milestone completions
  let milestoneXP = 0;
  const completedMilestones: string[] = [];

  for (const milestone of quest.milestones) {
    if (!milestone.is_completed && milestone.target_count) {
      const newMilestoneProgress = Math.min(milestone.target_count, milestone.current_count + countAdded);
      if (newMilestoneProgress >= milestone.target_count) {
        milestoneXP += milestone.xp_reward + milestone.bonus_xp;
        completedMilestones.push(milestone.id);
      }
    }
  }

  // Is quest complete?
  const isComplete = quest.target_count ? newCount >= quest.target_count : false;
  const completionBonus = isComplete ? 500 : 0;

  // Create log entry
  await prisma.life_quest_logs.create({
    data: {
      quest_id: questId,
      log_date: new Date(),
      count_added: countAdded,
      notes,
      xp_earned: xpEarned,
    },
  });

  // Update quest
  await prisma.life_quests.update({
    where: { id: questId },
    data: {
      current_count: newCount,
      progress_percent: newProgress,
      journey_stage: journeyStage as any,
      xp_earned: { increment: xpEarned + milestoneXP + completionBonus },
      status: isComplete ? "COMPLETED" : undefined,
      completed_at: isComplete ? new Date() : undefined,
      updated_at: new Date(),
    },
  });

  // Update completed milestones
  if (completedMilestones.length > 0) {
    await prisma.life_quest_milestones.updateMany({
      where: { id: { in: completedMilestones } },
      data: {
        is_completed: true,
        completed_at: new Date(),
      },
    });
  }

  // Update user XP
  const totalXP = xpEarned + milestoneXP + completionBonus;
  await prisma.app_profiles.upsert({
    where: {
      user_id_app_id: { user_id: user.id, app_id: "life" },
    },
    update: {
      xp: { increment: totalXP },
    },
    create: {
      user_id: user.id,
      app_id: "life",
      xp: totalXP,
      level: 1,
    },
  });

  // Also update total XP
  await prisma.profiles.update({
    where: { id: user.id },
    data: {
      total_xp: { increment: totalXP },
    },
  });

  return NextResponse.json({
    success: true,
    xpEarned: totalXP,
    criticalHit,
    newCount,
    newProgress,
    journeyStage,
    isComplete,
    milestonesCompleted: completedMilestones.length,
  });
}
