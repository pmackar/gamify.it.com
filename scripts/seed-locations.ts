import prisma from '../lib/db';
import * as osm from './fetchers/openstreetmap';
import type { NormalizedPlace } from './fetchers/openstreetmap';

// System user ID for global/seeded content
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || '7eab7440-5c91-4d5e-99cc-77cd64d5aa56';

type LocationType = 'RESTAURANT' | 'BAR' | 'CAFE' | 'ATTRACTION' | 'MUSEUM' | 'NATURE' | 'HOTEL' | 'NIGHTLIFE' | 'BEACH' | 'OTHER';

interface City {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
}

interface SeedResult {
  city: string;
  total: number;
  byType: Record<string, number>;
  errors: string[];
}

const LOCATION_COUNTS = {
  RESTAURANT: 30,
  BAR: 15,
  CAFE: 10,
  ATTRACTION: 20,
  MUSEUM: 10,
  NATURE: 10,
  HOTEL: 5,
};

async function insertLocation(
  place: NormalizedPlace,
  type: LocationType,
  cityId: string
): Promise<boolean> {
  try {
    // Check if already exists
    const existing = await prisma.travel_locations.findFirst({
      where: {
        external_id: place.id,
        external_source: place.source,
      },
    });

    if (existing) {
      return false; // Already exists
    }

    await prisma.travel_locations.create({
      data: {
        name: place.name,
        type,
        address: place.address,
        latitude: place.lat,
        longitude: place.lng,
        city_id: cityId,
        user_id: null, // Global location (travel_locations allows null)
        description: place.description,
        website: place.website,
        phone: place.phone,
        hours: place.hours,
        price_level: place.priceLevel,
        tags: place.categories,
        external_id: place.id,
        external_source: place.source,
        avg_rating: place.rating,
        rating_count: place.rating ? 1 : 0,
        total_visits: 0,
      },
    });

    return true;
  } catch (error) {
    console.error(`  Error inserting ${place.name}: ${error}`);
    return false;
  }
}

async function seedLocationsForCity(city: City): Promise<SeedResult> {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`Seeding locations for ${city.name}...`);
  console.log(`Using OpenStreetMap (ODbL License - Attribution: © OpenStreetMap contributors)`);
  console.log(`${'='.repeat(60)}`);

  const result: SeedResult = {
    city: city.name,
    total: 0,
    byType: {},
    errors: [],
  };

  const { latitude: lat, longitude: lng } = city;

  // Restaurants
  try {
    console.log('\n  Fetching restaurants from OpenStreetMap...');
    const restaurants = await osm.fetchRestaurants(lat, lng, LOCATION_COUNTS.RESTAURANT);
    let count = 0;
    for (const place of restaurants) {
      if (await insertLocation(place, 'RESTAURANT', city.id)) count++;
    }
    result.byType['RESTAURANT'] = count;
    result.total += count;
    console.log(`    ✓ ${count} restaurants`);
  } catch (error) {
    result.errors.push(`Restaurants: ${error}`);
    console.error(`    ✗ Restaurants failed: ${error}`);
  }

  // Bars
  try {
    console.log('  Fetching bars from OpenStreetMap...');
    const bars = await osm.fetchBars(lat, lng, LOCATION_COUNTS.BAR);
    let count = 0;
    for (const place of bars) {
      if (await insertLocation(place, 'BAR', city.id)) count++;
    }
    result.byType['BAR'] = count;
    result.total += count;
    console.log(`    ✓ ${count} bars`);
  } catch (error) {
    result.errors.push(`Bars: ${error}`);
    console.error(`    ✗ Bars failed: ${error}`);
  }

  // Cafes
  try {
    console.log('  Fetching cafes from OpenStreetMap...');
    const cafes = await osm.fetchCafes(lat, lng, LOCATION_COUNTS.CAFE);
    let count = 0;
    for (const place of cafes) {
      if (await insertLocation(place, 'CAFE', city.id)) count++;
    }
    result.byType['CAFE'] = count;
    result.total += count;
    console.log(`    ✓ ${count} cafes`);
  } catch (error) {
    result.errors.push(`Cafes: ${error}`);
    console.error(`    ✗ Cafes failed: ${error}`);
  }

  // Attractions
  try {
    console.log('  Fetching attractions from OpenStreetMap...');
    const attractions = await osm.fetchAttractions(lat, lng, LOCATION_COUNTS.ATTRACTION);
    let count = 0;
    for (const place of attractions) {
      if (await insertLocation(place, 'ATTRACTION', city.id)) count++;
    }
    result.byType['ATTRACTION'] = count;
    result.total += count;
    console.log(`    ✓ ${count} attractions`);
  } catch (error) {
    result.errors.push(`Attractions: ${error}`);
    console.error(`    ✗ Attractions failed: ${error}`);
  }

  // Museums
  try {
    console.log('  Fetching museums from OpenStreetMap...');
    const museums = await osm.fetchMuseums(lat, lng, LOCATION_COUNTS.MUSEUM);
    let count = 0;
    for (const place of museums) {
      if (await insertLocation(place, 'MUSEUM', city.id)) count++;
    }
    result.byType['MUSEUM'] = count;
    result.total += count;
    console.log(`    ✓ ${count} museums`);
  } catch (error) {
    result.errors.push(`Museums: ${error}`);
    console.error(`    ✗ Museums failed: ${error}`);
  }

  // Parks/Nature
  try {
    console.log('  Fetching parks/nature from OpenStreetMap...');
    const parks = await osm.fetchParks(lat, lng, LOCATION_COUNTS.NATURE);
    let count = 0;
    for (const place of parks) {
      if (await insertLocation(place, 'NATURE', city.id)) count++;
    }
    result.byType['NATURE'] = count;
    result.total += count;
    console.log(`    ✓ ${count} parks/nature`);
  } catch (error) {
    result.errors.push(`Parks: ${error}`);
    console.error(`    ✗ Parks failed: ${error}`);
  }

  // Hotels
  try {
    console.log('  Fetching hotels from OpenStreetMap...');
    const hotels = await osm.fetchHotels(lat, lng, LOCATION_COUNTS.HOTEL);
    let count = 0;
    for (const place of hotels) {
      if (await insertLocation(place, 'HOTEL', city.id)) count++;
    }
    result.byType['HOTEL'] = count;
    result.total += count;
    console.log(`    ✓ ${count} hotels`);
  } catch (error) {
    result.errors.push(`Hotels: ${error}`);
    console.error(`    ✗ Hotels failed: ${error}`);
  }

  // Update city location count
  await prisma.travel_cities.update({
    where: { id: city.id },
    data: { location_count: result.total },
  });

  console.log(`\n  ✓ Total: ${result.total} locations seeded for ${city.name}`);

  return result;
}

