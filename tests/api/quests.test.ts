/**
 * API Integration Tests - Quests
 *
 * Tests for /api/quests/[questId] endpoints.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createMockRequest,
  createMockParams,
  mockUser,
  parseResponse,
} from "../utils/api-test-utils";

// Mock quest data
const mockQuest = {
  id: "quest-123",
  name: "Food Tour",
  description: "Visit all restaurants",
  status: "ACTIVE",
  user_id: "test-user-id-123",
  start_date: null,
  end_date: null,
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-15"),
  target_city_id: null,
  target_neighborhood_id: null,
  user: {
    id: "test-user-id-123",
    username: "testuser",
    display_name: "Test User",
    avatar_url: null,
  },
  target_city: null,
  target_neighborhood: null,
  cities: [],
  neighborhoods: [],
  items: [],
  party: null,
};

// Create controllable mocks using vi.hoisted
const mockGetAuthUser = vi.hoisted(() => vi.fn());
const mockAwardXP = vi.hoisted(() => vi.fn().mockResolvedValue({
  xpAwarded: 100,
  appLeveledUp: false,
  newAppLevel: 3,
}));
const mockCheckAchievements = vi.hoisted(() => vi.fn().mockResolvedValue([]));
const mockCalculateQuestCompletionXP = vi.hoisted(() => vi.fn().mockReturnValue(200));
const mockPrisma = vi.hoisted(() => ({
  travel_quests: {
    findUnique: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
  activity_feed: {
    create: vi.fn(),
  },
}));

// Mock modules
vi.mock("@/lib/db", () => ({
  default: mockPrisma,
}));

vi.mock("@/lib/auth", () => ({
  getAuthUser: mockGetAuthUser,
}));

vi.mock("@/lib/services/gamification.service", () => ({
  awardXP: mockAwardXP,
  checkAchievements: mockCheckAchievements,
  calculateQuestCompletionXP: mockCalculateQuestCompletionXP,
}));

// Import route handlers after mocking
import { GET, PATCH, DELETE } from "@/app/api/quests/[questId]/route";

describe("/api/quests/[questId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetAuthUser.mockResolvedValue(mockUser);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("GET", () => {
    it("should return quest details for owner", async () => {
      // Arrange
      mockPrisma.travel_quests.findUnique.mockResolvedValue(mockQuest);

      const request = createMockRequest("/api/quests/quest-123");
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await GET(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("quest");
      expect(data.quest).toHaveProperty("id", "quest-123");
      expect(data.quest).toHaveProperty("name", "Food Tour");
      expect(data).toHaveProperty("isOwner", true);
      expect(data.quest).toHaveProperty("completionStats");
    });

    it("should return quest details for party member", async () => {
      // Arrange
      const partyMemberId = "party-member-id";
      const questWithParty = {
        ...mockQuest,
        user_id: "other-user-id", // Different owner
        party: {
          id: "party-1",
          quest_id: "quest-123",
          created_at: new Date(),
          members: [
            {
              id: "m1",
              user_id: mockUser.id,
              role: "MEMBER",
              status: "ACCEPTED",
              invited_at: new Date(),
              joined_at: new Date(),
              user: { id: mockUser.id, username: "testuser", display_name: "Test", avatar_url: null, main_level: 5 },
            },
          ],
        },
      };

      mockPrisma.travel_quests.findUnique.mockResolvedValue(questWithParty);

      const request = createMockRequest("/api/quests/quest-123");
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await GET(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("isOwner", false);
      expect(data).toHaveProperty("isPartyMember", true);
    });

    it("should return 403 for non-owner non-member", async () => {
      // Arrange
      const otherQuest = {
        ...mockQuest,
        user_id: "other-user-id",
        party: null,
      };

      mockPrisma.travel_quests.findUnique.mockResolvedValue(otherQuest);

      const request = createMockRequest("/api/quests/quest-123");
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await GET(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(403);
      expect(data).toHaveProperty("error");
    });

    it("should return 404 for non-existent quest", async () => {
      // Arrange
      mockPrisma.travel_quests.findUnique.mockResolvedValue(null);

      const request = createMockRequest("/api/quests/nonexistent");
      const params = createMockParams({ questId: "nonexistent" });

      // Act
      const response = await GET(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(404);
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Arrange
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest("/api/quests/quest-123");
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await GET(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
    });

    it("should calculate completion stats correctly", async () => {
      // Arrange
      const questWithItems = {
        ...mockQuest,
        items: [
          { id: "i1", completed: true },
          { id: "i2", completed: true },
          { id: "i3", completed: false },
        ],
      };

      mockPrisma.travel_quests.findUnique.mockResolvedValue(questWithItems);

      const request = createMockRequest("/api/quests/quest-123");
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await GET(request, params);
      const { data } = await parseResponse(response);

      // Assert
      expect(data.quest.completionStats.total).toBe(3);
      expect(data.quest.completionStats.completed).toBe(2);
      expect(data.quest.completionStats.percentage).toBe(67);
    });
  });

  describe("PATCH - edit action", () => {
    it("should update quest name", async () => {
      // Arrange
      mockPrisma.travel_quests.findUnique.mockResolvedValue({
        id: "quest-123",
        user_id: mockUser.id,
      });
      mockPrisma.travel_quests.update.mockResolvedValue({
        id: "quest-123",
        name: "Updated Name",
        description: "desc",
        status: "ACTIVE",
        start_date: null,
        end_date: null,
      });

      const request = createMockRequest("/api/quests/quest-123", {
        method: "PATCH",
        body: { action: "edit", name: "Updated Name" },
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await PATCH(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data.quest).toHaveProperty("name", "Updated Name");
    });

    it("should return 403 when non-owner tries to edit", async () => {
      // Arrange
      mockPrisma.travel_quests.findUnique.mockResolvedValue({
        id: "quest-123",
        user_id: "other-user-id",
      });

      const request = createMockRequest("/api/quests/quest-123", {
        method: "PATCH",
        body: { action: "edit", name: "Hacked Name" },
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await PATCH(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(403);
    });

    it("should return 400 for invalid action", async () => {
      // Arrange
      const request = createMockRequest("/api/quests/quest-123", {
        method: "PATCH",
        body: { action: "invalid" },
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await PATCH(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
    });
  });

  describe("PATCH - complete action", () => {
    it("should complete quest and award XP", async () => {
      // Arrange
      const completableQuest = {
        ...mockQuest,
        status: "ACTIVE",
        items: [
          { id: "i1", completed: true },
          { id: "i2", completed: true },
        ],
        party: null,
      };

      mockPrisma.travel_quests.findUnique.mockResolvedValue(completableQuest);
      mockPrisma.travel_quests.update.mockResolvedValue({ ...completableQuest, status: "COMPLETED" });

      const request = createMockRequest("/api/quests/quest-123", {
        method: "PATCH",
        body: { action: "complete" },
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await PATCH(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data).toHaveProperty("xpAwarded");
      expect(mockAwardXP).toHaveBeenCalled();
    });

    it("should return 400 if items are incomplete", async () => {
      // Arrange
      const incompleteQuest = {
        ...mockQuest,
        status: "ACTIVE",
        items: [
          { id: "i1", completed: true },
          { id: "i2", completed: false },
        ],
      };

      mockPrisma.travel_quests.findUnique.mockResolvedValue(incompleteQuest);

      const request = createMockRequest("/api/quests/quest-123", {
        method: "PATCH",
        body: { action: "complete" },
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await PATCH(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(400);
      expect(data.error).toContain("completed");
    });

    it("should return 409 if quest already completed", async () => {
      // Arrange
      const completedQuest = {
        ...mockQuest,
        status: "COMPLETED",
        items: [],
      };

      mockPrisma.travel_quests.findUnique.mockResolvedValue(completedQuest);

      const request = createMockRequest("/api/quests/quest-123", {
        method: "PATCH",
        body: { action: "complete" },
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await PATCH(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(409);
    });
  });

  describe("DELETE", () => {
    it("should delete owned quest", async () => {
      // Arrange
      mockPrisma.travel_quests.findUnique.mockResolvedValue({
        id: "quest-123",
        user_id: mockUser.id,
        name: "My Quest",
      });
      mockPrisma.travel_quests.delete.mockResolvedValue({});

      const request = createMockRequest("/api/quests/quest-123", {
        method: "DELETE",
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await DELETE(request, params);
      const { status, data } = await parseResponse(response);

      // Assert
      expect(status).toBe(200);
      expect(data).toHaveProperty("success", true);
      expect(data.message).toContain("My Quest");
      expect(mockPrisma.travel_quests.delete).toHaveBeenCalledWith({
        where: { id: "quest-123" },
      });
    });

    it("should return 403 when non-owner tries to delete", async () => {
      // Arrange
      mockPrisma.travel_quests.findUnique.mockResolvedValue({
        id: "quest-123",
        user_id: "other-user-id",
        name: "Not My Quest",
      });

      const request = createMockRequest("/api/quests/quest-123", {
        method: "DELETE",
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await DELETE(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(403);
      expect(mockPrisma.travel_quests.delete).not.toHaveBeenCalled();
    });

    it("should return 404 for non-existent quest", async () => {
      // Arrange
      mockPrisma.travel_quests.findUnique.mockResolvedValue(null);

      const request = createMockRequest("/api/quests/nonexistent", {
        method: "DELETE",
      });
      const params = createMockParams({ questId: "nonexistent" });

      // Act
      const response = await DELETE(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(404);
    });

    it("should return 401 for unauthenticated requests", async () => {
      // Arrange
      mockGetAuthUser.mockResolvedValue(null);

      const request = createMockRequest("/api/quests/quest-123", {
        method: "DELETE",
      });
      const params = createMockParams({ questId: "quest-123" });

      // Act
      const response = await DELETE(request, params);
      const { status } = await parseResponse(response);

      // Assert
      expect(status).toBe(401);
    });
  });
});
