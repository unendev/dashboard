import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

// ============================================================================ 
// 1. 映射规则定义 (V4.1)
// ============================================================================ 
// 调整说明:
// 1. 移除了 '生活' -> '日常' 的规则
// 2. 逻辑中增加了 theme 保护机制

const RULES = [
  // --- 基础分类标签转 Theme ---
  { match: /^Knowledge$/i, toTheme: 'knowledge', remove: true },
  { match: /^Life$/i, toTheme: 'life', remove: true },
  { match: /^Thought$/i, toTheme: 'thought', remove: true },
  { match: /^Root$/i, toTheme: 'root', remove: true },

  // --- 见闻 ---
  { match: /^见闻\/技术\/?(.*)?$/, toTheme: 'knowledge', replace: '技术/$1' },
  { match: /^技术\/?(.*)?$/, toTheme: 'knowledge', replace: '技术/$1' },
  { match: /^AI$/, toTheme: 'knowledge', replace: '技术/AI' },
  
  { match: /^见闻\/游戏(?:\/开发)?$/, toTheme: 'knowledge', replace: '游戏开发' },
  { match: /^见-游戏开发$/, toTheme: 'knowledge', replace: '游戏开发' },
  { match: /^游戏开发$/, toTheme: 'knowledge', replace: '游戏开发' },

  { match: /^见闻\/音乐\/?(.*)?$/, toTheme: 'knowledge', replace: '音乐/$1' },
  { match: /^见-音乐$/, toTheme: 'knowledge', replace: '音乐' },
  { match: /^东方$/, toTheme: 'root', replace: '音乐/东方' },

  { match: /^见闻\/奇闻\/?(.*)?$/, toTheme: 'life', replace: '奇闻异事/$1' },
  { match: /^见-奇闻$/, toTheme: 'life', replace: '奇闻异事' },
  { match: /^奇人$/, toTheme: 'life', replace: '奇闻异事/奇人' },

  { match: /^见-爆料$/, toTheme: 'knowledge', replace: '媒体/爆料' },
  { match: /^见-国家发展$/, toTheme: 'knowledge', replace: '社科/国家发展' },

  // --- 视野 ---
  { match: /^视野\/人类史$/, toTheme: 'knowledge', replace: '社科/人类史' },
  { match: /^人类史$/, toTheme: 'knowledge', replace: '社科/人类史' },
  
  { match: /^视野\/游戏开发$/, toTheme: 'thought', replace: '游戏开发/宣发' },
  { match: /^宣发$/, toTheme: 'thought', replace: '游戏开发/宣发' },

  { match: /^视野\/图形学$/, toTheme: 'knowledge', replace: '技术/图形学' },
  { match: /^渲染$/, toTheme: 'knowledge', replace: '技术/渲染' },

  { match: /^视野-差评君$/, toTheme: 'root', replace: '媒体/文章/差评君' },
  { match: /^#小约翰可汗$/, toTheme: 'root', replace: '媒体/视频/小约翰可汗' },
  { match: /^小约翰可汗$/, toTheme: 'root', replace: '媒体/视频/小约翰可汗' },
  
  { match: /^视野-游戏新闻$/, toTheme: 'knowledge', replace: '媒体/游戏新闻' },
  
  { match: /^阶级与社会$/, toTheme: 'knowledge', replace: '社科/阶级与社会' },

  // --- 点子/经验/技巧 ---
  { match: /^点子\/游戏$/, toTheme: 'thought', replace: '灵感/游戏设计' },
  
  { match: /^经验\/踩坑$/, toTheme: 'thought', replace: '经验/踩坑' },
  { match: /^教训$/, toTheme: 'thought', replace: '经验/教训' },

  { match: /^技巧\/思考方式$/, toTheme: 'thought', replace: '技巧/思维模型' },
  { match: /^思维方式$/, toTheme: 'thought', replace: '技巧/思维模型' },
  { match: /^技巧$/, toTheme: 'thought', replace: '技巧' },

  // --- 生活 & 零散 ---
  // [移除] { match: /^生活$/, toTheme: 'life', replace: '日常' }, 
  // [保留] 生活标签会走默认逻辑：如果有其他规则匹配则变，否则保留。但这里没有匹配规则，所以保留为 '生活'。
  // 但是，如果 theme 为空，我们是否需要因为 '生活' 标签而把 theme 设为 'life'？
  // 如果我想把 Knowledge 提取为 theme，那么 Life 也应该提取。
  // 但 '生活' 不在 RULE 列表里了。
  // 如果仅仅想提取 theme，可以加一个只提取不替换的规则：
  { match: /^生活$/, toTheme: 'life', replace: '生活' }, // 显式规则：Tag不变，但建议 theme=life

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

  // --- 保留的高价值概念标签 ---
  { match: /^#?迷思$/, toTheme: 'thought', replace: '#迷思' },
  { match: /^#?解构$/, toTheme: 'thought', replace: '#解构' },
  { match: /^#?抽象$/, toTheme: 'thought', replace: '#抽象' },
  { match: /^#?艺术$/, toTheme: 'thought', replace: '#艺术' },
  { match: /^#?浪漫$/, toTheme: 'life', replace: '#浪漫' },
  
  // --- 作品类 ---
  { match: /^演出\/明日方舟\/(.*)$/, toTheme: 'life', replace: '明日方舟/$1' },
  { match: /^漫画\/恋爱\/(.*)$/, toTheme: 'life', replace: '漫画/$1' },
  { match: /^动画\/(.*)$/, toTheme: 'life', replace: '动画/$1' },
];

// ============================================================================ 
// 2. 执行逻辑
// ============================================================================ 

async function main() {
  console.log("正在读取所有宝藏数据...");
  const treasures = await prisma.treasure.findMany();
  console.log(`共找到 ${treasures.length} 条记录。`);

  // --- 备份 ---
  const backupDir = path.join(process.cwd(), '.archive', 'db-backup');
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }
  const backupFile = path.join(backupDir, `treasures_backup_${Date.now()}.json`);
  fs.writeFileSync(backupFile, JSON.stringify(treasures, null, 2));
  console.log(`[备份] 数据已备份至: ${backupFile}`);
  
  let successCount = 0;
  let skipCount = 0;

  for (const t of treasures) {
    const oldTags = [...t.tags];
    const oldTheme = t.theme;
    
    let newTags = [];
    let newTheme = oldTheme; // 默认保持原 theme 不动

    // 处理每一个旧标签
    for (const tag of oldTags) {
      let matched = false;
      
      for (const rule of RULES) {
        // Double check skip '生活'->'日常'
        if (rule.match.toString().includes('^生活$') && rule.replace === '日常') {
           continue; 
        }

        const m = tag.match(rule.match);
        if (m) {
          matched = true;
          
          // 1. 处理 Theme 更新 (仅当原 theme 为空时)
          if (rule.toTheme && rule.remove) {
             if (!oldTheme) {
                 newTheme = rule.toTheme;
                 // 标签被移除了
             } else {
                 // 原 theme 有值，则保留该标签
                 newTags.push(tag);
             }
          }
          // 2. 处理 Tag 替换
          else if (rule.replace) {
            let replacedTag = rule.replace;
            if (tag.match(rule.match).length > 1) {
              replacedTag = tag.replace(rule.match, rule.replace);
            }
            replacedTag = replacedTag.replace(/\/+$/, '').replace(/\/+/g, '/');
            
            // 建议 Theme (仅当原 theme 为空)
            if (rule.toTheme && !oldTheme && !newTheme) {
                newTheme = rule.toTheme;
            }

            if (replacedTag !== tag) {
              newTags.push(replacedTag);
            } else {
              newTags.push(tag);
            }
          } 
          else {
            newTags.push(tag);
          }
          
          break;
        }
      }

      if (!matched) {
        newTags.push(tag);
      }
    }

    // 去重
    newTags = [...new Set(newTags)];
    
    // 检查是否有变化
    const tagsChanged = JSON.stringify(oldTags.sort()) !== JSON.stringify(newTags.sort());
    const themeChanged = oldTheme !== newTheme;

    if (tagsChanged || themeChanged) {
      // 执行更新
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

  console.log(`\n迁移完成!`);
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