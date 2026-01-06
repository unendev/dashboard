'use client'

import { memo } from 'react'
import { cn } from '@/lib/utils'
import { getTypeIcon } from './timeline-utils'

interface TimelinePreviewProps {
  title: string
  content?: string
  type: 'TEXT' | 'IMAGE'
  tags: string[]
  position: { x: number; y: number }
}

export const TimelinePreview = memo(function TimelinePreview({
  title,
  content,
  type,
  tags,
  position,
}: TimelinePreviewProps) {
  const typeIcon = getTypeIcon(type)
  
  // 提取摘要（前100字）
  const summary = content 
    ? content.length > 100 
      ? content.substring(0, 100) + '...' 
      : content
    : '无内容'

  // 过滤主题标签（排除主要分类）
  const topicTags = tags.filter(tag => 
    !['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
  )

  return (
    <div
      className={cn(
        "absolute z-50 w-72 max-w-sm",
        "bg-gradient-to-br from-black/95 to-black/90 backdrop-blur-2xl",
        "border border-white/10 rounded-xl shadow-2xl",
        "p-3.5 animate-in fade-in-0 zoom-in-95 duration-200",
        "ring-1 ring-white/5"
      )}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
      }}
    >
      {/* 标题和类型 */}
      <div className="flex items-start gap-2 mb-2.5">
        <span className="text-base flex-shrink-0 opacity-70">{typeIcon}</span>
        <h4 className="text-xs font-semibold text-white/90 line-clamp-2 flex-1 leading-relaxed">
          {title}
        </h4>
      </div>

      {/* 摘要 */}
      <p className="text-[11px] text-white/60 leading-relaxed mb-2.5 line-clamp-3">
        {summary}
      </p>

      {/* 标签 */}
      {topicTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-white/5">
          {topicTags.slice(0, 3).map((tag) => (
            <span
              key={tag}
              className="px-2 py-0.5 text-[10px] rounded-full bg-white/5 text-white/70 border border-white/5"
            >
              {tag}
            </span>
          ))}
          {topicTags.length > 3 && (
            <span className="text-[10px] text-white/40">
              +{topicTags.length - 3}
            </span>
          )}
        </div>
      )}

      {/* 指示箭头 */}
      <div
        className="absolute w-2.5 h-2.5 bg-gradient-to-br from-black/95 to-black/90 border-l border-t border-white/10 transform rotate-45"
        style={{
          left: '-5px',
          top: '18px',
        }}
      />
    </div>
  )
})
