import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "pk.eyJ1IjoiZ2FtaWZ5aXQiLCJhIjoiY21qdDM0YTlwNTFjZzNkcHNrb2dhMHA5dCJ9.pmMdYrUGnRI1gaPBlXUzlw";

interface MapboxFeature {
  center: [number, number]; // [longitude, latitude]
  place_name: string;
  relevance: number;
}

interface MapboxResponse {
  features: MapboxFeature[];
}

async function geocodeAddress(query: string): Promise<{ lat: number; lng: number } | null> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodedQuery}.json?access_token=${MAPBOX_TOKEN}&limit=1`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  Geocoding API error: ${response.status}`);
      return null;
    }

    const data: MapboxResponse = await response.json();

    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }

    return null;
  } catch (error) {
    console.error(`  Geocoding error:`, error);
    return null;
  }
}

async function geocodeLocations() {
  console.log("🌍 Starting geocoding for locations missing coordinates...\n");

  // Get all locations with 0,0 coordinates
  const locations = await prisma.location.findMany({
    where: {
      latitude: 0,
      longitude: 0,
    },
    include: {
      city: {
        select: {
          name: true,
          country: true,
        },
      },
    },
  });

  console.log(`Found ${locations.length} locations to geocode\n`);

  let updated = 0;
  let failed = 0;

  for (const location of locations) {
    // Build search query with available info
    const parts = [location.name];

    if (location.neighborhoodOld) {
      parts.push(location.neighborhoodOld);
    }
    if (location.address) {
      parts.push(location.address);
    }
    parts.push(location.city.name);
    parts.push(location.city.country);

    const query = parts.join(", ");

    console.log(`Geocoding: ${location.name}`);
    console.log(`  Query: ${query}`);

    const coords = await geocodeAddress(query);

    if (coords) {
      await prisma.location.update({
        where: { id: location.id },
        data: {
          latitude: coords.lat,
          longitude: coords.lng,
        },
      });
      console.log(`  ✓ Found: ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}`);
      updated++;
    } else {
      // Try with just name and city
      const fallbackQuery = `${location.name}, ${location.city.name}, ${location.city.country}`;
      console.log(`  Trying fallback: ${fallbackQuery}`);

      const fallbackCoords = await geocodeAddress(fallbackQuery);

      if (fallbackCoords) {
        await prisma.location.update({
          where: { id: location.id },
          data: {
            latitude: fallbackCoords.lat,
            longitude: fallbackCoords.lng,
          },
        });
        console.log(`  ✓ Found (fallback): ${fallbackCoords.lat.toFixed(6)}, ${fallbackCoords.lng.toFixed(6)}`);
        updated++;
      } else {
        console.log(`  ✗ Not found`);
        failed++;
      }
    }

    // Rate limiting - Mapbox allows 600 requests/minute
    await new Promise((resolve) => setTimeout(resolve, 150));
  }

  console.log("\n" + "=".repeat(50));
  console.log(`✅ Successfully geocoded: ${updated} locations`);
  console.log(`❌ Failed to geocode: ${failed} locations`);
  console.log("=".repeat(50));
}

geocodeLocations()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