async function seedAllLocations() {
  console.log('Starting location seeding with OpenStreetMap...');
  console.log('Data License: Open Database License (ODbL)');
  console.log('Attribution: © OpenStreetMap contributors\n');

  // Get all seeded cities (owned by system user)
  const cities = await prisma.travel_cities.findMany({
    where: { user_id: SYSTEM_USER_ID },
    select: {
      id: true,
      name: true,
      latitude: true,
      longitude: true,
    },
    orderBy: { name: 'asc' },
  });

  if (cities.length === 0) {
    console.error('No seeded cities found. Run seed-cities.ts first.');
    process.exit(1);
  }

  console.log(`Found ${cities.length} cities to seed.\n`);

  const results: SeedResult[] = [];

  for (const city of cities) {
    if (city.latitude && city.longitude) {
      const result = await seedLocationsForCity(city as City);
      results.push(result);
    } else {
      console.log(`Skipping ${city.name}: missing coordinates`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SEEDING COMPLETE');
  console.log('Data Source: OpenStreetMap (© OpenStreetMap contributors)');
  console.log('='.repeat(60));

  let grandTotal = 0;
  const typeTotal: Record<string, number> = {};

  for (const result of results) {
    console.log(`\n${result.city}: ${result.total} locations`);
    grandTotal += result.total;
    for (const [type, count] of Object.entries(result.byType)) {
      typeTotal[type] = (typeTotal[type] || 0) + count;
    }
    if (result.errors.length > 0) {
      console.log(`  Errors: ${result.errors.join(', ')}`);
    }
  }

  console.log('\n' + '-'.repeat(40));
  console.log('TOTALS:');
  for (const [type, count] of Object.entries(typeTotal)) {
    console.log(`  ${type}: ${count}`);
  }
  console.log(`\nGrand Total: ${grandTotal} locations across ${results.length} cities`);
}

// Allow seeding a single city by name
const cityArg = process.argv[2];

if (cityArg) {
  // Seed single city
  (async () => {
    const city = await prisma.travel_cities.findFirst({
      where: {
        name: { contains: cityArg, mode: 'insensitive' },
        user_id: SYSTEM_USER_ID,
      },
    });

    if (!city) {
      console.error(`City not found: ${cityArg}`);
      process.exit(1);
    }

    if (!city.latitude || !city.longitude) {
      console.error(`City ${city.name} is missing coordinates`);
      process.exit(1);
    }

    await seedLocationsForCity(city as City);
    process.exit(0);
  })();
} else {
  // Seed all cities
  seedAllLocations()
    .then(() => {
      console.log('\nDone!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Error seeding locations:', error);
      process.exit(1);
    });
}
