
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const treasures = await prisma.treasure.findMany({
    select: {
      id: true,
      title: true,
      tags: true,
      theme: true,
    },
    take: 20, // 只看前20条
  });

  console.log("Treasure Data Sample:");
  console.log(JSON.stringify(treasures, null, 2));
  
  // 统计所有标签出现次数
  const allTags = {};
  const allThemes = {};

  const allTreasures = await prisma.treasure.findMany({
    select: { tags: true, theme: true }
  });

  allTreasures.forEach(t => {
    t.tags.forEach(tag => {
      allTags[tag] = (allTags[tag] || 0) + 1;
    });
    if (t.theme) {
      allThemes[t.theme] = (allThemes[t.theme] || 0) + 1;
    }
  });

  console.log("\nTag Statistics:");
  console.table(Object.entries(allTags).sort((a, b) => b[1] - a[1]).slice(0, 20));

  console.log("\nTheme Statistics:");
  console.table(Object.entries(allThemes));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

