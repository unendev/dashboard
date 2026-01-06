import {
  PrismaClient
} from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ============================================================================ 
// 1. 映射规则定义
// ============================================================================ 

const THEME_MAPPING = {
  'knowledge': 'knowledge',
  'life': 'life',
  'thought': 'thought',
  'root': 'root',
  // 兼容旧的颜色/语义 theme
  'blue': 'knowledge',
  'green': 'life', // 假设
  'purple': 'thought', // 假设
  'red': 'root', // 假设
  'tech': 'knowledge',
  'inspiration': 'thought',
};

const RULES = [
  // --- 基础分类标签转 Theme ---
  { match: /^Knowledge$/i, toTheme: 'knowledge', remove: true },
  { match: /^Life$/i, toTheme: 'life', remove: true },
  { match: /^Thought$/i, toTheme: 'thought', remove: true },
  { match: /^Root$/i, toTheme: 'root', remove: true },

  // --- 见闻 (Knowledge/Life) ---
  { match: /^见闻\/技术\/?(.*)?$/, toTheme: 'knowledge', replace: '技术/$1' }, // 见闻/技术/AI -> 技术/AI
  { match: /^技术\/?(.*)?$/, toTheme: 'knowledge', replace: '技术/$1' },      // 技术/前端 -> 技术/前端
  { match: /^AI$/, toTheme: 'knowledge', replace: '技术/AI' },
  
  { match: /^见闻\/游戏(?:\/开发)?$/, toTheme: 'knowledge', replace: '游戏开发' },
  { match: /^见-游戏开发$/, toTheme: 'knowledge', replace: '游戏开发' },
  { match: /^游戏开发$/, toTheme: 'knowledge', replace: '游戏开发' },

  { match: /^见闻\/音乐\/?(.*)?$/, toTheme: 'knowledge', replace: '音乐/$1' },
  { match: /^见-音乐$/, toTheme: 'knowledge', replace: '音乐' },
  { match: /^东方$/, toTheme: 'root', replace: '音乐/东方' }, // 根据文档：音乐/东方 -> 根源/知识

  { match: /^见闻\/奇闻\/?(.*)?$/, toTheme: 'life', replace: '奇闻异事/$1' },
  { match: /^见-奇闻$/, toTheme: 'life', replace: '奇闻异事' },
  { match: /^奇人$/, toTheme: 'life', replace: '奇闻异事/奇人' },

  { match: /^见-爆料$/, toTheme: 'knowledge', replace: '媒体/爆料' },
  { match: /^见-国家发展$/, toTheme: 'knowledge', replace: '社科/国家发展' },

  // --- 视野 (Knowledge/Thought) ---
  { match: /^视野\/人类史$/, toTheme: 'knowledge', replace: '社科/人类史' },
  { match: /^人类史$/, toTheme: 'knowledge', replace: '社科/人类史' },
  
  { match: /^视野\/游戏开发$/, toTheme: 'thought', replace: '游戏开发/宣发' }, // 视野下的游戏开发偏向思考/宣发？
  { match: /^宣发$/, toTheme: 'thought', replace: '游戏开发/宣发' },

  { match: /^视野\/图形学$/, toTheme: 'knowledge', replace: '技术/图形学' },
  { match: /^渲染$/, toTheme: 'knowledge', replace: '技术/渲染' },

  { match: /^视野-差评君$/, toTheme: 'root', replace: '媒体/文章/差评君' },
  { match: /^#小约翰可汗$/, toTheme: 'root', replace: '媒体/视频/小约翰可汗' },
  { match: /^小约翰可汗$/, toTheme: 'root', replace: '媒体/视频/小约翰可汗' },
  
  { match: /^视野-游戏新闻$/, toTheme: 'knowledge', replace: '媒体/游戏新闻' },
  
  { match: /^阶级与社会$/, toTheme: 'knowledge', replace: '社科/阶级与社会' },

  // --- 点子/经验/技巧 (Thought) ---
  { match: /^点子\/游戏$/, toTheme: 'thought', replace: '灵感/游戏设计' },
  
  { match: /^经验\/踩坑$/, toTheme: 'thought', replace: '经验/踩坑' },
  { match: /^教训$/, toTheme: 'thought', replace: '经验/教训' },

  { match: /^技巧\/思考方式$/, toTheme: 'thought', replace: '技巧/思维模型' },
  { match: /^思维方式$/, toTheme: 'thought', replace: '技巧/思维模型' },
  { match: /^技巧$/, toTheme: 'thought', replace: '技巧' },

  // --- 生活 & 零散 ---
  { match: /^生活$/, toTheme: 'life', replace: '日常' }, // 纯"生活"标签转为"日常"
  { match: /^生活装饰$/, toTheme: 'life', replace: '兴趣/装饰' },
  
  { match: /^哲学$/, toTheme: 'thought', replace: '哲学' },
  
  // 具体技术
  { match: /^UI$/, toTheme: 'knowledge', replace: '技术/UI' },
  { match: /^模型$/, toTheme: 'knowledge', replace: '技术/模型' },
  { match: /^前端$/, toTheme: 'knowledge', replace: '技术/前端' },
  { match: /^JavaScript$/, toTheme: 'knowledge', replace: '技术/JavaScript' },
  { match: /^编程$/, toTheme: 'knowledge', replace: '技术/编程' },
  { match: /^学习笔记$/, toTheme: 'knowledge', replace: '技术/学习笔记' },

  // 工具
  { match: /^#工具$/, toTheme: 'knowledge', replace: '工具' },
  { match: /^#UE$/, toTheme: 'knowledge', replace: '工具/UE' },
  { match: /^UE$/, toTheme: 'knowledge', replace: '工具/UE' },

  // --- 保留的高价值概念标签 (不需要变，但可以明确指定 Theme) ---
  { match: /^#?迷思$/, toTheme: 'thought', replace: '#迷思' },
  { match: /^#?解构$/, toTheme: 'thought', replace: '#解构' },
  { match: /^#?抽象$/, toTheme: 'thought', replace: '#抽象' },
  { match: /^#?艺术$/, toTheme: 'thought', replace: '#艺术' },
  { match: /^#?浪漫$/, toTheme: 'life', replace: '#浪漫' },
  
  // --- 作品类 (通常不需要变，但要归类) ---
  // 假设格式为 "作品名/篇章" 的通常是 root 或 knowledge?
  // 暂时不通过正则强行归类所有作品，只处理已知的
  { match: /^演出\/明日方舟\/(.*)$/, toTheme: 'life', replace: '明日方舟/$1' }, // 假设演出归为生活/娱乐？
  { match: /^漫画\/恋爱\/(.*)$/, toTheme: 'life', replace: '漫画/$1' },
  { match: /^动画\/(.*)$/, toTheme: 'life', replace: '动画/$1' },
];

// ============================================================================ 
// 2. 逻辑处理
// ============================================================================ 

async function main() {
  const treasures = await prisma.treasure.findMany();
  
  let totalChanges = 0;
  let markdownOutput = `# 标签迁移预览报告 (V4.0)\n\n`;
  markdownOutput += `生成时间: ${new Date().toLocaleString()}\n\n`;
  markdownOutput += `| ID (Title) | 原 Tags | 原 Theme | **新 Tags** | **新 Theme** | 变更说明 |\n`;
  markdownOutput += `|---|---|---|---|---|---|
`;

  const stats = {
    processed: 0,
    changed: 0,
    themeConflicts: 0,
  };

  for (const t of treasures) {
    stats.processed++;
    const oldTags = [...t.tags];
    const oldTheme = t.theme;
    
    let newTags = [];
    let newTheme = oldTheme ? (THEME_MAPPING[oldTheme.toLowerCase()] || oldTheme) : null;
    let changeLog = [];

    // 处理每一个旧标签
    for (const tag of oldTags) {
      let matched = false;
      
      for (const rule of RULES) {
        const m = tag.match(rule.match);
        if (m) {
          matched = true;
          
          // 1. 处理 Theme 更新
          if (rule.toTheme) {
            if (!newTheme) {
              newTheme = rule.toTheme;
              changeLog.push(`Theme设为 ${rule.toTheme} (源自标签 ${tag})`);
            } else if (newTheme !== rule.toTheme) {
              // 冲突策略：Root > Knowledge/Thought/Life ? 或者保留原有的？
              // 暂时策略：如果新推导出的 theme 优先级更高或更具体，则覆盖。
              // 这里简化：记录冲突，暂不覆盖，除非原 theme 是 generic 的。
              changeLog.push(`[Theme冲突] 保持 ${newTheme}, 忽略 ${rule.toTheme} (源自 ${tag})`);
              stats.themeConflicts++;
            }
          }

          // 2. 处理 Tag 替换
          if (rule.remove) {
            changeLog.push(`移除标签: ${tag}`);
          } else if (rule.replace) {
            // 支持正则替换组 $1
            let replacedTag = rule.replace;
            if (tag.match(rule.match).length > 1) {
              replacedTag = tag.replace(rule.match, rule.replace);
            }
            // 清理路径中的双斜杠等
            replacedTag = replacedTag.replace(/\/+\$/, '').replace(/\/+/g, '/');
            
            if (replacedTag !== tag) {
              newTags.push(replacedTag);
              changeLog.push(`重命名: ${tag} -> ${replacedTag}`);
            } else {
              newTags.push(tag); // 没变
            }
          } else {
            newTags.push(tag); // 规则只改了 theme，没改 tag 名
          }
          
          break; // 匹配到一个规则就停止
        }
      }

      if (!matched) {
        newTags.push(tag); // 没匹配到规则，保留原样
      }
    }

    // 去重
    newTags = [...new Set(newTags)];
    
    // 比较是否有变化
    const tagsChanged = JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort());
    const themeChanged = oldTheme !== newTheme;

    if (tagsChanged || themeChanged) {
      stats.changed++;
      totalChanges++;
      
      const titleShort = t.title.length > 15 ? t.title.substring(0, 15) + '...' : t.title;
      const tagsDiff = tagsChanged ? `<span style="color:red">${oldTags.join(', ')}</span>` : oldTags.join(', ');
      const tagsNew = tagsChanged ? `<span style="color:green">${newTags.join(', ')}</span>` : newTags.join(', ');
      const themeDiff = themeChanged ? `**${newTheme}** (was ${oldTheme})` : newTheme;

      markdownOutput += `| ${titleShort} | ${oldTags.join('<br>')} | ${oldTheme || '-'} | **${newTags.join('<br>')}** | **${newTheme || '-'}** | ${changeLog.join('<br>')} |\n`;
    }
  }

  markdownOutput += `\n## 统计\n`;
  markdownOutput += `- 总记录数: ${stats.processed}\n`;
  markdownOutput += `- 需变更记录数: ${stats.changed}\n`;
  markdownOutput += `- Theme 冲突数: ${stats.themeConflicts}\n`;

  fs.writeFileSync('MIGRATION_PREVIEW.md', markdownOutput);
  console.log(`预览报告已生成: MIGRATION_PREVIEW.md`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
