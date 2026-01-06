import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { WeeklyReviewData } from '@/types/milestone';

/**
 * POST /api/milestones/generate-draft
 * 生成指定时间段的每周回顾草稿
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { startDate, endDate } = await request.json();
    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: '缺少必需参数：startDate, endDate' },
        { status: 400 }
      );
    }

    // 获取指定时间段的所有计时任务
    const tasks = await prisma.timerTask.findMany({
      where: {
        userId: session.user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
        elapsedTime: { gt: 0 }, // 只获取有时长的任务
      },
      orderBy: { elapsedTime: 'desc' },
    });

    if (tasks.length === 0) {
      return NextResponse.json({
        aiTitle: '休息周',
        aiFocus: '本周没有计时记录',
        aiInsights: ['本周没有计时活动，建议适当规划时间'],
        aiKeyAchievements: [],
      } as WeeklyReviewData);
    }

    // 计算基本统计
    const totalSeconds = tasks.reduce((sum: number, task: typeof tasks[number]) => sum + task.elapsedTime, 0);
    const totalHours = totalSeconds / 3600;
    
    // 按分类聚合任务
    const categoryStats: Record<string, { hours: number; tasks: string[] }> = {};
    tasks.forEach((task: typeof tasks[number]) => {
      const category = task.categoryPath || '未分类';
      if (!categoryStats[category]) {
        categoryStats[category] = { hours: 0, tasks: [] };
      }
      categoryStats[category].hours += task.elapsedTime / 3600;
      if (task.name) {
        categoryStats[category].tasks.push(task.name);
      }
    });

    // 找出主要关注领域
    const topCategory = Object.entries(categoryStats)
      .sort(([, a], [, b]) => b.hours - a.hours)[0];
    
    const mainFocus = topCategory ? topCategory[0] : '综合发展';

    // 生成关键成果（选择时长较长的任务）
    const keyAchievements = tasks
      .slice(0, 10) // 取前10个任务
      .filter((task: typeof tasks[number]) => task.elapsedTime >= 1800 && task.name) // 至少30分钟且有名称
      .map((task: typeof tasks[number]) => ({
        taskId: task.id,
        taskName: task.name!,
        categoryPath: task.categoryPath || '未分类',
        duration: task.elapsedTime,
        reason: `投入了${Math.round(task.elapsedTime / 60)}分钟，是本周重要的学习/工作内容`,
      }));

    // 生成洞察
    const insights: string[] = [];
    
    if (totalHours > 0) {
      insights.push(`本周总投入时间${totalHours.toFixed(1)}小时，平均每天${(totalHours / 7).toFixed(1)}小时`);
    }
    
    if (topCategory) {
      const percentage = ((topCategory[1].hours / totalHours) * 100).toFixed(0);
      insights.push(`主要专注于${topCategory[0]}领域，占总时间的${percentage}%`);
    }
    
    if (keyAchievements.length > 0) {
      insights.push(`完成了${keyAchievements.length}项重要任务，展现了良好的执行力`);
    }
    
    const uniqueCategories = Object.keys(categoryStats).length;
    if (uniqueCategories > 1) {
      insights.push(`涉及${uniqueCategories}个不同领域，保持了学习的多样性`);
    }

    // 生成标题
    const weekTitle = `${mainFocus}专注周 (${startDate} ~ ${endDate})`;

    const draft: WeeklyReviewData = {
      aiTitle: weekTitle,
      aiFocus: `本周主要专注于${mainFocus}，投入${totalHours.toFixed(1)}小时进行深度学习和实践`,
      aiInsights: insights,
      aiKeyAchievements: keyAchievements,
    };

    return NextResponse.json(draft);
  } catch (error) {
    console.error('[Milestones Generate Draft API] Failed:', error);
    return NextResponse.json(
      { error: '生成草稿失败', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

