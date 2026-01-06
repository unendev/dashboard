import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reddit
 * 获取Reddit帖子列表
 * 
 * 查询参数:
 * - date: 指定日期 (YYYY-MM-DD，可选)
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // 可选参数，用于查看往期数据
    
    let targetDate: Date;
    let actualDate: Date;
    
    if (date) {
      // 如果指定了日期，使用该日期
      targetDate = new Date(date);
      actualDate = targetDate;
    } else {
      // 默认使用今天的日期
      targetDate = new Date();
      actualDate = targetDate;
    }
    
    // 查询指定日期的帖子数据
    const startOfDay = new Date(actualDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(actualDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let posts = await prisma.reddit_posts.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      select: {
        id: true,
        title: true,
        title_cn: true,
        url: true,
        core_issue: true,
        key_info: true,
        post_type: true,
        value_assessment: true,
        detailed_analysis: true,
        subreddit: true,
        timestamp: true
      }
    });

    // 如果没有指定日期且当天没有数据，则查找最近有数据的日期
    if (!date && posts.length === 0) {
      const latestPost = await prisma.reddit_posts.findFirst({
        orderBy: {
          timestamp: 'desc'
        },
        select: {
          timestamp: true
        }
      });
      
      if (latestPost && latestPost.timestamp) {
        actualDate = new Date(latestPost.timestamp);
        const newStartOfDay = new Date(actualDate);
        newStartOfDay.setHours(0, 0, 0, 0);
        
        const newEndOfDay = new Date(actualDate);
        newEndOfDay.setHours(23, 59, 59, 999);
        
        posts = await prisma.reddit_posts.findMany({
          where: {
            timestamp: {
              gte: newStartOfDay,
              lte: newEndOfDay
            }
          },
          orderBy: {
            timestamp: 'desc'
          },
          select: {
            id: true,
            title: true,
            title_cn: true,
            url: true,
            core_issue: true,
            key_info: true,
            post_type: true,
            value_assessment: true,
            detailed_analysis: true,
            subreddit: true,
            timestamp: true
          }
        });
      }
    }

    // 生成报告数据
    const reportDate = actualDate.toISOString().split('T')[0];
    const total = posts.length;
    
    // 统计各板块数量
    const subredditMap = new Map<string, number>();
    posts.forEach((post: typeof posts[number]) => {
      if (post.subreddit) {
        subredditMap.set(post.subreddit, (subredditMap.get(post.subreddit) || 0) + 1);
      }
    });
    
    const subredditStats = Array.from(subredditMap.entries())
      .map(([subreddit, count]) => ({ subreddit, count }))
      .sort((a, b) => b.count - a.count);
    
    // 生成摘要
    const highValuePosts = posts.filter((p: typeof posts[number]) => p.value_assessment === '高');
    
    return NextResponse.json({
      meta: {
        post_count: total,
        report_date: reportDate,
        title: `Reddit技术+游戏开发每日报告 (${reportDate})`,
        source: "Reddit",
        subreddits: subredditStats.map((s: typeof subredditStats[number]) => s.subreddit)
      },
      summary: {
        overview: `今日从 ${subredditStats.length} 个技术板块采集到 ${total} 条帖子，其中高价值内容 ${highValuePosts.length} 条。`,
        highlights: {
          tech_savvy: posts.slice(0, 3).map((p: typeof posts[number]) => p.title_cn || p.title),
          resources_deals: highValuePosts.slice(0, 3).map((p: typeof highValuePosts[number]) => p.title_cn || p.title),
          hot_topics: posts.slice(0, 5).map((p: typeof posts[number]) => p.title_cn || p.title)
        },
        conclusion: "技术社区持续活跃，涵盖游戏开发、前沿技术等多个领域。"
      },
      posts: posts.map((p: typeof posts[number]) => ({
        id: p.id,
        title: p.title_cn || p.title,
        url: p.url,
        subreddit: p.subreddit,
        analysis: {
          core_issue: p.core_issue,
          key_info: typeof p.key_info === 'string' ? JSON.parse(p.key_info) : p.key_info,
          post_type: p.post_type,
          value_assessment: p.value_assessment,
          detailed_analysis: p.detailed_analysis
        }
      }))
    });
  } catch (error) {
    console.error('Reddit API Error:', error);
    return NextResponse.json(
      {
        success: false,
        error: '获取Reddit数据失败'
      },
      { status: 500 }
    );
  }
}
