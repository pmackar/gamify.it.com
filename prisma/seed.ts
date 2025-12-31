import { PrismaClient } from "@prisma/client";
import { ACHIEVEMENTS } from "../lib/achievements";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding achievements...");

  for (const achievement of ACHIEVEMENTS) {
    await prisma.achievement.upsert({
      where: { code: achievement.code },
      update: {
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        category: achievement.category,
        tier: achievement.tier,
        criteria: achievement.criteria,
      },
      create: {
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        category: achievement.category,
        tier: achievement.tier,
        criteria: achievement.criteria,
      },
    });
    console.log(`  ✓ ${achievement.name}`);
  }

  console.log(`\nSeeded ${ACHIEVEMENTS.length} achievements`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
