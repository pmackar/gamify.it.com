import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Rate limit: 1 request per second for Nominatim
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function geocodeAddress(address: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const encoded = encodeURIComponent(address);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encoded}&limit=1`,
      {
        headers: {
          'User-Agent': 'GamifyTravel/1.0 (https://gamify.it.com)',
        },
      }
    );

    if (!res.ok) {
      console.error(`  Geocode failed for "${address}": ${res.status}`);
      return null;
    }

    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
    }

    console.error(`  No results for "${address}"`);
    return null;
  } catch (error) {
    console.error(`  Error geocoding "${address}":`, error);
    return null;
  }
}

async function main() {
  // Get all locations needing geocoding
  const locations = await prisma.travel_locations.findMany({
    where: {
      address: { not: null },
    },
    select: {
      id: true,
      name: true,
      address: true,
      latitude: true,
      longitude: true,
    },
  });

  const needsGeocoding = locations.filter(l => {
    return l.address && (l.latitude === 0 || l.longitude === 0 || l.latitude === null || l.longitude === null);
  });

  console.log(`Found ${needsGeocoding.length} locations to geocode\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < needsGeocoding.length; i++) {
    const loc = needsGeocoding[i];
    console.log(`[${i + 1}/${needsGeocoding.length}] ${loc.name}`);

    const coords = await geocodeAddress(loc.address!);

    if (coords) {
      await prisma.travel_locations.update({
        where: { id: loc.id },
        data: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });
      console.log(`  ✓ ${coords.lat}, ${coords.lng}`);
      success++;
    } else {
      failed++;
    }

    // Rate limit: wait 1 second between requests
    if (i < needsGeocoding.length - 1) {
      await delay(1000);
    }
  }

  console.log(`\nDone! Success: ${success}, Failed: ${failed}`);
  await prisma.$disconnect();
}

main().catch(console.error);
