import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { withAuth } from "@/lib/api";

// GET /api/fitness/athlete/program - Get athlete's current program assignment
export const GET = withAuth(async (_request, user) => {
  // Find active coaching relationship
  const relationship = await prisma.coaching_relationships.findFirst({
    where: { athlete_id: user.id, status: "ACTIVE" },
    include: {
      coach: {
        include: {
          user: {
            select: {
              display_name: true,
              email: true,
              avatar_url: true,
            },
          },
        },
      },
    },
  });

  if (!relationship) {
    return NextResponse.json({
      hasCoach: false,
      program: null,
      assignment: null,
    });
  }

  // Find active program assignment
  const assignment = await prisma.coaching_program_assignments.findFirst({
    where: {
      relationship_id: relationship.id,
      status: "active",
    },
    include: {
      program: {
        include: {
          weeks: {
            include: {
              workouts: {
                include: {
                  exercises: {
                    orderBy: { order_index: "asc" },
                  },
                },
                orderBy: { day_number: "asc" },
              },
            },
            orderBy: { week_number: "asc" },
          },
        },
      },
    },
  });

  if (!assignment) {
    return NextResponse.json({
      hasCoach: true,
      coach: {
        id: relationship.coach.id,
        name: relationship.coach.user.display_name || relationship.coach.user.email,
        avatar: relationship.coach.user.avatar_url,
      },
      program: null,
      assignment: null,
    });
  }

  // Check for pending updates (version_synced_at is null but program_version is set)
  const hasPendingUpdate = assignment.program_version !== null && assignment.version_synced_at === null;

  // Get latest version number for comparison
  const latestVersion = await prisma.coaching_program_versions.findFirst({
    where: { program_id: assignment.program_id },
    orderBy: { version: "desc" },
    select: { version: true, notes: true, created_at: true },
  });

  // Check if athlete is behind on version
  const isOutdated = latestVersion
    ? (assignment.program_version || 0) < latestVersion.version
    : false;

  return NextResponse.json({
    hasCoach: true,
    coach: {
      id: relationship.coach.id,
      name: relationship.coach.user.display_name || relationship.coach.user.email,
      avatar: relationship.coach.user.avatar_url,
    },
    program: assignment.program,
    assignment: {
      id: assignment.id,
      startDate: assignment.start_date,
      currentWeek: assignment.current_week,
      status: assignment.status,
      programVersion: assignment.program_version,
      versionSyncedAt: assignment.version_synced_at,
      hasPendingUpdate,
      isOutdated,
      latestVersion: latestVersion
        ? {
            version: latestVersion.version,
            notes: latestVersion.notes,
            createdAt: latestVersion.created_at,
          }
        : null,
    },
  });
});

// POST /api/fitness/athlete/program - Acknowledge program update
export const POST = withAuth(async (request, user) => {
  const body = await request.json();
  const { action } = body;

  if (action !== "acknowledge_update") {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Find active assignment
  const relationship = await prisma.coaching_relationships.findFirst({
    where: { athlete_id: user.id, status: "ACTIVE" },
  });

  if (!relationship) {
    return NextResponse.json({ error: "No coaching relationship" }, { status: 404 });
  }

  const assignment = await prisma.coaching_program_assignments.findFirst({
    where: {
      relationship_id: relationship.id,
      status: "active",
    },
  });

  if (!assignment) {
    return NextResponse.json({ error: "No active program" }, { status: 404 });
  }

  // Mark as synced
  await prisma.coaching_program_assignments.update({
    where: { id: assignment.id },
    data: {
      version_synced_at: new Date(),
      updated_at: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    message: "Program update acknowledged",
  });
});
