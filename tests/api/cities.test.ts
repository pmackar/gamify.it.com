/**
 * API Integration Tests - Cities
 *
 * Tests for /api/cities and /api/cities/[cityId] endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockRequest,
  createMockParams,
  mockUser,
  parseResponse,
} from "../utils/api-test-utils";
import { mockCity } from "../utils/prisma-mock";

// Create controllable mocks using vi.hoisted
const mockGetAuthUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  travel_cities: {
    findUnique: vi.fn(),
  },
  travel_user_location_data: {
    findMany: vi.fn(),
  },
}));

// Mock modules
vi.mock("@/lib/db", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: mockGetAuthUser,
}));

// Import route handlers after mocking
import { GET } from "@/app/api/cities/[cityId]/route";

describe("/api/cities/[cityId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: authenticated user
    mockGetAuthUser.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("should return city details for valid cityId", async () => {
      // Arrange
      const cityId = "city-123";
      const mockCityWithNeighborhoods = {
        ...mockCity,
        neighborhoods: [
          { id: "neigh-1", name: "Downtown", _count: { locations: 5 } },
          { id: "neigh-2", name: "Uptown", _count: { locations: 3 } },
        ],
        _count: { locations: 10 },
      };

      mockPrisma.travel_cities.findUnique.mockResolvedValue(
        mockCityWithNeighborhoods
      );
      mockPrisma.travel_user_location_data.findMany.mockResolvedValue([
        { location_id: "loc-1" },
        { location_id: "loc-2" },
      ]);

      const request = createMockRequest(`/api/cities/${cityId}`);
      const params = createMockParams({ cityId });

      // Act
      const response = await GET(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("id", "city-123");
      expect(data).toHaveProperty("name", "New York");
      expect(data).toHaveProperty("neighborhoods");
      expect(data.neighborhoods).toHaveLength(2);
      expect(data).toHaveProperty("visitedLocationCount", 2);
    });

    it("should return 404 for non-existent city", async () => {
      // Arrange
      mockPrisma.travel_cities.findUnique.mockResolvedValue(null);

      const request = createMockRequest("/api/cities/nonexistent");
      const params = createMockParams({ cityId: "nonexistent" });

      // Act
      const response = await GET(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(404);
      expect(data).toHaveProperty("error");
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Arrange
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest("/api/cities/city-123");
      const params = createMockParams({ cityId: "city-123" });

      // Act
      const response = await GET(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
    });

    it("should transform field names to camelCase", async () => {
      // Arrange
      const mockCityData = {
        ...mockCity,
        first_visited: new Date("2024-01-01"),
        last_visited: new Date("2024-06-01"),
        visit_count: 5,
        location_count: 10,
        neighborhoods: [],
        _count: { locations: 10 },
      };

      mockPrisma.travel_cities.findUnique.mockResolvedValue(mockCityData);
      mockPrisma.travel_user_location_data.findMany.mockResolvedValue([]);

      const request = createMockRequest("/api/cities/city-123");
      const params = createMockParams({ cityId: "city-123" });

      // Act
      const response = await GET(request, params);
      const { data } = await parseResponse(response);

      // Assert - verify snake_case is transformed to camelCase
      expect(data).toHaveProperty("firstVisited");
      expect(data).toHaveProperty("lastVisited");
      expect(data).toHaveProperty("visitCount");
      expect(data).toHaveProperty("locationCount");
    });
  });
});
