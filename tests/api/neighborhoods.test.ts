/**
 * API Integration Tests - Neighborhoods
 *
 * Tests for /api/neighborhoods/[neighborhoodId] endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockRequest,
  createMockParams,
  mockUser,
  parseResponse,
} from "../utils/api-test-utils";

// Mock neighborhood data
const mockNeighborhood = {
  id: "neigh-123",
  name: "Downtown",
  description: "Central business district",
  latitude: 40.7128,
  longitude: -74.006,
  city_id: "city-123",
  user_id: "test-user-id-123",
  city: { id: "city-123", name: "New York", country: "USA" },
  locations: [
    {
      id: "loc-1",
      name: "Coffee Shop",
      type: "CAFE",
      avg_rating: 4.5,
      visited: true,
      hotlist: false,
    },
  ],
};

// Create controllable mocks using vi.hoisted
const mockGetAuthUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  travel_neighborhoods: {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
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
import {
  GET,
  PATCH,
  DELETE,
} from "@/app/api/neighborhoods/[neighborhoodId]/route";

describe("/api/neighborhoods/[neighborhoodId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("should return neighborhood details with locations", async () => {
      // Arrange
      mockPrisma.travel_neighborhoods.findUnique.mockResolvedValue(
        mockNeighborhood
      );

      const request = createMockRequest("/api/neighborhoods/neigh-123");
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await GET(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("id", "neigh-123");
      expect(data).toHaveProperty("name", "Downtown");
      expect(data).toHaveProperty("locations");
      expect(data.locations).toHaveLength(1);
      expect(data).toHaveProperty("city");
      expect(data.city.name).toBe("New York");
    });

    it("should return 404 for non-existent neighborhood", async () => {
      // Arrange
      mockPrisma.travel_neighborhoods.findUnique.mockResolvedValue(null);

      const request = createMockRequest("/api/neighborhoods/nonexistent");
      const params = createMockParams({ neighborhoodId: "nonexistent" });

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

      const request = createMockRequest("/api/neighborhoods/neigh-123");
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await GET(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
    });

    it("should transform location fields to camelCase", async () => {
      // Arrange
      mockPrisma.travel_neighborhoods.findUnique.mockResolvedValue(
        mockNeighborhood
      );

      const request = createMockRequest("/api/neighborhoods/neigh-123");
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await GET(request, params);
      const { data } = await parseResponse(response);

      // Assert
      expect(data.locations[0]).toHaveProperty("avgRating", 4.5);
    });
  });

  describe("PATCH", () => {
    it("should update neighborhood name", async () => {
      // Arrange
      const updatedNeighborhood = {
        ...mockNeighborhood,
        name: "Updated Downtown",
      };

      mockPrisma.travel_neighborhoods.findFirst.mockResolvedValue(
        mockNeighborhood
      );
      mockPrisma.travel_neighborhoods.update.mockResolvedValue(
        updatedNeighborhood
      );

      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "PATCH",
        body: { name: "Updated Downtown" },
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await PATCH(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("name", "Updated Downtown");
      expect(mockPrisma.travel_neighborhoods.update).toHaveBeenCalledWith({
        where: { id: "neigh-123" },
        data: expect.objectContaining({ name: "Updated Downtown" }),
      });
    });

    it("should return 400 for invalid latitude", async () => {
      // Arrange
      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "PATCH",
        body: { latitude: 999 }, // Invalid: > 90
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await PATCH(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
      expect(data).toHaveProperty("error");
    });

    it("should return 400 for invalid longitude", async () => {
      // Arrange
      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "PATCH",
        body: { longitude: -200 }, // Invalid: < -180
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await PATCH(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
    });

    it("should return 404 if user does not own neighborhood", async () => {
      // Arrange
      mockPrisma.travel_neighborhoods.findFirst.mockResolvedValue(null);

      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "PATCH",
        body: { name: "New Name" },
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await PATCH(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(404);
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Arrange
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "PATCH",
        body: { name: "New Name" },
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await PATCH(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
    });
  });

  describe("DELETE", () => {
    it("should delete owned neighborhood", async () => {
      // Arrange
      mockPrisma.travel_neighborhoods.findFirst.mockResolvedValue(
        mockNeighborhood
      );
      mockPrisma.travel_neighborhoods.delete.mockResolvedValue(mockNeighborhood);

      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "DELETE",
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await DELETE(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(mockPrisma.travel_neighborhoods.delete).toHaveBeenCalledWith({
        where: { id: "neigh-123" },
      });
    });

    it("should return 404 for non-owned neighborhood", async () => {
      // Arrange
      mockPrisma.travel_neighborhoods.findFirst.mockResolvedValue(null);

      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "DELETE",
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await DELETE(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(404);
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Arrange
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest("/api/neighborhoods/neigh-123", {
        method: "DELETE",
      });
      const params = createMockParams({ neighborhoodId: "neigh-123" });

      // Act
      const response = await DELETE(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
    });
  });
});
