import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";

// GET /api/fitness/coach/programs - List all programs for coach
export async function GET(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get coach profile
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  // Get all programs with summary info
  const programs = await prisma.coaching_programs.findMany({
    where: { coach_id: coach.id },
    include: {
      weeks: {
        include: {
          workouts: {
            select: { id: true, name: true, rest_day: true },
          },
        },
        orderBy: { week_number: "asc" },
      },
      assignments: {
        where: { status: "active" },
        select: { id: true },
      },
    },
    orderBy: { updated_at: "desc" },
  });

  // Transform for response
  const result = programs.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    duration_weeks: p.duration_weeks,
    difficulty: p.difficulty,
    goal: p.goal,
    goal_priorities: p.goal_priorities,
    is_template: p.is_template,
    created_at: p.created_at,
    updated_at: p.updated_at,
    active_assignments: p.assignments.length,
    total_workouts: p.weeks.reduce(
      (sum, w) => sum + w.workouts.filter((wo) => !wo.rest_day).length,
      0
    ),
  }));

  return NextResponse.json({ programs: result });
}

// POST /api/fitness/coach/programs - Create new program
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get coach profile
  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  const body = await request.json();
  const { name, description, duration_weeks, difficulty, goal, goalPriorities, is_template } = body;

  if (!name || !duration_weeks) {
    return NextResponse.json(
      { error: "Name and duration are required" },
      { status: 400 }
    );
  }

  // Support both legacy goal and new goalPriorities
  const primaryGoal = goalPriorities?.[0] || goal || null;

  // Create program with empty weeks
  const program = await prisma.coaching_programs.create({
    data: {
      coach_id: coach.id,
      name,
      description: description || null,
      duration_weeks,
      difficulty: difficulty || null,
      goal: primaryGoal,
      goal_priorities: goalPriorities || null,
      is_template: is_template || false,
      weeks: {
        create: Array.from({ length: duration_weeks }, (_, i) => ({
          week_number: i + 1,
          name: `Week ${i + 1}`,
          workouts: {
            create: Array.from({ length: 7 }, (_, j) => ({
              day_number: j + 1,
              name: j < 3 ? `Day ${j + 1}` : "",
              rest_day: j >= 3, // Default: 3 workout days, 4 rest days
            })),
          },
        })),
      },
    },
    include: {
      weeks: {
        include: {
          workouts: {
            orderBy: { day_number: "asc" },
          },
        },
        orderBy: { week_number: "asc" },
      },
    },
  });

  return NextResponse.json({ program }, { status: 201 });
}
