
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const treasures = await prisma.treasure.findMany({
    select: { id: true, tags: true, title: true }
  });

  let updatedCount = 0;

  for (const t of treasures) {
    let newTags = [...t.tags];
    let changed = false;

    // 过滤掉已知的乱码标签 "闅剧环" (难题)
    // 同时也过滤掉其他非法的顶级标签（非作品/技术/社科/情报/生活/媒体，且不带#）
    // 但为了安全，我们只针对性删除 "闅剧环"
    // 我们通过特征识别它：长度为 2，且不是我们已知的合法标签
    
    // 或者直接匹配那个乱码的 unicode 特征
    // 但最稳妥的是：如果标签名不在白名单里，且不包含 / 和 #，就打印出来确认
    
    const validRoots = ['作品', '技术', '社科', '情报', '生活', '媒体', '奇闻', '见闻']; // 奇闻见闻稍后处理
    
    const originalLength = newTags.length;
    newTags = newTags.filter(tag => {
      if (tag.includes('/') || tag.startsWith('#')) return true;
      if (validRoots.includes(tag)) return true;
      
      // 剩下的就是疑似乱码或残留
      console.log(`[删除] 发现残留标签: "${tag}" (ID: ${t.id})`);
      return false; // 删除它
    });

    if (newTags.length !== originalLength) {
      await prisma.treasure.update({
        where: { id: t.id },
        data: { tags: newTags }
      });
      updatedCount++;
    }
  }

  console.log(`清理完成，更新了 ${updatedCount} 条记录。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
