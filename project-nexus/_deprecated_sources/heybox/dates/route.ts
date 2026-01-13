import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // 查询所有可用日期（按timestamp分组）
    const posts = await prisma.heybox_posts.findMany({
      select: {
        timestamp: true
      },
      orderBy: {
        timestamp: 'desc'
      }
    });

    // 按日期分组统计
    const dateMap = new Map<string, number>();
    
    posts.forEach((post: typeof posts[number]) => {
      if (post.timestamp) {
        const date = new Date(post.timestamp).toISOString().split('T')[0];
        dateMap.set(date, (dateMap.get(date) || 0) + 1);
      }
    });

    // 转换为数组并排序
    const dates = Array.from(dateMap.entries())
      .map(([date, count]) => ({
        date,
        count,
        label: date
      }))
      .sort((a, b) => b.date.localeCompare(a.date)); // 降序排列

    return NextResponse.json({ dates });
  } catch (error) {
    console.error('Error fetching Heybox dates:', error);
    return NextResponse.json(
      { error: 'Failed to fetch dates' },
      { status: 500 }
    );
  }
}



