import {
  PrismaClient
} from '@prisma/client';

const prisma = new PrismaClient();

// 复制自 lib/tag-utils.ts 的逻辑，确保环境一致
const CONCEPT_KEYWORDS = new Set([
  '迷思', '哲思', '解构', '抽象', '艺术', '浪漫', '虚无', '本质', '哲学', '意识'
]);

const NAVIGATION_ROOTS = new Set([
  '作品', '技术', '社科', '媒体', '奇闻', '见闻', '领域', '资源', '来源'
]);

function detectTagType(tag) {
  // 1. 包含 / 必定是导航
  if (tag.includes('/')) return 'navigation';

  // 2. 处理带 # 的标签
  if (tag.startsWith('#')) {
    const rawContent = tag.slice(1);
    if (CONCEPT_KEYWORDS.has(rawContent)) {
      return 'concept';
    }
    return 'attribute';
  }

  // 3. 处理不带 # 且不带 / 的标签
  if (NAVIGATION_ROOTS.has(tag)) {
    return 'navigation';
  }
  
  return 'attribute';
}

async function main() {
  console.log("正在读取数据库...");
  const treasures = await prisma.treasure.findMany({
    select: { id: true, tags: true, theme: true }
  });

  const tagCounts = {};
  const tagSamples = {}; // 记录一个使用该标签的 ID 示例

  treasures.forEach(t => {
    t.tags.forEach(tag => {
      if (!tagCounts[tag]) {
        tagCounts[tag] = 0;
        tagSamples[tag] = t.id;
      }
      tagCounts[tag]++;
    });
  });

  console.log("\n=== 标签诊断报告 ===\n");
  console.log("Total unique tags:", Object.keys(tagCounts).length);

  const problemTags = [
    '灵感', '点子', '经验', '教训', '技巧', '精华', '未来', '探究', '哲思', 
    'reddit', '见闻', '视野', '情报'
  ];

  console.log("\n--- 重点关注标签 ---");
  problemTags.forEach(pt => {
    const count = tagCounts[pt];
    if (count !== undefined) {
      console.log(`[EXIST] "${pt}" (Count: ${count})`);
      console.log(`   Type Detect: ${detectTagType(pt)}`);
      console.log(`   Sample ID: ${tagSamples[pt]}`);
    } else {
      // 检查是否有近似的（比如带空格）
      const similar = Object.keys(tagCounts).find(k => k.includes(pt));
      if (similar) {
        console.log(`[SIMILAR] Found "${similar}" instead of "${pt}"`);
        console.log(`   Type Detect: ${detectTagType(similar)}`);
      } else {
        console.log(`[MISSING] "${pt}" not found (Good?)`);
      }
    }
  });

  console.log("\n--- 导航标签误判检查 ---");
  // 列出被判为 navigation 但不含 / 的标签
  Object.keys(tagCounts).forEach(tag => {
    if (detectTagType(tag) === 'navigation' && !tag.includes('/')) {
      console.log(`Root Navigation: "${tag}" (Count: ${tagCounts[tag]})`);
    }
  });

  console.log("\n--- 概念标签重复源头检查 ---");
  // 检查 '迷思' 在不同 Theme 下的分布
  const conceptCheck = '迷思'; // 或 #迷思
  const themeDist = {};
  treasures.forEach(t => {
    if (t.tags.includes(conceptCheck) || t.tags.includes('#' + conceptCheck)) {
      const k = t.theme || 'null';
      themeDist[k] = (themeDist[k] || 0) + 1;
    }
  });
  console.log(`Distribution of "${conceptCheck}" by Theme:`, themeDist);

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
