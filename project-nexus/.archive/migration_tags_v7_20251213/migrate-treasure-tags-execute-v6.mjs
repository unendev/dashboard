import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// Theme 补全规则
const THEME_INFERENCE = [
  { match: /^作品(\/.*)?$/, theme: 'root' },
  { match: /^技术(\/.*)?$/, theme: 'knowledge' },
  { match: /^社科(\/.*)?$/, theme: 'knowledge' },
  { match: /^媒体(\/.*)?$/, theme: 'knowledge' },
  { match: /^奇闻(\/.*)?$/, theme: 'life' },
  { match: /^音乐(\/.*)?$/, theme: 'life' },
  { match: /^见闻(\/.*)?$/, theme: 'knowledge' },
  { match: /^视野(\/.*)?$/, theme: 'knowledge' },
];

const TAG_FIXES = [
  { match: /^灵感$/, replace: '#灵感' },
  { match: /^点子$/, replace: '#点子' },
  { match: /^经验$/, replace: '#经验' },
  { match: /^教训$/, replace: '#教训' },
  { match: /^技巧$/, replace: '#技巧' },
  { match: /^精华$/, replace: '#精华' },
  { match: /^未来$/, replace: '#未来' },
  { match: /^探究$/, replace: '#探究' },
  { match: /^哲思$/, replace: '#哲思' },
  { match: /^资产$/, replace: '#资产' },
  { match: /^资源$/, replace: '#资源' },
  { match: /^reddit$/i, replace: '媒体/Reddit' },
  { match: /^见闻$/, replace: '媒体/见闻' },
];

async function main() {
  console.log("开始 V6 迁移 (Debug 版)...");
  
  // 分批处理防止超时
  const total = await prisma.treasure.count();
  const batchSize = 50;
  let processed = 0;
  let successCount = 0;
  let skipCount = 0;

  while (processed < total) {
    const treasures = await prisma.treasure.findMany({
      skip: processed,
      take: batchSize,
    });

    for (const t of treasures) {
      let newTags = [...t.tags];
      let newTheme = t.theme;
      
      // 1. 清洗残留
      newTags = newTags.map(tag => {
        let finalTag = tag;
        for (const rule of TAG_FIXES) {
          if (tag.match(rule.match)) {
            finalTag = tag.replace(rule.match, rule.replace);
            break;
          }
        }
        return finalTag;
      });

      // 2. 补全 Theme
      if (!newTheme) {
        for (const tag of newTags) {
          for (const rule of THEME_INFERENCE) {
            if (tag.match(rule.match)) {
              newTheme = rule.theme;
              console.log(`[Infer] ${t.title.substring(0,10)}... : ${tag} -> ${newTheme}`);
              break;
            }
          }
          if (newTheme) break;
        }
      }

      // 去重
      newTags = [...new Set(newTags)];
      
      const tagsChanged = JSON.stringify(t.tags.sort()) !== JSON.stringify(newTags.sort());
      const themeChanged = t.theme !== newTheme;

      if (tagsChanged || themeChanged) {
        await prisma.treasure.update({
          where: { id: t.id },
          data: {
            tags: newTags,
            theme: newTheme,
          }
        });
        successCount++;
      } else {
        skipCount++;
      }
    }
    
    processed += treasures.length;
    console.log(`进度: ${processed}/${total}`);
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