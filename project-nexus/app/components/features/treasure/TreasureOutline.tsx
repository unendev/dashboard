'use client'

import { useMemo } from 'react'
import { List, FileText, Image as ImageIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TreasureOutlineProps {
  treasures: Array<{
    id: string
    title: string
    type: 'TEXT' | 'IMAGE'
    createdAt: string
  }>
  selectedId?: string
  onTreasureClick?: (id: string) => void
}

export function TreasureOutline({ treasures, selectedId, onTreasureClick }: TreasureOutlineProps) {
  // 按日期分组
  const groupedTreasures = useMemo(() => {
    const groups: Record<string, typeof treasures> = {}
    
    treasures.forEach(treasure => {
      const date = new Date(treasure.createdAt)
      const dateKey = date.toLocaleDateString('zh-CN', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })
      
      if (!groups[dateKey]) {
        groups[dateKey] = []
      }
      groups[dateKey].push(treasure)
    })
    
    return groups
  }, [treasures])

  const getTypeIcon = (type: 'TEXT' | 'IMAGE') => {
    switch (type) {
      case 'TEXT': return <FileText className="h-3.5 w-3.5 text-blue-400" />
      case 'IMAGE': return <ImageIcon className="h-3.5 w-3.5 text-green-400" />
      default: return <FileText className="h-3.5 w-3.5 text-blue-400" />
    }
  }

  if (treasures.length === 0) {
    return (
      <div className="p-4">
        <div className="text-center py-12">
          <List className="h-12 w-12 mx-auto text-white/20 mb-3" />
          <p className="text-white/40 text-sm">暂无内容</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <List className="w-5 h-5 text-blue-400" />
        <h2 className="text-lg font-semibold text-white">大纲</h2>
        <span className="ml-auto text-xs text-white/40">{treasures.length} 条</span>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedTreasures).map(([date, items]) => (
          <div key={date} className="space-y-2">
            {/* 日期标题 */}
            <div className="text-xs font-medium text-white/50 bg-[#0d1117] py-1">
              {date}
            </div>
            
            {/* 宝藏列表 */}
            <div className="space-y-1">
              {items.map((treasure) => (
                <button
                  key={treasure.id}
                  onClick={() => onTreasureClick?.(treasure.id)}
                  className={cn(
                    "w-full text-left px-3 py-2 rounded-lg transition-all group",
                    "hover:bg-[#161b22] border border-transparent hover:border-white/10",
                    selectedId === treasure.id && "bg-[#161b22] border-blue-500/50"
                  )}
                >
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5 flex-shrink-0">
                      {getTypeIcon(treasure.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className={cn(
                        "text-sm line-clamp-2 transition-colors",
                        selectedId === treasure.id 
                          ? "text-blue-300 font-medium" 
                          : "text-white/70 group-hover:text-white/90"
                      )}>
                        {treasure.title}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
