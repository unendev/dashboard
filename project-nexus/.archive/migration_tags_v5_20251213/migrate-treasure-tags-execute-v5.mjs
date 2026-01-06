import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const RULES = [
  // --- 1. 作品类合并 (Works) ---
  { match: /^游戏(\/.*)?$/, replace: '作品/游戏$1' },
  { match: /^明日方舟(\/.*)?$/, replace: '作品/游戏/明日方舟$1' },
  { match: /^动画(\/.*)?$/, replace: '作品/动画$1' },
  { match: /^漫画(\/.*)?$/, replace: '作品/漫画$1' },
  { match: /^小说(\/.*)?$/, replace: '作品/小说$1' },
  { match: /^网文(\/.*)?$/, replace: '作品/网文$1' },
  { match: /^演出(\/.*)?$/, replace: '作品/演出$1' },

  // --- 2. 技术类合并 (Tech) ---
  { match: /^开发(\/.*)?$/, replace: '技术/开发$1' },
  { match: /^设计(\/.*)?$/, replace: '技术/设计$1' },
  { match: /^工具(\/.*)?$/, replace: '技术/工具$1' },
  { match: /^资源(\/.*)?$/, replace: '技术/资源$1' },

  // --- 3. 转为属性/自由标签 (#) ---
  { match: /^灵感$/, replace: '#灵感' },
  { match: /^点子$/, replace: '#点子' },
  { match: /^经验$/, replace: '#经验' },
  { match: /^教训$/, replace: '#教训' },
  { match: /^技巧$/, replace: '#技巧' },
  { match: /^精华$/, replace: '#精华' },
  { match: /^未来$/, replace: '#未来' },
  { match: /^探究$/, replace: '#探究' },
  { match: /^哲思$/, replace: '#哲思' },
  
  // --- 4. 媒体与来源 ---
  { match: /^reddit$/, replace: '媒体/Reddit' },
  
  // --- 5. 见闻整理 ---
  { match: /^奇闻异事(\/.*)?$/, replace: '奇闻$1' },
];

async function main() {
  console.log("正在读取所有宝藏数据...");
  const treasures = await prisma.treasure.findMany();
  console.log(`共找到 ${treasures.length} 条记录。`);

  // --- 备份 ---
  const backupDir = path.join(process.cwd(), '.archive', 'db-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFile = path.join(backupDir, `treasures_backup_v5_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(treasures, null, 2));
  console.log(`[备份] 数据已备份至: ${backupFile}`);
  
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
      // 执行更新
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

  console.log(`
迁移完成!`);
  console.log(`- 成功更新: ${successCount} 条`);
  console.log(`- 无需变更: ${skipCount} 条`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
