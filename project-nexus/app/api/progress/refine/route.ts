import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ProgressAIService } from '@/lib/progress-ai-service';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/progress/refine
 * 根据用户反馈调整分析
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { progressId, userFeedback } = await request.json();

    if (!progressId || !userFeedback) {
      return NextResponse.json({ error: '缺少必要参数' }, { status: 400 });
    }

    // 获取现有进度
    const progress = await prisma.dailyProgress.findUnique({
      where: { id: progressId },
    });

    if (!progress || progress.userId !== session.user.id) {
      return NextResponse.json({ error: '进度不存在' }, { status: 404 });
    }

    // 构建对话历史
    const history = Array.isArray(progress.conversationHistory)
      ? progress.conversationHistory
      : [];

    // AI调整分析
    const refined = await ProgressAIService.refineAnalysisWithFeedback(
      progress.aiAnalysis as unknown as import('@/lib/progress-ai-service').DailyAnalysisResult,
      userFeedback,
      history as Array<{ role: string; content: string }>
    );

    // 更新进度
    const updated = await prisma.dailyProgress.update({
      where: { id: progressId },
      data: {
        aiAnalysis: JSON.parse(JSON.stringify(refined)),
        aiExtractedSkills: JSON.parse(JSON.stringify(refined.extractedSkills)),
        aiExtractedProjects: JSON.parse(JSON.stringify(refined.extractedProjects)),
        aiInsights: refined.insights,
        conversationHistory: JSON.parse(JSON.stringify([
          ...history,
          { role: 'user', content: userFeedback },
          { role: 'assistant', content: JSON.stringify(refined) },
        ])),
        iterations: progress.iterations + 1,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error('[Progress API] Refine failed:', error);
    return NextResponse.json(
      { error: '调整失败', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}


