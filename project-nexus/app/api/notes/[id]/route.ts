import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

/**
 * GET /api/notes/[id] - 获取单篇笔记的完整内容
 */
export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const params = await context.params
    const note = await prisma.note.findFirst({
      where: {
        id: params.id,
        userId: session.user.id, // 确保用户只能访问自己的笔记
      },
    })

    if (!note) {
      return NextResponse.json({ error: '笔记不存在' }, { status: 404 })
    }

    return NextResponse.json(note)
  } catch (error) {
    const params = await context.params
    console.error(`❌ [GET /api/notes/${params.id}] 获取笔记失败:`, error)
    return NextResponse.json({ error: '获取笔记失败' }, { status: 500 })
  }
}

/**
 * PUT /api/notes/[id] - 更新单篇笔记
 */
export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const params = await context.params
    const { title, content } = await request.json()

    // 首先验证笔记是否存在且属于该用户
    const existingNote = await prisma.note.findFirst({
        where: { id: params.id, userId: session.user.id }
    })

    if (!existingNote) {
        return NextResponse.json({ error: '笔记不存在或无权访问' }, { status: 404 })
    }

    const updatedNote = await prisma.note.update({
      where: { id: params.id },
      data: {
        title,
        content,
      },
    })

    return NextResponse.json(updatedNote)
  } catch (error) {
    const params = await context.params
    console.error(`❌ [PUT /api/notes/${params.id}] 更新笔记失败:`, error)
    return NextResponse.json({ error: '更新笔记失败' }, { status: 500 })
  }
}

/**
 * DELETE /api/notes/[id] - 删除单篇笔记
 */
export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const params = await context.params
    // 首先验证笔记是否存在且属于该用户
    const existingNote = await prisma.note.findFirst({
        where: { id: params.id, userId: session.user.id }
    })

    if (!existingNote) {
        return NextResponse.json({ error: '笔记不存在或无权访问' }, { status: 404 })
    }

    await prisma.note.delete({
      where: { id: params.id },
    })

    return NextResponse.json({ message: '笔记已删除' })
  } catch (error) {
    const params = await context.params
    console.error(`❌ [DELETE /api/notes/${params.id}] 删除笔记失败:`, error)
    return NextResponse.json({ error: '删除笔记失败' }, { status: 500 })
  }
}