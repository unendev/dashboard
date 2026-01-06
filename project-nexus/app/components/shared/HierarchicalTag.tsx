/**
 * 层级标签组件 - 统一显示普通标签和层级标签
 * 
 * 支持斜杠分隔的层级标签，自动识别并美化显示
 * 支持多种标签类型：层级、感受、人物、年代、普通
 */

import { cn } from '@/lib/utils'
import { Hash, X } from 'lucide-react'
import { detectTagType, getTagColorScheme, getTagTypeLabel } from '@/lib/tag-utils'

interface HierarchicalTagProps {
  tag: string
  variant?: 'default' | 'cloud'
  size?: 'sm' | 'md' | 'lg' | 'xl'
  isSelected?: boolean
  onRemove?: () => void
  onClick?: () => void
  className?: string
}

export function HierarchicalTag({
  tag,
  variant = 'default',
  size = 'md',
  isSelected = false,
  onRemove,
  onClick,
  className
}: HierarchicalTagProps) {
  // 检测标签类型（自动）
  const tagType = detectTagType(tag)
  const colorScheme = getTagColorScheme(tagType)
  const typeLabel = getTagTypeLabel(tagType)
  
  // 如果标签以 # 开头，显示时去掉，因为 UI 会自己加 # 或图标
  const displayTag = tag.startsWith('#') ? tag.slice(1) : tag
  
  // 检测层级标签（包含斜杠）
  const isHierarchical = displayTag.includes('/')
  const parts = isHierarchical ? displayTag.split('/') : [displayTag]

  // 尺寸样式映射
  const sizeStyles = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-base',
    xl: 'text-xl'
  }

  // 变体样式映射
  const variantStyles = {
    // 默认样式（标签输入）- 使用类型颜色
    default: `${colorScheme.bg} border ${colorScheme.border} ${colorScheme.text}`,
    
    // 标签云样式 - 使用更亮的白色
    cloud: isSelected
      ? colorScheme.text
      : 'text-white/80 hover:text-white'
  }

  // 悬停按钮样式
  const hoverButtonStyle = colorScheme.hover

  if (variant === 'cloud') {
    // 标签云样式（简化版，无边框无背景）
    return (
      <button
        onClick={onClick}
        className={cn(
          'transition-all duration-200 hover:scale-110 font-medium inline-flex items-center gap-1',
          sizeStyles[size],
          variantStyles.cloud,
          className
        )}
        title={`${typeLabel}${isHierarchical ? `：${parts.join(' → ')}` : ''}`}
      >
        <span>#</span>
        {isHierarchical ? (
          <span className="inline-flex items-center gap-0.5">
            {parts.map((part, i) => (
              <span key={i} className="inline-flex items-center">
                {i > 0 && <span className="mx-0.5 opacity-50">/</span>}
                <span>{part}</span>
              </span>
            ))}
          </span>
        ) : (
          displayTag
        )}
      </button>
    )
  }

  // 默认样式（标签输入）
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md',
        variantStyles.default,
        sizeStyles[size],
        'animate-in fade-in-0 zoom-in-95 duration-200',
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
      title={`${typeLabel}${isHierarchical ? `：${parts.join(' → ')}` : ''}`}
    >
      <Hash className="h-3 w-3" />
      {isHierarchical ? (
        <span className="flex items-center gap-1">
          {parts.map((part, i) => (
            <span key={i} className="inline-flex items-center">
              {i > 0 && <span className="mx-0.5 text-blue-400/60">/</span>}
              <span>{part}</span>
            </span>
          ))}
        </span>
      ) : (
        displayTag
      )}
      {onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          className={cn('rounded-full p-0.5 transition-colors', hoverButtonStyle)}
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </span>
  )
}

