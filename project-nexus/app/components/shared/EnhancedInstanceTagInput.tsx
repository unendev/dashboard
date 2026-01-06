'use client'

import React, { useState, useEffect, useRef, KeyboardEvent } from 'react'
import { InstanceTagCache } from '@/lib/instance-tag-cache'
import { Button } from '@/app/components/ui/button'
import { Plus, Clock, Sparkles, Tags } from 'lucide-react'
import { safeFetchJSON } from '@/lib/fetch-utils'

interface InstanceTag {
  id: string
  name: string
  userId: string
  createdAt: string
  updatedAt: string
}

interface EnhancedInstanceTagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  userId?: string
  placeholder?: string
  maxTags?: number
  className?: string
}

export function EnhancedInstanceTagInput({ 
  tags, 
  onChange, 
  userId = 'user-1',
  placeholder = '输入事务项（回车创建）...',
  maxTags = 10,
  className = ''
}: EnhancedInstanceTagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [availableTags, setAvailableTags] = useState<InstanceTag[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [recentTags, setRecentTags] = useState<string[]>([])
  const [isMobile, setIsMobile] = useState(false)
  const [isBrowsingAll, setIsBrowsingAll] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 检测移动端
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // 加载可用的事务项和最近使用
  useEffect(() => {
    const loadInstanceTags = async () => {
      setIsLoading(true)
      try {
        // 加载最近使用的标签
        const recent = localStorage.getItem('recentInstanceTags')
        if (recent) {
          try {
            const parsed = JSON.parse(recent)
            setRecentTags(Array.isArray(parsed) ? parsed.slice(0, 5) : [])
          } catch (e) {
            console.error('Failed to parse recentInstanceTags:', e)
            setRecentTags([])
          }
        } else {
          // 初始化一些默认的最近使用标签
          setRecentTags(['学习', '工作', '项目'])
        }

        // 首先尝试从缓存加载
        const cachedData = InstanceTagCache.loadFromStorage()
        if (cachedData && cachedData.length > 0) {
          setAvailableTags(cachedData)
          setIsLoading(false)
          checkForUpdates()
          return
        }

        // 并行加载：预定义事务项 + 已使用过的事务项
        const [predefinedTags, usedTagsData] = await Promise.all([
          InstanceTagCache.preload(userId),
          safeFetchJSON<{ instanceTags: string[] }>(
            `/api/timer-tasks/instance-tags?userId=${userId}`, 
            {}, 
            0
          ).catch(() => null)
        ])

        const safePredefinedTags = Array.isArray(predefinedTags) ? predefinedTags : []

        let usedTags: InstanceTag[] = []
        if (usedTagsData) {
          usedTags = (usedTagsData.instanceTags || []).map((tagName: string) => ({
            id: `used-${tagName}`,
            name: tagName,
            userId: userId,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }))
        }

        // 合并并去重
        const allTagsMap: Record<string, InstanceTag> = {};
        safePredefinedTags.forEach(tag => allTagsMap[tag.name] = tag)
        usedTags.forEach(tag => {
          if (!allTagsMap[tag.name]) {
            allTagsMap[tag.name] = tag
          }
        })

        const mergedTags = Object.values(allTagsMap)
        setAvailableTags(mergedTags)
        
        if (mergedTags.length > 0) {
          InstanceTagCache.updateInstanceTags(mergedTags)
        }
      } catch (error) {
        console.error('加载事务项失败:', error)
      } finally {
        setIsLoading(false)
      }
    }

    const checkForUpdates = async () => {
      try {
        const [predefinedData, usedTagsData] = await Promise.all([
          safeFetchJSON<{ instanceTags?: InstanceTag[] } | InstanceTag[]>(
            `/api/instance-tags?userId=${userId}`, 
            {}, 
            0
          ).catch(() => null),
          safeFetchJSON<{ instanceTags: string[] }>(
            `/api/timer-tasks/instance-tags?userId=${userId}`, 
            {}, 
            0
          ).catch(() => null)
        ])

        const currentData = InstanceTagCache.getInstanceTags()
        
        if (predefinedData && usedTagsData) {
          const allTagsMap: Record<string, InstanceTag> = {};
          const predefinedTags: InstanceTag[] = Array.isArray(predefinedData) 
            ? predefinedData 
            : ((predefinedData as { instanceTags?: InstanceTag[] }).instanceTags || []);
          predefinedTags.forEach((tag: InstanceTag) => allTagsMap[tag.name] = tag);
          (usedTagsData.instanceTags || []).forEach((tagName: string) => {
            if (!allTagsMap[tagName]) {
              allTagsMap[tagName] = {
                id: `used-${tagName}`,
                name: tagName,
                userId: userId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
              }
            }
          })

          const mergedData = Object.values(allTagsMap)
          const hasChanges = !currentData || 
            mergedData.length !== currentData.length ||
            mergedData.some(newTag => !currentData.find(currentTag => currentTag.name === newTag.name))
          
          if (hasChanges) {
            InstanceTagCache.updateInstanceTags(mergedData)
            setAvailableTags(mergedData)
          }
        }
      } catch (error) {
        console.log('检查事务项更新失败:', error)
      }
    }

    loadInstanceTags()
  }, [userId])

  // 过滤建议列表（排除已选择的标签）
  const filteredSuggestions = availableTags.filter(
    (tag) =>
      !tags.includes(tag.name) &&
      tag.name.toLowerCase().includes(inputValue.toLowerCase())
  ).map(tag => tag.name)

  // 点击外部关闭建议列表
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowSuggestions(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // 创建新标签
  const createTag = async (tagName: string) => {
    const trimmedTag = tagName.trim()
    if (!trimmedTag) return

    const formattedTag = trimmedTag.startsWith('#') ? trimmedTag : `#${trimmedTag}`

    setIsCreating(true)
    try {
      const response = await fetch('/api/instance-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formattedTag,
          userId: userId
        })
      })

      const contentType = response.headers.get('content-type')
      if (!contentType?.includes('application/json')) {
        console.error('API 返回的不是 JSON 格式')
        return null
      }

      if (response.ok) {
        try {
          const newTag = await response.json()
          setAvailableTags(prev => [...prev, newTag])
          InstanceTagCache.addInstanceTag(newTag)
          return formattedTag
        } catch (parseError) {
          console.error('解析创建标签响应失败:', parseError)
          return null
        }
      } else {
        try {
          const errorData = await response.json()
          if (response.status === 409) {
            return formattedTag
          } else {
            console.error('创建标签失败:', errorData.error)
            return null
          }
        } catch (parseError) {
          console.error('解析错误响应失败:', parseError)
          return null
        }
      }
    } catch (error) {
      console.error('创建事务项失败:', error)
      return null
    } finally {
      setIsCreating(false)
    }
  }

  // 添加标签
  const addTag = async (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return
    if (tags.includes(trimmedTag)) return
    if (tags.length >= maxTags) return

    const existingTag = availableTags.find(t => t.name === trimmedTag || t.name === `#${trimmedTag}`)
    
    let finalTag = trimmedTag
    if (existingTag) {
      finalTag = existingTag.name
    } else {
      const createdTag = await createTag(trimmedTag)
      if (createdTag) {
        finalTag = createdTag
      } else {
        return
      }
    }

    // 保存到最近使用
    const recent = JSON.parse(localStorage.getItem('recentInstanceTags') || '[]')
    const updated = [finalTag, ...recent.filter((t: string) => t !== finalTag)].slice(0, 10)
    localStorage.setItem('recentInstanceTags', JSON.stringify(updated))
    setRecentTags(updated.slice(0, 5))

    onChange([...tags, finalTag])
    setInputValue('')
    setShowSuggestions(false)
    setSelectedIndex(0)
  }

  // 删除标签
  const removeTag = (index: number) => {
    onChange(tags.filter((_, i) => i !== index))
  }

  // 处理键盘事件
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    // 移动端禁用 Enter 键，改用按钮
    if (isMobile && e.key === 'Enter') {
      e.preventDefault()
      return
    }

    // PC 端 Enter 或空格添加标签
    if (!isMobile && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault()
      
      if (showSuggestions && filteredSuggestions.length > 0) {
        addTag(filteredSuggestions[selectedIndex])
      } else if (inputValue.trim()) {
        addTag(inputValue)
      }
    }
    
    // Backspace 删除最后一个标签
    if (e.key === 'Backspace' && !inputValue && tags.length > 0) {
      removeTag(tags.length - 1)
    }

    // 上下箭头选择建议
    if (showSuggestions && filteredSuggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        )
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex((prev) => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        )
      }
    }
    
    // Escape 关闭建议
    if (e.key === 'Escape') {
      setShowSuggestions(false)
    }
  }

  // 处理输入变化
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputValue(value)
    setShowSuggestions(value.length > 0)
    setSelectedIndex(0)
  }

  return (
    <div className={`space-y-2 ${className}`} ref={containerRef}>
      <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
        事务项 (可选)
      </label>
      
      {/* 输入框和已选标签 */}
      <div className="relative">
        <div className="flex flex-wrap gap-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 min-h-[42px] focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500 transition-all">
          {/* 已选标签 */}
          {tags.map((tag, index) => {
            const displayName = tag.replace(/^#/, '')
            return (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500 text-white text-sm rounded-full transition-all hover:bg-blue-600"
              >
                {displayName}
                <button
                  type="button"
                  onClick={() => removeTag(index)}
                  className="text-white hover:text-red-300 hover:scale-125 transition-all font-bold ml-1"
                  aria-label={`删除 ${displayName}`}
                  title="点击删除或按Backspace"
                >
                  ×
                </button>
              </span>
            )
          })}
          
          {/* 输入框 */}
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              if (inputValue) setShowSuggestions(true)
              // 移动端显示建议（即使没输入）
              if (isMobile) setShowSuggestions(true)
            }}
            placeholder={tags.length === 0 ? placeholder : ''}
            disabled={isCreating || tags.length >= maxTags}
            className="flex-1 min-w-[120px] outline-none bg-transparent text-gray-900 dark:text-gray-100 placeholder-gray-400 disabled:opacity-50"
          />

          {/* 【修改】移动端输入时显示明确的“添加”按钮 */}
          {isMobile && inputValue.trim() && (
            <Button
              type="button"
              size="sm"
              onClick={() => addTag(inputValue)}
              disabled={isCreating}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1 h-auto rounded-lg text-sm"
            >
              添加
            </Button>
          )}
        </div>

        {/* 【删除】旧的移动端浮动添加按钮 */}

        {/* 浏览全部按钮 */}
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => {
            setIsBrowsingAll(prev => !prev);
            setShowSuggestions(true);
            if(inputRef.current) inputRef.current.focus();
          }}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1 h-auto"
          title="浏览所有标签"
        >
          <Tags className={`h-4 w-4 ${isBrowsingAll ? 'text-blue-500' : 'text-gray-400 hover:text-gray-600'}`} />
        </Button>

        {/* 建议下拉浮窗（包含最近使用和推荐） */}
        {showSuggestions && (
          <div className="absolute z-50 w-full mt-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-xl max-h-64 overflow-y-auto">
            {isBrowsingAll ? (
              // 浏览全部模式
              <div>
                <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                  <Tags className="h-3 w-3" />
                  所有标签
                </div>
                {availableTags.map((tag) => {
                  const displayName = tag.name.replace(/^#/, '')
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => addTag(tag.name)}
                      disabled={tags.includes(tag.name)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <span className="text-xs">🏷️</span>
                      {displayName}
                    </button>
                  )
                })}
              </div>
            ) : (
              // 默认建议模式
              <>
                {/* 搜索建议 - 放在最前面 */}
                {filteredSuggestions.length > 0 && (
                  <div>
                    <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                      <Sparkles className="h-3 w-3" />
                      建议
                    </div>
                    {filteredSuggestions.map((suggestion, index) => {
                      const displayName = suggestion.replace(/^#/, '')
                      return (
                        <button
                          key={suggestion}
                          type="button"
                          onClick={() => addTag(suggestion)}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors flex items-center gap-2 ${
                            index === selectedIndex
                              ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                              : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                          }`}
                        >
                          {index === selectedIndex && <span className="text-xs">→</span>}
                          <span className="text-xs">🏷️</span>
                          {displayName}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* 最近使用 - 放在建议之后 */}
                {recentTags.length > 0 && (
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <div className="px-3 py-2 flex items-center gap-2 text-xs font-semibold text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/50">
                      <Clock className="h-3 w-3" />
                      最近使用
                    </div>
                    {recentTags.map((tag) => {
                      const displayName = tag.replace(/^#/, '')
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => addTag(tag)}
                          className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                        >
                          <span className="text-xs">🔖</span>
                          {displayName}
                        </button>
                      )
                    })}
                  </div>
                )}

                {/* 无建议时显示提示 */}
                {!filteredSuggestions.length && inputValue && (
                  <div className="px-3 py-3 text-sm text-gray-500 dark:text-gray-400 text-center">
                    按 Enter 创建新标签
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* 加载状态 */}
        {isLoading && (
          <div className="absolute right-2 top-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}

        {/* 创建状态提示 */}
        {isCreating && (
          <div className="absolute right-2 top-2 text-xs text-gray-500">
            创建中...
          </div>
        )}
      </div>

      {/* 提示文本 */}
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {isMobile ? (
          <span>点击按钮添加标签，或点击已添加的标签上的 × 删除</span>
        ) : (
          <span>输入并按回车/空格创建新标签，或点击 × 删除</span>
        )}
        {tags.length >= maxTags && (
          <span className="block text-orange-400 mt-1">已达到标签上限</span>
        )}
      </p>
    </div>
  )
}


