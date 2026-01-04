import prisma from '../lib/db';

// System user ID for global/seeded content
// This user will own all seeded cities and locations
const SYSTEM_USER_ID = process.env.SYSTEM_USER_ID || '7eab7440-5c91-4d5e-99cc-77cd64d5aa56';

const US_CITIES = [
  // Top 30 US Cities by population + tourism
  { name: 'New York', region: 'New York', country: 'United States', country_code: 'US', latitude: 40.7128, longitude: -74.0060 },
  { name: 'Los Angeles', region: 'California', country: 'United States', country_code: 'US', latitude: 34.0522, longitude: -118.2437 },
  { name: 'Chicago', region: 'Illinois', country: 'United States', country_code: 'US', latitude: 41.8781, longitude: -87.6298 },
  { name: 'Houston', region: 'Texas', country: 'United States', country_code: 'US', latitude: 29.7604, longitude: -95.3698 },
  { name: 'Phoenix', region: 'Arizona', country: 'United States', country_code: 'US', latitude: 33.4484, longitude: -112.0740 },
  { name: 'Philadelphia', region: 'Pennsylvania', country: 'United States', country_code: 'US', latitude: 39.9526, longitude: -75.1652 },
  { name: 'San Antonio', region: 'Texas', country: 'United States', country_code: 'US', latitude: 29.4241, longitude: -98.4936 },
  { name: 'San Diego', region: 'California', country: 'United States', country_code: 'US', latitude: 32.7157, longitude: -117.1611 },
  { name: 'Dallas', region: 'Texas', country: 'United States', country_code: 'US', latitude: 32.7767, longitude: -96.7970 },
  { name: 'San Jose', region: 'California', country: 'United States', country_code: 'US', latitude: 37.3382, longitude: -121.8863 },
  { name: 'Austin', region: 'Texas', country: 'United States', country_code: 'US', latitude: 30.2672, longitude: -97.7431 },
  { name: 'San Francisco', region: 'California', country: 'United States', country_code: 'US', latitude: 37.7749, longitude: -122.4194 },
  { name: 'Seattle', region: 'Washington', country: 'United States', country_code: 'US', latitude: 47.6062, longitude: -122.3321 },
  { name: 'Denver', region: 'Colorado', country: 'United States', country_code: 'US', latitude: 39.7392, longitude: -104.9903 },
  { name: 'Boston', region: 'Massachusetts', country: 'United States', country_code: 'US', latitude: 42.3601, longitude: -71.0589 },
  { name: 'Nashville', region: 'Tennessee', country: 'United States', country_code: 'US', latitude: 36.1627, longitude: -86.7816 },
  { name: 'Miami', region: 'Florida', country: 'United States', country_code: 'US', latitude: 25.7617, longitude: -80.1918 },
  { name: 'Las Vegas', region: 'Nevada', country: 'United States', country_code: 'US', latitude: 36.1699, longitude: -115.1398 },
  { name: 'Portland', region: 'Oregon', country: 'United States', country_code: 'US', latitude: 45.5152, longitude: -122.6784 },
  { name: 'New Orleans', region: 'Louisiana', country: 'United States', country_code: 'US', latitude: 29.9511, longitude: -90.0715 },
  { name: 'Atlanta', region: 'Georgia', country: 'United States', country_code: 'US', latitude: 33.7490, longitude: -84.3880 },
  { name: 'Washington', region: 'District of Columbia', country: 'United States', country_code: 'US', latitude: 38.9072, longitude: -77.0369 },
  { name: 'Honolulu', region: 'Hawaii', country: 'United States', country_code: 'US', latitude: 21.3069, longitude: -157.8583 },
  { name: 'Orlando', region: 'Florida', country: 'United States', country_code: 'US', latitude: 28.5383, longitude: -81.3792 },
  { name: 'Minneapolis', region: 'Minnesota', country: 'United States', country_code: 'US', latitude: 44.9778, longitude: -93.2650 },
  { name: 'Detroit', region: 'Michigan', country: 'United States', country_code: 'US', latitude: 42.3314, longitude: -83.0458 },
  { name: 'Tampa', region: 'Florida', country: 'United States', country_code: 'US', latitude: 27.9506, longitude: -82.4572 },
  { name: 'St. Louis', region: 'Missouri', country: 'United States', country_code: 'US', latitude: 38.6270, longitude: -90.1994 },
  { name: 'Baltimore', region: 'Maryland', country: 'United States', country_code: 'US', latitude: 39.2904, longitude: -76.6122 },
  { name: 'Charlotte', region: 'North Carolina', country: 'United States', country_code: 'US', latitude: 35.2271, longitude: -80.8431 },
];

async function seedCities() {
  console.log('Seeding 30 US cities...\n');

  const results = {
    created: 0,
    existing: 0,
  };

  for (const city of US_CITIES) {
    try {
      // Check if city already exists for this user
      const existing = await prisma.travel_cities.findFirst({
        where: {
          name: city.name,
          country: city.country,
          user_id: SYSTEM_USER_ID,
        },
      });

      if (existing) {
        console.log(`  ⏭ ${city.name}, ${city.region} (already exists)`);
        results.existing++;
        continue;
      }

      // Create new city owned by system user
      await prisma.travel_cities.create({
        data: {
          name: city.name,
          region: city.region,
          country: city.country,
          country_code: city.country_code,
          latitude: city.latitude,
          longitude: city.longitude,
          user_id: SYSTEM_USER_ID,
          location_count: 0,
          visit_count: 0,
        },
      });

      console.log(`  ✓ ${city.name}, ${city.region}`);
      results.created++;
    } catch (error) {
      console.error(`  ✗ ${city.name}: ${error}`);
    }
  }

  console.log(`\nSeeding complete!`);
  console.log(`  Created: ${results.created}`);
  console.log(`  Already existed: ${results.existing}`);
  console.log(`  Total: ${US_CITIES.length}`);
}

seedCities()
  .then(() => {
    console.log('\nDone!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Error seeding cities:', error);
    process.exit(1);
  });
