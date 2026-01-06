
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const RULES = [
  // --- 1. 媒体 -> 情报 ---
  // 将所有以 "媒体" 开头的标签替换为 "情报"
  { match: /^媒体(\/.*)?$/, replace: '情报$1' },
  
  // --- 2. 奇闻 -> 情报/奇闻 ---
  { match: /^奇闻(\/.*)?$/, replace: '情报/奇闻$1' },
  
  // --- 3. 音乐 -> 作品/音乐 ---
  { match: /^音乐(\/.*)?$/, replace: '作品/音乐$1' },
  
  // --- 4. 资产 -> 技术/资产 ---
  { match: /^资产(\/.*)?$/, replace: '技术/资产$1' },
  
  // --- 补漏 ---
  { match: /^见闻(\/.*)?$/, replace: '情报/见闻$1' },
];

async function main() {
  console.log("开始 V8 迁移：4领域终极归纳 (作品, 技术, 社科, 情报)...");
  const treasures = await prisma.treasure.findMany();
  
  // --- 备份 ---
  const backupDir = path.join(process.cwd(), '.archive', 'db-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFile = path.join(backupDir, `treasures_backup_v8_${Date.now()}.json`);
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
