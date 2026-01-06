'use server'

import { prisma } from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getBeijingTime } from '@/lib/utils'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'

// 日志分类相关类型定义
interface LogActivity {
  name: string;
  duration: string;
}

interface LogSubCategory {
  name: string;
  activities: LogActivity[];
}

interface LogCategory {
  name: string;
  subCategories: LogSubCategory[];
}

// 获取当前登录用户ID的辅助函数
async function getCurrentUserId(): Promise<string> {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    throw new Error('未登录或会话已过期')
  }
  return session.user.id
}

export async function createSkill(formData: FormData) {
  const userId = await getCurrentUserId()
  const name = formData.get('name') as string
  const description = formData.get('description') as string

  if (!name || name.trim().length === 0) {
    throw new Error('技能名称不能为空')
  }

  try {
    await prisma.skill.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        userId,
      },
    })

    // 重新验证页面数据
    revalidatePath('/dashboard')
  } catch (error) {
    console.error('创建技能失败:', error)
    throw new Error('创建技能失败，请重试')
  }
}

export async function levelUpSkill(skillId: string) {
  try {
    const skill = await prisma.skill.findUnique({
      where: { id: skillId },
    })

    if (!skill) {
      throw new Error('技能不存在')
    }

    await prisma.skill.update({
      where: { id: skillId },
      data: {
        level: { increment: 1 },
        experience: 0, // 升级后重置经验值
      },
    })

    revalidatePath('/dashboard')
  } catch (error) {
    console.error('升级技能失败:', error)
    throw new Error('升级技能失败，请重试')
  }
}

export async function createQuest(formData: FormData) {
  const userId = await getCurrentUserId()
  const title = formData.get('title') as string
  const description = formData.get('description') as string
  const skillId = formData.get('skillId') as string
  const priority = formData.get('priority') as string

  if (!title || title.trim().length === 0) {
    throw new Error('任务标题不能为空')
  }

  try {
    await prisma.quest.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        skillId: skillId || null,
        priority: priority as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT' || 'MEDIUM',
        userId,
      },
    })

    revalidatePath('/quests')
  } catch (error) {
    console.error('创建任务失败:', error)
    throw new Error('创建任务失败，请重试')
  }
}

export async function updateQuestStatus(questId: string, status: string) {
  try {
    await prisma.quest.update({
      where: { id: questId },
      data: {
        status: status as 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED',
        updatedAt: getBeijingTime(),
      },
    })

    revalidatePath('/quests')
  } catch (error) {
    console.error('更新任务状态失败:', error)
    throw new Error('更新任务状态失败，请重试')
  }
}

export async function createLog(formData: FormData) {
  const userId = await getCurrentUserId()
  const content = formData.get('content') as string | null;
  const questId = formData.get('questId') as string;
  const categoriesString = formData.get('categories') as string;
  const timestampString = formData.get('timestamp') as string;

  let categoriesData: LogCategory[] = [];
  if (categoriesString) {
    try {
      categoriesData = JSON.parse(categoriesString);
    } catch (error) {
      console.error('解析 categories 失败:', error);
      throw new Error('日志分类数据格式不正确');
    }
  }

  let timestamp: Date | undefined;
  if (timestampString) {
    timestamp = new Date(timestampString);
  } else {
    // 使用北京时间 (UTC+8)
          timestamp = getBeijingTime();
  }

  try {
    await prisma.log.create({
      data: {
        content: content?.trim() || null,
        questId: questId || null,
        userId,
        timestamp: timestamp,
        categories: {
          create: categoriesData.map(category => ({
            name: category.name,
            subCategories: {
              create: category.subCategories.map((subCategory: LogSubCategory) => ({
                name: subCategory.name,
                activities: {
                  create: subCategory.activities.map((activity: LogActivity) => ({
                    name: activity.name,
                    duration: activity.duration,
                  })),
                },
              })),
            },
          })),
        },
      },
    });

    revalidatePath('/log');
  } catch (error) {
    console.error('创建日志失败:', error);
    throw new Error('创建日志失败，请重试');
  }
}