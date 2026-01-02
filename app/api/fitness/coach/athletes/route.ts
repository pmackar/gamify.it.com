import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";

// GET /api/fitness/coach/athletes - List coached athletes
export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
    });

    if (!coachProfile) {
      return NextResponse.json(
        { error: "Not registered as a coach" },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || "ACTIVE";

    const relationships = await prisma.coaching_relationships.findMany({
      where: {
        coach_id: coachProfile.id,
        ...(status !== "all" && { status: status as any }),
      },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            display_name: true,
            username: true,
            avatar_url: true,
            main_level: true,
            total_xp: true,
          },
        },
        assignments: {
          where: { status: "active" },
          include: {
            program: {
              select: {
                id: true,
                name: true,
                duration_weeks: true,
              },
            },
          },
          take: 1,
          orderBy: { created_at: "desc" },
        },
      },
      orderBy: { accepted_at: "desc" },
    });

    // Get fitness data for each athlete to show last workout
    const athleteIds = relationships.map((r) => r.athlete_id);
    const fitnessData = await prisma.gamify_fitness_data.findMany({
      where: { user_id: { in: athleteIds } },
      select: { user_id: true, data: true, updated_at: true },
    });

    const fitnessDataMap = new Map(
      fitnessData.map((fd) => [fd.user_id, fd])
    );

    const athletes = relationships.map((rel) => {
      const fitness = fitnessDataMap.get(rel.athlete_id);
      const fitnessJson = fitness?.data as any;
      const lastWorkout = fitnessJson?.workouts?.[0];

      return {
        relationship_id: rel.id,
        status: rel.status,
        invited_at: rel.invited_at,
        accepted_at: rel.accepted_at,
        coach_notes: rel.coach_notes,
        athlete: rel.athlete,
        current_program: rel.assignments[0]?.program || null,
        current_assignment: rel.assignments[0] || null,
        fitness_summary: fitnessJson
          ? {
              level: fitnessJson.profile?.level || 1,
              total_workouts: fitnessJson.workouts?.length || 0,
              last_workout_date: lastWorkout?.endTime || lastWorkout?.startTime,
            }
          : null,
      };
    });

    return NextResponse.json({ athletes });
  } catch (error) {
    console.error("Error fetching athletes:", error);
    return NextResponse.json(
      { error: "Failed to fetch athletes" },
      { status: 500 }
    );
  }
}

// POST /api/fitness/coach/athletes - Invite an athlete
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const coachProfile = await prisma.coach_profiles.findUnique({
      where: { user_id: user.id },
      include: {
        athletes: {
          where: { status: "ACTIVE" },
        },
      },
    });

    if (!coachProfile) {
      return NextResponse.json(
        { error: "Not registered as a coach" },
        { status: 404 }
      );
    }

    // Check athlete limit
    if (coachProfile.athletes.length >= coachProfile.max_athletes) {
      return NextResponse.json(
        { error: `Maximum athlete limit (${coachProfile.max_athletes}) reached` },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { athlete_id, email, username } = body;

    // Find athlete by ID, email, or username
    let athlete;
    if (athlete_id) {
      athlete = await prisma.profiles.findUnique({
        where: { id: athlete_id },
      });
    } else if (email) {
      athlete = await prisma.profiles.findUnique({
        where: { email },
      });
    } else if (username) {
      athlete = await prisma.profiles.findUnique({
        where: { username },
      });
    }

    if (!athlete) {
      return NextResponse.json(
        { error: "Athlete not found" },
        { status: 404 }
      );
    }

    // Can't coach yourself
    if (athlete.id === user.id) {
      return NextResponse.json(
        { error: "You cannot coach yourself" },
        { status: 400 }
      );
    }

    // Check for existing relationship
    const existingRelationship = await prisma.coaching_relationships.findUnique({
      where: {
        coach_id_athlete_id: {
          coach_id: coachProfile.id,
          athlete_id: athlete.id,
        },
      },
    });

    if (existingRelationship) {
      if (existingRelationship.status === "ACTIVE") {
        return NextResponse.json(
          { error: "Already coaching this athlete" },
          { status: 400 }
        );
      }
      if (existingRelationship.status === "PENDING") {
        return NextResponse.json(
          { error: "Invitation already pending" },
          { status: 400 }
        );
      }
      // If ended/paused, allow re-invitation by updating
      const updated = await prisma.coaching_relationships.update({
        where: { id: existingRelationship.id },
        data: {
          status: "PENDING",
          invited_at: new Date(),
          accepted_at: null,
          ended_at: null,
        },
        include: {
          athlete: {
            select: {
              id: true,
              email: true,
              display_name: true,
              username: true,
              avatar_url: true,
            },
          },
        },
      });

      // Create activity notification
      await prisma.activity_feed.create({
        data: {
          user_id: athlete.id,
          actor_id: user.id,
          type: "PARTY_INVITE_RECEIVED", // Reusing for coaching invite
          entity_type: "coaching",
          entity_id: updated.id,
          metadata: {
            coach_name: coachProfile.business_name || user.email,
            type: "coaching_invite",
          },
        },
      });

      return NextResponse.json({
        success: true,
        relationship: updated,
        message: "Re-invited athlete",
      });
    }

    // Create new relationship
    const relationship = await prisma.coaching_relationships.create({
      data: {
        coach_id: coachProfile.id,
        athlete_id: athlete.id,
        status: "PENDING",
      },
      include: {
        athlete: {
          select: {
            id: true,
            email: true,
            display_name: true,
            username: true,
            avatar_url: true,
          },
        },
      },
    });

    // Create activity notification
    await prisma.activity_feed.create({
      data: {
        user_id: athlete.id,
        actor_id: user.id,
        type: "PARTY_INVITE_RECEIVED", // Reusing existing type
        entity_type: "coaching",
        entity_id: relationship.id,
        metadata: {
          coach_name: coachProfile.business_name || user.email,
          type: "coaching_invite",
        },
      },
    });

    return NextResponse.json({
      success: true,
      relationship,
      message: "Invitation sent",
    });
  } catch (error) {
    console.error("Error inviting athlete:", error);
    return NextResponse.json(
      { error: "Failed to invite athlete" },
      { status: 500 }
    );
  }
}
