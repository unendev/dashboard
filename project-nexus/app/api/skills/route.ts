import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getUserId } from '@/lib/auth-utils'

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserId(request)
    
    const skills = await prisma.skill.findMany({
      where: { userId },
      select: {
        id: true,
        name: true,
      },
      orderBy: { name: 'asc' }
    })

    return NextResponse.json(skills)
  } catch (error) {
    console.error('获取技能列表失败:', error)
    return NextResponse.json(
      { error: '获取技能列表失败' },
      { status: 500 }
    )
  }
}