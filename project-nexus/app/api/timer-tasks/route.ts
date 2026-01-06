import { NextRequest, NextResponse } from 'next/server';
import { TimerDB } from '@/lib/timer-db';
import { createTimerTaskSchema } from '@/lib/validations/timer-task';
import { ZodError } from 'zod';
import { getToken } from 'next-auth/jwt';
import { prisma } from '@/lib/prisma';

async function ensureCategoryPath(categoryPath: string) {
  if (!categoryPath || categoryPath === '未分类') return;
  const parts = categoryPath.split('/').map(p => p.trim()).filter(p => p);
  let parentId: string | null = null;
  for (const part of parts) {
    const existing = await prisma.logCategory.findFirst({ where: { name: part, parentId } });
    if (existing) {
      parentId = existing.id;
    } else {
      try {
        const newCat = await prisma.logCategory.create({ data: { name: part, parentId } });
        parentId = newCat.id;
      } catch (e) {
        const retry = await prisma.logCategory.findFirst({ where: { name: part, parentId } });
        if (retry) parentId = retry.id;
      }
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || searchParams.get('userId') || 'user-1';
    const date = searchParams.get('date');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    let tasks;
    if (date) tasks = await TimerDB.getTasksByDate(userId, date);
    else if (startDate && endDate) tasks = await TimerDB.getTasksByDateRange(userId, startDate, endDate);
    else tasks = await TimerDB.getAllTasks(userId);
    return NextResponse.json(tasks);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    if (body.action === 'updateOrder') {
      await TimerDB.updateTaskOrder(body.taskOrders);
      return NextResponse.json({ success: true });
    }
    console.log('📥 [API/TIMER] POST Received body:', JSON.stringify(body, null, 2));

    // Validate body
    const validated = createTimerTaskSchema.parse(body);
    console.log('✅ [API/TIMER] Validation passed. instanceTagNames:', body.instanceTagNames);

    const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET });
    const userId = token?.sub || body.userId || 'user-1';

    if (body.isRunning) await TimerDB.pauseAllRunningTasks(userId);

    const newTask = await TimerDB.addTask({
      ...validated,
      userId,
      instanceTagNames: body.instanceTagNames || [],
      order: body.order || 0,
      version: 1
    });

    console.log('✅ [API/TIMER] Task created in DB:', {
      id: newTask.id,
      name: newTask.name,
      instanceTag: newTask.instanceTag,
      // Ensure to check relation if loaded
      instanceTagsCount: newTask.instanceTags?.length
    });

    if (newTask.categoryPath) {
      ensureCategoryPath(newTask.categoryPath).catch(console.error);
    }

    return NextResponse.json(newTask, { status: 201 });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: 'Validation failed', details: error.issues }, { status: 400 });
    return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, version, deviceId, ...updates } = body; // Remove deviceId from updates
    if (updates.isRunning === true) {
      const task = await TimerDB.getTaskById(id);
      if (task) await TimerDB.pauseAllRunningTasks(task.userId);
    }
    const updatedTask = await TimerDB.updateTask(id, updates);
    return NextResponse.json(updatedTask);
  } catch (error: any) {
    console.error('❌ [API/TIMER] PUT Error:', error);
    return NextResponse.json({ error: 'Update failed', details: error.message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });
  await TimerDB.deleteTask(id);
  return NextResponse.json({ success: true });
}
