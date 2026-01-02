/**
 * Import travel locations from Notion CSV export
 *
 * Usage: npx tsx scripts/import-notion-travel.ts
 */

import { PrismaClient, LocationType } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CSV_PATH = '/Users/petermackar/Downloads/Private & Shared 2/travel places import 2dc81ffc014680358a86f8a4f94508c8_all.csv';

// Map Notion types to our LocationType enum
const TYPE_MAP: Record<string, LocationType> = {
  'Restaurant': 'RESTAURANT',
  'Cafe': 'CAFE',
  'Bar': 'BAR',
  'Museum': 'MUSEUM',
  'Gallery': 'ATTRACTION',
  'Shop': 'SHOP',
  'Park': 'NATURE',
  'Beach': 'BEACH',
  'Hotel': 'HOTEL',
  'Nightlife': 'NIGHTLIFE',
  'Takeout Only': 'RESTAURANT',
  '': 'OTHER',
};

// Parse cost string to price level (1-4)
function parseCost(cost: string): number | null {
  const dollarCount = (cost.match(/\$/g) || []).length;
  return dollarCount > 0 ? Math.min(dollarCount, 4) : null;
}

// Parse neighborhood name from Notion relation string
function parseNeighborhood(notionStr: string): string | null {
  if (!notionStr || notionStr === '') return null;
  // Format: "Fishtown (https://www.notion.so/...)"
  const match = notionStr.match(/^([^(]+)\s*\(/);
  if (match) return match[1].trim();
  return notionStr.trim() || null;
}

// Parse rating to number
function parseRating(rating: string): number | null {
  const num = parseFloat(rating);
  return isNaN(num) ? null : num;
}

// Simple CSV parser that handles quoted fields
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());

  return result;
}

