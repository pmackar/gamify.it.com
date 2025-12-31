/**
 * Update location types from Notion
 */

import { Client } from "@notionhq/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

type LocationType = "RESTAURANT" | "BAR" | "CAFE" | "ATTRACTION" | "HOTEL" | "SHOP" | "NATURE" | "TRANSPORT" | "MUSEUM" | "BEACH" | "NIGHTLIFE" | "OTHER";

// Map Notion type names to Prisma enum values
const TYPE_MAP: Record<string, LocationType> = {
  restaurant: "RESTAURANT",
  bar: "BAR",
  cafe: "CAFE",
  coffee: "CAFE",
  "coffee shop": "CAFE",
  bakery: "CAFE",
  attraction: "ATTRACTION",
  "tourist attraction": "ATTRACTION",
  landmark: "ATTRACTION",
  hotel: "HOTEL",
  accommodation: "HOTEL",
  shop: "SHOP",
  store: "SHOP",
  shopping: "SHOP",
  retail: "SHOP",
  bookstore: "SHOP",
  nature: "NATURE",
  park: "NATURE",
  hiking: "NATURE",
  garden: "NATURE",
  transport: "TRANSPORT",
  museum: "MUSEUM",
  gallery: "MUSEUM",
  "art gallery": "MUSEUM",
  beach: "BEACH",
  nightlife: "NIGHTLIFE",
  club: "NIGHTLIFE",
  "music venue": "NIGHTLIFE",
  other: "OTHER",
};

function mapLocationType(types: string[]): LocationType {
  for (const type of types) {
    const normalizedType = type.toLowerCase().trim();
    if (TYPE_MAP[normalizedType]) {
      return TYPE_MAP[normalizedType];
    }
  }
  // Check for partial matches
  for (const type of types) {
    const normalizedType = type.toLowerCase().trim();
    for (const [key, value] of Object.entries(TYPE_MAP)) {
      if (normalizedType.includes(key) || key.includes(normalizedType)) {
        return value;
      }
    }
  }
  return "OTHER";
}

function getPropertyValue(property: any): any {
  if (!property) return undefined;

  switch (property.type) {
    case "title":
      return property.title?.[0]?.plain_text;
    case "multi_select":
      return property.multi_select?.map((item: any) => item.name);
    default:
      return undefined;
  }
}

async function main() {
  const databaseId = process.argv[2] || "2d181ffc014680f1bd98ce538066374d";

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error("Error: NOTION_TOKEN required");
    process.exit(1);
  }

  const notion = new Client({ auth: notionToken });

  console.log("Updating location types from Notion...\n");

  let cursor: string | undefined = undefined;
  let updated = 0;
  let unchanged = 0;

  do {
    const response: any = await (notion as any).databases.query({
      database_id: databaseId,
      start_cursor: cursor,
      page_size: 100,
    });

    for (const page of response.results) {
      if ("properties" in page) {
        const props = page.properties;

        const name = getPropertyValue(props.Name);
        const notionTypes = getPropertyValue(props.Type) || [];

        if (!name || notionTypes.length === 0) continue;

        const mappedType = mapLocationType(notionTypes);

        // Find location by name
        const location = await prisma.location.findFirst({
          where: { name },
        });

        if (location && location.type !== mappedType) {
          await prisma.location.update({
            where: { id: location.id },
            data: { type: mappedType },
          });
          console.log(`✓ ${name}: ${location.type} → ${mappedType} (from: ${notionTypes.join(", ")})`);
          updated++;
        } else if (location) {
          unchanged++;
        }
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Updated: ${updated} locations`);
  console.log(`⏭️  Unchanged: ${unchanged} locations`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
