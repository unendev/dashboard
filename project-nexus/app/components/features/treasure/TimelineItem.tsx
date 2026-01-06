'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { formatTimelineDate, getCategoryColor, getTypeIcon } from './timeline-utils'

interface TimelineItemProps {
  id: string
  title: string
  content?: string
  createdAt: string
  type: 'TEXT' | 'IMAGE'
  tags: string[]
  isActive?: boolean
  isLast?: boolean
  onClick: (id: string) => void
  onHover?: (id: string | null, element?: HTMLDivElement | null, data?: { title: string; content?: string; type: 'TEXT' | 'IMAGE'; tags: string[] }) => void
}

export const TimelineItem = memo(function TimelineItem({
  id,
  title,
  content,
  createdAt,
  type,
  tags,
  isActive = false,
  isLast = false,
  onClick,
  onHover,
}: TimelineItemProps) {
  const categoryColor = getCategoryColor(tags)
  const typeIcon = getTypeIcon(type)
  const dateLabel = formatTimelineDate(createdAt)

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    const element = e.currentTarget
    onHover?.(id, element, { title, content, type, tags })
  }

  return (
    <div
      className="relative flex gap-3 group cursor-pointer"
      onClick={() => onClick(id)}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => onHover?.(null)}
    >
      {/* 时间线连接线 - 更精致 */}
      {!isLast && (
        <div 
          className="absolute left-[10px] top-7 w-[2px] h-full bg-gradient-to-b from-blue-400/20 via-purple-400/15 to-transparent"
          aria-hidden="true"
        />
      )}
      
      {/* 节点 - 更精致 */}
      <div className="relative z-10 flex-shrink-0 pt-2">
        <div
          className={cn(
            "w-5 h-5 rounded-full flex items-center justify-center transition-all duration-300",
            "border backdrop-blur-sm shadow-sm",
            isActive
              ? `bg-gradient-to-br ${categoryColor} border-white/60 scale-125 shadow-lg ring-2 ring-white/20`
              : "bg-black/80 border-white/10 group-hover:border-white/30 group-hover:scale-110 group-hover:bg-black/60"
          )}
        >
          {isActive && (
            <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          )}
        </div>
      </div>

      {/* 内容区域 - 更精致 */}
      <div className="flex-1 min-w-0 pb-5">
        {/* 标题和类型图标 */}
        <div className="flex items-start gap-1.5">
          <span className="text-sm flex-shrink-0 opacity-60">{typeIcon}</span>
          <h3
            className={cn(
              "text-xs font-medium transition-all duration-200 line-clamp-2 leading-relaxed",
              isActive
                ? "text-white font-semibold"
                : "text-white/60 group-hover:text-white/85"
            )}
          >
            {title}
          </h3>
        </div>

        {/* 日期 */}
        <div
          className={cn(
            "text-[10px] mt-1 ml-5 transition-colors duration-200 font-medium",
            isActive
              ? "text-blue-300/80"
              : "text-white/30 group-hover:text-white/50"
          )}
        >
          {dateLabel}
        </div>
      </div>
    </div>
  )
})
