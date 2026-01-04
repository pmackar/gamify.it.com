import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions-server";
import prisma from "@/lib/db";

type SortField = "email" | "main_level" | "total_xp" | "current_streak" | "last_activity_date" | "created_at";
type SortDirection = "asc" | "desc";

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(user.id);

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const search = searchParams.get("search") || "";
    const role = searchParams.get("role") || "all";
    const sortBy = (searchParams.get("sortBy") || "created_at") as SortField;
    const sortDir = (searchParams.get("sortDir") || "desc") as SortDirection;

    const skip = (page - 1) * limit;

    // Build where clause
    const where: any = {};

    if (search) {
      where.OR = [
        { email: { contains: search, mode: "insensitive" } },
        { username: { contains: search, mode: "insensitive" } },
        { display_name: { contains: search, mode: "insensitive" } },
      ];
    }

    // Build orderBy clause
    const validSortFields: SortField[] = ["email", "main_level", "total_xp", "current_streak", "last_activity_date", "created_at"];
    const orderByField = validSortFields.includes(sortBy) ? sortBy : "created_at";
    const orderBy = { [orderByField]: sortDir };

    // Get total count
    const total = await prisma.profiles.count({ where });

    // Get users with their roles
    const users = await prisma.profiles.findMany({
      where,
      select: {
        id: true,
        email: true,
        username: true,
        display_name: true,
        avatar_url: true,
        total_xp: true,
        main_level: true,
        current_streak: true,
        last_activity_date: true,
        created_at: true,
        user_role: {
          select: { role: true },
        },
      },
      orderBy,
      skip,
      take: limit,
    });

    // Transform users to include role at top level
    let transformedUsers = users.map((u) => ({
      id: u.id,
      email: u.email,
      username: u.username,
      display_name: u.display_name,
      avatar_url: u.avatar_url,
      total_xp: u.total_xp,
      main_level: u.main_level,
      current_streak: u.current_streak,
      last_activity_date: u.last_activity_date?.toISOString() || null,
      created_at: u.created_at?.toISOString() || null,
      role: u.user_role?.role || null,
    }));

    // Filter by role if specified
    if (role === "admin") {
      transformedUsers = transformedUsers.filter((u) => u.role === "ADMIN");
    } else if (role === "user") {
      transformedUsers = transformedUsers.filter((u) => u.role !== "ADMIN");
    }

    return NextResponse.json({
      users: transformedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/users
 *
 * Update a user's role
 */
export async function PATCH(request: NextRequest) {
  try {
    const currentUser = await getAuthUser();
    if (!currentUser) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await requireAdmin(currentUser.id);

    const body = await request.json();
    const { userId, role } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!role || !["USER", "ADMIN"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }

    // Prevent self-demotion
    if (userId === currentUser.id && role !== "ADMIN") {
      return NextResponse.json(
        { error: "Cannot remove your own admin role" },
        { status: 400 }
      );
    }

    // Upsert the user role
    await prisma.user_roles.upsert({
      where: { user_id: userId },
      update: { role },
      create: {
        user_id: userId,
        role,
        granted_by: currentUser.id,
      },
    });

    return NextResponse.json({
      success: true,
      userId,
      role,
    });
  } catch (error) {
    console.error("Update user role error:", error);
    return NextResponse.json(
      { error: "Failed to update user role" },
      { status: 500 }
    );
  }
}
