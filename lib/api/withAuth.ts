import { NextRequest, NextResponse } from "next/server";
import { getAuthUser, AuthUser } from "@/lib/auth";
import { Errors, ApiErrorResponse } from "./errors";

/**
 * Handler function type that receives the authenticated user
 */
type AuthenticatedHandler<T> = (
  request: NextRequest,
  user: AuthUser
) => Promise<NextResponse<T>>;

/**
 * Handler function type for routes with params
 */
type AuthenticatedHandlerWithParams<T, P> = (
  request: NextRequest,
  user: AuthUser,
  params: P
) => Promise<NextResponse<T>>;

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
export function withAuth<T>(
  handler: AuthenticatedHandler<T>
): (request: NextRequest) => Promise<NextResponse<T | ApiErrorResponse>> {
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
 * export const GET = withAuthParams<ResponseType, { id: string }>(
 *   async (request, user, { id }) => {
 *     const item = await prisma.items.findFirst({
 *       where: { id, user_id: user.id }
 *     });
 *     return NextResponse.json(item);
 *   }
 * );
 */
export function withAuthParams<T, P extends Record<string, string>>(
  handler: AuthenticatedHandlerWithParams<T, P>
): (
  request: NextRequest,
  context: { params: Promise<P> }
) => Promise<NextResponse<T | ApiErrorResponse>> {
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
export function withOptionalAuth<T>(
  handler: (
    request: NextRequest,
    user: AuthUser | null
  ) => Promise<NextResponse<T>>
): (request: NextRequest) => Promise<NextResponse<T | ApiErrorResponse>> {
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
