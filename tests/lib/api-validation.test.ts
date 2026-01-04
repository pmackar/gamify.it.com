import { describe, it, expect, vi } from "vitest";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";
import { validateBody, validateQuery, CommonSchemas } from "@/lib/api/validation";

// Mock NextRequest for body validation
function createMockRequest(body: unknown): NextRequest {
  return {
    json: vi.fn().mockResolvedValue(body),
    url: "http://localhost:3000/api/test",
  } as unknown as NextRequest;
}

// Mock NextRequest for query validation
function createMockQueryRequest(params: Record<string, string>): NextRequest {
  const url = new URL("http://localhost:3000/api/test");
  Object.entries(params).forEach(([key, value]) => {
    url.searchParams.set(key, value);
  });
  return {
    url: url.toString(),
    json: vi.fn(),
  } as unknown as NextRequest;
}

describe("validateBody", () => {
  const testSchema = z.object({
    name: z.string().trim().min(1).max(100),
    count: z.number().int().positive(),
    optional: z.string().optional(),
  });

  it("returns validated data for valid input", async () => {
    const request = createMockRequest({ name: "test", count: 5 });
    const result = await validateBody(request, testSchema);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({ name: "test", count: 5 });
  });

  it("trims string values", async () => {
    const request = createMockRequest({ name: "  test  ", count: 5 });
    const result = await validateBody(request, testSchema);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { name: string }).name).toBe("test");
  });

  it("includes optional fields when provided", async () => {
    const request = createMockRequest({ name: "test", count: 5, optional: "value" });
    const result = await validateBody(request, testSchema);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { optional?: string }).optional).toBe("value");
  });

  it("returns validation error for missing required field", async () => {
    const request = createMockRequest({ count: 5 });
    const result = await validateBody(request, testSchema);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(400);
  });

  it("returns validation error for invalid type", async () => {
    const request = createMockRequest({ name: "test", count: "not a number" });
    const result = await validateBody(request, testSchema);

    expect(result).toBeInstanceOf(NextResponse);
  });

  it("returns validation error for value constraint violation", async () => {
    const request = createMockRequest({ name: "test", count: -5 });
    const result = await validateBody(request, testSchema);

    expect(result).toBeInstanceOf(NextResponse);
  });

  it("returns error for invalid JSON", async () => {
    const request = {
      json: vi.fn().mockRejectedValue(new SyntaxError("Invalid JSON")),
      url: "http://localhost:3000/api/test",
    } as unknown as NextRequest;

    const result = await validateBody(request, testSchema);

    expect(result).toBeInstanceOf(NextResponse);
    const response = result as NextResponse;
    expect(response.status).toBe(400);
  });
});

describe("validateQuery", () => {
  const querySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    status: z.enum(["active", "completed"]).optional(),
  });

  it("returns validated data with defaults", () => {
    const request = createMockQueryRequest({});
    const result = validateQuery(request, querySchema);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({ page: 1, limit: 20 });
  });

  it("coerces string numbers to integers", () => {
    const request = createMockQueryRequest({ page: "5", limit: "50" });
    const result = validateQuery(request, querySchema);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect(result).toEqual({ page: 5, limit: 50 });
  });

  it("includes optional enum values", () => {
    const request = createMockQueryRequest({ status: "active" });
    const result = validateQuery(request, querySchema);

    expect(result).not.toBeInstanceOf(NextResponse);
    expect((result as { status?: string }).status).toBe("active");
  });

  it("returns validation error for invalid enum value", () => {
    const request = createMockQueryRequest({ status: "invalid" });
    const result = validateQuery(request, querySchema);

    expect(result).toBeInstanceOf(NextResponse);
  });

  it("returns validation error for constraint violation", () => {
    const request = createMockQueryRequest({ limit: "200" }); // max is 100
    const result = validateQuery(request, querySchema);

    expect(result).toBeInstanceOf(NextResponse);
  });
});

