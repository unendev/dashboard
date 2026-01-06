'use client'

import { useState, useRef, useEffect, KeyboardEvent } from 'react'
import { Hash, ChevronDown } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HierarchicalTag } from '@/app/components/shared/HierarchicalTag'
import { Button } from '@/app/components/ui/button'

interface TagInputProps {
  tags: string[]
  onChange: (tags: string[]) => void
  suggestions?: string[]
  maxTags?: number
  placeholderTags?: string[]  // 占位符标签（半透明显示，不是真实标签）
  onPlaceholderFocus?: () => void  // 当点击输入框且存在占位符标签时触发
}

export function TagInput({ 
  tags, 
  onChange, 
  suggestions = [], 
  maxTags = 10,
  placeholderTags = [],
  onPlaceholderFocus
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // 过滤建议列表
  const filteredSuggestions = suggestions.filter(
    (suggestion) =>
      !tags.includes(suggestion) &&
      suggestion.toLowerCase().includes(inputValue.toLowerCase())
  )

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

  // 添加标签
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim()
    if (!trimmedTag) return
    if (tags.includes(trimmedTag)) return
    if (tags.length >= maxTags) return

    onChange([...tags, trimmedTag])
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
    // Enter 或空格添加标签
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      
      if (showSuggestions && filteredSuggestions.length > 0) {
        // 从建议中选择
        addTag(filteredSuggestions[selectedIndex])
      } else if (inputValue.trim()) {
        // 创建新标签
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
    <div className="space-y-2" ref={containerRef}>
      <label className="block text-sm font-medium text-gray-400">
        主题标签
        {tags.length > 0 && (
          <span className="ml-2 text-xs text-gray-500">
            ({tags.length}/{maxTags})
          </span>
        )}
      </label>
      
      {/* 输入区域 */}
      <div
        onClick={() => inputRef.current?.focus()}
        className={cn(
          "min-h-[42px] px-3 py-2 rounded-lg border transition-all cursor-text",
          "bg-gray-800/50 border-gray-700",
          "hover:bg-gray-800 hover:border-gray-600",
          "focus-within:bg-gray-800 focus-within:border-blue-500/50 focus-within:ring-2 focus-within:ring-blue-500/20"
        )}
      >
        <div className="flex flex-wrap gap-2 items-center">
          {/* 已选标签 */}
          {tags.map((tag, index) => (
            <HierarchicalTag
              key={index}
              tag={tag}
              variant="default"
              size="sm"
              onRemove={() => removeTag(index)}
            />
          ))}
          
          {/* 占位符标签（仅在没有真实标签时显示） */}
          {tags.length === 0 && placeholderTags.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center opacity-40 pointer-events-none">
              {placeholderTags.map((tag, index) => (
                <HierarchicalTag
                  key={`placeholder-${index}`}
                  tag={tag}
                  variant="default"
                  size="sm"
                />
              ))}
            </div>
          )}
          
          {/* 输入框 */}
          {tags.length < maxTags && (
            <div className="flex-1 min-w-[120px] relative flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => {
                  // 点击输入框时，如果存在占位符标签，触发清空回调
                  if (placeholderTags.length > 0 && onPlaceholderFocus) {
                    onPlaceholderFocus()
                  }
                  inputValue && setShowSuggestions(true)
                }}
                placeholder={
                  tags.length === 0 && placeholderTags.length > 0 
                    ? "输入以替换默认标签..." 
                    : tags.length === 0 
                      ? "输入标签，支持 / 分隔层级..." 
                      : "继续添加..."
                }
                className={cn(
                  "flex-1 w-full bg-transparent border-0 outline-none",
                  "text-white placeholder:text-gray-500 text-sm",
                  "focus:outline-none",
                  "py-1"
                )}
              />
              {inputValue.trim() && (
                <Button
                  type="button"
                  size="sm"
                  className="px-3 py-1 h-auto bg-blue-600 hover:bg-blue-700 text-white rounded-md text-xs"
                  onClick={() => addTag(inputValue)}
                >
                  添加
                </Button>
              )}
              
              {/* 建议列表 */}
              {showSuggestions && filteredSuggestions.length > 0 && (
                <div
                  className={cn(
                    "absolute top-full left-0 mt-2 w-64 max-h-48 overflow-y-auto z-50",
                    "bg-gray-800 border border-gray-700 rounded-lg shadow-xl",
                    "animate-in fade-in-0 slide-in-from-top-2 duration-200"
                  )}
                >
                  {filteredSuggestions.map((suggestion, index) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => addTag(suggestion)}
                      className={cn(
                        "w-full px-3 py-2 text-left text-sm transition-colors",
                        "flex items-center gap-2",
                        index === selectedIndex
                          ? "bg-blue-500/20 text-blue-300"
                          : "text-gray-300 hover:bg-gray-700"
                      )}
                    >
                      <Hash className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{suggestion}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* 提示文本 */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <span>💡 Enter 或空格添加</span>
          <span className="text-gray-600">|</span>
          <span className="text-purple-400">支持 / 创建层级标签</span>
          {filteredSuggestions.length > 0 && showSuggestions && (
            <>
              <span className="text-gray-600">|</span>
              <span className="flex items-center gap-1 text-blue-400">
                <ChevronDown className="h-3 w-3" />
                {filteredSuggestions.length} 个所有标签
              </span>
            </>
          )}
        </div>
        {tags.length >= maxTags && (
          <span className="text-orange-400">已达到标签上限</span>
        )}
      </div>
    </div>
  )
}


