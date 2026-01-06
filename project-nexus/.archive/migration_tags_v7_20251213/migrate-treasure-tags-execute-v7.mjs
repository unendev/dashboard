
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const RULES = [
  // --- 1. 属性类 (转为 #) ---
  // 匹配 "灵感" 或 "灵感/xxx"，替换为 "#灵感" 或 "#灵感/xxx"
  { match: /^灵感(\/.*)?$/, replace: '#灵感$1' },
  { match: /^点子(\/.*)?$/, replace: '#点子$1' },
  { match: /^经验(\/.*)?$/, replace: '#经验$1' },
  { match: /^教训(\/.*)?$/, replace: '#教训$1' },
  { match: /^技巧(\/.*)?$/, replace: '#技巧$1' },
  { match: /^精华(\/.*)?$/, replace: '#精华$1' },
  { match: /^未来(\/.*)?$/, replace: '#未来$1' },
  { match: /^探究(\/.*)?$/, replace: '#探究$1' },
  { match: /^哲思(\/.*)?$/, replace: '#哲思$1' },
  
  // --- 2. 媒体/来源类 ---
  { match: /^reddit(\/.*)?$/i, replace: '媒体/Reddit$1' },
  { match: /^情报(\/.*)?$/, replace: '媒体/情报$1' },
  { match: /^见闻(\/.*)?$/, replace: '媒体/见闻$1' },
  { match: /^视野(\/.*)?$/, replace: '媒体/视野$1' },
  
  // --- 3. 补漏 ---
  // 如果还有 "生活" 作为标签，转为 #生活 (因为 theme 已有 life)
  { match: /^生活(\/.*)?$/, replace: '#生活$1' },
];

async function main() {
  console.log("开始 V7 迁移：深度清洗与归纳...");
  const treasures = await prisma.treasure.findMany();
  
  // --- 备份 ---
  const backupDir = path.join(process.cwd(), '.archive', 'db-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFile = path.join(backupDir, `treasures_backup_v7_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(treasures, null, 2));
  console.log(`[备份] ${backupFile}`);
  
  let successCount = 0;
  let skipCount = 0;

  for (const t of treasures) {
    const oldTags = [...t.tags];
    let newTags = [];

    for (const tag of oldTags) {
      let matched = false;
      let finalTag = tag;

      for (const rule of RULES) {
        const m = tag.match(rule.match);
        if (m) {
          matched = true;
          finalTag = tag.replace(rule.match, rule.replace);
          // 清理路径中的 //
          finalTag = finalTag.replace(/\/+$/, '').replace(/\/+/g, '/');
          break;
        }
      }
      newTags.push(finalTag);
    }

    // 去重
    newTags = [...new Set(newTags)];
    
    // 检查是否有变化
    const tagsChanged = JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort());

    if (tagsChanged) {
      await prisma.treasure.update({
        where: { id: t.id },
        data: {
          tags: newTags,
        }
      });
      successCount++;
    } else {
      skipCount++;
    }
  }

  console.log(`迁移完成! 更新: ${successCount}, 跳过: ${skipCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
