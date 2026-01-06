import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProgressAIService } from '@/lib/progress-ai-service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/progress/analyze
 * 分析指定日期的进度（通常是前一天）
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { targetDate } = await request.json();
    if (!targetDate) {
      return NextResponse.json({ error: '缺少目标日期' }, { status: 400 });
    }

    // 检查是否已存在分析
    const existing = await prisma.dailyProgress.findUnique({
      where: {
        userId_date: {
          userId: session.user.id,
          date: targetDate,
        },
      },
    });

    if (existing) {
      return NextResponse.json(existing);
    }

    // 生成AI分析
    const analysis = await ProgressAIService.generateDailyAnalysis(
      session.user.id,
      targetDate
    );

    // 创建进度记录
    const progress = await prisma.dailyProgress.create({
      data: {
        userId: session.user.id,
        date: targetDate,
        aiAnalysis: JSON.parse(JSON.stringify(analysis)),
        aiExtractedSkills: JSON.parse(JSON.stringify(analysis.extractedSkills)),
        aiExtractedProjects: JSON.parse(JSON.stringify(analysis.extractedProjects)),
        aiInsights: analysis.insights,
        conversationHistory: [],
        totalHours: analysis.totalHours,
        newSkillsCount: analysis.extractedSkills.filter((s) => s.isNew).length,
      },
    });

    return NextResponse.json(progress);
  } catch (error) {
    console.error('[Progress API] Analyze failed:', error);
    return NextResponse.json(
      { error: '分析失败', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}


