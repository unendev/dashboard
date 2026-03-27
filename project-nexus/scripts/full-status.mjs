import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
async function main() {
  try {
    const postsCount = await prisma.reddit_posts.count();
    const commentsCount = await prisma.redditComment.count();
    const withAI = await prisma.reddit_posts.count({ 
      where: { 
        title_cn: { not: null } 
      } 
    });
    
    console.log(`\n=== Reddit 数据同步状态报告 ===`);
    console.log(`📌 帖子总量: ${postsCount}`);
    console.log(`💬 评论总量: ${commentsCount}`);
    console.log(`🤖 已完成 AI 分析的帖子: ${withAI}`);
    
    // Check latest 3 analysis
    const latestAnalysed = await prisma.reddit_posts.findMany({
        where: { title_cn: { not: null } },
        orderBy: { timestamp: 'desc' },
        take: 3
    });
    
    console.log(`\n最新分析片段:`);
    latestAnalysed.forEach(p => {
        console.log(`- [${p.subreddit}] ${p.title_cn}`);
        console.log(`  └ 核心议题: ${p.core_issue}`);
    });
    
  } catch (e) {
    console.error(e)
  } finally {
    await prisma.$disconnect()
  }
}
main()
