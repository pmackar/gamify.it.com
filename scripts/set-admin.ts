/**
 * Set a user as admin
 * Usage: npx tsx scripts/set-admin.ts
 */

import prisma from "../lib/db";

const ADMIN_EMAIL = "pmackar@gmail.com";

async function main() {
  console.log(`Setting ${ADMIN_EMAIL} as admin...`);

  // Find the user by email
  const user = await prisma.profiles.findFirst({
    where: { email: ADMIN_EMAIL },
  });

  if (!user) {
    console.error(`User not found: ${ADMIN_EMAIL}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.id} (${user.display_name || user.username})`);

  // Check if they already have a role
  const existingRole = await prisma.user_roles.findUnique({
    where: { user_id: user.id },
  });

  if (existingRole?.role === "ADMIN") {
    console.log("User is already an admin!");
    return;
  }

  // Set admin role
  await prisma.user_roles.upsert({
    where: { user_id: user.id },
    update: {
      role: "ADMIN",
      granted_at: new Date(),
    },
    create: {
      user_id: user.id,
      role: "ADMIN",
      granted_at: new Date(),
    },
  });

  console.log(`Successfully set ${ADMIN_EMAIL} as admin!`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
