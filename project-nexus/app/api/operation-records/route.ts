import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json([]);
  }
  try {
    const userId = await getUserId(request);
    
    const records = await prisma.operationRecord.findMany({
      where: { userId },
      orderBy: { timestamp: 'desc' },
      take: 50, // 只获取最近50条记录
    });

    return NextResponse.json(records);
  } catch (error) {
    console.error('获取操作记录失败:', error);
    return NextResponse.json(
      { error: '获取操作记录失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    const { action, taskName, details } = body;

    if (!action || !taskName) {
      return NextResponse.json(
        { error: 'action和taskName是必需的' },
        { status: 400 }
      );
    }

    const record = await prisma.operationRecord.create({
      data: {
        action,
        taskName,
        details: details || null,
        userId,
        timestamp: new Date(),
      },
    });

    return NextResponse.json(record, { status: 201 });
  } catch (error) {
    console.error('创建操作记录失败:', error);
    return NextResponse.json(
      { error: '创建操作记录失败' },
      { status: 500 }
    );
  }
}
