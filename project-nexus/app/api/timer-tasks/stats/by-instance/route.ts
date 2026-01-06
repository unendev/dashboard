import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';

// GET /api/timer-tasks/stats/by-instance - 获取实例标签统计
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user-1'; // 默认用户ID
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    const stats = await TimerDB.getInstanceStats(userId, startDate || undefined, endDate || undefined);
    
    return NextResponse.json({
      stats,
      period: startDate && endDate ? `${startDate} 到 ${endDate}` : '全部时间',
      totalInstances: stats.length
    });
  } catch (error) {
    console.error('Error fetching instance stats:', error);
    return NextResponse.json({ error: 'Failed to fetch instance stats' }, { status: 500 });
  }
}

