import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, AuthUser } from "@/lib/auth";
import { Errors, ApiErrorResponse } from "./errors";
import { checkUserTier, checkUserIsAdmin } from "@/lib/permissions-server";

/**
 * Handler function type that receives the authenticated user.
 * Handler can return any NextResponse type (including error responses from validation).
 */
type AuthenticatedHandler = (
  request: NextRequest,
  user: AuthUser
) => Promise<NextResponse>;

/**
 * Handler function type for routes with params
 */
type AuthenticatedHandlerWithParams<P> = (
  request: NextRequest,
  user: AuthUser,
  params: P
) => Promise<NextResponse>;

/**
 * Handler function type for optional auth
 */
type OptionalAuthHandler = (
  request: NextRequest,
  user: AuthUser | null
) => Promise<NextResponse>;

/**
 * Wrap an API route handler with authentication check.
 * Eliminates repetitive auth boilerplate from 100+ routes.
 *
 * @example
 * // Before:
 * export async function GET(request: NextRequest) {
 *   const user = await getAuthUser();
 *   if (!user) {
 *     return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
 *   }
 *   // ... route logic
 * }
 *
 * // After:
 * export const GET = withAuth(async (request, user) => {
 *   // user is guaranteed to be authenticated
 *   return NextResponse.json({ data: "..." });
 * });
 */
export function withAuth(
  handler: AuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse<ApiErrorResponse> | NextResponse> {
  return async (request: NextRequest) => {
    try {
      const user = await getAuthUser();
      if (!user) {
        return Errors.unauthorized();
      }
      return await handler(request, user);
    } catch (error) {
      console.error("API route error:", error);
      return Errors.internal();
    }
  };
}

/**
 * Wrap an API route handler with authentication check and route params.
 * Use for dynamic routes like [id] or [questId].
 *
 * @example
 * export const GET = withAuthParams<{ id: string }>(
 *   async (request, user, { id }) => {
 *     const item = await prisma.items.findFirst({
 *       where: { id, user_id: user.id }
 *     });
 *     return NextResponse.json(item);
 *   }
 * );
 */
export function withAuthParams<P extends Record<string, string>>(
  handler: AuthenticatedHandlerWithParams<P>
): (
  request: NextRequest,
  context: { params: Promise<P> }
) => Promise<NextResponse<ApiErrorResponse> | NextResponse> {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    try {
      const user = await getAuthUser();
      if (!user) {
        return Errors.unauthorized();
      }
      const params = await context.params;
      return await handler(request, user, params);
    } catch (error) {
      console.error("API route error:", error);
      return Errors.internal();
    }
  };
}

/**
 * Optional auth wrapper - user may or may not be authenticated.
 * Useful for routes that have different behavior for logged-in vs anonymous users.
 *
 * @example
 * export const GET = withOptionalAuth(async (request, user) => {
 *   if (user) {
 *     // Return personalized data
 *   } else {
 *     // Return public data
 *   }
 * });
 */
export function withOptionalAuth(
  handler: OptionalAuthHandler
): (request: NextRequest) => Promise<NextResponse<ApiErrorResponse> | NextResponse> {
  return async (request: NextRequest) => {
    try {
      const user = await getAuthUser();
      return await handler(request, user);
    } catch (error) {
      console.error("API route error:", error);
      return Errors.internal();
    }
  };
}

/**
 * Wrap an API route handler with coach-only authentication.
 * Only allows users with COACH tier or ADMIN role.
 *
 * @example
 * export const GET = withCoachAuth(async (request, user) => {
 *   // user is guaranteed to be a coach or admin
 *   return NextResponse.json({ athletes: [...] });
 * });
 */
export function withCoachAuth(
  handler: AuthenticatedHandler
): (request: NextRequest) => Promise<NextResponse<ApiErrorResponse> | NextResponse> {
  return async (request: NextRequest) => {
    try {
      const user = await getAuthUser();
      if (!user) {
        return Errors.unauthorized();
      }
      const [isAdmin, hasCoachTier] = await Promise.all([
        checkUserIsAdmin(user.id),
        checkUserTier(user.id, "fitness", "COACH"),
      ]);
      if (!isAdmin && !hasCoachTier) {
        return Errors.forbidden("Coach or Admin access required");
      }
      return await handler(request, user);
    } catch (error) {
      console.error("API route error:", error);
      return Errors.internal();
    }
  };
}

/**
 * Wrap an API route handler with coach-only authentication and route params.
 * Use for dynamic routes like [athleteId] or [programId].
 *
 * @example
 * export const GET = withCoachAuthParams<{ athleteId: string }>(
 *   async (request, user, { athleteId }) => {
 *     const athlete = await prisma.users.findFirst({ where: { id: athleteId } });
 *     return NextResponse.json(athlete);
 *   }
 * );
 */
export function withCoachAuthParams<P extends Record<string, string>>(
  handler: AuthenticatedHandlerWithParams<P>
): (
  request: NextRequest,
  context: { params: Promise<P> }
) => Promise<NextResponse<ApiErrorResponse> | NextResponse> {
  return async (request: NextRequest, context: { params: Promise<P> }) => {
    try {
      const user = await getAuthUser();
      if (!user) {
        return Errors.unauthorized();
      }
      const [isAdmin, hasCoachTier] = await Promise.all([
        checkUserIsAdmin(user.id),
        checkUserTier(user.id, "fitness", "COACH"),
      ]);
      if (!isAdmin && !hasCoachTier) {
        return Errors.forbidden("Coach or Admin access required");
      }
      const params = await context.params;
      return await handler(request, user, params);
    } catch (error) {
      console.error("API route error:", error);
      return Errors.internal();
    }
  };
}
