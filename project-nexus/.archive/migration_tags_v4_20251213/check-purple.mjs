
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const purpleTreasures = await prisma.treasure.findMany({
    where: {
      theme: 'purple',
    },
    select: {
      title: true,
      tags: true,
    }
  });

  console.log("Purple Theme Treasures:");
  console.table(purpleTreasures);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
