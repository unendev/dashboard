import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
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
      // 默认使用今天的日期（小黑盒实时数据）
      targetDate = new Date();
      actualDate = targetDate;
    }
    
    // 查询指定日期的帖子数据
    const startOfDay = new Date(actualDate);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(actualDate);
    endOfDay.setHours(23, 59, 59, 999);
    
    let posts = await prisma.heybox_posts.findMany({
      where: {
        timestamp: {
          gte: startOfDay,
          lte: endOfDay
        }
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // 如果没有指定日期且当天没有数据，则查找最近有数据的日期
    if (!date && posts.length === 0) {
      const latestPost = await prisma.heybox_posts.findFirst({
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
        
        posts = await prisma.heybox_posts.findMany({
          where: {
            timestamp: {
              gte: newStartOfDay,
              lte: newEndOfDay
            }
          },
          orderBy: {
            timestamp: 'desc'
          }
        });
      }
    }

    // 转换为组件需要的格式
    const formattedPosts = posts.map((post: typeof posts[number]) => ({
      id: post.id,
      title: post.title,
      title_cn: post.title_cn,
      url: post.url,
      author: post.author,
      cover_image: post.cover_image,
      game_tag: post.game_tag,
      likes_count: post.likes_count ?? 0,
      comments_count: post.comments_count ?? 0,
      views_count: post.views_count ?? 0,
      analysis: {
        title_cn: post.title_cn,
        core_issue: post.core_issue || '',
        key_info: Array.isArray(post.key_info) ? post.key_info : [],
        post_type: post.post_type || '未知',
        value_assessment: post.value_assessment || '中',
        detailed_analysis: post.detailed_analysis || ''
      }
    }));

    // 生成报告元数据
    const reportDate = actualDate.toISOString().split('T')[0];

    const report = {
      meta: {
        report_date: reportDate,
        title: `小黑盒每日报告 (${reportDate})`,
        source: "小黑盒",
        post_count: posts.length
      },
      posts: formattedPosts
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching Heybox data from database:', error);
    return NextResponse.json(
      { error: 'Failed to load Heybox report from database' },
      { status: 500 }
    );
  }
}



