import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db";
import { getUser } from "@/lib/auth";
import Anthropic from "@anthropic-ai/sdk";
import { EXERCISES, EXERCISE_TIERS } from "@/lib/fitness/data";

const anthropic = new Anthropic();

interface GenerateRequest {
  goal: "strength" | "hypertrophy" | "endurance" | "general";
  durationWeeks: number;
  daysPerWeek: number;
  experienceLevel: "beginner" | "intermediate" | "advanced";
  equipment: string[];
  focusAreas?: string[];
  includeDeload?: boolean;
  progressionType?: string;
  programName?: string;
}

// POST /api/fitness/coach/programs/generate - Generate a program using AI
export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const coach = await prisma.coach_profiles.findUnique({
    where: { user_id: user.id },
  });

  if (!coach) {
    return NextResponse.json({ error: "Not a coach" }, { status: 403 });
  }

  const body: GenerateRequest = await request.json();
  const {
    goal,
    durationWeeks,
    daysPerWeek,
    experienceLevel,
    equipment,
    focusAreas,
    includeDeload,
    progressionType,
    programName,
  } = body;

  // Validate inputs
  if (!goal || !durationWeeks || !daysPerWeek || !experienceLevel) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // Build exercise list by tier for the prompt
  const exercisesByTier = {
    tier1: EXERCISE_TIERS.tier1.map((id) => {
      const ex = EXERCISES.find((e) => e.id === id);
      return ex ? { id, name: ex.name, muscle: ex.muscle } : null;
    }).filter(Boolean),
    tier2: EXERCISE_TIERS.tier2.map((id) => {
      const ex = EXERCISES.find((e) => e.id === id);
      return ex ? { id, name: ex.name, muscle: ex.muscle } : null;
    }).filter(Boolean),
    tier3: EXERCISES.filter(
      (e) => !EXERCISE_TIERS.tier1.includes(e.id) && !EXERCISE_TIERS.tier2.includes(e.id)
    ).map((ex) => ({ id: ex.id, name: ex.name, muscle: ex.muscle })),
  };

  const prompt = `You are an expert strength and conditioning coach. Generate a ${durationWeeks}-week training program with the following specifications:

GOAL: ${goal}
EXPERIENCE LEVEL: ${experienceLevel}
TRAINING DAYS PER WEEK: ${daysPerWeek}
AVAILABLE EQUIPMENT: ${equipment.join(", ") || "full gym"}
${focusAreas?.length ? `FOCUS AREAS: ${focusAreas.join(", ")}` : ""}
${includeDeload ? "Include a deload week at the end" : ""}

AVAILABLE EXERCISES BY TIER:
- TIER 1 (Primary compounds - prioritize these): ${exercisesByTier.tier1.map((e: any) => `${e.name} (${e.id})`).join(", ")}
- TIER 2 (Secondary compounds): ${exercisesByTier.tier2.map((e: any) => `${e.name} (${e.id})`).join(", ")}
- TIER 3 (Accessories): ${exercisesByTier.tier3.slice(0, 30).map((e: any) => `${e.name} (${e.id})`).join(", ")}

GUIDELINES:
1. Each workout should have 4-6 exercises
2. Start with Tier 1 compounds, then Tier 2, then Tier 3 accessories
3. For ${experienceLevel} level:
   - Beginner: 2-3 sets per exercise, 8-12 reps
   - Intermediate: 3-4 sets per exercise, 6-12 reps
   - Advanced: 4-5 sets per exercise, 4-10 reps
4. Include appropriate rest days
5. Balance push/pull/legs appropriately
6. For ${goal} goal, prioritize:
   - Strength: lower reps (3-6), higher intensity
   - Hypertrophy: moderate reps (8-12), moderate intensity
   - Endurance: higher reps (12-20), lower intensity

Return a JSON object with this exact structure:
{
  "name": "Program name",
  "description": "Brief description",
  "weeks": [
    {
      "week_number": 1,
      "name": "Week name (optional)",
      "workouts": [
        {
          "day_number": 1,
          "name": "Workout name (e.g., 'Push Day A')",
          "rest_day": false,
          "exercises": [
            {
              "exercise_id": "bench_press",
              "exercise_name": "Bench Press",
              "sets": 4,
              "reps_min": 6,
              "reps_max": 8,
              "intensity": "RPE 8",
              "rest_seconds": 180,
              "notes": "Focus on chest contraction"
            }
          ]
        },
        {
          "day_number": 2,
          "name": "Rest",
          "rest_day": true,
          "exercises": []
        }
      ]
    }
  ]
}

IMPORTANT:
- Use EXACT exercise_id values from the list above
- Include all 7 days for each week (including rest days)
- Return ONLY valid JSON, no markdown or explanation`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 8000,
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    // Extract JSON from response
    const content = message.content[0];
    if (content.type !== "text") {
      return NextResponse.json(
        { error: "Unexpected response format" },
        { status: 500 }
      );
    }

    let programData;
    try {
      // Try to parse the response directly
      programData = JSON.parse(content.text);
    } catch {
      // Try to extract JSON from markdown code block
      const jsonMatch = content.text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        programData = JSON.parse(jsonMatch[1].trim());
      } else {
        throw new Error("Could not parse AI response as JSON");
      }
    }

    // Create the program in the database
    const program = await prisma.$transaction(async (tx) => {
      // Create program
      const newProgram = await tx.coaching_programs.create({
        data: {
          coach_id: coach.id,
          name: programName || programData.name || `${goal} Program`,
          description: programData.description,
          duration_weeks: durationWeeks,
          difficulty: experienceLevel,
          goal,
          progression_config: progressionType
            ? { type: progressionType }
            : { type: "linear", weightIncrement: 5, deloadThreshold: 3, deloadPercent: 0.1 },
        },
      });

      // Create weeks
      for (const week of programData.weeks) {
        const newWeek = await tx.coaching_program_weeks.create({
          data: {
            program_id: newProgram.id,
            week_number: week.week_number,
            name: week.name || null,
          },
        });

        // Create workouts for this week
        for (const workout of week.workouts) {
          const newWorkout = await tx.coaching_workouts.create({
            data: {
              week_id: newWeek.id,
              day_number: workout.day_number,
              name: workout.name || (workout.rest_day ? "Rest" : "Workout"),
              rest_day: workout.rest_day || false,
            },
          });

          // Create exercises for this workout
          if (workout.exercises && workout.exercises.length > 0) {
            await tx.coaching_workout_exercises.createMany({
              data: workout.exercises.map((ex: any, i: number) => ({
                workout_id: newWorkout.id,
                exercise_id: ex.exercise_id,
                exercise_name: ex.exercise_name,
                order_index: i,
                sets: ex.sets || 3,
                reps_min: ex.reps_min || 8,
                reps_max: ex.reps_max || null,
                intensity: ex.intensity || null,
                rest_seconds: ex.rest_seconds || 90,
                notes: ex.notes || null,
              })),
            });
          }
        }
      }

      return newProgram;
    });

    return NextResponse.json({ program, generated: programData }, { status: 201 });
  } catch (error: any) {
    console.error("Error generating program:", error);
    return NextResponse.json(
      { error: error.message || "Failed to generate program" },
      { status: 500 }
    );
  }
}
