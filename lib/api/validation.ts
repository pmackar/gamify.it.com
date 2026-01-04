import { z, ZodError, ZodSchema } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { Errors, ApiErrorResponse } from "./errors";

/**
 * Parse and validate request body against a Zod schema.
 * Returns the validated data or an error response.
 *
 * @example
 * const createQuestSchema = z.object({
 *   name: z.string().trim().min(1).max(200),
 *   description: z.string().optional(),
 * });
 *
 * export async function POST(request: NextRequest) {
 *   const result = await validateBody(request, createQuestSchema);
 *   if (result instanceof NextResponse) return result; // Validation error
 *
 *   const { name, description } = result; // Fully typed
 *   // ... create quest
 * }
 */
export async function validateBody<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): Promise<z.infer<T> | NextResponse<ApiErrorResponse>> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof ZodError) {
      return Errors.validationFailed({
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    if (error instanceof SyntaxError) {
      return Errors.invalidInput("Invalid JSON in request body");
    }
    throw error;
  }
}

/**
 * Parse and validate query parameters against a Zod schema.
 *
 * @example
 * const listSchema = z.object({
 *   page: z.coerce.number().int().min(1).default(1),
 *   limit: z.coerce.number().int().min(1).max(100).default(20),
 *   status: z.enum(['active', 'completed']).optional(),
 * });
 *
 * export async function GET(request: NextRequest) {
 *   const params = validateQuery(request, listSchema);
 *   if (params instanceof NextResponse) return params;
 *
 *   const { page, limit, status } = params;
 * }
 */
export function validateQuery<T extends ZodSchema>(
  request: NextRequest,
  schema: T
): z.infer<T> | NextResponse<ApiErrorResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const params = Object.fromEntries(searchParams.entries());
    return schema.parse(params);
  } catch (error) {
    if (error instanceof ZodError) {
      return Errors.validationFailed({
        issues: error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
          code: issue.code,
        })),
      });
    }
    throw error;
  }
}

/**
 * Common reusable schemas
 */
export const CommonSchemas = {
  /** UUID string validation */
  uuid: z.string().uuid(),

  /** Pagination parameters */
  pagination: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /** Cursor-based pagination */
  cursorPagination: z.object({
    cursor: z.string().uuid().optional(),
    limit: z.coerce.number().int().min(1).max(100).default(20),
  }),

  /** Date range filter */
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional(),
  }),

  /** Common status filter */
  status: z.enum(["ACTIVE", "COMPLETED", "ARCHIVED", "DRAFT"]),

  /** Non-empty trimmed string */
  nonEmptyString: z.string().trim().min(1),

  /** Optional trimmed string (max 2000 chars for descriptions) */
  description: z.string().trim().max(2000).optional(),

  /** Array of UUIDs */
  uuidArray: z.array(z.string().uuid()),
};

/**
 * Type helper to infer schema type
 */
export type InferSchema<T extends ZodSchema> = z.infer<T>;
