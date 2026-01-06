'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Card } from '@/app/components/ui/card'
import { 
  Bold, 
  Italic, 
  Link, 
  List, 
  Code, 
  Quote, 
  Image as ImageIcon,
  Send
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface DiscordMarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  onSubmit?: () => void
  className?: string
  maxLength?: number
}

export function DiscordMarkdownEditor({
  value,
  onChange,
  placeholder = "分享你的想法...",
  onSubmit,
  className,
  maxLength = 2000
}: DiscordMarkdownEditorProps) {
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 自动调整高度
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [value])

  const insertText = (before: string, after: string = '', placeholder: string = '') => {
    const textarea = textareaRef.current
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selectedText = value.substring(start, end)
    const textToInsert = selectedText || placeholder

    const newValue = 
      value.substring(0, start) + 
      before + textToInsert + after + 
      value.substring(end)

    onChange(newValue)

    // 设置光标位置
    setTimeout(() => {
      const newCursorPos = start + before.length + textToInsert.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      textarea.focus()
    }, 0)
  }

  const formatText = (format: string) => {
    switch (format) {
      case 'bold':
        insertText('**', '**', '粗体文本')
        break
      case 'italic':
        insertText('*', '*', '斜体文本')
        break
      case 'code':
        insertText('`', '`', '代码')
        break
      case 'codeblock':
        insertText('```\n', '\n```', '代码块')
        break
      case 'quote':
        insertText('> ', '', '引用文本')
        break
      case 'link':
        insertText('[', '](url)', '链接文本')
        break
      case 'list':
        insertText('- ', '', '列表项')
        break
      case 'image':
        insertText('![', '](image-url)', '图片描述')
        break
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey && onSubmit) {
      e.preventDefault()
      onSubmit()
    }
  }

  const renderPreview = () => {
    // 简单的 Markdown 预览渲染
    const lines = value.split('\n')
    return lines.map((line, index) => {
      if (line.startsWith('**') && line.endsWith('**')) {
        return <strong key={index}>{line.slice(2, -2)}</strong>
      }
      if (line.startsWith('*') && line.endsWith('*')) {
        return <em key={index}>{line.slice(1, -1)}</em>
      }
      if (line.startsWith('> ')) {
        return <blockquote key={index} className="border-l-4 border-gray-300 pl-4 italic">{line.slice(2)}</blockquote>
      }
      if (line.startsWith('- ')) {
        return <li key={index}>{line.slice(2)}</li>
      }
      if (line.startsWith('```')) {
        return <pre key={index} className="bg-gray-100 p-2 rounded">{line.slice(3)}</pre>
      }
      return <p key={index}>{line}</p>
    })
  }

  return (
    <Card className={cn("p-4", className)}>
      {/* 工具栏 */}
      <div className="flex items-center gap-2 mb-3 pb-3 border-b">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('bold')}
          className="h-8 w-8 p-0"
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('italic')}
          className="h-8 w-8 p-0"
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('code')}
          className="h-8 w-8 p-0"
        >
          <Code className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('quote')}
          className="h-8 w-8 p-0"
        >
          <Quote className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('link')}
          className="h-8 w-8 p-0"
        >
          <Link className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('list')}
          className="h-8 w-8 p-0"
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => formatText('image')}
          className="h-8 w-8 p-0"
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        
        <div className="flex-1" />
        
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsPreviewMode(!isPreviewMode)}
          className="h-8 px-3"
        >
          {isPreviewMode ? '编辑' : '预览'}
        </Button>
      </div>

      {/* 编辑器/预览区域 */}
      <div className="min-h-[120px]">
        {isPreviewMode ? (
          <div className="prose prose-sm max-w-none">
            {renderPreview()}
          </div>
        ) : (
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className="w-full resize-none border-none outline-none bg-transparent text-sm leading-relaxed"
            style={{ minHeight: '120px' }}
            maxLength={maxLength}
          />
        )}
      </div>

      {/* 底部信息 */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t">
        <div className="text-xs text-gray-500">
          {value.length}/{maxLength} 字符
        </div>
        <div className="text-xs text-gray-500">
          按 Ctrl+Enter 发送
        </div>
      </div>

      {/* 提交按钮 */}
      {onSubmit && (
        <div className="flex justify-end mt-3">
          <Button
            onClick={onSubmit}
            disabled={!value.trim()}
            size="sm"
            className="gap-2"
          >
            <Send className="h-4 w-4" />
            发送
          </Button>
        </div>
      )}
    </Card>
  )
}



