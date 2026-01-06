import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth'; // 假设认证选项在此处定义
import { mergeDuplicateTimerTasks } from '@/lib/task-merger';

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const result = await mergeDuplicateTimerTasks(userId);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error merging duplicate tasks:', error);
    return NextResponse.json(
      { message: 'Failed to merge duplicate tasks', error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
