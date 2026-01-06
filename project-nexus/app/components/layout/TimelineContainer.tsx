'use client'

import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface TimelineContainerProps {
  children: ReactNode
  className?: string
}

export function TimelineContainer({ children, className }: TimelineContainerProps) {
  return (
    <div className={cn("relative", className)}>
      {/* 时间线连接线 */}
      <div className="absolute left-5 top-0 bottom-0 w-0.5 bg-white/20"></div>
      
      {/* 内容 */}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}

interface TimelineItemProps {
  children: ReactNode
  className?: string
  isLast?: boolean
}

export function TimelineItem({ children, className, isLast = false }: TimelineItemProps) {
  return (
    <div className={cn("relative pl-16 pb-8", !isLast && "border-b border-white/10", className)}>
      {/* 时间线节点 */}
      <div className="absolute left-0 top-0 w-10 h-10 bg-white/10 backdrop-blur-sm border-2 border-white/20 rounded-full flex items-center justify-center z-10">
        <div className="w-3 h-3 bg-blue-400 rounded-full"></div>
      </div>
      
      {/* 内容 */}
      <div className="relative">
        {children}
      </div>
    </div>
  )
}


