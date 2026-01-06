import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';

// GET /api/timer-tasks/instance-tags - 获取所有使用过的实例标签
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user-1'; // 默认用户ID

    const instanceTags = await TimerDB.getInstanceTags(userId);
    
    return NextResponse.json({
      instanceTags,
      count: instanceTags.length
    });
  } catch (error) {
    console.error('Error fetching instance tags:', error);
    return NextResponse.json({ error: 'Failed to fetch instance tags' }, { status: 500 });
  }
}

