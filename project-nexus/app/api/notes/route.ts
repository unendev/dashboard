import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notes - 获取当前用户的所有笔记列表（仅标题和ID）
 */
export async function GET() {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json([]);
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const notes = await prisma.note.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        title: true,
        updatedAt: true,
      },
      orderBy: {
        order: 'asc',
      },
    })

    return NextResponse.json(notes)
  } catch (error) {
    console.error('❌ [GET /api/notes] 获取笔记列表失败:', error)
    return NextResponse.json({ error: '获取笔记列表失败' }, { status: 500 })
  }
}

/**
 * POST /api/notes - 为当前用户创建一篇新笔记
 */
export async function POST(request: Request) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { title, content } = await request.json()

    const newNote = await prisma.note.create({
      data: {
        userId: session.user.id,
        title: title || `New Note ${new Date().toLocaleString()}`.substring(0, 50),
        content: content || '',
      },
    })

    return NextResponse.json(newNote)
  } catch (error) {
    console.error('❌ [POST /api/notes] 创建笔记失败:', error)
    return NextResponse.json({ error: '创建笔记失败' }, { status: 500 })
  }
}