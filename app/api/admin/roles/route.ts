import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions-server";
import prisma from "@/lib/db";

/**
 * GET /api/admin/roles
 *
 * Fetch all app features and their tier requirements
 */
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(user.id);

    // Get all app features
    const features = await prisma.app_features.findMany({
      orderBy: [{ app_id: "asc" }, { min_tier: "asc" }, { name: "asc" }],
    });

    // Get subscription counts by tier
    const subscriptionCounts = await prisma.user_subscriptions.groupBy({
      by: ["tier", "app_id"],
      _count: { id: true },
    });

    // Transform to more usable format
    const countsByTierAndApp: Record<string, Record<string, number>> = {};
    subscriptionCounts.forEach((item) => {
      if (!countsByTierAndApp[item.tier]) {
        countsByTierAndApp[item.tier] = {};
      }
      countsByTierAndApp[item.tier][item.app_id] = item._count.id;
    });

    // Group features by app
    const featuresByApp: Record<string, typeof features> = {};
    features.forEach((feature) => {
      if (!featuresByApp[feature.app_id]) {
        featuresByApp[feature.app_id] = [];
      }
      featuresByApp[feature.app_id].push(feature);
    });

    return NextResponse.json({
      features,
      featuresByApp,
      subscriptionCounts: countsByTierAndApp,
      tiers: ["FREE", "PREMIUM", "COACH", "PRO"],
      apps: ["global", "fitness", "today", "travel"],
    });
  } catch (error) {
    console.error("Admin roles error:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles data" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/roles
 *
 * Create a new app feature
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(user.id);

    const body = await request.json();
    const { app_id, feature_key, name, description, min_tier } = body;

    if (!app_id || !feature_key || !name || !min_tier) {
      return NextResponse.json(
        { error: "app_id, feature_key, name, and min_tier are required" },
        { status: 400 }
      );
    }

    const validTiers = ["FREE", "PREMIUM", "COACH", "PRO"];
    if (!validTiers.includes(min_tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    // Check if feature already exists
    const existing = await prisma.app_features.findUnique({
      where: { app_id_feature_key: { app_id, feature_key } },
    });

    if (existing) {
      return NextResponse.json(
        { error: "Feature with this key already exists for this app" },
        { status: 400 }
      );
    }

    const feature = await prisma.app_features.create({
      data: {
        app_id,
        feature_key,
        name,
        description: description || null,
        min_tier,
      },
    });

    return NextResponse.json({ success: true, feature });
  } catch (error) {
    console.error("Create feature error:", error);
    return NextResponse.json(
      { error: "Failed to create feature" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/roles
 *
 * Update an existing app feature
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(user.id);

    const body = await request.json();
    const { id, name, description, min_tier } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const validTiers = ["FREE", "PREMIUM", "COACH", "PRO"];
    if (min_tier && !validTiers.includes(min_tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const updateData: any = {};
    if (name !== undefined) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (min_tier !== undefined) updateData.min_tier = min_tier;

    const feature = await prisma.app_features.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({ success: true, feature });
  } catch (error) {
    console.error("Update feature error:", error);
    return NextResponse.json(
      { error: "Failed to update feature" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/roles
 *
 * Delete an app feature
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(user.id);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    await prisma.app_features.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete feature error:", error);
    return NextResponse.json(
      { error: "Failed to delete feature" },
      { status: 500 }
    );
  }
}
