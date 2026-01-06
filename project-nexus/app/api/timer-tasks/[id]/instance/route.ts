import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';

// PATCH /api/timer-tasks/[id]/instance - 更新任务的实例标签
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { instanceTag } = body;

    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }

    // 验证实例标签格式（可选，以@开头）
    if (instanceTag && !instanceTag.startsWith('@')) {
      return NextResponse.json({ 
        error: 'Instance tag should start with @ symbol' 
      }, { status: 400 });
    }

    const updatedTask = await TimerDB.updateInstanceTag(id, instanceTag || null);
    return NextResponse.json(updatedTask);
  } catch (error) {
    console.error('Error updating instance tag:', error);
    return NextResponse.json({ error: 'Failed to update instance tag' }, { status: 500 });
  }
}
