import { NextResponse } from "next/server";
import { withAuth } from "@/lib/api";
import { getUserPermissions } from "@/lib/permissions-server";

/**
 * GET /api/permissions
 *
 * Returns the current user's permissions including:
 * - Global role (user/admin)
 * - Per-app subscription tiers and features
 */
export const GET = withAuth(async (_request, user) => {
  const permissions = await getUserPermissions(user.id);
  return NextResponse.json(permissions);
});
