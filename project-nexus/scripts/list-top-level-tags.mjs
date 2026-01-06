import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const treasures = await prisma.treasure.findMany({
    select: { tags: true }
  });

  const topLevelTags = {};

  treasures.forEach(t => {
    t.tags.forEach(tag => {
      console.log("原始标签:", tag); // 临时调试打印
      if (!tag.includes('/') && !tag.startsWith('#')) {
        topLevelTags[tag] = (topLevelTags[tag] || 0) + 1;
      }
    });
  });

  const sortedTags = Object.entries(topLevelTags)
    .sort(([, countA], [, countB]) => countB - countA)
    .map(([name, count]) => ({ name, count }));

  console.log("当前所有顶级导航标签列表 (不含 # 和 /):");
  console.log(JSON.stringify(sortedTags, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });