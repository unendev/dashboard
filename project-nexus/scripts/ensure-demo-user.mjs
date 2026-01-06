import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_USER = {
  email: 'demo@example.com',
  password: 'demo123456',
  name: '示例用户'
}

async function ensureDemoUser() {
  try {
    // 检查示例用户是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { email: DEMO_USER.email }
    })

    if (existingUser) {
      console.log('✅ 示例账号已存在:', DEMO_USER.email)
      return
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

    console.log('✅ 示例账号创建成功!')
    console.log('   邮箱:', user.email)
    console.log('   密码:', DEMO_USER.password)
    console.log('   姓名:', user.name)
  } catch (error) {
    console.error('❌ 创建示例账号失败:', error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

ensureDemoUser()

