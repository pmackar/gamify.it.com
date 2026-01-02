/**
 * Migration script: gamify.travel (old) → gamify.it.com (new)
 *
 * Source: ghgghjhcrjwewsdrtkcj (PascalCase tables)
 * Destination: klsxuyiwkjrkkvwwbehc (snake_case travel_* tables)
 */

import { PrismaClient } from '@prisma/client';

const SOURCE_DB_URL = "postgresql://postgres.ghgghjhcrjwewsdrtkcj:RbpFki86oe8Q64XHbYdyyQhHBrUZHtoK@aws-0-us-west-2.pooler.supabase.com:5432/postgres";

// Source DB client
const sourceDb = new PrismaClient({
  datasources: { db: { url: SOURCE_DB_URL } },
});

// Destination DB client (uses env DATABASE_URL)
const destDb = new PrismaClient();

interface SourceUser {
  id: string;
  email: string;
  name: string | null;
}

interface SourceCity {
  id: string;
  name: string;
  country: string;
  region: string | null;
  countryCode: string | null;
  latitude: number | null;
  longitude: number | null;
  firstVisited: Date | null;
  lastVisited: Date | null;
  visitCount: number;
  notes: string | null;
  locationCount: number;
  userId: string;
}

interface SourceLocation {
  id: string;
  name: string;
  type: string;
  address: string | null;
  latitude: number;
  longitude: number;
  description: string | null;
  website: string | null;
  phone: string | null;
  priceLevel: number | null;
  tags: string[];
  avgRating: number | null;
  ratingCount: number;
  userId: string | null;
  cityId: string;
  neighborhood: string | null;
  blurb: string | null;
  cuisine: string | null;
  hotlist: boolean;
  hours: string | null;
  otherInfo: string | null;
  visited: boolean;
  neighborhoodId: string | null;
  reviewCount: number;
  totalVisits: number;
}

interface SourceNeighborhood {
  id: string;
  name: string;
  description: string | null;
  latitude: number | null;
  longitude: number | null;
  cityId: string;
  userId: string;
}

interface SourceVisit {
  id: string;
  date: Date;
  overallRating: number | null;
  foodQuality: number | null;
  serviceRating: number | null;
  ambianceRating: number | null;
  valueRating: number | null;
  notes: string | null;
  highlights: string[];
  xpEarned: number;
  userId: string;
  locationId: string;
}

interface SourceUserLocationData {
  id: string;
  hotlist: boolean;
  visited: boolean;
  personalRating: number | null;
  notes: string | null;
  visitCount: number;
  firstVisitedAt: Date | null;
  lastVisitedAt: Date | null;
  userId: string;
  locationId: string;
}

