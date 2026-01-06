import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserId } from '@/lib/auth-utils';
import { createLogSchema } from '@/lib/validations/log';
import { ZodError } from 'zod';

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    
    const logs = await prisma.log.findMany({
      where: { userId },
      include: {
        quest: { select: { id: true, title: true } },
        categories: {
          include: {
            subCategories: {
              include: {
                activities: true,
              },
            },
          },
        },
      },
      orderBy: { timestamp: 'desc' },
    });

    // 确保返回的是数组格式
    return NextResponse.json(logs);
  } catch (error) {
    console.error('获取日志失败:', error);
    return NextResponse.json(
      { error: '获取日志失败' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserId(request);
    const body = await request.json();
    
    // 验证输入数据
    const validated = createLogSchema.parse(body);
    const { content, questId, categories } = validated;

    // 创建日志
    const log = await prisma.log.create({
      data: {
        content,
        questId: questId || null,
        userId,
        timestamp: new Date(),
        categories: {
          create: categories?.map((category: { name: string; subCategories?: Array<{ name: string; activities?: Array<{ name: string; duration: string }> }> }) => ({
            name: category.name,
            subCategories: {
              create: category.subCategories?.map((subCategory: { name: string; activities?: Array<{ name: string; duration: string }> }) => ({
                name: subCategory.name,
                activities: {
                  create: subCategory.activities?.map((activity: { name: string; duration: string }) => ({
                    name: activity.name,
                    duration: activity.duration
                  })) || []
                }
              })) || []
            }
          })) || []
        }
      },
      include: {
        quest: { select: { id: true, title: true } },
        categories: {
          include: {
            subCategories: {
              include: {
                activities: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: '数据验证失败', details: error.issues }, { status: 400 });
    }
    console.error('创建日志失败:', error);
    return NextResponse.json(
      { error: '创建日志失败' },
      { status: 500 }
    );
  }
}
