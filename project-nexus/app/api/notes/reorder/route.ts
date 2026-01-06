import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

interface ReorderRequest {
  notes: Array<{
    id: string
    order: number
  }>
}

/**
 * PATCH /api/notes/reorder - 批量更新笔记的排序
 */
export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    const { notes } = (await request.json()) as ReorderRequest

    if (!Array.isArray(notes)) {
      return NextResponse.json({ error: '无效的请求体' }, { status: 400 })
    }

    const updates = notes.map((note: { id: string; order: number }) => 
      prisma.note.update({
        where: {
          id: note.id,
          // 确保用户只能更新自己的笔记
          userId: session.user!.id, 
        },
        data: {
          order: note.order,
        },
      })
    )

    // 在一个事务中执行所有更新
    await prisma.$transaction(updates)

    return NextResponse.json({ success: true, message: '排序已更新' })
  } catch (error) {
    console.error('❌ [PATCH /api/notes/reorder] 更新排序失败:', error)
    return NextResponse.json({ error: '更新排序失败' }, { status: 500 })
  }
}
