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

// 移除 Skill 和 Quest 相关 Action


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