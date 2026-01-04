/**
 * API Test Utilities
 *
 * Helpers for testing Next.js API routes with mocked auth and database.
 */

import { vi } from "vitest";
import { NextRequest } from "next/server";

// Mock user type matching AuthUser
export interface MockUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  role: string;
  totalXP: number;
  mainLevel: number;
  currentStreak: number;
  longestStreak: number;
}

// Default mock user for tests
export const mockUser: MockUser = {
  id: "test-user-id-123",
  email: "test@example.com",
  name: "Test User",
  image: null,
  role: "USER",
  totalXP: 1000,
  mainLevel: 5,
  currentStreak: 3,
  longestStreak: 10,
};

// Create a mock NextRequest
export function createMockRequest(
  url: string,
  options: {
    method?: string;
    body?: unknown;
    headers?: Record<string, string>;
    searchParams?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, headers = {}, searchParams = {} } = options;

  // Build URL with search params
  const urlObj = new URL(url, "http://localhost:3000");
  Object.entries(searchParams).forEach(([key, value]) => {
    urlObj.searchParams.set(key, value);
  });

  const requestInit: RequestInit = {
    method,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  };

  if (body && method !== "GET") {
    requestInit.body = JSON.stringify(body);
  }

  return new NextRequest(urlObj.toString(), requestInit);
}

// Parse JSON response from route handler
export async function parseResponse<T = unknown>(
  response: Response
): Promise<{ status: number; data: T }> {
  const data = await response.json();
  return {
    status: response.status,
    data: data as T,
  };
}

// Setup auth mock - call in beforeEach
export function setupAuthMock(user: MockUser | null = mockUser) {
  vi.doMock("@/lib/auth", () => ({
    getAuthUser: vi.fn().mockResolvedValue(user),
    getUser: vi.fn().mockResolvedValue(user),
  }));
}

// Reset all mocks - call in afterEach
export function resetMocks() {
  vi.clearAllMocks();
  vi.resetModules();
}

// Create mock params for dynamic routes
export function createMockParams<T extends Record<string, string>>(
  params: T
): { params: Promise<T> } {
  return { params: Promise.resolve(params) };
}

// Type for API error responses
export interface ApiError {
  error: string;
  code?: string;
  details?: unknown;
}

// Assert successful response
export function assertSuccess(response: { status: number; data: unknown }) {
  if (response.status >= 400) {
    throw new Error(
      `Expected success but got ${response.status}: ${JSON.stringify(response.data)}`
    );
  }
}

// Assert error response
export function assertError(
  response: { status: number; data: unknown },
  expectedStatus: number,
  expectedMessage?: string
) {
  if (response.status !== expectedStatus) {
    throw new Error(
      `Expected status ${expectedStatus} but got ${response.status}`
    );
  }
  if (expectedMessage) {
    const error = response.data as ApiError;
    if (!error.error?.includes(expectedMessage)) {
      throw new Error(
        `Expected error "${expectedMessage}" but got "${error.error}"`
      );
    }
  }
}
