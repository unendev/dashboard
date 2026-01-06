'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { DiscordStyleInput } from './DiscordStyleInput'
import { cn } from '@/lib/utils'

export interface TreasureData {
  title: string
  content: string
  type: 'TEXT' | 'IMAGE'
  tags: string[]
  theme?: string[] | null // 【修改】支持多个theme，作为数组
  skipAiTagging?: boolean
  images: Array<{
    url: string
    alt?: string
    width?: number
    height?: number
    size?: number
  }>
}

interface TreasureInputModalProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: TreasureData) => Promise<void>
  initialData?: TreasureData & { id?: string }
  mode?: 'create' | 'edit'
  lastTags?: string[]
  recentTags?: string[] // 【新增】
}

export function TreasureInputModal({ 
  isOpen, 
  onClose, 
  onSubmit,
  initialData,
  mode = 'create',
  lastTags,
  recentTags // 【新增】
}: TreasureInputModalProps) {
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleClose = () => {
    onClose()
  }

  if (!isMounted) {
    return null
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose}>
      <DialogPrimitive.Portal>
        {/* 自定义内容 - 无遮罩层 */}
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "max-w-2xl w-[90vw] max-h-[90vh] p-0 overflow-hidden",
            "bg-gray-900/95 backdrop-blur-xl border border-gray-700 rounded-lg",
            "shadow-2xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* 头部 */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
              <DialogPrimitive.Title className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                {mode === 'edit' ? '编辑宝藏' : '记录你的想法'}
              </DialogPrimitive.Title>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* 输入区域 */}
          <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 80px)' }}>
            <DiscordStyleInput
              onSubmit={onSubmit}
              onCancel={handleClose}
              initialData={initialData}
              mode={mode}
              lastTags={lastTags}
              recentTags={recentTags} // 【新增】
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
