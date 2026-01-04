import { NextResponse } from "next/server";

/**
 * Standard API error response format
 */
export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Standard error codes used across API routes
 */
export const ErrorCodes = {
  // Auth errors
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",

  // Validation errors
  VALIDATION_FAILED: "VALIDATION_FAILED",
  INVALID_INPUT: "INVALID_INPUT",
  MISSING_REQUIRED_FIELD: "MISSING_REQUIRED_FIELD",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Rate limiting
  RATE_LIMITED: "RATE_LIMITED",

  // Server errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  DATABASE_ERROR: "DATABASE_ERROR",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",
} as const;

export type ErrorCode = typeof ErrorCodes[keyof typeof ErrorCodes];

/**
 * Create a standardized API error response
 */
export function apiError(
  message: string,
  code: ErrorCode | string,
  status: number,
  details?: Record<string, unknown>
): NextResponse<ApiErrorResponse> {
  return NextResponse.json(
    {
      error: message,
      code,
      details,
      timestamp: new Date().toISOString(),
    },
    { status }
  );
}

/**
 * Common error responses
 */
export const Errors = {
  unauthorized: (message = "Authentication required") =>
    apiError(message, ErrorCodes.UNAUTHORIZED, 401),

  forbidden: (message = "You don't have permission to access this resource") =>
    apiError(message, ErrorCodes.FORBIDDEN, 403),

  notFound: (resource = "Resource") =>
    apiError(`${resource} not found`, ErrorCodes.NOT_FOUND, 404),

  validationFailed: (details: Record<string, unknown>) =>
    apiError("Validation failed", ErrorCodes.VALIDATION_FAILED, 400, details),

  invalidInput: (message: string) =>
    apiError(message, ErrorCodes.INVALID_INPUT, 400),

  conflict: (message: string) =>
    apiError(message, ErrorCodes.CONFLICT, 409),

  rateLimited: (retryAfter?: number) =>
    apiError(
      "Too many requests. Please try again later.",
      ErrorCodes.RATE_LIMITED,
      429,
      retryAfter ? { retryAfter } : undefined
    ),

  internal: (message = "An unexpected error occurred") =>
    apiError(message, ErrorCodes.INTERNAL_ERROR, 500),

  database: (message = "Database operation failed") =>
    apiError(message, ErrorCodes.DATABASE_ERROR, 500),
};

/**
 * Wrap an async handler with standardized error handling
 */
export function withErrorHandling<T>(
  handler: () => Promise<NextResponse<T>>,
  context?: string
): Promise<NextResponse<T | ApiErrorResponse>> {
  return handler().catch((error) => {
    console.error(`API Error${context ? ` in ${context}` : ""}:`, error);
    return Errors.internal();
  });
}
