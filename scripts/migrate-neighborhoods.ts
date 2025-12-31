/**
 * Migrate neighborhood strings to Neighborhood model
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Migrating neighborhoods...\n");

  // Get all unique neighborhood strings with their city
  const locations = await prisma.location.findMany({
    where: {
      neighborhoodOld: { not: null },
    },
    select: {
      id: true,
      neighborhoodOld: true,
      cityId: true,
      userId: true,
      latitude: true,
      longitude: true,
    },
  });

  // Group by unique neighborhood + city
  const neighborhoodMap = new Map<string, {
    name: string;
    cityId: string;
    userId: string;
    locations: { id: string; lat: number; lng: number }[];
  }>();

  for (const loc of locations) {
    if (!loc.neighborhoodOld) continue;

    const key = `${loc.cityId}:${loc.neighborhoodOld}`;
    if (!neighborhoodMap.has(key)) {
      neighborhoodMap.set(key, {
        name: loc.neighborhoodOld,
        cityId: loc.cityId,
        userId: loc.userId,
        locations: [],
      });
    }
    neighborhoodMap.get(key)!.locations.push({
      id: loc.id,
      lat: loc.latitude,
      lng: loc.longitude,
    });
  }

  console.log(`Found ${neighborhoodMap.size} unique neighborhoods\n`);

  // Create neighborhoods and update locations
  let created = 0;
  let updated = 0;

  for (const [key, data] of neighborhoodMap) {
    // Calculate center point from locations
    const validLocs = data.locations.filter(l => l.lat !== 0 && l.lng !== 0);
    let lat: number | undefined;
    let lng: number | undefined;

    if (validLocs.length > 0) {
      lat = validLocs.reduce((sum, l) => sum + l.lat, 0) / validLocs.length;
      lng = validLocs.reduce((sum, l) => sum + l.lng, 0) / validLocs.length;
    }

    // Create or find neighborhood
    const neighborhood = await prisma.neighborhood.upsert({
      where: {
        userId_cityId_name: {
          userId: data.userId,
          cityId: data.cityId,
          name: data.name,
        },
      },
      update: {},
      create: {
        userId: data.userId,
        cityId: data.cityId,
        name: data.name,
        latitude: lat,
        longitude: lng,
      },
    });

    console.log(`✓ ${data.name} (${data.locations.length} locations)`);
    created++;

    // Update locations to reference this neighborhood
    for (const loc of data.locations) {
      await prisma.location.update({
        where: { id: loc.id },
        data: { neighborhoodId: neighborhood.id },
      });
      updated++;
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Created ${created} neighborhoods`);
  console.log(`✅ Updated ${updated} locations`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
