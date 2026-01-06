import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// POST /api/timer-tasks/clear-instance-tag - 清除所有任务中指定的事务项引用
export async function POST(request: NextRequest) {
  try {
    const { tagName, userId } = await request.json();

    if (!tagName || !userId) {
      return NextResponse.json(
        { error: '缺少必要参数' },
        { status: 400 }
      );
    }

    // 处理旧格式：清除所有任务中的 instanceTag 字段
    const oldFormatUpdate = await prisma.timerTask.updateMany({
      where: {
        userId: userId,
        instanceTag: tagName
      },
      data: {
        instanceTag: null
      }
    });

    // 处理新格式：删除关联关系
    const newFormatDelete = await prisma.timerTaskInstanceTag.deleteMany({
      where: {
        instanceTag: {
          name: tagName,
          userId: userId
        }
      }
    });

    const totalUpdated = oldFormatUpdate.count + newFormatDelete.count;

    return NextResponse.json({
      success: true,
      message: `已清除 ${totalUpdated} 个任务中的事务项引用`,
      details: {
        oldFormatCleared: oldFormatUpdate.count,
        newFormatCleared: newFormatDelete.count
      }
    });
  } catch (error) {
    console.error('清除事务项引用失败:', error);
    return NextResponse.json(
      { error: '清除事务项引用失败' },
      { status: 500 }
    );
  }
}

