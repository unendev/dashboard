import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';

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
      // 默认使用昨天的日期
      targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - 1);
      actualDate = targetDate;
    }
    
    const reportDateStr = actualDate.toISOString().split('T')[0];
    let posts: any[] = []; // Use any[] temporarily to accommodate prisma and json types

    try {
        // 查询指定日期的帖子数据
        const startOfDay = new Date(actualDate);
        startOfDay.setHours(0, 0, 0, 0);
        
        const endOfDay = new Date(actualDate);
        endOfDay.setHours(23, 59, 59, 999);
        
        posts = await prisma.posts.findMany({
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
    } catch (dbError) {
        console.warn('Database query failed, attempting local JSON fallback:', dbError);
    }

    // Fallback: 如果数据库没有数据，尝试读取本地JSON文件
    if (posts.length === 0) {
        try {
            // 尝试读取今天的（或指定日期的）JSON
            const jsonFileName = `linux.do_report_${reportDateStr}.json`;
            const jsonPath = path.join(process.cwd(), 'data', jsonFileName);
            
            if (fs.existsSync(jsonPath)) {
                console.log(`Loading data from local JSON: ${jsonPath}`);
                const fileContent = fs.readFileSync(jsonPath, 'utf-8');
                const jsonData = JSON.parse(fileContent);
                
                if (jsonData.posts && Array.isArray(jsonData.posts)) {
                    // 映射 JSON 数据到 API 格式
                    posts = jsonData.posts.map((p: any) => ({
                        id: p.id,
                        title: p.title,
                        url: p.url,
                        replies_count: p.replies_count || 0,
                        participants_count: p.participants_count || 0,
                        core_issue: p.analysis?.core_issue,
                        key_info: p.analysis?.key_info,
                        post_type: p.analysis?.post_type,
                        value_assessment: p.analysis?.value_assessment,
                        detailed_analysis: p.analysis?.detailed_analysis,
                        // Add dummy timestamp if needed
                        timestamp: new Date()
                    }));
                }
            } else {
                 // 如果指定日期没找到，尝试找最近的 JSON (简单逻辑：只找昨天的)
                 // 或者这里保持空，前端会显示无数据
            }
        } catch (fileError) {
            console.error('Failed to read local JSON fallback:', fileError);
        }
    }

    // 如果没有指定日期且当天没有数据(数据库和本地都没)，则查找数据库最近有数据的日期 (保留原有逻辑)
    if (!date && posts.length === 0) {
      try {
          const latestPost = await prisma.posts.findFirst({
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
            
            posts = await prisma.posts.findMany({
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
      } catch (e) {
          // ignore db error
      }
    }

    // 转换为组件需要的格式
    const formattedPosts = posts.map((post: any) => ({
      id: post.id,
      title: post.title,
      url: post.url,
      replies_count: (post as { replies_count?: number }).replies_count ?? 0,
      participants_count: (post as { participants_count?: number }).participants_count ?? 0,
      analysis: {
        core_issue: post.core_issue || '',
        key_info: Array.isArray(post.key_info) ? post.key_info : [],
        post_type: post.post_type || '未知',
        value_assessment: post.value_assessment || '中',
        detailed_analysis: post.detailed_analysis || ''
      }
    }));

    // 生成报告元数据
    const reportDate = actualDate.toISOString().split('T')[0];
    
    // 按类型统计
    // const typeStats = posts.reduce((acc, post) => {
    //   const type = post.post_type || '未知';
    //   acc[type] = (acc[type] || 0) + 1;
    //   return acc;
    // }, {} as Record<string, number>);

    // 生成摘要信息
    const summary = generateSummary(posts);

    const report = {
      meta: {
        report_date: reportDate,
        title: `Linux.do 每日热帖报告 (${reportDate})`,
        source: "Linux.do",
        post_count: posts.length
      },
      summary,
      posts: formattedPosts
    };

    return NextResponse.json(report);
  } catch (error) {
    console.error('Error fetching Linux.do data from database:', error);
    return NextResponse.json(
      { error: 'Failed to load Linux.do report from database' },
      { status: 500 }
    );
  }
}

// 生成摘要信息的辅助函数
function generateSummary(posts: Array<{ value_assessment?: string | null; post_type?: string | null; title: string }>) {
  const highValuePosts = posts.filter(post => post.value_assessment === '高');
  const techPosts = posts.filter(post => 
    post.post_type === '技术问答' || 
    post.post_type === '资源分享' || 
    post.post_type === '新闻资讯'
  );
  
  const overview = `今日社区共收集到 ${posts.length} 条帖子，其中高价值内容 ${highValuePosts.length} 条。主要围绕技术讨论、资源分享和生活交流展开。`;
  
  const highlights = {
    tech_savvy: techPosts.slice(0, 3).map((post: typeof techPosts[number]) => post.title),
    resources_deals: highValuePosts.slice(0, 3).map((post: typeof highValuePosts[number]) => post.title),
    hot_topics: posts.slice(0, 3).map((post: typeof posts[number]) => post.title)
  };
  
  const conclusion = `在技术探索与生活分享的交织中，社区展现了丰富的讨论内容和活跃的交流氛围。`;
  
  return {
    overview,
    highlights,
    conclusion
  };
}