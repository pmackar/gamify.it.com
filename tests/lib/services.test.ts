import { describe, it, expect } from "vitest";
import {
  toLocationResponse,
  toLocationUserData,
  toUserPublicResponse,
  toQuestResponse,
  toQuestItemResponse,
  toPartyResponse,
  toPartyMemberResponse,
  toXPAwardResponse,
} from "@/lib/services/response-transformers";
import {
  calculateDistance,
  isWithinRadius,
  filterByDistance,
  calculateLocationActionXP,
  getLocationTypeXP,
} from "@/lib/services/location.service";
import {
  calculateQuestCompletionXP,
  getStreakMultiplier,
} from "@/lib/services/gamification.service";

// ============================================================================
// Response Transformers Tests
// ============================================================================

describe("Response Transformers", () => {
  describe("toLocationResponse", () => {
    const mockLocation = {
      id: "loc-123",
      name: "Test Restaurant",
      type: "RESTAURANT",
      address: "123 Main St",
      latitude: 40.7128,
      longitude: -74.006,
      city_id: "city-123",
      neighborhood_id: "neigh-123",
      google_place_id: "gp-123",
      notes: "Great food",
      created_at: new Date("2024-01-01"),
      city: { id: "city-123", name: "New York", country: "USA" },
      neighborhood: { id: "neigh-123", name: "Manhattan" },
    };

    it("transforms location to response format", () => {
      const result = toLocationResponse(mockLocation);

      expect(result.id).toBe("loc-123");
      expect(result.name).toBe("Test Restaurant");
      expect(result.type).toBe("RESTAURANT");
      expect(result.latitude).toBe(40.7128);
      expect(result.longitude).toBe(-74.006);
      expect(result.cityId).toBe("city-123");
      expect(result.neighborhoodId).toBe("neigh-123");
    });

    it("includes city data when present", () => {
      const result = toLocationResponse(mockLocation);

      expect(result.city).toEqual({
        id: "city-123",
        name: "New York",
        country: "USA",
      });
    });

    it("includes neighborhood data when present", () => {
      const result = toLocationResponse(mockLocation);

      expect(result.neighborhood).toEqual({
        id: "neigh-123",
        name: "Manhattan",
      });
    });

    it("handles null neighborhood", () => {
      const locationNoNeighborhood = { ...mockLocation, neighborhood: null, neighborhood_id: null };
      const result = toLocationResponse(locationNoNeighborhood);

      expect(result.neighborhood).toBeNull();
      expect(result.neighborhoodId).toBeNull();
    });

    it("includes user data when provided", () => {
      const userData = {
        is_visited: true,
        is_hotlisted: false,
        personal_rating: 4,
        visit_count: 3,
        first_visited: new Date("2024-01-15"),
        last_visited: new Date("2024-02-01"),
      };

      const result = toLocationResponse(mockLocation, userData);

      expect(result.userData).toBeDefined();
      expect(result.userData?.isVisited).toBe(true);
      expect(result.userData?.rating).toBe(4);
      expect(result.userData?.visitCount).toBe(3);
    });
  });

  describe("toLocationUserData", () => {
    it("transforms user location data", () => {
      const data = {
        is_visited: true,
        is_hotlisted: true,
        personal_rating: 5,
        visit_count: 10,
        first_visited: new Date("2024-01-01"),
        last_visited: new Date("2024-02-01"),
      };

      const result = toLocationUserData(data);

      expect(result.isVisited).toBe(true);
      expect(result.isHotlisted).toBe(true);
      expect(result.rating).toBe(5);
      expect(result.visitCount).toBe(10);
    });

    it("provides defaults for missing fields", () => {
      const data = {};

      const result = toLocationUserData(data);

      expect(result.isVisited).toBe(false);
      expect(result.isHotlisted).toBe(false);
      expect(result.rating).toBeNull();
      expect(result.visitCount).toBe(0);
    });
  });

  describe("toUserPublicResponse", () => {
    it("transforms user to public response", () => {
      const user = {
        id: "user-123",
        username: "johndoe",
        display_name: "John Doe",
        avatar_url: "https://example.com/avatar.jpg",
      };

      const result = toUserPublicResponse(user);

      expect(result.id).toBe("user-123");
      expect(result.username).toBe("johndoe");
      expect(result.displayName).toBe("John Doe");
      expect(result.avatarUrl).toBe("https://example.com/avatar.jpg");
    });
  });

  describe("toQuestResponse", () => {
    const mockQuest = {
      id: "quest-123",
      name: "Food Tour",
      description: "Visit all restaurants",
      status: "ACTIVE",
      target_date: new Date("2024-12-31"),
      created_at: new Date("2024-01-01"),
      updated_at: new Date("2024-01-15"),
      creator_id: "user-123",
      creator: {
        id: "user-123",
        username: "creator",
        display_name: "Creator",
        avatar_url: null,
      },
      quest_items: [
        { id: "item-1", location_id: "loc-1", sort_order: 0, is_completed: true, completed_at: new Date(), added_by_id: null, completed_by_id: null },
        { id: "item-2", location_id: "loc-2", sort_order: 1, is_completed: false, completed_at: null, added_by_id: null, completed_by_id: null },
      ],
      quest_parties: [],
    };

    it("transforms quest to response format", () => {
      const result = toQuestResponse(mockQuest, "user-123");

      expect(result.id).toBe("quest-123");
      expect(result.name).toBe("Food Tour");
      expect(result.status).toBe("ACTIVE");
      expect(result.isOwner).toBe(true);
    });

    it("calculates completion stats", () => {
      const result = toQuestResponse(mockQuest, "user-123");

      expect(result.itemCount).toBe(2);
      expect(result.completedCount).toBe(1);
      expect(result.completionPercentage).toBe(50);
    });

    it("marks non-owner correctly", () => {
      const result = toQuestResponse(mockQuest, "other-user");

      expect(result.isOwner).toBe(false);
    });

    it("includes items when requested", () => {
      const result = toQuestResponse(mockQuest, "user-123", { includeItems: true });

      expect(result.items).toHaveLength(2);
    });

    it("excludes items when not requested", () => {
      const result = toQuestResponse(mockQuest, "user-123", { includeItems: false });

      expect(result.items).toBeUndefined();
    });
  });

  describe("toXPAwardResponse", () => {
    it("creates success response with XP data", () => {
      const result = toXPAwardResponse({
        xpAwarded: 100,
        boostApplied: true,
        boostMultiplier: 1.5,
        newTotalXP: 1500,
        newLevel: 5,
        leveledUp: true,
        xpToNext: 500,
      });

      expect(result.success).toBe(true);
      expect(result.xpAwarded).toBe(100);
      expect(result.boostApplied).toBe(true);
      expect(result.leveledUp).toBe(true);
    });
  });
});

