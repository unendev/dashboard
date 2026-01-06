import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';

// GET /api/timer-tasks/running - 获取当前运行中的任务
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || 'user-1'; // 默认用户ID

    const runningTask = await TimerDB.getRunningTask(userId);
    
    if (runningTask) {
      return NextResponse.json(runningTask);
    } else {
      return NextResponse.json(null);
    }
  } catch (error) {
    console.error('Error fetching running task:', error);
    return NextResponse.json({ error: 'Failed to fetch running task' }, { status: 500 });
  }
}


