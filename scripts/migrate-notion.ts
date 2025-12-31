/**
 * Notion to gamify.travel Migration Script
 *
 * This script migrates travel data from a Notion database to gamify.travel.
 *
 * Usage:
 *   npx tsx scripts/migrate-notion.ts <userId> <notionDatabaseId>
 *
 * Environment Variables:
 *   NOTION_TOKEN - Your Notion integration token
 *   DATABASE_URL - PostgreSQL connection string
 *
 * Expected Notion Database Properties:
 *   - Name (title): Location name
 *   - Type (select): Location type (Restaurant, Bar, Cafe, etc.)
 *   - City (select): City name
 *   - Country (select): Country name
 *   - Address (text): Street address
 *   - Latitude (number): Latitude coordinate
 *   - Longitude (number): Longitude coordinate
 *   - Rating (number): Overall rating (1-5)
 *   - Notes (text): Description/notes
 *   - Tags (multi-select): Tags/categories
 *   - Visit Date (date): Date of visit
 */

import { Client } from "@notionhq/client";
import { PrismaClient } from "@prisma/client";

type LocationType = "RESTAURANT" | "BAR" | "CAFE" | "ATTRACTION" | "HOTEL" | "SHOP" | "NATURE" | "TRANSPORT" | "MUSEUM" | "BEACH" | "NIGHTLIFE" | "OTHER";

const prisma = new PrismaClient();

interface NotionLocation {
  name: string;
  type: string;
  city: string;
  country: string;
  region?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  rating?: number;
  notes?: string;
  tags?: string[];
  visitDate?: string;
  website?: string;
  priceLevel?: number;
}

// Map Notion type names to Prisma enum values
const TYPE_MAP: Record<string, LocationType> = {
  restaurant: "RESTAURANT",
  bar: "BAR",
  cafe: "CAFE",
  coffee: "CAFE",
  "coffee shop": "CAFE",
  attraction: "ATTRACTION",
  "tourist attraction": "ATTRACTION",
  hotel: "HOTEL",
  accommodation: "HOTEL",
  shop: "SHOP",
  store: "SHOP",
  shopping: "SHOP",
  nature: "NATURE",
  park: "NATURE",
  hiking: "NATURE",
  transport: "TRANSPORT",
  museum: "MUSEUM",
  gallery: "MUSEUM",
  beach: "BEACH",
  nightlife: "NIGHTLIFE",
  club: "NIGHTLIFE",
  other: "OTHER",
};

function mapLocationType(type: string): LocationType {
  const normalizedType = type.toLowerCase().trim();
  return TYPE_MAP[normalizedType] || "OTHER";
}

function getPropertyValue(property: any, type: string): any {
  if (!property) return undefined;

  switch (type) {
    case "title":
      return property.title?.[0]?.plain_text;
    case "rich_text":
      return property.rich_text?.[0]?.plain_text;
    case "select":
      return property.select?.name;
    case "multi_select":
      return property.multi_select?.map((item: any) => item.name);
    case "number":
      return property.number;
    case "date":
      return property.date?.start;
    case "url":
      return property.url;
    default:
      return undefined;
  }
}

