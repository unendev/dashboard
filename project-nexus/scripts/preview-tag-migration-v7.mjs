import { PrismaClient } from '@prisma/client';
import fs from 'fs';

const prisma = new PrismaClient();

const RULES = [
  // --- 1. 建立 情报 (Intel) 阵地 ---
  // 将 奇闻、见闻、媒体(部分)、Reddit 等归入 情报
  { match: /^奇闻(\/.*)?$/, replace: '情报/奇闻$1' },
  { match: /^见闻(\/.*)?$/, replace: '情报/见闻$1' }, // 如果你坚持用见闻，这里可以改为 '见闻$1' 保持不变，但为了演示收敛，先归入情报
  { match: /^媒体\/Reddit$/, replace: '情报/Reddit' }, // 来源归入情报
  { match: /^reddit$/i, replace: '情报/Reddit' },
  { match: /^爆料$/, replace: '情报/爆料' },
  
  // --- 2. 媒体的处理 ---
  // 媒体目前有39个，很多是文章/视频。
  // 激进方案：把“媒体”改名为“情报”？或者保留“媒体”作为“情报”的子集？
  // 暂时：将 媒体 -> 情报/媒体 (看看效果)
  { match: /^媒体(\/.*)?$/, replace: '情报/媒体$1' },

  // --- 3. 作品归位 (查漏补缺) ---
  { match: /^游戏(\/.*)?$/, replace: '作品/游戏$1' },
  { match: /^动画(\/.*)?$/, replace: '作品/动画$1' },
  { match: /^漫画(\/.*)?$/, replace: '作品/漫画$1' },
  { match: /^小说(\/.*)?$/, replace: '作品/小说$1' },
  { match: /^网文(\/.*)?$/, replace: '作品/网文$1' },
  { match: /^演出(\/.*)?$/, replace: '作品/演出$1' },
  { match: /^音乐(\/.*)?$/, replace: '作品/音乐$1' },

  // --- 4. 技术归位 ---
  { match: /^工具(\/.*)?$/, replace: '技术/工具$1' },
  { match: /^资源(\/.*)?$/, replace: '技术/资源$1' },
  { match: /^开发(\/.*)?$/, replace: '技术/开发$1' },
  { match: /^设计(\/.*)?$/, replace: '技术/设计$1' },

  // --- 5. 属性化 ---
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
];

async function main() {
  const treasures = await prisma.treasure.findMany();
  
  // 模拟变更后的标签集合（用于统计一级分类）
  const finalTags = new Set();
  
  let markdownOutput = `# 标签整理预览报告 (V7.0 - 情报归纳)\n\n`;
  markdownOutput += `| ID (Title) | 原 Tags | **新 Tags** | 变更 |\n`;
  markdownOutput += `|---|---|---|---|
`;

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
      
      // 收集一级分类用于统计
      if (!finalTag.startsWith('#')) {
        const root = finalTag.split('/')[0];
        finalTags.add(root);
      }
    }

    if (JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort())) {
      const titleShort = t.title.length > 15 ? t.title.substring(0, 15) + '...' : t.title;
      markdownOutput += `| ${titleShort} | ${oldTags.join('<br>')} | **${newTags.join('<br>')}** | 是 |\n`;
    }
  }

  markdownOutput += `\n## 预计一级分类概览\n`;
  markdownOutput += Array.from(finalTags).sort().join('\n');

  fs.writeFileSync('MIGRATION_PREVIEW_V7.md', markdownOutput);
  console.log(`预览报告已生成: MIGRATION_PREVIEW_V7.md`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