describe("CommonSchemas", () => {
  describe("uuid", () => {
    it("validates correct UUID", () => {
      const result = CommonSchemas.uuid.safeParse("123e4567-e89b-12d3-a456-426614174000");
      expect(result.success).toBe(true);
    });

    it("rejects invalid UUID", () => {
      const result = CommonSchemas.uuid.safeParse("not-a-uuid");
      expect(result.success).toBe(false);
    });
  });

  describe("pagination", () => {
    it("provides defaults", () => {
      const result = CommonSchemas.pagination.parse({});
      expect(result).toEqual({ page: 1, limit: 20 });
    });

    it("coerces string values", () => {
      const result = CommonSchemas.pagination.parse({ page: "5", limit: "50" });
      expect(result).toEqual({ page: 5, limit: 50 });
    });

    it("rejects negative page", () => {
      expect(() => CommonSchemas.pagination.parse({ page: "-1" })).toThrow();
    });

    it("rejects limit over 100", () => {
      expect(() => CommonSchemas.pagination.parse({ limit: "150" })).toThrow();
    });
  });

  describe("cursorPagination", () => {
    it("allows missing cursor", () => {
      const result = CommonSchemas.cursorPagination.parse({});
      expect(result).toEqual({ limit: 20 });
    });

    it("validates cursor as UUID", () => {
      const result = CommonSchemas.cursorPagination.safeParse({
        cursor: "123e4567-e89b-12d3-a456-426614174000",
      });
      expect(result.success).toBe(true);
    });

    it("rejects invalid cursor", () => {
      const result = CommonSchemas.cursorPagination.safeParse({ cursor: "invalid" });
      expect(result.success).toBe(false);
    });
  });

  describe("nonEmptyString", () => {
    it("validates non-empty string", () => {
      const result = CommonSchemas.nonEmptyString.safeParse("hello");
      expect(result.success).toBe(true);
    });

    it("trims whitespace", () => {
      const result = CommonSchemas.nonEmptyString.parse("  hello  ");
      expect(result).toBe("hello");
    });

    it("rejects empty string", () => {
      const result = CommonSchemas.nonEmptyString.safeParse("");
      expect(result.success).toBe(false);
    });

    it("rejects whitespace-only string", () => {
      const result = CommonSchemas.nonEmptyString.safeParse("   ");
      expect(result.success).toBe(false);
    });
  });

  describe("description", () => {
    it("allows undefined", () => {
      const result = CommonSchemas.description.parse(undefined);
      expect(result).toBeUndefined();
    });

    it("trims whitespace", () => {
      const result = CommonSchemas.description.parse("  test  ");
      expect(result).toBe("test");
    });

    it("allows up to 2000 characters", () => {
      const longString = "a".repeat(2000);
      const result = CommonSchemas.description.parse(longString);
      expect(result).toBe(longString);
    });

    it("rejects over 2000 characters", () => {
      const tooLong = "a".repeat(2001);
      const result = CommonSchemas.description.safeParse(tooLong);
      expect(result.success).toBe(false);
    });
  });

  describe("uuidArray", () => {
    it("validates array of valid UUIDs", () => {
      const result = CommonSchemas.uuidArray.safeParse([
        "123e4567-e89b-12d3-a456-426614174000",
        "223e4567-e89b-12d3-a456-426614174001",
      ]);
      expect(result.success).toBe(true);
    });

    it("validates empty array", () => {
      const result = CommonSchemas.uuidArray.safeParse([]);
      expect(result.success).toBe(true);
    });

    it("rejects array with invalid UUID", () => {
      const result = CommonSchemas.uuidArray.safeParse([
        "123e4567-e89b-12d3-a456-426614174000",
        "not-a-uuid",
      ]);
      expect(result.success).toBe(false);
    });
  });

  describe("status", () => {
    it("validates ACTIVE status", () => {
      expect(CommonSchemas.status.parse("ACTIVE")).toBe("ACTIVE");
    });

    it("validates all status options", () => {
      const statuses = ["ACTIVE", "COMPLETED", "ARCHIVED", "DRAFT"];
      statuses.forEach((status) => {
        expect(() => CommonSchemas.status.parse(status)).not.toThrow();
      });
    });

    it("rejects invalid status", () => {
      expect(() => CommonSchemas.status.parse("INVALID")).toThrow();
    });
  });
});
