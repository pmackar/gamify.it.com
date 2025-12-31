/**
 * Migration script: Convert single-user locations to multi-user global locations
 *
 * This script:
 * 1. Sets createdById = userId for each existing location
 * 2. Creates UserLocationData records for the original owner with their visited/hotlist/rating data
 * 3. Updates aggregate stats on locations
 *
 * Run with: npx tsx scripts/migrate-to-global.ts
 */

import { PrismaClient } from "@prisma/client";
import * as dotenv from "dotenv";

dotenv.config();

const prisma = new PrismaClient();

async function migrateToGlobalLocations() {
  console.log("Starting migration to global locations...\n");

  // Get all locations with their current user data
  const locations = await prisma.location.findMany({
    include: {
      visits: true,
    },
  });

  console.log(`Found ${locations.length} locations to migrate\n`);

  let migratedCount = 0;
  let userDataCreated = 0;
  let errors: string[] = [];

  for (const location of locations) {
    try {
      // Skip if already migrated (createdById is set)
      if (location.createdById) {
        console.log(`Skipping ${location.name} - already migrated`);
        continue;
      }

      // Skip if no userId (shouldn't happen but be safe)
      if (!location.userId) {
        console.log(`Skipping ${location.name} - no userId`);
        continue;
      }

      const originalUserId = location.userId;

      // Calculate visit stats from actual visits
      const userVisits = location.visits.filter(v => v.userId === originalUserId);
      const visitCount = userVisits.length;
      const firstVisit = userVisits.length > 0
        ? userVisits.reduce((earliest, v) => v.date < earliest.date ? v : earliest).date
        : null;
      const lastVisit = userVisits.length > 0
        ? userVisits.reduce((latest, v) => v.date > latest.date ? v : latest).date
        : null;

      // Get personal rating from most recent visit with a rating
      const visitsWithRating = userVisits
        .filter(v => v.overallRating !== null)
        .sort((a, b) => b.date.getTime() - a.date.getTime());
      const personalRating = visitsWithRating.length > 0 ? visitsWithRating[0].overallRating : null;

      // Update location: set createdById, calculate aggregate stats
      await prisma.location.update({
        where: { id: location.id },
        data: {
          createdById: originalUserId,
          totalVisits: visitCount,
          reviewCount: 0, // No reviews yet in old system
        },
      });

      // Check if UserLocationData already exists
      const existingUserData = await prisma.userLocationData.findUnique({
        where: {
          userId_locationId: {
            userId: originalUserId,
            locationId: location.id,
          },
        },
      });

      if (!existingUserData) {
        // Create UserLocationData for the original owner
        await prisma.userLocationData.create({
          data: {
            userId: originalUserId,
            locationId: location.id,
            hotlist: location.hotlist,
            visited: location.visited,
            personalRating: personalRating,
            visitCount: visitCount,
            firstVisitedAt: firstVisit,
            lastVisitedAt: lastVisit,
          },
        });
        userDataCreated++;
      }

      migratedCount++;
      console.log(`✓ Migrated: ${location.name} (${visitCount} visits)`);

    } catch (error) {
      const errorMsg = `Error migrating ${location.name}: ${error}`;
      console.error(`✗ ${errorMsg}`);
      errors.push(errorMsg);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("Migration Summary:");
  console.log(`  Locations migrated: ${migratedCount}`);
  console.log(`  UserLocationData created: ${userDataCreated}`);
  console.log(`  Errors: ${errors.length}`);

  if (errors.length > 0) {
    console.log("\nErrors:");
    errors.forEach(e => console.log(`  - ${e}`));
  }

  // Verify migration
  console.log("\n" + "=".repeat(50));
  console.log("Verification:");

  const locationsWithCreator = await prisma.location.count({
    where: { createdById: { not: null } },
  });
  const totalUserData = await prisma.userLocationData.count();

  console.log(`  Locations with createdById: ${locationsWithCreator}/${locations.length}`);
  console.log(`  Total UserLocationData records: ${totalUserData}`);
}

async function main() {
  try {
    await migrateToGlobalLocations();
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
