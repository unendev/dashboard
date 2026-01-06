
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const problematicTag = "闅剧环"; // '难题' 的乱码表示

async function main() {
  console.log(`正在从所有宝藏中移除乱码标签: "${problematicTag}"`);

  const treasures = await prisma.treasure.findMany({
    where: {
      tags: { has: problematicTag }
    },
    select: { id: true, tags: true, title: true }
  });

  if (treasures.length === 0) {
    console.log(`没有找到包含乱码标签 "${problematicTag}" 的记录。`);
    return;
  }

  let updatedCount = 0;
  for (const t of treasures) {
    const newTags = t.tags.filter(tag => tag !== problematicTag);
    
    await prisma.treasure.update({
      where: { id: t.id },
      data: { tags: newTags }
    });
    updatedCount++;
    console.log(`更新宝藏: "${t.title}"`);
  }

  console.log(`成功从 ${updatedCount} 条记录中移除了乱码标签 "${problematicTag}"。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
