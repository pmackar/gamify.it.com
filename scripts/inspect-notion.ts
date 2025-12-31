/**
 * Inspect Notion database properties
 */

import { Client } from "@notionhq/client";

async function main() {
  const databaseId = process.argv[2] || "2d181ffc014680f1bd98ce538066374d";

  const notionToken = process.env.NOTION_TOKEN;
  if (!notionToken) {
    console.error("Error: NOTION_TOKEN required");
    process.exit(1);
  }

  const notion = new Client({ auth: notionToken });

  // Get first page to inspect properties
  const response: any = await (notion as any).databases.query({
    database_id: databaseId,
    page_size: 1,
  });

  if (response.results.length > 0) {
    const page = response.results[0];
    console.log("Database Properties:\n");

    for (const [key, value] of Object.entries(page.properties)) {
      const prop = value as any;
      console.log(`${key}:`);
      console.log(`  Type: ${prop.type}`);

      // Show sample value
      if (prop.type === "title" && prop.title?.[0]) {
        console.log(`  Value: ${prop.title[0].plain_text}`);
      } else if (prop.type === "rich_text" && prop.rich_text?.[0]) {
        console.log(`  Value: ${prop.rich_text[0].plain_text}`);
      } else if (prop.type === "select" && prop.select) {
        console.log(`  Value: ${prop.select.name}`);
      } else if (prop.type === "number") {
        console.log(`  Value: ${prop.number}`);
      } else if (prop.type === "url") {
        console.log(`  Value: ${prop.url}`);
      } else if (prop.type === "checkbox") {
        console.log(`  Value: ${prop.checkbox}`);
      }
      console.log();
    }
  }
}

main().catch(console.error);
