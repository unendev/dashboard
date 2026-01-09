'use client'

import { useState, useEffect } from 'react'
import { X, Sparkles } from 'lucide-react'
import * as DialogPrimitive from '@radix-ui/react-dialog'
import { DiscordStyleInput } from './DiscordStyleInput'
import { cn } from '@/lib/utils'
import { useTreasureAIAssistant } from '@/app/store/treasure-ai-assistant'
import { TreasureAIChatPanel } from '../TreasureAIChatPanel'

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
  const { setContext, clearContext, isOpen: isAiOpen, closeSidebar, openSidebar } = useTreasureAIAssistant()

  useEffect(() => {
    setIsMounted(true)
  }, [])

  // 上下文检测：当Modal打开时，向AI助手发送上下文
  useEffect(() => {
    if (isOpen && initialData) {
      // 提取人类管理的标签（#领域/ 和 #概念/）
      const humanTags = (initialData.tags || []).filter(
        tag => tag.startsWith('#领域/') || tag.startsWith('#概念/')
      )

      setContext({
        type: mode === 'edit' ? 'edit' : 'create',
        treasureData: {
          title: initialData.title || '未命名',
          content: initialData.content || '',
          tags: humanTags,
        },
      })
    } else if (isOpen) {
      // 创建新宝藏，无初始数据
      setContext({
        type: 'create',
        treasureData: {
          title: '',
          content: '',
          tags: [],
        },
      })
    } else {
      // Modal关闭时清除上下文
      clearContext()
    }
  }, [isOpen, initialData, mode, setContext, clearContext])

  const handleClose = () => {
    clearContext()
    onClose()
  }

  if (!isMounted) {
    return null
  }

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={handleClose} modal={true}>
      <DialogPrimitive.Portal>
        {/* 背景遮罩 */}
        <DialogPrimitive.Overlay className="fixed inset-0 z-40 bg-transparent/0" />

        {/* 自定义内容 */}
        <DialogPrimitive.Content
          onPointerDownOutside={(e) => e.preventDefault()}
          onInteractOutside={(e) => e.preventDefault()}
          className={cn(
            "fixed left-[50%] top-[50%] z-50 translate-x-[-50%] translate-y-[-50%]",
            "flex items-start gap-1", // 紧凑布局：微小间距
            "w-auto max-w-[95vw]", // 宽度由内容决定（卡片宽度之和）
            "outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
            "data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95"
          )}
        >
          {/* 左侧卡片：主编辑区 */}
          <div className={cn(
            "bg-[#0f172a] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300",
            isAiOpen ? "w-[750px] max-w-[60vw]" : "w-[700px] max-w-[90vw]", // 宽度控制
            "max-h-[85vh]" // 卡片高度限制，内部滚动
          )}>
            {/* 头部 */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-full"></div>
                <DialogPrimitive.Title className="text-lg font-semibold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                  {mode === 'edit' ? '编辑宝藏' : '记录你的想法'}
                </DialogPrimitive.Title>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => isAiOpen ? closeSidebar() : openSidebar()}
                  className={cn(
                    "p-2 rounded-lg transition-colors flex items-center gap-2 text-sm",
                    isAiOpen
                      ? "bg-purple-500/20 text-purple-300 hover:bg-purple-500/30"
                      : "text-gray-400 hover:text-white hover:bg-gray-800"
                  )}
                  title={isAiOpen ? "关闭 AI 助手" : "打开 AI 助手"}
                >
                  <Sparkles className="w-4 h-4" />
                  {!isAiOpen && <span>AI 助手</span>}
                </button>
                <div className="w-px h-4 bg-gray-700 mx-1" />
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-300 transition-colors p-1"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* 输入区域 (自动滚动) */}
            <div className="flex-1 overflow-y-auto min-h-0 px-6 py-4">
              <DiscordStyleInput
                onSubmit={onSubmit}
                onCancel={handleClose}
                initialData={initialData}
                mode={mode}
                lastTags={lastTags}
                recentTags={recentTags}
              />
            </div>
          </div>

          {/* 右侧卡片：AI 助手 (独立渲染) */}
          {isAiOpen && (
            <div className="w-[400px] h-[600px] bg-[#0f172a] border border-gray-700/50 rounded-xl shadow-2xl overflow-hidden shrink-0 animate-in slide-in-from-left-4 fade-in duration-300">
              <TreasureAIChatPanel
                onClose={closeSidebar}
                className="h-full border-none bg-transparent shadow-none"
              />
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
