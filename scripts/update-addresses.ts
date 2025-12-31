/**
 * Update addresses and other fields from Notion
 *
 * Usage: NOTION_TOKEN=xxx npx tsx scripts/update-addresses.ts <notionDatabaseId>
 */

import { Client } from "@notionhq/client";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

function getPropertyValue(property: any): any {
  if (!property) return undefined;

  switch (property.type) {
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
    case "url":
      return property.url;
    case "checkbox":
      return property.checkbox;
    default:
      return undefined;
  }
}

async function main() {
  const databaseId = process.argv[2] || "2d181ffc014680f1bd98ce538066374d";

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error("Error: NOTION_TOKEN environment variable is required");
    process.exit(1);
  }

  const notion = new Client({ auth: notionToken });

  console.log("Fetching data from Notion...\n");

  let cursor: string | undefined = undefined;
  let updated = 0;
  let notFound = 0;

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
        const address = getPropertyValue(props.Address);
        const website = getPropertyValue(props.Website);
        const blurb = getPropertyValue(props.Blurb);
        const cost = getPropertyValue(props.Cost);
        const hours = getPropertyValue(props.Hours); // multi_select
        const otherInfo = getPropertyValue(props["Other Info"]); // multi_select
        const visited = getPropertyValue(props["Have we been here?"]);
        const hotlist = getPropertyValue(props.Hotlist);
        const cuisineArr = getPropertyValue(props.Cuisine); // multi_select

        if (!name) continue;

        // Map cost to priceLevel
        let priceLevel: number | undefined;
        if (cost) {
          if (cost === "$") priceLevel = 1;
          else if (cost === "$$") priceLevel = 2;
          else if (cost === "$$$") priceLevel = 3;
          else if (cost === "$$$$") priceLevel = 4;
        }

        // Find location by name
        const location = await prisma.location.findFirst({
          where: { name },
        });

        if (location) {
          const updateData: any = {};

          if (address) {
            updateData.address = address;
          }
          if (website && !location.website) {
            updateData.website = website;
          }
          if (cuisineArr && cuisineArr.length > 0) {
            updateData.cuisine = cuisineArr.join(", ");
          }
          if (blurb) {
            updateData.blurb = blurb;
          }
          if (priceLevel) {
            updateData.priceLevel = priceLevel;
          }
          if (hours && hours.length > 0) {
            updateData.hours = hours.join(", ");
          }
          if (otherInfo && otherInfo.length > 0) {
            updateData.otherInfo = otherInfo.join(", ");
          }
          if (typeof visited === "boolean") {
            updateData.visited = visited;
          }
          if (typeof hotlist === "boolean") {
            updateData.hotlist = hotlist;
          }

          if (Object.keys(updateData).length > 0) {
            await prisma.location.update({
              where: { id: location.id },
              data: updateData,
            });

            const updates: string[] = [];
            if (updateData.address) updates.push(`Address: ${address}`);
            if (updateData.cuisine) updates.push(`Cuisine: ${updateData.cuisine}`);
            if (updateData.blurb) updates.push(`Blurb: ${blurb?.substring(0, 50)}...`);
            if (updateData.priceLevel) updates.push(`Cost: ${cost}`);
            if (updateData.visited) updates.push(`Visited: ${visited}`);
            if (updateData.hotlist) updates.push(`Hotlist: ${hotlist}`);

            console.log(`✓ ${name}`);
            updates.forEach((u) => console.log(`    ${u}`));
            updated++;
          }
        } else {
          console.log(`✗ Not found: ${name}`);
          notFound++;
        }
      }
    }

    cursor = response.has_more ? response.next_cursor ?? undefined : undefined;
  } while (cursor);

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Updated: ${updated} locations`);
  console.log(`❌ Not found: ${notFound} locations`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
