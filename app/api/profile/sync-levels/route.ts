import { NextResponse } from "next/server";
import prisma from "@/lib/db";
import { calculateLevelFromTotalXP } from "@/lib/gamification";

// GET /api/profile/sync-levels - Recalculate main_level for all profiles (for easy browser access)
export async function GET() {
  return syncLevels();
}

// POST /api/profile/sync-levels - Recalculate main_level for all profiles from total_xp
export async function POST() {
  return syncLevels();
}

async function syncLevels() {
  try {
    // Get all profiles with their total_xp
    const profiles = await prisma.profiles.findMany({
      select: {
        id: true,
        total_xp: true,
        main_level: true,
      },
    });

    let updated = 0;
    const updates: Array<{ id: string; oldLevel: number; newLevel: number; totalXp: number }> = [];

    for (const profile of profiles) {
      const totalXp = profile.total_xp || 0;
      const currentLevel = profile.main_level || 1;
      const { level: correctLevel } = calculateLevelFromTotalXP(totalXp);

      if (currentLevel !== correctLevel) {
        await prisma.profiles.update({
          where: { id: profile.id },
          data: { main_level: correctLevel },
        });
        updates.push({
          id: profile.id,
          oldLevel: currentLevel,
          newLevel: correctLevel,
          totalXp,
        });
        updated++;
      }
    }

    return NextResponse.json({
      success: true,
      totalProfiles: profiles.length,
      updated,
      updates,
    });
  } catch (error) {
    console.error("Error syncing profile levels:", error);
    return NextResponse.json(
      { error: "Failed to sync profile levels" },
      { status: 500 }
    );
  }
}
