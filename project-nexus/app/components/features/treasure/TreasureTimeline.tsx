'use client'

import { useMemo, useState, useCallback } from 'react'
import { X, Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'
import { TimelineGroup } from './TimelineGroup'
import { TimelinePreview } from './TimelinePreview'
import { groupTreasuresByDate, DATE_GROUPS, type TimelineItem } from './timeline-utils'
import './treasure-timeline.css'

interface TreasureTimelineProps {
  treasures: TimelineItem[]
  activeId?: string
  isOpen?: boolean
  onItemClick: (id: string) => void
  onClose?: () => void
  className?: string
}

export function TreasureTimeline({
  treasures,
  activeId,
  isOpen = true,
  onItemClick,
  onClose,
  className,
}: TreasureTimelineProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [previewData, setPreviewData] = useState<{
    title: string
    content?: string
    type: 'TEXT' | 'IMAGE'
    tags: string[]
    position: { x: number; y: number }
  } | null>(null)

  // 处理 hover 事件
  const handleItemHover = useCallback((
    id: string | null,
    element?: HTMLDivElement | null,
    data?: { title: string; content?: string; type: 'TEXT' | 'IMAGE'; tags: string[] }
  ) => {
    setHoveredId(id)
    
    if (id && element && data) {
      const rect = element.getBoundingClientRect()
      const previewWidth = 320 // w-80 = 320px
      const previewHeight = 200 // 预估高度
      
      // 计算位置，确保不超出视口
      let x = rect.right + 16
      let y = rect.top
      
      // 如果右侧空间不足，显示在左侧
      if (x + previewWidth > window.innerWidth) {
        x = rect.left - previewWidth - 16
      }
      
      // 如果底部空间不足，向上调整
      if (y + previewHeight > window.innerHeight) {
        y = Math.max(10, window.innerHeight - previewHeight - 10)
      }
      
      setPreviewData({
        ...data,
        position: { x, y },
      })
    } else {
      setPreviewData(null)
    }
  }, [])

  // 按日期分组
  const groupedTreasures = useMemo(() => {
    return groupTreasuresByDate(treasures)
  }, [treasures])

  // 计算总数
  const totalCount = treasures.length

  return (
    <>
      {/* 移动端遮罩 */}
      {isOpen && onClose && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* 时间线面板 - 浮动在左侧 */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-40",
          "w-80 lg:w-64 xl:w-72",
          "backdrop-blur-xl",
          "border-r border-white/5",
          "flex flex-col",
          "transition-transform duration-300 ease-in-out",
          "shadow-2xl lg:shadow-xl",
          // 移动端抽屉效果，PC端始终显示
          isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
          className
        )}
      >
        {/* 头部 - 更精致的设计 */}
        <div className="flex-shrink-0 px-5 py-4 border-b border-white/5 bg-black/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-400/30 to-purple-400/30 flex items-center justify-center ring-1 ring-white/10">
                <Calendar className="w-4 h-4 text-blue-300" />
              </div>
              <div>
                <h2 className="text-sm font-semibold bg-gradient-to-r from-blue-200 to-purple-200 bg-clip-text text-transparent">
                  时间线
                </h2>
                <p className="text-xs text-white/40">{totalCount} 个宝藏</p>
              </div>
            </div>
            
            {/* 移动端关闭按钮 */}
            {onClose && (
              <button
                onClick={onClose}
                className="lg:hidden text-white/60 hover:text-white/90 transition-colors"
                aria-label="关闭时间线"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* 时间线内容区域 - 透明背景 */}
        <div className="flex-1 overflow-y-auto px-4 py-3 timeline-scrollbar bg-transparent">
          {totalCount === 0 ? (
            // 空状态
            <div className="flex flex-col items-center justify-center h-full text-center py-12">
              <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Calendar className="w-8 h-8 text-white/30" />
              </div>
              <h3 className="text-sm font-medium text-white/60 mb-2">
                暂无宝藏
              </h3>
              <p className="text-xs text-white/40">
                创建你的第一个宝藏
              </p>
            </div>
          ) : (
            // 时间线分组
            <div className="space-y-2 bg-transparent">
              {Object.entries(DATE_GROUPS).map(([key, { label }]) => (
                <TimelineGroup
                  key={key}
                  label={label}
                  items={groupedTreasures[key] || []}
                  activeId={activeId}
                  defaultExpanded={key === 'today' || key === 'yesterday'}
                  onItemClick={onItemClick}
                  onItemHover={handleItemHover}
                />
              ))}
            </div>
          )}
        </div>

        {/* 底部渐变装饰 */}
        <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-black/40 to-transparent pointer-events-none" />
      </aside>

      {/* Hover 预览 */}
      {previewData && (
        <TimelinePreview
          title={previewData.title}
          content={previewData.content}
          type={previewData.type}
          tags={previewData.tags}
          position={previewData.position}
        />
      )}
    </>
  )
}
