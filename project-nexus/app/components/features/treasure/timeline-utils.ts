/**
 * 时间线工具函数
 */

/**
 * 格式化时间线日期为人性化格式
 */
export function formatTimelineDate(date: string | Date): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  // 重置时间到当天0点，便于日期比较
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const compareDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  
  const diffInMs = today.getTime() - compareDate.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return '今天'
  if (diffInDays === 1) return '昨天'
  if (diffInDays < 7) return `${diffInDays}天前`
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7)
    return `${weeks}周前`
  }
  if (diffInDays < 365) {
    const months = Math.floor(diffInDays / 30)
    return `${months}个月前`
  }
  
  const years = Math.floor(diffInDays / 365)
  return `${years}年前`
}

/**
 * 获取日期分组标签
 */
export function getDateGroupLabel(date: string | Date): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date
  const now = new Date()
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const compareDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate())
  
  const diffInMs = today.getTime() - compareDate.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))
  
  if (diffInDays === 0) return 'today'
  if (diffInDays === 1) return 'yesterday'
  if (diffInDays < 7) return 'thisWeek'
  if (diffInDays < 30) return 'thisMonth'
  return 'earlier'
}

/**
 * 日期分组配置
 */
export const DATE_GROUPS = {
  today: { label: '今天', order: 0 },
  yesterday: { label: '昨天', order: 1 },
  thisWeek: { label: '本周', order: 2 },
  thisMonth: { label: '本月', order: 3 },
  earlier: { label: '更早', order: 4 },
} as const

export type DateGroupKey = keyof typeof DATE_GROUPS

/**
 * 按日期分组宝藏
 */
export interface TimelineItem {
  id: string
  title: string
  content?: string
  createdAt: string
  type: 'TEXT' | 'IMAGE'
  tags: string[]
}

export interface GroupedTimeline {
  [key: string]: TimelineItem[]
}

export function groupTreasuresByDate(treasures: TimelineItem[]): GroupedTimeline {
  const groups: GroupedTimeline = {
    today: [],
    yesterday: [],
    thisWeek: [],
    thisMonth: [],
    earlier: [],
  }
  
  treasures.forEach(treasure => {
    const groupKey = getDateGroupLabel(treasure.createdAt)
    groups[groupKey].push(treasure)
  })
  
  return groups
}

/**
 * 获取主要分类的颜色
 */
export function getCategoryColor(tags: string[]): string {
  const primaryCategory = tags.find(tag => 
    ['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
  )
  
  const colorMap: Record<string, string> = {
    Life: 'from-green-400 to-emerald-500',
    Knowledge: 'from-blue-400 to-cyan-500',
    Thought: 'from-purple-400 to-pink-500',
    Root: 'from-orange-400 to-red-500',
  }
  
  return primaryCategory ? colorMap[primaryCategory] : 'from-gray-400 to-gray-500'
}

/**
 * 获取类型图标
 */
export function getTypeIcon(type: 'TEXT' | 'IMAGE'): string {
  const iconMap = {
    TEXT: '📝',
    IMAGE: '🖼️',
  }
  return iconMap[type] ?? '??'
}
