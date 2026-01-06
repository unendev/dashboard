'use client'

import { useState } from 'react'
import { Card } from '@/app/components/ui/card'
import { Button } from '@/app/components/ui/button'
import { 
  FileText, 
  Calendar, 
  Tag, 
  Edit, 
  Trash2, 
  MoreVertical,
  Heart,
  Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownView } from '@/app/components/shared/MarkdownView'

interface TextCardProps {
  treasure: {
    id: string
    title: string
    content?: string
    tags: string[]
    createdAt: string
    updatedAt: string
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
}

export function TextCard({ 
  treasure, 
  onEdit, 
  onDelete, 
  className 
}: TextCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [showActions, setShowActions] = useState(false)

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const renderContent = () => {
    if (!treasure.content) return null
    
    return (
      <div className="prose prose-sm max-w-none">
        <MarkdownView content={treasure.content} variant="light" />
      </div>
    )
  }

  const shouldTruncate = treasure.content && treasure.content.length > 200

  return (
    <Card className={cn("p-6 hover:shadow-lg transition-shadow duration-200", className)}>
      {/* 头部 */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded-lg">
            <FileText className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg text-gray-900">{treasure.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Calendar className="h-4 w-4" />
              {formatDate(treasure.createdAt)}
            </div>
          </div>
        </div>
        
        <div className="relative">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowActions(!showActions)}
            className="h-8 w-8 p-0"
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
          
          {showActions && (
            <div className="absolute right-0 top-8 bg-white border rounded-lg shadow-lg py-1 z-10 min-w-[120px]">
              {onEdit && (
                <button
                  onClick={() => onEdit(treasure.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100"
                >
                  <Edit className="h-4 w-4" />
                  编辑
                </button>
              )}
              {onDelete && (
                <button
                  onClick={() => onDelete(treasure.id)}
                  className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-gray-100 text-red-600"
                >
                  <Trash2 className="h-4 w-4" />
                  删除
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 内容 */}
      {treasure.content && (
        <div className="mb-4">
          <div className={cn(
            "prose prose-sm max-w-none",
            !isExpanded && shouldTruncate && "line-clamp-4"
          )}>
            {renderContent()}
          </div>
          
          {shouldTruncate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="mt-2 text-blue-600 hover:text-blue-700"
            >
              {isExpanded ? '收起' : '展开'}
            </Button>
          )}
        </div>
      )}

      {/* 标签 */}
      {treasure.tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-4">
          {treasure.tags.map((tag, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs"
            >
              <Tag className="h-3 w-3" />
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* 底部操作 */}
      <div className="flex items-center justify-between pt-4 border-t">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" className="gap-2">
            <Heart className="h-4 w-4" />
            喜欢
          </Button>
          <Button variant="ghost" size="sm" className="gap-2">
            <Share2 className="h-4 w-4" />
            分享
          </Button>
        </div>
        
        <div className="text-xs text-gray-500">
          {treasure.updatedAt !== treasure.createdAt && '已编辑'}
        </div>
      </div>
    </Card>
  )
}