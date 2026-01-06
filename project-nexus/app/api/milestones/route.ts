import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import type { CreateMilestoneInput } from '@/types/milestone';

// 获取里程碑列表

/**
 * GET /api/milestones
 * 获取用户的里程碑列表（按时间倒序）
 */
export async function GET(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({ milestones: [], total: 0 });
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    // 查询里程碑数据
    const milestones = await prisma.milestone.findMany({
      where: {
        userId: session.user.id,
      },
      orderBy: {
        startDate: 'desc', // 按开始日期倒序排列
      },
      take: limit,
      skip: offset,
    });

    // 获取总数量
    const total = await prisma.milestone.count({
      where: {
        userId: session.user.id,
      },
    });

    return NextResponse.json({
      milestones,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Milestones API] GET failed:', error);
    return NextResponse.json(
      { error: '获取里程碑失败', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/milestones
 * 创建新的里程碑记录
 */
export async function POST(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 });
    }

    const body: CreateMilestoneInput = await request.json();
    const {
      startDate,
      endDate,
      aiTitle,
      aiFocus,
      aiInsights,
      aiKeyAchievements,
      confirmedAchievements,
      userNotes,
    } = body;

    // 输入验证
    if (!startDate || !endDate || !aiTitle || !aiFocus) {
      return NextResponse.json(
        { error: '缺少必需字段：startDate, endDate, aiTitle, aiFocus' },
        { status: 400 }
      );
    }

    // 检查是否已存在同期间的里程碑
    const existing = await prisma.milestone.findUnique({
      where: {
        userId_startDate_endDate: {
          userId: session.user.id,
          startDate: new Date(startDate),
          endDate: new Date(endDate),
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: '该时间段的里程碑已存在' },
        { status: 409 }
      );
    }

    // 创建里程碑记录
    const milestone = await prisma.milestone.create({
      data: {
        userId: session.user.id,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        aiTitle,
        aiFocus,
        aiInsights: aiInsights || [],
        aiKeyAchievements: aiKeyAchievements || {},
        confirmedAchievements: confirmedAchievements || {},
        userNotes: userNotes || null,
      },
    });

    return NextResponse.json(milestone, { status: 201 });
  } catch (error) {
    console.error('[Milestones API] POST failed:', error);
    return NextResponse.json(
      { error: '创建里程碑失败', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}
