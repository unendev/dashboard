import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({ message: 'Export mode' });
  }
  try {
    const { id } = await params;

    // 检查事务项是否存在
    const existingTag = await prisma.instanceTag.findUnique({
      where: { id }
    });

    if (!existingTag) {
      return NextResponse.json(
        { error: '事务项不存在' },
        { status: 404 }
      );
    }

    // 删除事务项（关联的TimerTaskInstanceTag会自动删除，因为设置了onDelete: Cascade）
    await prisma.instanceTag.delete({
      where: { id }
    });

    return NextResponse.json({ message: '事务项删除成功' });
  } catch (error) {
    console.error('删除事务项失败:', error);
    return NextResponse.json(
      { error: '删除事务项失败' },
      { status: 500 }
    );
  }
}
