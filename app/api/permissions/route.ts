import { NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth';
import { getUserPermissions } from '@/lib/permissions-server';

/**
 * GET /api/permissions
 *
 * Returns the current user's permissions including:
 * - Global role (user/admin)
 * - Per-app subscription tiers and features
 */
export async function GET() {
  try {
    const authUser = await getAuthUser();

    if (!authUser) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const permissions = await getUserPermissions(authUser.id);

    return NextResponse.json(permissions);
  } catch (error) {
    console.error('Error fetching permissions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch permissions' },
      { status: 500 }
    );
  }
}
