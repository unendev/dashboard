import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const todos = await prisma.widgetTodo.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(todos);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { text, group } = await req.json();
  const todo = await prisma.widgetTodo.create({
    data: {
      text,
      group: group || 'default',
      userId: session.user.id,
    },
  });

  return NextResponse.json(todo);
}

export async function PUT(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { id, completed, text, group } = await req.json();
  const todo = await prisma.widgetTodo.update({
    where: { id, userId: session.user.id },
    data: { completed, text, group },
  });

  return NextResponse.json(todo);
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return new NextResponse('Missing id', { status: 400 });

  await prisma.widgetTodo.delete({
    where: { id, userId: session.user.id },
  });

  return new NextResponse(null, { status: 204 });
}
