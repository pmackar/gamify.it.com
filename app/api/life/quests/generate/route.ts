import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import prisma from "@/lib/db";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic();

// Check AI usage limits
async function checkAIUsageLimit(userId: string): Promise<{ allowed: boolean; used: number; limit: number }> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get user's subscription tier
  const subscription = await prisma.user_subscriptions.findFirst({
    where: {
      user_id: userId,
      app_id: "life",
      status: "ACTIVE",
    },
  });

  // Limits by tier (per month)
  const limits: Record<string, number> = {
    FREE: 3,
    PREMIUM: 20,
    PRO: 100,
    COACH: 1000,
  };

  const tier = subscription?.tier || "FREE";
  const limit = limits[tier] || 3;

  // Get current usage
  const usage = await prisma.ai_quest_usage.findUnique({
    where: {
      user_id_month: {
        user_id: userId,
        month: monthStart,
      },
    },
  });

  const used = usage?.generation_count || 0;

  return {
    allowed: used < limit,
    used,
    limit,
  };
}

// Increment usage counter
async function incrementAIUsage(userId: string) {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  await prisma.ai_quest_usage.upsert({
    where: {
      user_id_month: {
        user_id: userId,
        month: monthStart,
      },
    },
    update: {
      generation_count: { increment: 1 },
      last_used: now,
    },
    create: {
      user_id: userId,
      month: monthStart,
      generation_count: 1,
      last_used: now,
    },
  });
}

// POST /api/life/quests/generate - AI generates quest from goal
export async function POST(request: NextRequest) {
  const user = await getAuthUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check usage limits
  const usageCheck = await checkAIUsageLimit(user.id);
  if (!usageCheck.allowed) {
    return NextResponse.json(
      {
        error: "AI generation limit reached",
        used: usageCheck.used,
        limit: usageCheck.limit,
        message: `You've used ${usageCheck.used}/${usageCheck.limit} AI generations this month. Upgrade for more!`,
      },
      { status: 429 }
    );
  }

  const body = await request.json();
  const { goal, deadline, hoursPerWeek } = body;

  if (!goal) {
    return NextResponse.json({ error: "Goal is required" }, { status: 400 });
  }

  const systemPrompt = `You are a quest architect for a life gamification app. Transform user goals into epic, actionable quests using the Hero's Journey narrative framework.

You must respond with valid JSON only. No markdown, no code blocks, just pure JSON.

Quest types:
- COUNTING: Goals with numeric targets (read 52 books, run 100 miles)
- COLLECTION: Complete sets (visit every state, try every flavor)
- ACHIEVEMENT: Single milestone goals (get an A, land a job)
- HABIT: Daily/regular practices (meditate, journal)
- PROJECT: Multi-step endeavors (launch app, write book)
- FITNESS: Physical training goals (marathon, muscle up)
- LEARNING: Skill acquisition (language, instrument)

Journey stages for milestones:
- CALLING (0%): Quest begins
- THRESHOLD (25%): First real progress
- TESTS (50%): Challenges emerge
- ORDEAL (75%): The hard middle
- REWARD (90%): Breakthrough
- RETURN (100%): Mastery achieved

Narrator types:
- sage: Wise, encouraging (for learning)
- coach: Motivating, tough love (for fitness)
- explorer: Curious, celebratory (for collections)
- strategist: Analytical, milestone-focused (for projects)`;

  const userPrompt = `Transform this goal into an epic quest:

Goal: "${goal}"
${deadline ? `Deadline: ${deadline}` : ""}
${hoursPerWeek ? `Available hours per week: ${hoursPerWeek}` : ""}

Generate a quest with:
1. A compelling title (creative, not just restating the goal)
2. Quest type classification
3. Story hook (1-2 sentences setting the scene)
4. Narrator type
5. Icon (single emoji)
6. 4-6 milestones mapped to Hero's Journey stages with:
   - Title
   - Journey stage
   - XP reward (50-500 based on difficulty)
   - Mentor message (encouragement)
   - Completion message (celebration)
   - Target count (if applicable)
7. Total XP available
8. For counting quests: target count and unit

Respond with this exact JSON structure:
{
  "title": "string",
  "description": "string",
  "questType": "COUNTING|COLLECTION|ACHIEVEMENT|HABIT|PROJECT|FITNESS|LEARNING",
  "icon": "emoji",
  "storyHook": "string",
  "narratorType": "sage|coach|explorer|strategist",
  "targetCount": number|null,
  "countUnit": "string"|null,
  "totalXpAvailable": number,
  "milestones": [
    {
      "title": "string",
      "description": "string",
      "journeyStage": "CALLING|THRESHOLD|TESTS|ORDEAL|REWARD|RETURN",
      "xpReward": number,
      "bonusXp": number,
      "mentorMessage": "string",
      "completionMessage": "string",
      "targetCount": number|null
    }
  ]
}`;

  try {
    const response = await anthropic.messages.create({
      model: "claude-3-haiku-20240307", // Using Haiku for cost efficiency
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: userPrompt,
        },
      ],
      system: systemPrompt,
    });

    // Extract text content
    const textContent = response.content.find((c) => c.type === "text");
    if (!textContent || textContent.type !== "text") {
      throw new Error("No text response from AI");
    }

    // Parse the JSON response
    let questData;
    try {
      // Try to extract JSON if wrapped in markdown code blocks
      let jsonText = textContent.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json?\n?/g, "").replace(/```$/g, "").trim();
      }
      questData = JSON.parse(jsonText);
    } catch (parseError) {
      console.error("Failed to parse AI response:", textContent.text);
      throw new Error("Failed to parse AI response as JSON");
    }

    // Increment usage counter after successful generation
    await incrementAIUsage(user.id);

    return NextResponse.json({
      quest: {
        ...questData,
        originalGoal: goal,
        aiGenerated: true,
      },
      usage: {
        used: usageCheck.used + 1,
        limit: usageCheck.limit,
      },
    });
  } catch (error: any) {
    console.error("AI generation error:", error);
    return NextResponse.json(
      { error: "Failed to generate quest: " + error.message },
      { status: 500 }
    );
  }
}
