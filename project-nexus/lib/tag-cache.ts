/**
 * 标签缓存工具 - 优化标签聚合检索性能
 * 
 * 缓存用户的标签列表，避免每次筛选都查询所有宝藏
 */

import { prisma } from './prisma'

// 缓存结构：userId -> Set<tag>
const tagCache = new Map<string, Set<string>>()

// 缓存时间戳：userId -> timestamp
const cacheTimestamps = new Map<string, number>()

// 缓存有效期：5分钟
const CACHE_TTL = 5 * 60 * 1000

/**
 * 获取用户的所有标签（带缓存）
 */
export async function getUserTags(userId: string): Promise<Set<string>> {
  const now = Date.now()
  const cachedTimestamp = cacheTimestamps.get(userId)
  
  // 检查缓存是否有效
  if (cachedTimestamp && now - cachedTimestamp < CACHE_TTL) {
    const cached = tagCache.get(userId)
    if (cached) {
      console.log(`[TagCache] 命中缓存: userId=${userId}, tags=${cached.size}`)
      return cached
    }
  }
  
  // 缓存失效或不存在，重新查询
  console.log(`[TagCache] 缓存失效，重新查询: userId=${userId}`)
  const treasures = await prisma.treasure.findMany({
    where: { userId },
    select: { tags: true }
  })
  
  // 收集所有唯一标签
  const tags = new Set<string>()
  treasures.forEach(t => t.tags.forEach(tag => tags.add(tag)))
  
  // 更新缓存
  tagCache.set(userId, tags)
  cacheTimestamps.set(userId, now)
  
  return tags
}

/**
 * 查找匹配的标签（支持父类聚合）
 * 
 * @param tag - 搜索的标签
 * @param userId - 用户ID
 * @returns 匹配的标签数组
 * 
 * @example
 * // 精确匹配
 * findMatchingTags('游戏开发', userId) // ['游戏开发']
 * 
 * // 父类聚合
 * findMatchingTags('游戏开发', userId) // ['游戏开发', '游戏开发/Unity', '游戏开发/虚幻引擎']
 */
export async function findMatchingTags(
  tag: string, 
  userId: string
): Promise<string[]> {
  const allTags = await getUserTags(userId)
  
  // 找出匹配的标签：精确匹配或以"父标签/"开头
  const matchingTags = Array.from(allTags).filter(t => 
    t === tag || t.startsWith(tag + '/')
  )
  
  console.log(`[TagCache] 匹配标签: ${tag} -> ${matchingTags.length} 个`)
  
  return matchingTags
}

/**
 * 使缓存失效（创建、更新、删除宝藏时调用）
 */
export function invalidateUserTagCache(userId: string): void {
  tagCache.delete(userId)
  cacheTimestamps.delete(userId)
  console.log(`[TagCache] 清除缓存: userId=${userId}`)
}

/**
 * 清空所有缓存（仅用于调试）
 */
export function clearAllTagCache(): void {
  tagCache.clear()
  cacheTimestamps.clear()
  console.log('[TagCache] 清空所有缓存')
}

