/**
 * Prisma Mock Utilities
 *
 * Provides mock implementations of Prisma client for testing.
 * Uses vitest's mock functions for flexible test setup.
 */

import { vi } from "vitest";

// Generic mock result builder
export function createMockResult<T>(data: T) {
  return vi.fn().mockResolvedValue(data);
}

// Create a chainable mock that supports Prisma's fluent API
export function createChainableMock<T>(finalResult: T) {
  const mock = {
    findUnique: vi.fn().mockResolvedValue(finalResult),
    findFirst: vi.fn().mockResolvedValue(finalResult),
    findMany: vi.fn().mockResolvedValue(Array.isArray(finalResult) ? finalResult : [finalResult]),
    create: vi.fn().mockResolvedValue(finalResult),
    update: vi.fn().mockResolvedValue(finalResult),
    delete: vi.fn().mockResolvedValue(finalResult),
    upsert: vi.fn().mockResolvedValue(finalResult),
    count: vi.fn().mockResolvedValue(1),
    groupBy: vi.fn().mockResolvedValue([]),
    createMany: vi.fn().mockResolvedValue({ count: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
    updateMany: vi.fn().mockResolvedValue({ count: 1 }),
  };
  return mock;
}

// Mock location data
export const mockLocation = {
  id: "loc-123",
  name: "Test Restaurant",
  type: "RESTAURANT",
  address: "123 Main St",
  latitude: 40.7128,
  longitude: -74.006,
  city_id: "city-123",
  neighborhood_id: "neigh-123",
  google_place_id: null,
  notes: null,
  blurb: "Great food",
  description: null,
  website: null,
  phone: null,
  hours: null,
  price_level: 2,
  cuisine: "Italian",
  tags: [],
  hotlist: false,
  visited: true,
  avg_rating: 4.5,
  rating_count: 10,
  review_count: 5,
  total_visits: 100,
  user_id: "test-user-id-123",
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-15"),
  city: { id: "city-123", name: "New York", country: "USA" },
  neighborhood: { id: "neigh-123", name: "Manhattan" },
};

// Mock quest data
export const mockQuest = {
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

// Mock city data
export const mockCity = {
  id: "city-123",
  name: "New York",
  country: "USA",
  region: "NY",
  latitude: 40.7128,
  longitude: -74.006,
  first_visited: new Date("2024-01-01"),
  last_visited: new Date("2024-06-01"),
  visit_count: 5,
  location_count: 10,
  notes: null,
  user_id: "test-user-id-123",
  neighborhoods: [],
  _count: { locations: 10 },
};

// Mock user location data
export const mockUserLocationData = {
  user_id: "test-user-id-123",
  location_id: "loc-123",
  visited: true,
  hotlist: false,
  personal_rating: 4.5,
  visit_count: 3,
  first_visited_at: new Date("2024-01-01"),
  last_visited_at: new Date("2024-06-01"),
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-06-01"),
};

// Mock app profile data
export const mockAppProfile = {
  id: "app-profile-123",
  user_id: "test-user-id-123",
  app_id: "travel",
  xp: 500,
  level: 3,
  xp_to_next: 150,
  stats: {},
  created_at: new Date("2024-01-01"),
  updated_at: new Date("2024-01-15"),
};

// Mock profile data
export const mockProfile = {
  id: "test-user-id-123",
  total_xp: 1000,
  main_level: 5,
  current_streak: 3,
  longest_streak: 10,
  last_activity_date: new Date("2024-06-01"),
  xp_boost_multiplier: null,
  xp_boost_expires_at: null,
  login_streak: 5,
  last_login_claim: new Date("2024-06-01"),
  streak_shields: 1,
};

// Factory to create a full Prisma mock
export function createPrismaMock(overrides: Record<string, unknown> = {}) {
  return {
    travel_locations: createChainableMock(mockLocation),
    travel_quests: createChainableMock(mockQuest),
    travel_quest_items: createChainableMock(null),
    travel_cities: createChainableMock(mockCity),
    travel_neighborhoods: createChainableMock(null),
    travel_user_location_data: createChainableMock(mockUserLocationData),
    travel_visits: createChainableMock(null),
    travel_reviews: createChainableMock(null),
    app_profiles: createChainableMock(mockAppProfile),
    profiles: createChainableMock(mockProfile),
    user_achievements: createChainableMock(null),
    activity_feed: createChainableMock(null),
    friendships: createChainableMock([]),
    quest_parties: createChainableMock(null),
    quest_party_members: createChainableMock(null),
    xp_events: createChainableMock(null),
    daily_login_claims: createChainableMock(null),
    ...overrides,
  };
}
