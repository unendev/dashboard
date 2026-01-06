import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const conversations = await prisma.conversation.findMany({
    where: { userId: session.user.id },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
    take: 20, // 限制最近20条
  });

  return NextResponse.json(conversations);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id, title, messages } = await req.json();

  // 使用事务确保一致性
  const result = await prisma.$transaction(async (tx) => {
    // 1. 创建或更新对话
    const conversation = await tx.conversation.upsert({
      where: { id: id || 'new-id' },
      update: { title, updatedAt: new Date() },
      create: {
        id: id || undefined,
        title: title || '新对话',
        userId: session.user.id,
      },
    });

    // 2. 如果提供了消息，则同步消息
    // 注意：简单起见，这里采用全量覆盖或增量添加
    // 为了性能和逻辑简单，我们只在对话结束时调用此接口同步
    if (messages && Array.isArray(messages)) {
      // 先删除旧消息（如果存在）
      await tx.chatMessage.deleteMany({
        where: { conversationId: conversation.id },
      });

      // 批量创建新消息
      await tx.chatMessage.createMany({
        data: messages.map((msg: any) => ({
          conversationId: conversation.id,
          role: msg.role,
          content: typeof msg.content === 'string' ? msg.content : JSON.stringify(msg.content),
        })),
      });
    }

    return conversation;
  });

  return NextResponse.json(result);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new NextResponse('Missing id', { status: 400 });

  await prisma.conversation.delete({
    where: { id, userId: session.user.id },
  });

  return new NextResponse(null, { status: 204 });
}
