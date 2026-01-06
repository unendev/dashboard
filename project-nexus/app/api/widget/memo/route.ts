import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const WIDGET_MEMO_TITLE = 'Widget Memo';

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  let memo = await prisma.note.findFirst({
    where: { userId: session.user.id, title: WIDGET_MEMO_TITLE },
    orderBy: { createdAt: 'asc' },
  });

  if (!memo) {
    memo = await prisma.note.create({
      data: {
        userId: session.user.id,
        title: WIDGET_MEMO_TITLE,
        content: '',
      },
    });
  }

  return NextResponse.json(memo);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { content } = await req.json();
  
  // First, try to find an existing memo.
  const existingMemo = await prisma.note.findFirst({
    where: { userId: session.user.id, title: WIDGET_MEMO_TITLE },
    orderBy: { createdAt: 'asc' } // Get the oldest one if duplicates exist
  });

  if (existingMemo) {
    // If found, update it
    const updatedMemo = await prisma.note.update({
      where: { id: existingMemo.id },
      data: { content },
    });
    return NextResponse.json(updatedMemo);
  } else {
    // If not found, create a new one
    const newMemo = await prisma.note.create({
      data: {
        userId: session.user.id,
        title: WIDGET_MEMO_TITLE,
        content,
      },
    });
    return NextResponse.json(newMemo);
  }
}
