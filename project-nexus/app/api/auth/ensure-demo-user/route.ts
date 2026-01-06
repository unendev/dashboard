import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

// 示例账号配置
const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demo123456',
  name: '示例用户'
}

export async function POST() {
  try {
    // 检查示例用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: DEMO_USER.email }
    })

    if (existingUser) {
      return NextResponse.json({
        success: true,
        message: '示例账号已存在',
        user: {
          email: DEMO_USER.email,
          name: DEMO_USER.name
        }
      })
    }

    // 创建示例用户
    const hashedPassword = await bcrypt.hash(DEMO_USER.password, 12)
    
    const user = await prisma.user.create({
      data: {
        email: DEMO_USER.email,
        password: hashedPassword,
        name: DEMO_USER.name,
        emailVerified: new Date(),
      }
    })

    return NextResponse.json({
      success: true,
      message: '示例账号创建成功',
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
      }
    })
  } catch (error) {
    console.error('确保示例账号存在时出错:', error)
    return NextResponse.json(
      { error: '创建示例账号失败' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    // 获取示例用户信息
    const user = await prisma.user.findUnique({
      where: { email: DEMO_USER.email }
    })

    if (!user) {
      return NextResponse.json(
        { error: '示例用户不存在，请先创建' },
        { status: 404 }
      )
    }

    return NextResponse.json({
      id: user.id,
      email: DEMO_USER.email,
      name: DEMO_USER.name,
      password: DEMO_USER.password,
    })
  } catch (error) {
    console.error('获取示例用户信息失败:', error)
    return NextResponse.json(
      { error: '获取示例用户信息失败' },
      { status: 500 }
    )
  }
}

