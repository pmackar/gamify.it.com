/**
 * Location Service
 *
 * Centralized business logic for location operations:
 * - User location data retrieval
 * - Location enrichment with user data
 * - Distance calculations
 * - XP calculations for location actions
 */

import prisma from "@/lib/db";
import { XP_VALUES } from "@/lib/gamification";
import {
  toLocationResponse,
  toLocationUserData,
  type LocationResponse,
  type LocationUserData,
} from "./response-transformers";

// ============================================================================
// Types
// ============================================================================

export interface LocationWithUserData extends LocationResponse {
  userData: LocationUserData;
}

export interface NearbyLocationResult {
  location: LocationResponse;
  distanceKm: number;
}

// ============================================================================
// User Location Data
// ============================================================================

/**
 * Get user-specific data for a single location
 */
export async function getUserLocationData(
  userId: string,
  locationId: string
): Promise<LocationUserData | null> {
  const userData = await prisma.travel_user_location_data.findUnique({
    where: {
      user_id_location_id: {
        user_id: userId,
        location_id: locationId,
      },
    },
  });

  if (!userData) {
    return null;
  }

  return toLocationUserData(userData);
}

/**
 * Get user-specific data for multiple locations (batch)
 */
export async function getUserLocationDataBatch(
  userId: string,
  locationIds: string[]
): Promise<Map<string, LocationUserData>> {
  if (locationIds.length === 0) {
    return new Map();
  }

  const userData = await prisma.travel_user_location_data.findMany({
    where: {
      user_id: userId,
      location_id: { in: locationIds },
    },
  });

  const map = new Map<string, LocationUserData>();
  for (const data of userData) {
    map.set(data.location_id, toLocationUserData(data));
  }

  return map;
}

/**
 * Enrich locations with user data
 */
export async function enrichLocationsWithUserData(
  locations: { id: string; [key: string]: unknown }[],
  userId: string
): Promise<LocationWithUserData[]> {
  const locationIds = locations.map((l) => l.id);
  const userDataMap = await getUserLocationDataBatch(userId, locationIds);

  return locations.map((location) => {
    const userData = userDataMap.get(location.id) ?? {
      isVisited: false,
      isHotlisted: false,
      rating: null,
      visitCount: 0,
      firstVisited: null,
      lastVisited: null,
    };

    return {
      ...toLocationResponse(location as Parameters<typeof toLocationResponse>[0]),
      userData,
    };
  });
}

// ============================================================================
// Distance Calculations (Haversine formula)
// ============================================================================

/**
 * Calculate distance between two coordinates in kilometers
 */
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(deg: number): number {
  return deg * (Math.PI / 180);
}

/**
 * Check if location is within radius
 */
export function isWithinRadius(
  centerLat: number,
  centerLon: number,
  locationLat: number,
  locationLon: number,
  radiusKm: number
): boolean {
  return calculateDistance(centerLat, centerLon, locationLat, locationLon) <= radiusKm;
}

/**
 * Filter locations by distance and return with distances
 */
export function filterByDistance<T extends { latitude: number; longitude: number }>(
  locations: T[],
  centerLat: number,
  centerLon: number,
  radiusKm: number
): Array<{ item: T; distanceKm: number }> {
  return locations
    .map((item) => ({
      item,
      distanceKm: calculateDistance(centerLat, centerLon, item.latitude, item.longitude),
    }))
    .filter(({ distanceKm }) => distanceKm <= radiusKm)
    .sort((a, b) => a.distanceKm - b.distanceKm);
}

// ============================================================================
// XP Calculations
// ============================================================================

/**
 * Calculate XP for a location action
 */
export function calculateLocationActionXP(
  action: "new_location" | "visit" | "first_visit" | "visit_with_rating" | "visit_with_review" | "visit_with_photo" | "new_city" | "new_country",
  locationType: string,
  streakDays: number = 0
): number {
  const baseXP = XP_VALUES[action] ?? 25;
  const typeMultiplier = XP_VALUES.type_multipliers[locationType] ?? 1.0;
  const streakMultiplier = getStreakMultiplier(streakDays);

  return Math.floor(baseXP * typeMultiplier * streakMultiplier);
}

/**
 * Get streak multiplier based on consecutive days
 */
function getStreakMultiplier(streakDays: number): number {
  const thresholds = Object.keys(XP_VALUES.streak_multipliers)
    .map(Number)
    .sort((a, b) => b - a);

  for (const threshold of thresholds) {
    if (streakDays >= threshold) {
      return XP_VALUES.streak_multipliers[threshold];
    }
  }

  return 1.0;
}

