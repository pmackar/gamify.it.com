import { NextRequest, NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { requireAdmin } from "@/lib/permissions-server";
import prisma from "@/lib/db";

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
      orderBy: { created_at: "desc" },
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
      created_at: u.created_at.toISOString(),
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
