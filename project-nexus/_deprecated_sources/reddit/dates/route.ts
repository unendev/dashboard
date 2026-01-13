import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 获取最近30天有数据的日期列表
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    
    const dates = await prisma.reddit_posts.findMany({
      where: {
        timestamp: {
          gte: thirtyDaysAgo
        }
      },
      select: {
        timestamp: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // 按日期分组并格式化
    const dateMap = new Map<string, number>();
    
    dates.forEach((post: typeof dates[number]) => {
      if (post.timestamp) {
        const dateStr = post.timestamp.toISOString().split('T')[0];
        dateMap.set(dateStr, (dateMap.get(dateStr) || 0) + 1);
      }
    });

    const availableDates = Array.from(dateMap.entries()).map(([date, count]) => ({
      date,
      count,
      label: formatDateLabel(date)
    }));

    return NextResponse.json({
      dates: availableDates,
      total: availableDates.length
    });
  } catch (error) {
    console.error('Error fetching available dates:', error);
    return NextResponse.json(
      { error: 'Failed to load available dates' },
      { status: 500 }
    );
  }
}

// 格式化日期标签 - 统一使用日期格式
function formatDateLabel(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('zh-CN', {
    month: 'short',
    day: 'numeric',
    weekday: 'short'
  });
}