/**
 * Get XP amount for location type
 */
export function getLocationTypeXP(locationType: string): number {
  const typeMap: Record<string, number> = {
    RESTAURANT: 50,
    BAR: 50,
    CAFE: 40,
    ATTRACTION: 75,
    MUSEUM: 75,
    NATURE: 75,
    HOTEL: 60,
    BEACH: 60,
    NIGHTLIFE: 50,
    SHOP: 40,
    TRANSPORT: 25,
    OTHER: 40,
  };

  return typeMap[locationType] ?? 50;
}

// ============================================================================
// Location Queries
// ============================================================================

/**
 * Find nearby locations for a user
 */
export async function findNearbyLocations(
  userId: string,
  latitude: number,
  longitude: number,
  radiusKm: number = 5,
  options: {
    limit?: number;
    includeVisited?: boolean;
    types?: string[];
  } = {}
): Promise<NearbyLocationResult[]> {
  const { limit = 50, includeVisited = true, types } = options;

  // Get user's locations within approximate bounding box
  // (rough filter, then precise distance calculation)
  const latDelta = radiusKm / 111; // ~111km per degree latitude
  const lonDelta = radiusKm / (111 * Math.cos(toRad(latitude)));

  const where: Record<string, unknown> = {
    user_id: userId,
    latitude: {
      gte: latitude - latDelta,
      lte: latitude + latDelta,
    },
    longitude: {
      gte: longitude - lonDelta,
      lte: longitude + lonDelta,
    },
  };

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  const locations = await prisma.travel_locations.findMany({
    where,
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
    take: limit * 2, // Get extra for filtering
  });

  // Get user data for these locations
  const locationIds = locations.map((l) => l.id);
  const userDataMap = await getUserLocationDataBatch(userId, locationIds);

  // Filter by exact distance and optionally by visited status
  const results: NearbyLocationResult[] = [];

  for (const location of locations) {
    const distance = calculateDistance(
      latitude,
      longitude,
      Number(location.latitude),
      Number(location.longitude)
    );

    if (distance > radiusKm) continue;

    const userData = userDataMap.get(location.id);
    if (!includeVisited && userData?.isVisited) continue;

    results.push({
      location: toLocationResponse(location, userData ? {
        is_visited: userData.isVisited,
        is_hotlisted: userData.isHotlisted,
        personal_rating: userData.rating,
        visit_count: userData.visitCount,
        first_visited: userData.firstVisited ? new Date(userData.firstVisited) : null,
        last_visited: userData.lastVisited ? new Date(userData.lastVisited) : null,
      } : undefined),
      distanceKm: Math.round(distance * 100) / 100,
    });
  }

  // Sort by distance and limit
  return results
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

/**
 * Search locations by name/address
 */
export async function searchLocations(
  userId: string,
  query: string,
  options: {
    limit?: number;
    cityId?: string;
    types?: string[];
  } = {}
): Promise<LocationWithUserData[]> {
  const { limit = 20, cityId, types } = options;

  const where: Record<string, unknown> = {
    user_id: userId,
    OR: [
      { name: { contains: query, mode: "insensitive" } },
      { address: { contains: query, mode: "insensitive" } },
    ],
  };

  if (cityId) {
    where.city_id = cityId;
  }

  if (types && types.length > 0) {
    where.type = { in: types };
  }

  const locations = await prisma.travel_locations.findMany({
    where,
    include: {
      city: { select: { id: true, name: true, country: true } },
      neighborhood: { select: { id: true, name: true } },
    },
    orderBy: { name: "asc" },
    take: limit,
  });

  return enrichLocationsWithUserData(locations, userId);
}

/**
 * Check if this is user's first location in a city
 */
export async function isFirstLocationInCity(
  userId: string,
  cityId: string,
  excludeLocationId?: string
): Promise<boolean> {
  const count = await prisma.travel_locations.count({
    where: {
      user_id: userId,
      city_id: cityId,
      id: excludeLocationId ? { not: excludeLocationId } : undefined,
    },
  });

  return count === 0;
}

/**
 * Check if this is user's first location in a country
 */
export async function isFirstLocationInCountry(
  userId: string,
  country: string,
  excludeLocationId?: string
): Promise<boolean> {
  const count = await prisma.travel_locations.count({
    where: {
      user_id: userId,
      city: { country },
      id: excludeLocationId ? { not: excludeLocationId } : undefined,
    },
  });

  return count === 0;
}
