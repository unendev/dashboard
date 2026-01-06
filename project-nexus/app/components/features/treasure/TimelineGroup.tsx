'use client'

import { useState, memo } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimelineItem } from './TimelineItem'
import type { TimelineItem as TimelineItemType } from './timeline-utils'

interface TimelineGroupProps {
  label: string
  items: TimelineItemType[]
  activeId?: string
  defaultExpanded?: boolean
  onItemClick: (id: string) => void
  onItemHover?: (id: string | null) => void
}

export const TimelineGroup = memo(function TimelineGroup({
  label,
  items,
  activeId,
  defaultExpanded = true,
  onItemClick,
  onItemHover,
}: TimelineGroupProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)

  if (items.length === 0) {
    return null
  }

  return (
    <div className="mb-6">
      {/* 分组标题 - 更精致 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={cn(
          "flex items-center gap-2 w-full px-2 py-1.5 mb-2",
          "text-xs font-semibold text-white/50 hover:text-white/75",
          "transition-all duration-200 rounded-md hover:bg-white/5",
          "group/header"
        )}
      >
        {isExpanded ? (
          <ChevronDown className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover/header:translate-y-0.5" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 flex-shrink-0 transition-transform group-hover/header:translate-x-0.5" />
        )}
        <span className="uppercase tracking-wider">{label}</span>
        <span className="text-[10px] text-white/30 bg-white/5 px-1.5 py-0.5 rounded-full">
          {items.length}
        </span>
      </button>

      {/* 时间线项目列表 */}
      {isExpanded && (
        <div className="space-y-1">
          {items.map((item, index) => (
            <TimelineItem
              key={item.id}
              id={item.id}
              title={item.title}
              content={item.content}
              createdAt={item.createdAt}
              type={item.type}
              tags={item.tags}
              isActive={item.id === activeId}
              isLast={index === items.length - 1}
              onClick={onItemClick}
              onHover={onItemHover}
            />
          ))}
        </div>
      )}
    </div>
  )
})

