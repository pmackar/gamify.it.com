import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { withAuth } from "@/lib/api";
import prisma from "@/lib/db";

const PropsSchema = z.object({
  workoutKey: z.string(), // Format: "userId:workoutId"
  emoji: z.string().optional(),
});

// GET /api/fitness/workout-props - Get props for multiple workouts
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const workoutKeys = searchParams.get("keys")?.split(",") || [];

  if (workoutKeys.length === 0) {
    return NextResponse.json({ props: {} });
  }

  // Get all props for the requested workouts
  const allProps = await prisma.workout_props.findMany({
    where: {
      workout_key: { in: workoutKeys },
    },
    include: {
      giver: {
        select: {
          id: true,
          username: true,
          display_name: true,
          avatar_url: true,
        },
      },
    },
  });

  // Group by workout key
  const propsByWorkout: Record<
    string,
    {
      count: number;
      hasGivenProps: boolean;
      givers: Array<{
        id: string;
        username: string | null;
        displayName: string | null;
        avatarUrl: string | null;
        emoji: string;
      }>;
    }
  > = {};

  for (const key of workoutKeys) {
    const workoutProps = allProps.filter((p) => p.workout_key === key);
    propsByWorkout[key] = {
      count: workoutProps.length,
      hasGivenProps: workoutProps.some((p) => p.giver_id === user.id),
      givers: workoutProps.map((p) => ({
        id: p.giver.id,
        username: p.giver.username,
        displayName: p.giver.display_name,
        avatarUrl: p.giver.avatar_url,
        emoji: p.emoji,
      })),
    };
  }

  return NextResponse.json({ props: propsByWorkout });
});

// POST /api/fitness/workout-props - Give props to a workout
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const parsed = PropsSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { workoutKey, emoji = "🔥" } = parsed.data;

  // Don't allow giving props to your own workout
  const [workoutUserId] = workoutKey.split(":");
  if (workoutUserId === user.id) {
    return NextResponse.json(
      { error: "You cannot give props to your own workout" },
      { status: 400 }
    );
  }

  // Check if already given props
  const existing = await prisma.workout_props.findUnique({
    where: {
      workout_key_giver_id: {
        workout_key: workoutKey,
        giver_id: user.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "You have already given props to this workout" },
      { status: 400 }
    );
  }

  // Create props
  const props = await prisma.workout_props.create({
    data: {
      workout_key: workoutKey,
      giver_id: user.id,
      emoji,
    },
  });

  // Get updated count
  const count = await prisma.workout_props.count({
    where: { workout_key: workoutKey },
  });

  return NextResponse.json({
    success: true,
    id: props.id,
    count,
  });
});

// DELETE /api/fitness/workout-props - Remove props from a workout
export const DELETE = withAuth(async (request: NextRequest, user) => {
  const { searchParams } = new URL(request.url);
  const workoutKey = searchParams.get("key");

  if (!workoutKey) {
    return NextResponse.json(
      { error: "Missing workout key" },
      { status: 400 }
    );
  }

  // Find and delete user's props
  const existing = await prisma.workout_props.findUnique({
    where: {
      workout_key_giver_id: {
        workout_key: workoutKey,
        giver_id: user.id,
      },
    },
  });

  if (!existing) {
    return NextResponse.json(
      { error: "You have not given props to this workout" },
      { status: 404 }
    );
  }

  await prisma.workout_props.delete({
    where: { id: existing.id },
  });

  // Get updated count
  const count = await prisma.workout_props.count({
    where: { workout_key: workoutKey },
  });

  return NextResponse.json({ success: true, count });
});