// ============================================================================
// Location Service Tests
// ============================================================================

describe("Location Service", () => {
  describe("calculateDistance", () => {
    it("returns 0 for same coordinates", () => {
      const distance = calculateDistance(40.7128, -74.006, 40.7128, -74.006);
      expect(distance).toBe(0);
    });

    it("calculates distance between NYC and LA approximately", () => {
      // NYC: 40.7128, -74.0060
      // LA: 34.0522, -118.2437
      const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
      // Should be roughly 3940 km
      expect(distance).toBeGreaterThan(3900);
      expect(distance).toBeLessThan(4000);
    });

    it("calculates short distances accurately", () => {
      // Two points ~1km apart in NYC
      const distance = calculateDistance(40.7128, -74.006, 40.7218, -74.006);
      expect(distance).toBeCloseTo(1, 0);
    });
  });

  describe("isWithinRadius", () => {
    it("returns true for point within radius", () => {
      const result = isWithinRadius(40.7128, -74.006, 40.7138, -74.007, 1);
      expect(result).toBe(true);
    });

    it("returns false for point outside radius", () => {
      const result = isWithinRadius(40.7128, -74.006, 40.8, -74.1, 1);
      expect(result).toBe(false);
    });
  });

  describe("filterByDistance", () => {
    const locations = [
      { id: "1", latitude: 40.7128, longitude: -74.006 }, // Center
      { id: "2", latitude: 40.7138, longitude: -74.007 }, // ~0.15 km
      { id: "3", latitude: 40.7228, longitude: -74.016 }, // ~1.4 km
      { id: "4", latitude: 40.8, longitude: -74.1 },       // ~12 km
    ];

    it("filters locations within radius", () => {
      const result = filterByDistance(locations, 40.7128, -74.006, 2);

      expect(result).toHaveLength(3);
      expect(result.map((r) => r.item.id)).toContain("1");
      expect(result.map((r) => r.item.id)).toContain("2");
      expect(result.map((r) => r.item.id)).toContain("3");
    });

    it("returns results sorted by distance", () => {
      const result = filterByDistance(locations, 40.7128, -74.006, 2);

      expect(result[0].item.id).toBe("1");
      expect(result[0].distanceKm).toBe(0);
    });

    it("includes distance in results", () => {
      const result = filterByDistance(locations, 40.7128, -74.006, 15);

      result.forEach((r) => {
        expect(r.distanceKm).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("calculateLocationActionXP", () => {
    it("calculates base XP for new location", () => {
      const xp = calculateLocationActionXP("new_location", "RESTAURANT", 0);
      expect(xp).toBe(50);
    });

    it("applies type multiplier", () => {
      const xp = calculateLocationActionXP("new_location", "ATTRACTION", 0);
      expect(xp).toBe(75); // 50 * 1.5
    });

    it("applies streak multiplier", () => {
      const xp = calculateLocationActionXP("new_location", "RESTAURANT", 30);
      expect(xp).toBe(100); // 50 * 2.0
    });

    it("stacks multipliers", () => {
      const xp = calculateLocationActionXP("new_location", "ATTRACTION", 30);
      expect(xp).toBe(150); // 50 * 1.5 * 2.0
    });
  });

  describe("getLocationTypeXP", () => {
    it("returns correct XP for known types", () => {
      expect(getLocationTypeXP("RESTAURANT")).toBe(50);
      expect(getLocationTypeXP("ATTRACTION")).toBe(75);
      expect(getLocationTypeXP("CAFE")).toBe(40);
      expect(getLocationTypeXP("TRANSPORT")).toBe(25);
    });

    it("returns default for unknown type", () => {
      expect(getLocationTypeXP("UNKNOWN")).toBe(50);
    });
  });
});

// ============================================================================
// Gamification Service Tests
// ============================================================================

describe("Gamification Service", () => {
  describe("calculateQuestCompletionXP", () => {
    it("calculates base XP without party", () => {
      const xp = calculateQuestCompletionXP(5, false, 0);
      // 100 (base) + 75 (5 * 15) = 175
      expect(xp).toBe(175);
    });

    it("applies party bonus multiplier", () => {
      const xp = calculateQuestCompletionXP(5, true, 3);
      // (100 + 75 + 150) * 1.25 = 406.25 -> 406
      expect(xp).toBe(406);
    });

    it("scales with item count", () => {
      const xp5 = calculateQuestCompletionXP(5, false, 0);
      const xp10 = calculateQuestCompletionXP(10, false, 0);

      expect(xp10 - xp5).toBe(75); // 5 more items * 15 XP
    });

    it("scales with party size", () => {
      const xp2 = calculateQuestCompletionXP(5, true, 2);
      const xp4 = calculateQuestCompletionXP(5, true, 4);

      // More party members = more XP
      expect(xp4).toBeGreaterThan(xp2);
    });
  });

  describe("getStreakMultiplier", () => {
    it("returns 1.0 for no streak", () => {
      expect(getStreakMultiplier(0)).toBe(1.0);
      expect(getStreakMultiplier(2)).toBe(1.0);
    });

    it("returns 1.1 at 3 days", () => {
      expect(getStreakMultiplier(3)).toBe(1.1);
      expect(getStreakMultiplier(5)).toBe(1.1);
    });

    it("returns 1.25 at 7 days", () => {
      expect(getStreakMultiplier(7)).toBe(1.25);
      expect(getStreakMultiplier(10)).toBe(1.25);
    });

    it("returns 1.5 at 14 days", () => {
      expect(getStreakMultiplier(14)).toBe(1.5);
      expect(getStreakMultiplier(20)).toBe(1.5);
    });

    it("returns 2.0 at 30 days", () => {
      expect(getStreakMultiplier(30)).toBe(2.0);
      expect(getStreakMultiplier(100)).toBe(2.0);
    });
  });
});
