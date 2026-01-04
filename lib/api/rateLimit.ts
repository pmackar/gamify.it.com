import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextRequest, NextResponse } from "next/server";
import { Errors } from "./errors";

/**
 * Rate limiter instance using Upstash Redis.
 * Requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN env vars.
 *
 * Falls back to no-op if env vars are not set (development mode).
 */
let ratelimit: Ratelimit | null = null;

// Initialize rate limiter if Upstash credentials are available
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
  });

  ratelimit = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(100, "1 m"), // 100 requests per minute default
    analytics: true,
    prefix: "gamify:ratelimit",
  });
}

/**
 * Rate limit configuration presets
 */
export const RateLimitPresets = {
  /** Standard API rate limit: 100 requests per minute */
  standard: { requests: 100, window: "1 m" as const },

  /** Strict rate limit for auth endpoints: 10 requests per minute */
  auth: { requests: 10, window: "1 m" as const },

  /** Relaxed rate limit for read-heavy endpoints: 200 requests per minute */
  relaxed: { requests: 200, window: "1 m" as const },

  /** Very strict for sensitive operations: 5 requests per minute */
  strict: { requests: 5, window: "1 m" as const },
} as const;

/**
 * Check rate limit for a given identifier.
 * Returns null if within limit, or an error response if exceeded.
 *
 * @param identifier - Unique identifier for the rate limit (e.g., user ID, IP)
 * @param prefix - Optional prefix to namespace the rate limit
 *
 * @example
 * const limited = await checkRateLimit(user.id);
 * if (limited) return limited;
 */
export async function checkRateLimit(
  identifier: string,
  prefix?: string
): Promise<NextResponse | null> {
  // Skip rate limiting if Upstash is not configured (dev mode)
  if (!ratelimit) {
    return null;
  }

  try {
    const key = prefix ? `${prefix}:${identifier}` : identifier;
    const { success, limit, remaining, reset } = await ratelimit.limit(key);

    if (!success) {
      const retryAfter = Math.ceil((reset - Date.now()) / 1000);
      return Errors.rateLimited(retryAfter);
    }

    // Optionally add rate limit headers to response
    // This would need to be handled differently since we return null on success

    return null;
  } catch (error) {
    // Log but don't fail if rate limiting has issues
    console.error("Rate limit check failed:", error);
    return null;
  }
}

/**
 * Get rate limit headers for a successful request.
 * Can be added to response headers to inform clients of their limit status.
 */
export async function getRateLimitHeaders(
  identifier: string,
  prefix?: string
): Promise<Record<string, string> | null> {
  if (!ratelimit) {
    return null;
  }

  try {
    const key = prefix ? `${prefix}:${identifier}` : identifier;
    const { limit, remaining, reset } = await ratelimit.limit(key);

    return {
      "X-RateLimit-Limit": limit.toString(),
      "X-RateLimit-Remaining": Math.max(0, remaining - 1).toString(),
      "X-RateLimit-Reset": reset.toString(),
    };
  } catch {
    return null;
  }
}

/**
 * Extract identifier from request for rate limiting.
 * Uses user ID if authenticated, falls back to IP address.
 */
export function getRateLimitIdentifier(
  request: NextRequest,
  userId?: string
): string {
  if (userId) {
    return `user:${userId}`;
  }

  // Fall back to IP address for unauthenticated requests
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded?.split(",")[0]?.trim() ||
             request.headers.get("x-real-ip") ||
             "unknown";

  return `ip:${ip}`;
}

/**
 * Higher-order function to add rate limiting to a handler.
 *
 * @example
 * export const POST = withRateLimit(
 *   withAuth(async (request, user) => {
 *     // handler logic
 *   }),
 *   "auth" // Use auth preset (stricter limits)
 * );
 */
export function withRateLimit<T extends (...args: unknown[]) => Promise<NextResponse>>(
  handler: T,
  preset: keyof typeof RateLimitPresets = "standard"
): T {
  return (async (...args: Parameters<T>) => {
    const request = args[0] as NextRequest;
    const identifier = getRateLimitIdentifier(request);

    const limited = await checkRateLimit(identifier, preset);
    if (limited) {
      return limited;
    }

    return handler(...args);
  }) as T;
}

/**
 * Check if rate limiting is enabled (Upstash configured).
 */
export function isRateLimitEnabled(): boolean {
  return ratelimit !== null;
}
