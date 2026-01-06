
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const tagToRemove = "难题";

async function main() {
  console.log(`正在从所有宝藏中移除标签: "${tagToRemove}"`);

  const treasures = await prisma.treasure.findMany({
    where: {
      tags: { has: tagToRemove }
    },
    select: { id: true, tags: true, title: true }
  });

  if (treasures.length === 0) {
    console.log(`没有找到包含标签 "${tagToRemove}" 的记录。`);
    return;
  }

  let updatedCount = 0;
  for (const t of treasures) {
    const newTags = t.tags.filter(tag => tag !== tagToRemove);
    
    await prisma.treasure.update({
      where: { id: t.id },
      data: { tags: newTags }
    });
    updatedCount++;
    console.log(`更新宝藏: "${t.title}"`);
  }

  console.log(`成功从 ${updatedCount} 条记录中移除了标签 "${tagToRemove}"。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
