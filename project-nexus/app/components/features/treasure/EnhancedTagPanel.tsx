'use client'

import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Hash, Sparkles, Layers, Tag, Settings, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HierarchicalTag } from '@/app/components/shared/HierarchicalTag'
import { detectTagType } from '@/lib/tag-utils'

interface TagWithCount {
  name: string
  count: number
  theme: string | null
}

interface EnhancedTagPanelProps {
  tags: TagWithCount[]
  selectedTag?: string
  onTagClick: (tag: string) => void
  visibleGroups?: Array<'navigation' | 'concept' | 'attribute'>
  labels?: Partial<Record<'navigation' | 'concept' | 'attribute', string>>
}

export function EnhancedTagPanel({
  tags,
  selectedTag,
  onTagClick,
  visibleGroups,
  labels
}: EnhancedTagPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['navigation', 'concept', 'attribute']))
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set())
  const [isManageMode, setIsManageMode] = useState(false)
  const showNavigation = visibleGroups ? visibleGroups.includes('navigation') : true
  const showConcept = visibleGroups ? visibleGroups.includes('concept') : true
  const showAttribute = visibleGroups ? visibleGroups.includes('attribute') : true

  // 1. 按类型分组标签
  const groupedTags = useMemo(() => {
    const groups = {
      navigation: [] as TagWithCount[],
      concept: [] as TagWithCount[],
      attribute: [] as TagWithCount[]
    }

    // 辅助 Map 用于聚合非导航标签 (name -> count)
    const conceptMap = new Map<string, number>();
    const attributeMap = new Map<string, number>();

    tags.forEach(tag => {
      const type = detectTagType(tag.name)
      if (type === 'navigation') {
        groups.navigation.push(tag)
      } else if (type === 'concept') {
        // 聚合：忽略 theme，只看 name
        conceptMap.set(tag.name, (conceptMap.get(tag.name) || 0) + tag.count);
      } else {
        attributeMap.set(tag.name, (attributeMap.get(tag.name) || 0) + tag.count);
      }
    })

    // 将 Map 转回数组
    groups.concept = Array.from(conceptMap.entries())
      .map(([name, count]) => ({ name, count, theme: null }))
      .sort((a, b) => b.count - a.count);
      
    groups.attribute = Array.from(attributeMap.entries())
      .map(([name, count]) => ({ name, count, theme: null }))
      .sort((a, b) => b.count - a.count);

    return groups
  }, [tags])

  // 2. 构建导航标签树 (纯标签层级，不包含 Theme)
  const navigationTree = useMemo(() => {
    // Structure: Level1 -> Level2 -> [FullTags...]
    const tree: Record<string, Record<string, string[]>> = {}

    groupedTags.navigation.forEach(tag => {
      const parts = tag.name.split('/')
      const level1 = parts[0]
      if (!tree[level1]) tree[level1] = {}

      if (parts.length > 1) {
        const level2 = parts[1]
        if (!tree[level1][level2]) tree[level1][level2] = []
        
        if (parts.length > 2) {
           tree[level1][level2].push(tag.name)
        }
      }
    })

    return tree
  }, [groupedTags.navigation])

  const toggleNode = (node: string) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(node)) newExpanded.delete(node)
    else newExpanded.add(node)
    setExpandedNodes(newExpanded)
  }

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(group)) newExpanded.delete(group)
    else newExpanded.add(group)
    setExpandedGroups(newExpanded)
  }

  // 获取标签计数（忽略 Theme，只看标签名匹配）
  const getTagCount = (tagName: string) => {
    // 精确匹配
    const exactMatch = tags.filter(t => t.name === tagName).reduce((sum, t) => sum + t.count, 0)
    
    // 子标签累加
    const childrenCount = tags
      .filter(t => t.name.startsWith(tagName + '/'))
      .reduce((sum, t) => sum + t.count, 0)
    
    return exactMatch + childrenCount
  }

  const handleDeleteTag = async (tag: string) => {
    if (!confirm(`确定要删除标签 "${tag}" 吗？\n这将从所有宝藏中移除此标签，且无法撤销。`)) return
    
    try {
      const res = await fetch('/api/treasures/tags', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag })
      })
      
      if (res.ok) {
        window.location.reload()
      } else {
        alert('删除失败')
      }
    } catch (e) {
      console.error(e)
      alert('删除失败')
    }
  }

  return (
    <div className="space-y-4">
      {/* 管理模式开关 */}
      <div className="flex justify-end px-1">
        <button
          onClick={() => setIsManageMode(!isManageMode)}
          className={cn(
            "p-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs",
            isManageMode 
              ? "bg-red-500/20 text-red-300"
              : "text-white/30 hover:text-white/60 hover:bg-white/5"
          )}
          title={isManageMode ? "退出管理模式" : "管理标签"}
        >
          <Settings className="w-3 h-3" />
          {isManageMode && <span>管理模式</span>}
        </button>
      </div>
      
      {/* --- 1. 导航标签 --- */}
      {showNavigation && groupedTags.navigation.length > 0 && (
        <div className={cn(
          "bg-[#0d1117] rounded-xl p-4 border transition-colors",
          isManageMode ? "border-red-500/30" : "border-white/10"
        )}>
          <button
            onClick={() => toggleGroup('navigation')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('navigation') ? <ChevronDown className="w-4 h-4 text-blue-400" /> : <ChevronRight className="w-4 h-4 text-blue-400" />}
            <Layers className="w-4 h-4 text-blue-400" />
            <h3 className="text-sm font-semibold text-white">{labels?.navigation || '导航标签'}</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.navigation.length}</span>
          </button>

          {expandedGroups.has('navigation') && (
            <div className="space-y-1 pl-1">
              {Object.entries(navigationTree).map(([level1, level2s]) => {
                const hasChildren = Object.keys(level2s).length > 0
                
                return (
                  <div key={level1} className="space-y-1">
                    <div className={cn(
                      "flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/5 transition-colors group",
                      selectedTag === level1 && "bg-blue-500/20"
                    )}>
                      <button
                        onClick={() => {
                          if (hasChildren) toggleNode(level1)
                          onTagClick(level1)
                        }}
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                      >
                        {hasChildren && (
                          expandedNodes.has(level1) ? (
                            <ChevronDown className="w-3 h-3 text-white/40 group-hover:text-white/70 flex-shrink-0" />
                          ) : (
                            <ChevronRight className="w-3 h-3 text-white/40 group-hover:text-white/70 flex-shrink-0" />
                          )
                        )}
                        {!hasChildren && <div className="w-3 flex-shrink-0" />}
                        
                        <Hash className="w-3 h-3 text-blue-400/70 flex-shrink-0" />
                        <span className="text-sm text-white/90 truncate">{level1}</span>
                      </button>
                      
                      {isManageMode ? (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDeleteTag(level1)
                          }}
                          className="p-1 text-red-400 hover:bg-red-500/20 rounded opacity-100"
                          title="删除"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      ) : (
                        <span className="text-xs text-white/30 ml-auto flex-shrink-0">{getTagCount(level1)}</span>
                      )}
                    </div>

                    {/* Level 2 */}
                    {expandedNodes.has(level1) && Object.entries(level2s).map(([level2, level3s]) => {
                      const level2HasChildren = level3s.length > 0
                      const level2FullPath = `${level1}/${level2}`

                      return (
                        <div key={level2FullPath} className="pl-5 space-y-1">
                          <div className={cn(
                            "flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/5 transition-colors group",
                            selectedTag === level2FullPath && "bg-blue-500/20"
                          )}>
                            <button
                              onClick={() => {
                                if (level2HasChildren) toggleNode(level2FullPath)
                                onTagClick(level2FullPath)
                              }}
                              className="flex-1 flex items-center gap-2 text-left min-w-0"
                            >
                              {level2HasChildren && (
                                expandedNodes.has(level2FullPath) ? <ChevronDown className="w-3 h-3 text-white/40 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-white/40 flex-shrink-0" />
                              )}
                              {!level2HasChildren && <div className="w-3 flex-shrink-0" />}
                              <span className="text-sm text-white/80 truncate">{level2}</span>
                            </button>
                            
                            {isManageMode ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteTag(level2FullPath)
                                }}
                                className="p-1 text-red-400 hover:bg-red-500/20 rounded opacity-100"
                              >
                                <Trash2 className="w-3 h-3" />
                              </button>
                            ) : (
                              <span className="text-xs text-white/30 ml-auto flex-shrink-0">{getTagCount(level2FullPath)}</span>
                            )}
                          </div>

                          {/* Level 3 (Leafs) */}
                          {expandedNodes.has(level2FullPath) && level3s.map(tagFullPath => (
                            <div key={tagFullPath} className={cn(
                              "flex items-center gap-2 w-full px-2 py-1 rounded hover:bg-white/5 transition-colors pl-8 group",
                              selectedTag === tagFullPath && "bg-blue-500/20"
                            )}>
                              <button 
                                onClick={() => onTagClick(tagFullPath)}
                                className="flex-1 text-left min-w-0"
                              >
                                <span className="text-sm text-white/70 truncate">{tagFullPath.split('/').slice(2).join('/')}</span>
                              </button>
                              
                              {isManageMode ? (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleDeleteTag(tagFullPath)
                                  }}
                                  className="p-1 text-red-400 hover:bg-red-500/20 rounded opacity-100"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              ) : (
                                <span className="text-xs text-white/30 ml-auto flex-shrink-0">{getTagCount(tagFullPath)}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      )
                    })}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* --- 2. 概念标签 --- */}
      {showConcept && groupedTags.concept.length > 0 && (
        <div className={cn(
          "bg-[#161b22] rounded-xl p-4 border transition-colors",
          isManageMode ? "border-red-500/30" : "border-white/10"
        )}>
          <button
            onClick={() => toggleGroup('concept')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('concept') ? <ChevronDown className="w-4 h-4 text-purple-400" /> : <ChevronRight className="w-4 h-4 text-purple-400" />}
            <Sparkles className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-semibold text-white">{labels?.concept || '概念标签'}</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.concept.length}</span>
          </button>

          {expandedGroups.has('concept') && (
            <div className="flex flex-wrap gap-2">
              {groupedTags.concept.map(tag => (
                <HierarchicalTag
                  key={`${tag.theme}-${tag.name}`}
                  tag={tag.name}
                  variant="default"
                  size="sm"
                  isSelected={selectedTag === tag.name}
                  onClick={() => onTagClick(tag.name)}
                  onRemove={isManageMode ? () => handleDeleteTag(tag.name) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- 3. 属性标签 --- */}
      {showAttribute && groupedTags.attribute.length > 0 && (
        <div className={cn(
          "bg-[#161b22] rounded-xl p-4 border transition-colors",
          isManageMode ? "border-red-500/30" : "border-white/10"
        )}>
          <button
            onClick={() => toggleGroup('attribute')}
            className="flex items-center gap-2 mb-3 w-full hover:opacity-80 transition-opacity"
          >
            {expandedGroups.has('attribute') ? <ChevronDown className="w-4 h-4 text-emerald-400" /> : <ChevronRight className="w-4 h-4 text-emerald-400" />}
            <Tag className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-white">{labels?.attribute || '属性标签'}</h3>
            <span className="text-xs text-white/40 ml-auto">{groupedTags.attribute.length}</span>
          </button>

          {expandedGroups.has('attribute') && (
            <div className="flex flex-wrap gap-2">
              {groupedTags.attribute.map(tag => (
                <HierarchicalTag
                  key={`${tag.theme}-${tag.name}`}
                  tag={tag.name}
                  variant="default"
                  size="sm"
                  isSelected={selectedTag === tag.name}
                  onClick={() => onTagClick(tag.name)}
                  onRemove={isManageMode ? () => handleDeleteTag(tag.name) : undefined}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