async function importLocations() {
  console.log('Starting Notion CSV import...\n');

  // Get user ID for Peter Mackar
  const user = await prisma.profiles.findFirst({
    where: { email: 'pmackar@gmail.com' },
  });

  if (!user) {
    console.error('User pmackar@gmail.com not found!');
    return;
  }
  console.log(`User: ${user.email} (${user.id})\n`);

  // Get Philadelphia city (should exist from previous migration)
  let city = await prisma.travel_cities.findFirst({
    where: { user_id: user.id, name: 'Philadelphia' },
  });

  if (!city) {
    city = await prisma.travel_cities.create({
      data: {
        user_id: user.id,
        name: 'Philadelphia',
        country: 'USA',
        country_code: 'US',
        region: 'Pennsylvania',
        latitude: 39.9526,
        longitude: -75.1652,
      },
    });
    console.log('Created Philadelphia city');
  }
  console.log(`City: ${city.name} (${city.id})\n`);

  // Get existing neighborhoods
  const neighborhoods = await prisma.travel_neighborhoods.findMany({
    where: { city_id: city.id },
  });
  const neighborhoodMap = new Map<string, string>();
  for (const nb of neighborhoods) {
    neighborhoodMap.set(nb.name.toLowerCase(), nb.id);
  }
  console.log(`Found ${neighborhoods.length} neighborhoods\n`);

  // Read and parse CSV
  const csvContent = fs.readFileSync(CSV_PATH, 'utf-8');
  const lines = csvContent.split('\n');

  // Skip BOM and header
  const header = parseCSVLine(lines[0].replace(/^\uFEFF/, ''));
  console.log('CSV Columns:', header.length);

  // Column indices (0-based)
  const COL = {
    NAME: 0,
    ADDRESS: 2,
    AVG_RATING: 4,
    BLURB: 5,
    COST: 7,
    CUISINE: 10,
    VISITED: 11,      // "Have we been here?"
    HOTLIST: 12,      // "Hotlist"
    HOURS: 14,
    NEIGHBORHOOD: 17,
    OTHER_INFO: 18,
    OUR_RATING: 19,
    PETERS_RATING: 20,
    TYPE: 23,
    WEBSITE: 24,
    PHILLY_NEIGHBORHOOD: 26,  // 🗺️ Philadelphia Neighborhoods
  };

  let imported = 0;
  let skipped = 0;
  let errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const fields = parseCSVLine(line);

    const name = fields[COL.NAME]?.trim();
    const address = fields[COL.ADDRESS]?.trim();

    // Skip if no address
    if (!address || address === '') {
      skipped++;
      continue;
    }

    // Skip if no name
    if (!name || name === '') {
      skipped++;
      continue;
    }

    const typeStr = fields[COL.TYPE]?.trim() || '';
    const type = TYPE_MAP[typeStr] || 'OTHER';

    const blurb = fields[COL.BLURB]?.trim() || null;
    const cost = fields[COL.COST]?.trim() || '';
    const cuisine = fields[COL.CUISINE]?.trim() || null;
    const visited = fields[COL.VISITED]?.toLowerCase() === 'yes';
    const hotlist = fields[COL.HOTLIST]?.toLowerCase() === 'yes';
    const hours = fields[COL.HOURS]?.trim() || null;
    const otherInfo = fields[COL.OTHER_INFO]?.trim() || null;
    const website = fields[COL.WEBSITE]?.trim() || null;

    // Ratings
    const ourRating = parseRating(fields[COL.OUR_RATING] || '');
    const petersRating = parseRating(fields[COL.PETERS_RATING] || '');

    // Neighborhood - prefer the Philly Neighborhoods column
    const neighborhoodStr = fields[COL.PHILLY_NEIGHBORHOOD] || fields[COL.NEIGHBORHOOD] || '';
    const neighborhoodName = parseNeighborhood(neighborhoodStr);
    const neighborhoodId = neighborhoodName
      ? neighborhoodMap.get(neighborhoodName.toLowerCase())
      : null;

    try {
      // Check if location already exists
      const existing = await prisma.travel_locations.findFirst({
        where: { city_id: city.id, name },
      });

      if (existing) {
        console.log(`  EXISTS: ${name}`);
        continue;
      }

      // Create location
      const location = await prisma.travel_locations.create({
        data: {
          user_id: user.id,
          city_id: city.id,
          neighborhood_id: neighborhoodId,
          name,
          type,
          address,
          description: blurb,
          website,
          price_level: parseCost(cost),
          cuisine,
          hours,
          other_info: otherInfo,
          blurb,
          avg_rating: ourRating,
          hotlist: false,  // Global hotlist stays false
          visited: visited,
          latitude: 0,  // Will need geocoding later
          longitude: 0,
        },
      });

      // Create user location data for visited/hotlist/rating
      if (visited || hotlist || petersRating !== null) {
        await prisma.travel_user_location_data.create({
          data: {
            user_id: user.id,
            location_id: location.id,
            visited,
            hotlist,
            personal_rating: petersRating,
            visit_count: visited ? 1 : 0,
            first_visited_at: visited ? new Date() : null,
            last_visited_at: visited ? new Date() : null,
          },
        });
      }

      imported++;
      const nbLabel = neighborhoodName || 'no neighborhood';
      console.log(`  Created: ${name} (${type}) - ${nbLabel}`);

    } catch (err) {
      errors.push(`${name}: ${err}`);
    }
  }

  console.log('\n----------------------------');
  console.log(`Imported: ${imported} locations`);
  console.log(`Skipped: ${skipped} (no address)`);
  console.log(`Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log('\nErrors:');
    errors.forEach(e => console.log(`  ${e}`));
  }

  // Update city location count
  const locationCount = await prisma.travel_locations.count({
    where: { city_id: city.id },
  });
  await prisma.travel_cities.update({
    where: { id: city.id },
    data: { location_count: locationCount },
  });

  console.log(`\nUpdated Philadelphia location_count: ${locationCount}`);

  await prisma.$disconnect();
}

importLocations().catch(console.error);
