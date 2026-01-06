import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { bookId, chapter, text, note, highlight, position, type, aiContent } = await request.json();

    if (!bookId || !chapter || !text || !position) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const newNote = await prisma.bookNote.create({
      data: {
        bookId,
        userId: session.user.id,
        chapter,
        text, // Renamed from originalText for consistency
        note,
        highlight,
        position,
        type: type || 'NOTE', // Default to NOTE
        aiContent,
      },
    });

    return NextResponse.json(newNote);
  } catch (error) {
    console.error('Create note error:', error);
    return NextResponse.json({ error: 'Failed to create note' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');

    if (!bookId) {
      return NextResponse.json({ error: 'Book ID is required' }, { status: 400 });
    }

    const notes = await prisma.bookNote.findMany({
      where: {
        bookId,
        userId: session.user.id,
      },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error('Fetch notes error:', error);
    return NextResponse.json({ error: 'Failed to fetch notes' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, chapter, text, note, highlight, position, type, aiContent } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const existingNote = await prisma.bookNote.findUnique({ where: { id } });
    if (!existingNote || existingNote.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 });
    }

    const updatedNote = await prisma.bookNote.update({
      where: { id },
      data: {
        chapter,
        text,
        note,
        highlight,
        position,
        type,
        aiContent,
      },
    });

    return NextResponse.json(updatedNote);
  } catch (error) {
    console.error('Update note error:', error);
    return NextResponse.json({ error: 'Failed to update note' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Note ID is required' }, { status: 400 });
    }

    const existingNote = await prisma.bookNote.findUnique({ where: { id } });
    if (!existingNote || existingNote.userId !== session.user.id) {
      return NextResponse.json({ error: 'Forbidden or Not Found' }, { status: 403 });
    }

    await prisma.bookNote.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete note error:', error);
    return NextResponse.json({ error: 'Failed to delete note' }, { status: 500 });
  }
}
