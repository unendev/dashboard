import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json([]);
  }
  try {
    const userId = await getUserId(request);

    const instanceTags = await prisma.instanceTag.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(instanceTags);
  } catch (error) {
    console.error('获取事务项失败:', error);
    return NextResponse.json(
      { error: '获取事务项失败' },
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
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { error: '事务项名称不能为空' },
        { status: 400 }
      );
    }

    // 确保名称以#开头
    const tagName = name.trim().startsWith('#') ? name.trim() : `#${name.trim()}`;

    // 检查是否已存在
    const existingTag = await prisma.instanceTag.findFirst({
      where: {
        name: tagName,
        userId
      }
    });

    if (existingTag) {
      return NextResponse.json(
        { error: '该事务项已存在' },
        { status: 409 }
      );
    }

    const instanceTag = await prisma.instanceTag.create({
      data: {
        name: tagName,
        userId
      }
    });

    return NextResponse.json(instanceTag, { status: 201 });
  } catch (error) {
    console.error('创建事务项失败:', error);
    return NextResponse.json(
      { error: '创建事务项失败' },
      { status: 500 }
    );
  }
}