async function migrate() {
  console.log('Starting migration...\n');

  // Step 1: Build user ID mapping (source email → dest UUID)
  console.log('1. Building user mapping...');
  const sourceUsers = await sourceDb.$queryRaw<SourceUser[]>`SELECT id, email, name FROM "User"`;
  const destUsers = await destDb.profiles.findMany({ select: { id: true, email: true } });

  const userIdMap = new Map<string, string>();
  for (const srcUser of sourceUsers) {
    const destUser = destUsers.find(u => u.email.toLowerCase() === srcUser.email.toLowerCase());
    if (destUser) {
      userIdMap.set(srcUser.id, destUser.id);
      console.log(`   Mapped: ${srcUser.email} → ${destUser.id}`);
    } else {
      console.log(`   SKIP: ${srcUser.email} (no matching dest user)`);
    }
  }

  if (userIdMap.size === 0) {
    console.log('No users to migrate. Exiting.');
    return;
  }

  // Step 2: Migrate Cities
  console.log('\n2. Migrating cities...');
  const sourceCities = await sourceDb.$queryRaw<SourceCity[]>`SELECT * FROM "City"`;
  const cityIdMap = new Map<string, string>();

  for (const city of sourceCities) {
    const destUserId = userIdMap.get(city.userId);
    if (!destUserId) {
      console.log(`   SKIP city "${city.name}" (no user mapping)`);
      continue;
    }

    // Check if already exists
    const existing = await destDb.travel_cities.findFirst({
      where: { user_id: destUserId, name: city.name, country: city.country },
    });

    if (existing) {
      cityIdMap.set(city.id, existing.id);
      console.log(`   EXISTS: ${city.name}, ${city.country}`);
      continue;
    }

    const newCity = await destDb.travel_cities.create({
      data: {
        user_id: destUserId,
        name: city.name,
        country: city.country,
        region: city.region,
        country_code: city.countryCode,
        latitude: city.latitude,
        longitude: city.longitude,
        first_visited: city.firstVisited,
        last_visited: city.lastVisited,
        visit_count: city.visitCount,
        notes: city.notes,
        location_count: city.locationCount,
      },
    });
    cityIdMap.set(city.id, newCity.id);
    console.log(`   Created: ${city.name}, ${city.country}`);
  }

  // Step 3: Migrate Neighborhoods
  console.log('\n3. Migrating neighborhoods...');
  const sourceNeighborhoods = await sourceDb.$queryRaw<SourceNeighborhood[]>`SELECT * FROM "Neighborhood"`;
  const neighborhoodIdMap = new Map<string, string>();

  for (const nb of sourceNeighborhoods) {
    const destUserId = userIdMap.get(nb.userId);
    const destCityId = cityIdMap.get(nb.cityId);
    if (!destUserId || !destCityId) {
      console.log(`   SKIP neighborhood "${nb.name}" (no mapping)`);
      continue;
    }

    const existing = await destDb.travel_neighborhoods.findFirst({
      where: { user_id: destUserId, city_id: destCityId, name: nb.name },
    });

    if (existing) {
      neighborhoodIdMap.set(nb.id, existing.id);
      console.log(`   EXISTS: ${nb.name}`);
      continue;
    }

    const newNb = await destDb.travel_neighborhoods.create({
      data: {
        user_id: destUserId,
        city_id: destCityId,
        name: nb.name,
        description: nb.description,
        latitude: nb.latitude,
        longitude: nb.longitude,
      },
    });
    neighborhoodIdMap.set(nb.id, newNb.id);
    console.log(`   Created: ${nb.name}`);
  }

  // Step 4: Migrate Locations
  console.log('\n4. Migrating locations...');
  const sourceLocations = await sourceDb.$queryRaw<SourceLocation[]>`SELECT * FROM "Location"`;
  const locationIdMap = new Map<string, string>();

  for (const loc of sourceLocations) {
    const destCityId = cityIdMap.get(loc.cityId);
    if (!destCityId) {
      console.log(`   SKIP location "${loc.name}" (no city mapping)`);
      continue;
    }

    const destUserId = loc.userId ? userIdMap.get(loc.userId) : null;
    const destNeighborhoodId = loc.neighborhoodId ? neighborhoodIdMap.get(loc.neighborhoodId) : null;

    // Check if already exists (by name + city)
    const existing = await destDb.travel_locations.findFirst({
      where: { city_id: destCityId, name: loc.name },
    });

    if (existing) {
      locationIdMap.set(loc.id, existing.id);
      continue; // Silent skip for locations
    }

    const newLoc = await destDb.travel_locations.create({
      data: {
        user_id: destUserId,
        city_id: destCityId,
        neighborhood_id: destNeighborhoodId,
        name: loc.name,
        type: loc.type as any,
        address: loc.address,
        latitude: loc.latitude,
        longitude: loc.longitude,
        description: loc.description,
        website: loc.website,
        phone: loc.phone,
        price_level: loc.priceLevel,
        tags: loc.tags,
        avg_rating: loc.avgRating,
        rating_count: loc.ratingCount,
        blurb: loc.blurb,
        cuisine: loc.cuisine,
        hotlist: loc.hotlist,
        hours: loc.hours,
        other_info: loc.otherInfo,
        visited: loc.visited,
        review_count: loc.reviewCount,
        total_visits: loc.totalVisits,
      },
    });
    locationIdMap.set(loc.id, newLoc.id);
  }
  console.log(`   Migrated ${locationIdMap.size} locations`);

  // Step 5: Migrate Visits
  console.log('\n5. Migrating visits...');
  const sourceVisits = await sourceDb.$queryRaw<SourceVisit[]>`SELECT * FROM "Visit"`;
  let visitCount = 0;

  for (const visit of sourceVisits) {
    const destUserId = userIdMap.get(visit.userId);
    const destLocationId = locationIdMap.get(visit.locationId);
    if (!destUserId || !destLocationId) continue;

    // Check if exists
    const existing = await destDb.travel_visits.findFirst({
      where: { user_id: destUserId, location_id: destLocationId, date: visit.date },
    });
    if (existing) continue;

    await destDb.travel_visits.create({
      data: {
        user_id: destUserId,
        location_id: destLocationId,
        date: visit.date,
        overall_rating: visit.overallRating,
        food_quality: visit.foodQuality,
        service_rating: visit.serviceRating,
        ambiance_rating: visit.ambianceRating,
        value_rating: visit.valueRating,
        notes: visit.notes,
        highlights: visit.highlights,
        xp_earned: visit.xpEarned,
      },
    });
    visitCount++;
  }
  console.log(`   Migrated ${visitCount} visits`);

  // Step 6: Migrate UserLocationData
  console.log('\n6. Migrating user location data...');
  const sourceULD = await sourceDb.$queryRaw<SourceUserLocationData[]>`SELECT * FROM "UserLocationData"`;
  let uldCount = 0;

  for (const uld of sourceULD) {
    const destUserId = userIdMap.get(uld.userId);
    const destLocationId = locationIdMap.get(uld.locationId);
    if (!destUserId || !destLocationId) continue;

    // Upsert to handle existing records
    await destDb.travel_user_location_data.upsert({
      where: {
        user_id_location_id: { user_id: destUserId, location_id: destLocationId },
      },
      update: {
        hotlist: uld.hotlist,
        visited: uld.visited,
        personal_rating: uld.personalRating,
        notes: uld.notes,
        visit_count: uld.visitCount,
        first_visited_at: uld.firstVisitedAt,
        last_visited_at: uld.lastVisitedAt,
      },
      create: {
        user_id: destUserId,
        location_id: destLocationId,
        hotlist: uld.hotlist,
        visited: uld.visited,
        personal_rating: uld.personalRating,
        notes: uld.notes,
        visit_count: uld.visitCount,
        first_visited_at: uld.firstVisitedAt,
        last_visited_at: uld.lastVisitedAt,
      },
    });
    uldCount++;
  }
  console.log(`   Migrated ${uldCount} user location data records`);

  console.log('\n✅ Migration complete!');

  // Print summary
  const finalCounts = await Promise.all([
    destDb.travel_cities.count(),
    destDb.travel_locations.count(),
    destDb.travel_neighborhoods.count(),
    destDb.travel_visits.count(),
    destDb.travel_user_location_data.count(),
  ]);

  console.log('\nFinal counts in destination DB:');
  console.log(`  Cities: ${finalCounts[0]}`);
  console.log(`  Locations: ${finalCounts[1]}`);
  console.log(`  Neighborhoods: ${finalCounts[2]}`);
  console.log(`  Visits: ${finalCounts[3]}`);
  console.log(`  User Location Data: ${finalCounts[4]}`);
}

migrate()
  .catch(console.error)
  .finally(async () => {
    await sourceDb.$disconnect();
    await destDb.$disconnect();
  });
