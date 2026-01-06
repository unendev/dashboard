import { NextRequest, NextResponse } from 'next/server';
import { AIService } from '@/lib/ai-service';
import { prisma } from '@/lib/prisma';

// POST /api/ai-summary/cron - 定时任务：生成昨日AI总结
export async function POST(request: NextRequest) {
  try {
    // 验证请求来源（可选：添加API密钥验证）
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.CRON_SECRET_TOKEN;
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('开始执行AI总结定时任务...');
    
    // 获取昨天的日期
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    console.log(`目标日期: ${yesterdayStr}`);
    
    // 获取所有用户（这里使用硬编码的用户ID，实际项目中应该从数据库获取）
    const userIds = ['user-1']; // 可以根据需要扩展
    
    const results = [];
    
    for (const userId of userIds) {
      try {
        console.log(`正在为用户 ${userId} 生成总结...`);
        
        // 检查是否已经存在总结
        const existingSummary = await prisma.aISummary.findUnique({
          where: {
            userId_date: {
              userId: userId,
              date: yesterdayStr
            }
          }
        });
        
        if (existingSummary) {
          console.log(`⚠️ 用户 ${userId} 的总结已存在，跳过`);
          results.push({
            userId: userId,
            date: yesterdayStr,
            success: true,
            skipped: true,
            message: '总结已存在'
          });
          continue;
        }
        
        // 生成 AI 总结
        const summary = await AIService.generateSummary(userId, yesterdayStr);
        
        // 保存总结到数据库
        const savedSummary = await prisma.aISummary.create({
          data: {
            userId: userId,
            date: yesterdayStr,
            summary: summary.summary,
            totalTime: summary.totalTime,
            taskCount: summary.taskCount,
            insights: summary.insights,
            categories: summary.categories
          }
        });
        
        results.push({
          userId: userId,
          date: yesterdayStr,
          success: true,
          summaryId: savedSummary.id,
          totalTime: summary.totalTime,
          taskCount: summary.taskCount
        });
        
        console.log(`✅ 用户 ${userId} 总结生成成功`);
        console.log(`   总结ID: ${savedSummary.id}`);
        console.log(`   总时间: ${Math.floor(summary.totalTime / 3600)}小时${Math.floor((summary.totalTime % 3600) / 60)}分钟`);
        console.log(`   任务数: ${summary.taskCount}个`);
        
      } catch (error) {
        console.error(`❌ 用户 ${userId} 总结生成失败:`, error);
        
        results.push({
          userId: userId,
          date: yesterdayStr,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    // 输出总结报告
    const successCount = results.filter(r => r.success && !r.skipped).length;
    const skippedCount = results.filter(r => r.skipped).length;
    const failedCount = results.filter(r => !r.success).length;
    
    console.log('\n=== AI 总结生成报告 ===');
    console.log(`日期: ${yesterdayStr}`);
    console.log(`总用户数: ${userIds.length}`);
    console.log(`成功生成: ${successCount}`);
    console.log(`跳过生成: ${skippedCount}`);
    console.log(`生成失败: ${failedCount}`);
    
    return NextResponse.json({
      success: true,
      date: yesterdayStr,
      totalUsers: userIds.length,
      successCount,
      skippedCount,
      failedCount,
      results
    });
    
  } catch (error) {
    console.error('❌ AI总结定时任务失败:', error);
    return NextResponse.json({ 
      error: 'AI总结定时任务失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

// GET /api/ai-summary/cron - 检查定时任务状态
export async function GET() {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];
    
    // 检查昨天的总结是否存在
    const summaries = await prisma.aISummary.findMany({
      where: {
        date: yesterdayStr
      },
      select: {
        userId: true,
        date: true,
        createdAt: true,
        totalTime: true,
        taskCount: true
      }
    });
    
    return NextResponse.json({
      date: yesterdayStr,
      summaryCount: summaries.length,
      summaries: summaries.map((s: typeof summaries[number]) => ({
        userId: s.userId,
        date: s.date,
        createdAt: s.createdAt,
        totalTime: s.totalTime,
        taskCount: s.taskCount
      }))
    });
    
  } catch (error) {
    console.error('检查定时任务状态失败:', error);
    return NextResponse.json({ 
      error: '检查定时任务状态失败',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