async function fetchNotionData(
  notion: Client,
  databaseId: string
): Promise<NotionLocation[]> {
  const locations: NotionLocation[] = [];
  let cursor: string | undefined = undefined;

  do {
    const response: any = await (notion as any).databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if ("properties" in page) {
        const props = page.properties;

        const location: NotionLocation = {
          name: getPropertyValue(props.Name, "title") || "Unknown",
          type: getPropertyValue(props.Type, "select") || "Other",
          city: getPropertyValue(props.City, "select") || "Unknown",
          country: getPropertyValue(props.Country, "select") || "Unknown",
          region: getPropertyValue(props.Region, "select"),
          address: getPropertyValue(props.Address, "rich_text"),
          latitude: getPropertyValue(props.Latitude, "number"),
          longitude: getPropertyValue(props.Longitude, "number"),
          rating: getPropertyValue(props.Rating, "number"),
          notes: getPropertyValue(props.Notes, "rich_text"),
          tags: getPropertyValue(props.Tags, "multi_select"),
          visitDate: getPropertyValue(props["Visit Date"], "date"),
          website: getPropertyValue(props.Website, "url"),
          priceLevel: getPropertyValue(props["Price Level"], "number"),
        };

        locations.push(location);
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  return locations;
}

async function migrateData(userId: string, locations: NotionLocation[]) {
  console.log(`\nMigrating ${locations.length} locations for user ${userId}...`);

  // Group locations by city
  const citiesMap = new Map<string, NotionLocation[]>();
  for (const loc of locations) {
    const key = `${loc.city}|${loc.country}`;
    if (!citiesMap.has(key)) {
      citiesMap.set(key, []);
    }
    citiesMap.get(key)!.push(loc);
  }

  let citiesCreated = 0;
  let locationsCreated = 0;
  let visitsCreated = 0;

  // Process each city
  for (const [key, cityLocations] of citiesMap) {
    const [cityName, country] = key.split("|");

    // Find a location with coordinates for city center
    const locationWithCoords = cityLocations.find(
      (l) => l.latitude && l.longitude
    );

    // Create or update city
    const city = await prisma.city.upsert({
      where: {
        userId_name_country: {
          userId,
          name: cityName,
          country,
        },
      },
      update: {
        locationCount: { increment: cityLocations.length },
      },
      create: {
        userId,
        name: cityName,
        country,
        region: cityLocations[0].region,
        latitude: locationWithCoords?.latitude,
        longitude: locationWithCoords?.longitude,
        firstVisited: cityLocations[0].visitDate
          ? new Date(cityLocations[0].visitDate)
          : new Date(),
        lastVisited: new Date(),
        locationCount: cityLocations.length,
      },
    });

    console.log(`  City: ${cityName}, ${country}`);
    citiesCreated++;

    // Create locations for this city
    for (const loc of cityLocations) {
      // Use default coordinates if missing (can be updated later)
      const latitude = loc.latitude || 0;
      const longitude = loc.longitude || 0;
      const hasCoords = loc.latitude && loc.longitude;

      if (!hasCoords) {
        console.log(`    ⚠ "${loc.name}" - missing coordinates (set to 0,0)`);
      }

      // Create location
      const location = await prisma.location.create({
        data: {
          userId,
          cityId: city.id,
          name: loc.name,
          type: mapLocationType(loc.type),
          address: loc.address,
          latitude: latitude,
          longitude: longitude,
          description: loc.notes,
          website: loc.website,
          priceLevel: loc.priceLevel,
          tags: loc.tags || [],
          avgRating: loc.rating,
          ratingCount: loc.rating ? 1 : 0,
        },
      });

      locationsCreated++;
      console.log(`    ✓ ${loc.name} (${loc.type})`);

      // Create initial visit if we have a date and/or rating
      if (loc.visitDate || loc.rating) {
        await prisma.visit.create({
          data: {
            userId,
            locationId: location.id,
            date: loc.visitDate ? new Date(loc.visitDate) : new Date(),
            overallRating: loc.rating,
            notes: loc.notes,
            xpEarned: 50, // Base XP for migrated locations
          },
        });
        visitsCreated++;
      }
    }
  }

  // Update user stats
  const [totalCities, totalLocations, totalVisits] = await Promise.all([
    prisma.city.count({ where: { userId } }),
    prisma.location.count({ where: { userId } }),
    prisma.visit.count({ where: { userId } }),
  ]);

  await prisma.user.update({
    where: { id: userId },
    data: {
      totalCities,
      totalLocations,
      totalVisits,
      // Award XP for all migrated locations
      xp: { increment: locationsCreated * 50 },
    },
  });

  return {
    citiesCreated,
    locationsCreated,
    visitsCreated,
  };
}

async function main() {
  const userId = process.argv[2];
  const databaseId = process.argv[3];

  if (!userId || !databaseId) {
    console.error(
      "Usage: npx tsx scripts/migrate-notion.ts <userId> <notionDatabaseId>"
    );
    console.error("\nExample:");
    console.error(
      "  npx tsx scripts/migrate-notion.ts cluser123abc 1234567890abcdef"
    );
    process.exit(1);
  }

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error("Error: NOTION_TOKEN environment variable is required");
    console.error("\nSet it in your .env file or export it:");
    console.error("  export NOTION_TOKEN=your_token_here");
    process.exit(1);
  }

  // Verify user exists
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    console.error(`Error: User with ID "${userId}" not found`);
    console.error("\nMake sure you have signed in at least once.");
    process.exit(1);
  }

  console.log(`Starting migration for user: ${user.email}`);
  console.log(`Notion database ID: ${databaseId}`);

  // Initialize Notion client
  const notion = new Client({ auth: notionToken });

  try {
    // Fetch data from Notion
    console.log("\nFetching data from Notion...");
    const locations = await fetchNotionData(notion, databaseId);
    console.log(`Found ${locations.length} locations`);

    if (locations.length === 0) {
      console.log("\nNo locations found in Notion database.");
      console.log("Make sure your database has the expected properties:");
      console.log("  - Name (title)");
      console.log("  - Type (select)");
      console.log("  - City (select)");
      console.log("  - Country (select)");
      console.log("  - Latitude (number)");
      console.log("  - Longitude (number)");
      return;
    }

    // Migrate data
    const results = await migrateData(userId, locations);

    console.log("\n✅ Migration complete!");
    console.log(`   Cities: ${results.citiesCreated}`);
    console.log(`   Locations: ${results.locationsCreated}`);
    console.log(`   Visits: ${results.visitsCreated}`);
    console.log(`   XP awarded: ${results.locationsCreated * 50}`);
  } catch (error) {
    console.error("\n❌ Migration failed:", error);
    process.exit(1);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
