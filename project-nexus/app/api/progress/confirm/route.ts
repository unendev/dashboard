import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/progress/confirm
 * 确认并存档每日进度
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { progressId, userNotes } = await request.json();

    if (!progressId) {
      return NextResponse.json({ error: '缺少进度ID' }, { status: 400 });
    }

    const progress = await prisma.dailyProgress.findUnique({
      where: { id: progressId },
    });

    if (!progress || progress.userId !== session.user.id) {
      return NextResponse.json({ error: '进度不存在' }, { status: 404 });
    }

    // 确认进度
    const confirmed = await prisma.dailyProgress.update({
      where: { id: progressId },
      data: {
        isConfirmed: true,
        userNotes: userNotes || null,
        finalAnalysis: JSON.parse(JSON.stringify(progress.aiAnalysis)),
        updatedAt: new Date(),
      },
    });

    // TODO: 更新技能档案和项目档案（后续实现）

    return NextResponse.json(confirmed);
  } catch (error) {
    console.error('[Progress API] Confirm failed:', error);
    return NextResponse.json(
      { error: '确认失败', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}


