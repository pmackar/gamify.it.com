import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function check() {
  const all = await prisma.travel_locations.findMany({
    select: { id: true, name: true, address: true, latitude: true, longitude: true }
  });

  const noCoords = all.filter(l => {
    const hasAddress = l.address && l.address.length > 0;
    const missingCoords = l.latitude === 0 || l.longitude === 0 || l.latitude === null || l.longitude === null;
    return hasAddress && missingCoords;
  });

  const hasCoords = all.filter(l => {
    return l.latitude !== null && l.longitude !== null && l.latitude !== 0 && l.longitude !== 0;
  });

  console.log("Total locations:", all.length);
  console.log("With valid coordinates:", hasCoords.length);
  console.log("With address but no/zero coordinates:", noCoords.length);

  if (noCoords.length > 0) {
    console.log("\nSample locations needing geocoding:");
    noCoords.slice(0, 5).forEach(l => console.log("  -", l.name, "|", l.address));
  }

  await prisma.$disconnect();
}
check();
