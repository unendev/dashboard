import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const RULES = [
  // --- 1. 作品类合并 (Works) ---
  // 注意顺序：先处理具体的，再处理通用的，防止重复前缀
  // 实际上如果正则写得好，顺序不重要。我们用全匹配 ^...$ 或 ^.../
  
  // 游戏：处理 "游戏/xxx" 和 "游戏"
  { match: /^游戏(\/.*)?$/, replace: '作品/游戏$1' },
  // 明日方舟：特殊处理，归入游戏
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
  // 这些词作为一级标签时，转为带 # 的形式
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
  const treasures = await prisma.treasure.findMany();
  
  let markdownOutput = `# 标签整理预览报告 (V5.0)\n\n`;
  markdownOutput += `生成时间: ${new Date().toLocaleString()}\n\n`;
  markdownOutput += `| ID (Title) | 原 Tags | **新 Tags** | 变更 |\n`;
  markdownOutput += `|---|---|---|---|
`;

  const stats = {
    processed: 0,
    changed: 0,
  };

  for (const t of treasures) {
    stats.processed++;
    const oldTags = [...t.tags];
    let newTags = [];
    let changed = false;

    for (const tag of oldTags) {
      let matched = false;
      let finalTag = tag;

      for (const rule of RULES) {
        const m = tag.match(rule.match);
        if (m) {
          matched = true;
          // 执行替换，$1 代表正则捕获组
          finalTag = tag.replace(rule.match, rule.replace);
          // 清理路径
          finalTag = finalTag.replace(/\/+\$/, '').replace(/\/+/g, '/');
          break;
        }
      }
      
      newTags.push(finalTag);
    }

    // 去重
    newTags = [...new Set(newTags)];
    
    if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
      stats.changed++;
      changed = true;
      
      const titleShort = t.title.length > 15 ? t.title.substring(0, 15) + '...' : t.title;
      markdownOutput += `| ${titleShort} | ${oldTags.join('<br>')} | **${newTags.join('<br>')}** | 是 |\n`;
    }
  }

  markdownOutput += `\n## 统计\n`;
  markdownOutput += `- 总记录数: ${stats.processed}\n`;
  markdownOutput += `- 需变更记录数: ${stats.changed}\n`;

  fs.writeFileSync('MIGRATION_PREVIEW_V5.md', markdownOutput);
  console.log(`预览报告已生成: MIGRATION_PREVIEW_V5.md`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
