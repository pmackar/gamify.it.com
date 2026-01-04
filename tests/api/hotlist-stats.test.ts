/**
 * API Integration Tests - Hotlist Stats
 *
 * Tests for /api/locations/hotlist-stats endpoint.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockRequest,
  mockUser,
  parseResponse,
} from "../utils/api-test-utils";

// Create controllable mocks using vi.hoisted
const mockGetAuthUser = vi.hoisted(() => vi.fn());
const mockPrisma = vi.hoisted(() => ({
  friendships: {
    findMany: vi.fn(),
  },
  travel_user_location_data: {
    groupBy: vi.fn(),
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

// Import route handler after mocking
import { POST } from "@/app/api/locations/hotlist-stats/route";

describe("/api/locations/hotlist-stats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("POST", () => {
    it("should return empty stats for empty locationIds", async () => {
      // Arrange
      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: { locationIds: [] },
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toEqual({ stats: {} });
    });

    it("should return empty stats when user has no friends", async () => {
      // Arrange
      mockPrisma.friendships.findMany.mockResolvedValue([]);

      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: {
          locationIds: [
            "550e8400-e29b-41d4-a716-446655440001",
            "550e8400-e29b-41d4-a716-446655440002",
          ],
        },
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toEqual({ stats: {} });
    });

    it("should return friend hotlist counts for locations", async () => {
      // Arrange
      const locationId1 = "550e8400-e29b-41d4-a716-446655440001";
      const locationId2 = "550e8400-e29b-41d4-a716-446655440002";
      const friendId = "friend-user-id";

      mockPrisma.friendships.findMany.mockResolvedValue([
        {
          requester_id: mockUser.id,
          addressee_id: friendId,
        },
      ]);

      mockPrisma.travel_user_location_data.groupBy.mockResolvedValue([
        { location_id: locationId1, _count: { user_id: 2 } },
      ]);

      mockPrisma.travel_user_location_data.findMany.mockResolvedValue([
        {
          location_id: locationId1,
          user: {
            id: friendId,
            display_name: "Alice",
            username: "alice",
          },
        },
        {
          location_id: locationId1,
          user: {
            id: "friend-2",
            display_name: "Bob",
            username: "bob",
          },
        },
      ]);

      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: { locationIds: [locationId1, locationId2] },
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("stats");
      expect(data.stats[locationId1]).toBeDefined();
      expect(data.stats[locationId1].count).toBe(2);
      expect(data.stats[locationId1].friendNames).toContain("Alice");
      expect(data.stats[locationId1].friendNames).toContain("Bob");
    });

    it("should use username if display_name is null", async () => {
      // Arrange
      const locationId = "550e8400-e29b-41d4-a716-446655440001";
      const friendId = "friend-user-id";

      mockPrisma.friendships.findMany.mockResolvedValue([
        { requester_id: mockUser.id, addressee_id: friendId },
      ]);

      mockPrisma.travel_user_location_data.groupBy.mockResolvedValue([
        { location_id: locationId, _count: { user_id: 1 } },
      ]);

      mockPrisma.travel_user_location_data.findMany.mockResolvedValue([
        {
          location_id: locationId,
          user: {
            id: friendId,
            display_name: null,
            username: "alice_username",
          },
        },
      ]);

      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: { locationIds: [locationId] },
      });

      // Act
      const response = await POST(request);
      const { data } = await parseResponse(response);

      // Assert
      expect(data.stats[locationId].friendNames).toContain("alice_username");
    });

    it("should return empty stats for invalid UUIDs", async () => {
      // Arrange
      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: { locationIds: ["not-a-uuid", "also-invalid"] },
      });

      // Act
      const response = await POST(request);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toEqual({ stats: {} });
    });

    it("should limit friend names to 3", async () => {
      // Arrange
      const locationId = "550e8400-e29b-41d4-a716-446655440001";

      mockPrisma.friendships.findMany.mockResolvedValue([
        { requester_id: mockUser.id, addressee_id: "f1" },
        { requester_id: mockUser.id, addressee_id: "f2" },
        { requester_id: mockUser.id, addressee_id: "f3" },
        { requester_id: mockUser.id, addressee_id: "f4" },
      ]);

      mockPrisma.travel_user_location_data.groupBy.mockResolvedValue([
        { location_id: locationId, _count: { user_id: 5 } },
      ]);

      mockPrisma.travel_user_location_data.findMany.mockResolvedValue([
        { location_id: locationId, user: { id: "f1", display_name: "Alice", username: "a" } },
        { location_id: locationId, user: { id: "f2", display_name: "Bob", username: "b" } },
        { location_id: locationId, user: { id: "f3", display_name: "Carol", username: "c" } },
        { location_id: locationId, user: { id: "f4", display_name: "Dave", username: "d" } },
        { location_id: locationId, user: { id: "f5", display_name: "Eve", username: "e" } },
      ]);

      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: { locationIds: [locationId] },
      });

      // Act
      const response = await POST(request);
      const { data } = await parseResponse(response);

      // Assert
      expect(data.stats[locationId].friendNames).toHaveLength(3);
      expect(data.stats[locationId].count).toBe(5);
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Arrange
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: {
          locationIds: ["550e8400-e29b-41d4-a716-446655440001"],
        },
      });

      // Act
      const response = await POST(request);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
    });

    it("should handle friendships where user is addressee", async () => {
      // Arrange
      const locationId = "550e8400-e29b-41d4-a716-446655440001";
      const friendId = "friend-user-id";

      // User is the addressee, not requester
      mockPrisma.friendships.findMany.mockResolvedValue([
        { requester_id: friendId, addressee_id: mockUser.id },
      ]);

      mockPrisma.travel_user_location_data.groupBy.mockResolvedValue([
        { location_id: locationId, _count: { user_id: 1 } },
      ]);

      mockPrisma.travel_user_location_data.findMany.mockResolvedValue([
        {
          location_id: locationId,
          user: { id: friendId, display_name: "Friend", username: "friend" },
        },
      ]);

      const request = createMockRequest("/api/locations/hotlist-stats", {
        method: "POST",
        body: { locationIds: [locationId] },
      });

      // Act
      const response = await POST(request);
      const { data } = await parseResponse(response);

      // Assert
      expect(data.stats[locationId]).toBeDefined();
      expect(data.stats[locationId].friendNames).toContain("Friend");
    });
  });
});
