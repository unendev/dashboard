'use client'

import { useMemo, useState, useEffect } from 'react'
import { BarChart3, Tag as TagIcon, X, Grid3x3, List } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HierarchicalTag } from '@/app/components/shared/HierarchicalTag'
import { EnhancedTagPanel } from './EnhancedTagPanel'

interface TreasureStatsPanelProps {
  treasures: Array<{
    id: string
    createdAt: string
    tags: string[]
    theme?: string[] | null // 【修改】支持多个theme
  }>
  onTagClick?: (tag: string) => void
  selectedTag?: string
}

export function TreasureStatsPanel({ treasures, onTagClick, selectedTag }: TreasureStatsPanelProps) {
  useEffect(() => {
    if (treasures.length > 0) {
      const allTags = treasures.flatMap(t => t.tags);
      console.group('🔍 [Treasure Stats Debug]');
      console.log('📦 Total Treasures:', treasures.length);
      console.log('🏷️ Raw Sample Tags (first 5):', treasures.slice(0, 5).map(t => t.tags));
      console.log('🎨 Unique Tags:', [...new Set(allTags)]);
      console.groupEnd();
    }
  }, [treasures]);

  // 标签视图模式：cloud（标签云） 或 tree（分组树）
  const [tagViewMode, setTagViewMode] = useState<'cloud' | 'tree'>('tree')
  const [activeTab, setActiveTab] = useState<'human' | 'concept' | 'ai'>('human')

  // 计算热力图数据（最近12周，每周7天）
  const heatmapData = useMemo(() => {
    const weeks = 12
    const now = new Date()
    const data: Array<{ date: string; count: number; dayOfWeek: number }> = []

    // 计算总天数
    const totalDays = weeks * 7

    for (let i = totalDays - 1; i >= 0; i--) {
      const date = new Date(now)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const dayOfWeek = date.getDay() // 0=周日, 1=周一, ..., 6=周六

      const count = treasures.filter(t => {
        const tDate = new Date(t.createdAt).toISOString().split('T')[0]
        return tDate === dateStr
      }).length

      data.push({ date: dateStr, count, dayOfWeek })
    }

    return data
  }, [treasures])

  // 将数据转换为周视图（7行 x N列）
  const weeklyData = useMemo(() => {
    const weeks: Array<Array<{ date: string; count: number; index: number } | null>> = []

    // 初始化7行（周日到周六）
    for (let i = 0; i < 7; i++) {
      weeks.push([])
    }

    // 填充数据
    heatmapData.forEach((day, index) => {
      weeks[day.dayOfWeek].push({
        date: day.date,
        count: day.count,
        index  // 添加索引用于贪吃蛇动画
      })
    })

    // 确保每行长度一致
    const maxLength = Math.max(...weeks.map(w => w.length))
    weeks.forEach(week => {
      while (week.length < maxLength) {
        week.push(null)
      }
    })

    return weeks
  }, [heatmapData])

  // 计算标签统计
  const tagStats = useMemo(() => {
    // Key: "theme|tag" -> Value
    const statsMap: Record<string, { name: string, count: number, theme: string | null }> = {}

    const isNewTag = (tag: string) =>
      tag.startsWith('#领域/') || tag.startsWith('#概念/') || tag.startsWith('#实体/') || tag.startsWith('#性质/') || tag.startsWith('#技术/')

    treasures.forEach(t => {
      // 【修改】处理theme数组
      const themes = Array.isArray(t.theme) ? t.theme : (t.theme ? [t.theme] : [])
      const themeStr = themes.length > 0 ? themes.map(th => th.toLowerCase()).join(',') : null

      t.tags.filter(isNewTag).forEach(tag => {
        // 排除主要分类
        if (!['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)) {
          // 聚合 (Theme, Tag) 组合
          const key = `${themeStr || 'none'}|${tag}`

          if (!statsMap[key]) {
            statsMap[key] = { name: tag, count: 0, theme: themeStr }
          }
          statsMap[key].count++
        }
      })
    })

    return Object.values(statsMap)
      .sort((a, b) => b.count - a.count)
  }, [treasures])

  const visibleTags = useMemo(() => {
    switch (activeTab) {
      case 'human':
        return tagStats.filter(stat => stat.name.startsWith('#领域/') || stat.name.startsWith('#技术/'))
      case 'concept':
        return tagStats.filter(stat => stat.name.startsWith('#概念/'))
      case 'ai':
        return tagStats.filter(stat => stat.name.startsWith('#实体/') || stat.name.startsWith('#性质/'))
      default:
        return []
    }
  }, [tagStats, activeTab])

  // 如果没有数据，不渲染
  if (treasures.length === 0) {
    return null
  }

  // 计算热力图颜色（GitHub 风格）
  const getHeatColor = (count: number) => {
    const maxCount = Math.max(...heatmapData.map(d => d.count), 1)
    const intensity = count / maxCount

    // GitHub 风格配色
    if (count === 0) return 'bg-[#161b22] border border-white/5'
    if (intensity < 0.25) return 'bg-green-900/40 border border-green-700/30'
    if (intensity < 0.5) return 'bg-green-700/60 border border-green-600/40'
    if (intensity < 0.75) return 'bg-green-600/80 border border-green-500/50'
    return 'bg-green-500 border border-green-400'
  }

  // 计算标签字体大小
  const getTagSize = (count: number): 'sm' | 'md' | 'lg' | 'xl' => {
    const maxCount = Math.max(...tagStats.map(t => t.count), 1)
    const ratio = count / maxCount

    if (ratio > 0.75) return 'xl'
    if (ratio > 0.5) return 'lg'
    if (ratio > 0.25) return 'md'
    return 'sm'
  }

  return (
    <div className="space-y-6 p-4">
      {/* GitHub 风格热力图 */}
      <div className="bg-[#1e293b] rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-4 h-4 text-green-400" />
          <h3 className="text-sm font-semibold text-white">创作热力图</h3>
          <span className="text-xs text-white/40 ml-auto">最近12周</span>
        </div>

        {/* 周视图网格 */}
        <div className="overflow-x-auto">
          <div className="flex gap-[3px] min-w-max">
            {/* 星期标签 */}
            <div className="flex flex-col gap-[3px] pr-2">
              <div className="h-3 text-[10px] text-white/40 leading-3">日</div>
              <div className="h-3 text-[10px] text-white/0 leading-3">一</div>
              <div className="h-3 text-[10px] text-white/40 leading-3">二</div>
              <div className="h-3 text-[10px] text-white/0 leading-3">三</div>
              <div className="h-3 text-[10px] text-white/40 leading-3">四</div>
              <div className="h-3 text-[10px] text-white/0 leading-3">五</div>
              <div className="h-3 text-[10px] text-white/40 leading-3">六</div>
            </div>

            {/* 热力图方块 */}
            {weeklyData[0]?.map((_, colIndex) => (
              <div key={colIndex} className="flex flex-col gap-[3px]">
                {weeklyData.map((row, rowIndex) => {
                  const cell = row[colIndex]
                  if (!cell) {
                    return <div key={rowIndex} className="w-3 h-3 bg-transparent" />
                  }

                  return (
                    <div
                      key={rowIndex}
                      className={cn(
                        "w-3 h-3 rounded-sm transition-all duration-200 hover:scale-150 hover:z-10 cursor-pointer group relative",
                        getHeatColor(cell.count)
                      )}
                      title={`${cell.date}: ${cell.count} 个宝藏`}
                    >
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-black/95 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-30 shadow-lg border border-white/10">
                        <div>{cell.count} 个宝藏</div>
                        <div className="text-white/60">{cell.date}</div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ))}
          </div>
        </div>

        {/* 图例 */}
        <div className="flex items-center gap-2 text-xs text-white/50 mt-4">
          <span>少</span>
          <div className="flex gap-1">
            <div className="w-3 h-3 rounded-sm bg-[#161b22] border border-white/5" />
            <div className="w-3 h-3 rounded-sm bg-green-900/40 border border-green-700/30" />
            <div className="w-3 h-3 rounded-sm bg-green-700/60 border border-green-600/40" />
            <div className="w-3 h-3 rounded-sm bg-green-600/80 border border-green-500/50" />
            <div className="w-3 h-3 rounded-sm bg-green-500 border border-green-400" />
          </div>
          <span>多</span>
        </div>
      </div>

      {/* 标签区域 */}
      <div className="bg-[#161b22] rounded-xl p-4 border border-white/10">
        <div className="flex items-center gap-2 mb-3">
          <TagIcon className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-white">标签导航</h3>

          {/* 人类标签切换 */}
          <div className="ml-auto flex items-center gap-1 bg-white/5 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('human')}
              className={cn(
                "p-1 rounded transition-colors",
                activeTab === 'human'
                  ? "bg-blue-500/30 text-blue-300"
                  : "text-white/40 hover:text-white/60"
              )}
              title="域"
            >
              域
            </button>
            <button
              onClick={() => setActiveTab('concept')}
              className={cn(
                "p-1 rounded transition-colors",
                activeTab === 'concept'
                  ? "bg-blue-500/30 text-blue-300"
                  : "text-white/40 hover:text-white/60"
              )}
              title="念"
            >
              念
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={cn(
                "p-1 rounded transition-colors",
                activeTab === 'ai'
                  ? "bg-blue-500/30 text-blue-300"
                  : "text-white/40 hover:text-white/60"
              )}
              title="AI"
            >
              AI
            </button>
          </div>

          {/* 视图切换按钮 */}
          {activeTab === 'human' && (
            <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1">
              <button
                onClick={() => setTagViewMode('tree')}
                className={cn(
                  "p-1 rounded transition-colors",
                  tagViewMode === 'tree'
                    ? "bg-blue-500/30 text-blue-300"
                    : "text-white/40 hover:text-white/60"
                )}
                title="分组树视图"
              >
                <List className="w-3 h-3" />
              </button>
              <button
                onClick={() => setTagViewMode('cloud')}
                className={cn(
                  "p-1 rounded transition-colors",
                  tagViewMode === 'cloud'
                    ? "bg-blue-500/30 text-blue-300"
                    : "text-white/40 hover:text-white/60"
                )}
                title="标签云视图"
              >
                <Grid3x3 className="w-3 h-3" />
              </button>
            </div>
          )}

          {selectedTag && (
            <button
              onClick={() => onTagClick?.('')}
              className="text-xs text-white/60 hover:text-white/90 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {visibleTags.length === 0 ? (
          <div className="text-center py-8 text-white/40 text-sm">
            暂无标签
          </div>
        ) : activeTab === 'human' ? (
          tagViewMode === 'cloud' ? (
            /* 标签云视图 */
            <div className="flex flex-wrap gap-2 items-center justify-center">
              {visibleTags.map((stat) => (
                <HierarchicalTag
                  key={stat.name}
                  tag={stat.name}
                  variant="cloud"
                  size={getTagSize(stat.count) as 'sm' | 'md' | 'lg' | 'xl'}
                  isSelected={selectedTag === stat.name}
                  onClick={() => onTagClick?.(stat.name)}
                />
              ))}
            </div>
          ) : (
            /* 分组树视图 */
            <EnhancedTagPanel
              tags={visibleTags}
              selectedTag={selectedTag}
              onTagClick={onTagClick || (() => { })}
              visibleGroups={['navigation']}
              labels={{ navigation: '域' }}
            />
          )
        ) : (
          /* 概念/AI 标签 (Label Cloud) */
          <div className="flex flex-wrap gap-2">
            {visibleTags.map(stat => (
              <HierarchicalTag
                key={stat.name}
                tag={stat.name}
                variant="default"
                size="sm"
                isSelected={selectedTag === stat.name}
                onClick={() => onTagClick?.(stat.name)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 统计摘要 */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-[#161b22] rounded-lg p-3 border border-white/10">
          <div className="text-2xl font-bold text-white">{treasures.length}</div>
          <div className="text-xs text-white/60">总宝藏数</div>
        </div>
        <div className="bg-[#161b22] rounded-lg p-3 border border-white/10">
          <div className="text-2xl font-bold text-white">{tagStats.length}</div>
          <div className="text-xs text-white/60">标签数</div>
        </div>
      </div>
    </div>
  )
}
