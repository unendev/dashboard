'use client'

import { useState, useRef, useEffect } from 'react'
import { Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { TreasureData } from './TreasureInputModal'
import { ImageUploadPreview } from './ImageUploadPreview'
import { PrimaryCategorySelector } from './PrimaryCategorySelector'
import { TagInput } from './TagInput'
import { HierarchicalTag } from '@/app/components/shared/HierarchicalTag'
import { InputToolbar } from './InputToolbar'

// Hooks
import { useTreasureState } from '@/app/hooks/useTreasureState'
import { useOssUpload } from '@/app/hooks/useOssUpload'

interface DiscordStyleInputProps {
  onSubmit: (data: TreasureData) => Promise<void>
  onCancel: () => void
  initialData?: TreasureData & { id?: string }
  mode?: 'create' | 'edit'
  lastTags?: string[]
  recentTags?: string[]
}

export function DiscordStyleInput({ onSubmit, onCancel, initialData, mode = 'create', lastTags, recentTags }: DiscordStyleInputProps) {
  // 1. State Management
  const { 
    content, setContent,
    images, setImages,
    uploadingImages, setUploadingImages,
    primaryCategories, setPrimaryCategories,
    topicTags, setTopicTags,
    defaultTags, setDefaultTags
  } = useTreasureState(initialData, mode, lastTags)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([])
  const [skipAiTagging, setSkipAiTagging] = useState(false)
  const [suggestedDomainTags, setSuggestedDomainTags] = useState<string[]>([])
  const [suggestedConceptTags, setSuggestedConceptTags] = useState<string[]>([])
  const [isSuggesting, setIsSuggesting] = useState(false)
  const [suggestError, setSuggestError] = useState<string | null>(null)

  // 2. Logic Hooks
  const { upload } = useOssUpload()

  // Refs
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Effects
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
    }
  }, [content])

  useEffect(() => {
    setTimeout(() => textareaRef.current?.focus(), 100)
  }, [])

  useEffect(() => {
    fetch('/api/treasures/tags')
      .then(res => res.ok ? res.json() : [])
      .then(tags => setTagSuggestions(tags
        .map((t: any) => t.name)
        .filter((tag: string) => tag.startsWith('#领域/') || tag.startsWith('#概念/'))
      ))
      .catch(console.error)
  }, [])

  // Handlers
  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value
    setContent(newContent)
  }

  const handleUploadFiles = async (files: File[]) => {
    const imageFiles = files.filter(f => f.type.startsWith('image/'))
    
    for (const file of imageFiles) {
      const uploadId = Math.random().toString(36).substr(2, 9)
      
      setUploadingImages(prev => [...prev, { id: uploadId, file, progress: 0 }])

      try {
        const result = await upload(file, {
          onProgress: (progress) => {
            setUploadingImages(prev => prev.map(img => img.id === uploadId ? { ...img, progress } : img))
          }
        })

        setImages(prev => [...prev, {
          url: result.signedUrl,
          originalUrl: result.originalUrl,
          alt: file.name,
          size: file.size
        }])
      } catch (error) {
        alert(`上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
      } finally {
        setUploadingImages(prev => prev.filter(img => img.id !== uploadId))
      }
    }
  }

  const handleCancel = () => {
    setSkipAiTagging(false)
    onCancel()
  }

  const handleSubmit = async () => {
    if (!content.trim() && images.length === 0) return
    if (uploadingImages.length > 0) {
      alert('请等待图片上传完成')
      return
    }

    setIsSubmitting(true)
    const savedContent = content
    const savedImages = images

    try {
      const extractTitle = (text: string) => text.split('\n').filter(line => line.trim())[0] || '未命名'
      const title = extractTitle(content)
      const contentWithoutTitle = content.split('\n').slice(1).join('\n').trim()
      
      let type: TreasureData['type'] = 'TEXT'
      if (images.length > 0) type = 'IMAGE'

      const data: TreasureData = {
        title,
        content: contentWithoutTitle,
        type,
        tags: topicTags.length > 0 ? topicTags : defaultTags,
        theme: primaryCategories.length > 0 ? primaryCategories.map(c => c.toLowerCase()) : null,
        ...(mode === 'create' && { skipAiTagging }),
        images: images.map(img => ({
          url: img.originalUrl || img.url,
          alt: img.alt,
          width: img.width,
          height: img.height,
          size: img.size
        })),
      }

      await onSubmit(data)
      handleCancel()
    } catch (error) {
      console.error('Submit error:', error)
      setContent(savedContent)
      setImages(savedImages)
      alert('提交失败，请稍后重试')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleUseLastTags = () => {
    if (!lastTags) return
    const primaryCategoryList = ['Life', 'Knowledge', 'Thought', 'Root']
    setPrimaryCategories(lastTags.filter(tag => primaryCategoryList.includes(tag)))
    setTopicTags(lastTags.filter(tag => !primaryCategoryList.includes(tag)))
    setDefaultTags(lastTags)
  }

  const handleSuggestTags = async () => {
    if (!content.trim() && images.length === 0) {
      alert('请先输入内容')
      return
    }

    setIsSuggesting(true)
    setSuggestError(null)

    try {
      const extractTitle = (text: string) => text.split('\n').filter(line => line.trim())[0] || '未命名'
      const title = extractTitle(content)
      const contentWithoutTitle = content.split('\n').slice(1).join('\n').trim()

      const response = await fetch('/api/treasures/ai-suggest-tags', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, content: contentWithoutTitle })
      })

      if (!response.ok) {
        throw new Error(`AI建议失败: ${response.status}`)
      }

      const data = await response.json()
      setSuggestedDomainTags(Array.isArray(data.domain) ? data.domain : [])
      setSuggestedConceptTags(Array.isArray(data.concept) ? data.concept : [])
    } catch (error) {
      console.error('Suggest tags error:', error)
      setSuggestError('AI建议失败，请稍后重试')
    } finally {
      setIsSuggesting(false)
    }
  }

  const canSubmit = primaryCategories.length > 0 && (!!content.trim() || images.length > 0) && !isSubmitting && uploadingImages.length === 0
  const availableDomainSuggestions = suggestedDomainTags.filter(tag => !topicTags.includes(tag))
  const availableConceptSuggestions = suggestedConceptTags.filter(tag => !topicTags.includes(tag))

  return (
    <div 
      ref={containerRef}
      className="space-y-4"
      onDrop={(e) => {
        e.preventDefault(); setIsDragging(false);
        handleUploadFiles(Array.from(e.dataTransfer?.files || []));
      }}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
    >
      <PrimaryCategorySelector value={primaryCategories} onChange={setPrimaryCategories} />

      {recentTags && recentTags.length > 0 && (
        <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-700/50">
          <span className="text-sm text-gray-400 mr-1">最近使用:</span>
          {recentTags.map(tag => (
            <HierarchicalTag
              key={tag} tag={tag} variant="default" size="sm"
              onClick={() => !topicTags.includes(tag) && setTopicTags(prev => [...prev, tag])}
            />
          ))}
        </div>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-gray-700/50">
        <span className="text-sm text-gray-400">AI建议标签</span>
        <button
          type="button"
          onClick={handleSuggestTags}
          disabled={isSuggesting}
          className={cn(
            "text-xs px-2 py-1 rounded border border-white/10 hover:bg-white/5 transition-colors",
            isSuggesting ? "text-white/40" : "text-white/70"
          )}
        >
          {isSuggesting ? '生成中...' : '生成建议'}
        </button>
      </div>

      {(availableDomainSuggestions.length > 0 || availableConceptSuggestions.length > 0) && (
        <div className="space-y-2">
          {availableDomainSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 mr-1">领域:</span>
              {availableDomainSuggestions.map(tag => (
                <HierarchicalTag
                  key={tag}
                  tag={tag}
                  variant="default"
                  size="sm"
                  onClick={() => setTopicTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
                />
              ))}
            </div>
          )}
          {availableConceptSuggestions.length > 0 && (
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-gray-400 mr-1">概念:</span>
              {availableConceptSuggestions.map(tag => (
                <HierarchicalTag
                  key={tag}
                  tag={tag}
                  variant="default"
                  size="sm"
                  onClick={() => setTopicTags(prev => prev.includes(tag) ? prev : [...prev, tag])}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {suggestError && (
        <div className="text-xs text-red-400">{suggestError}</div>
      )}

      <TagInput
        tags={topicTags}
        onChange={(newTags) => {
          setTopicTags(newTags)
          if (newTags.length > 0 && defaultTags.length > 0) setDefaultTags([])
        }}
        suggestions={tagSuggestions}
        maxTags={10}
        placeholderTags={topicTags.length === 0 ? defaultTags : []}
        onPlaceholderFocus={() => setDefaultTags([])}
      />

      {lastTags && lastTags.length > 0 && (
        <div className="flex justify-end">
          <button onClick={handleUseLastTags} className="text-xs text-gray-400 hover:text-white underline">使用上次标签</button>
        </div>
      )}

      <div className={cn("relative rounded-lg transition-all", isDragging && "ring-2 ring-blue-400 bg-blue-900/50")}>
        {isDragging && (
          <div className="absolute inset-0 flex items-center justify-center bg-blue-900/90 backdrop-blur-sm rounded-lg z-10 pointer-events-none">
            <div className="text-center">
              <Paperclip className="h-12 w-12 text-blue-400 mx-auto mb-2" />
              <p className="text-blue-300 font-medium">释放以上传图片</p>
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={content}
          onChange={handleContentChange}
          onPaste={(e) => {
            const items = e.clipboardData?.items
            if (items) handleUploadFiles(Array.from(items).filter(i => i.type.startsWith('image/')).map(i => i.getAsFile()!).filter(Boolean))
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); handleSubmit(); }
            if (e.key === 'Escape') {
               handleCancel();
            }
          }}
          placeholder="分享你的想法..."
          className="w-full resize-none border-0 rounded-lg bg-gray-800 focus:bg-gray-750 px-4 py-3 text-base leading-relaxed text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
          style={{ minHeight: '120px' }}
          maxLength={10000}
        />

      </div>

      {(images.length > 0 || uploadingImages.length > 0) && (
        <ImageUploadPreview
          images={images}
          uploadingImages={uploadingImages}
          onRemove={(index) => setImages(prev => prev.filter((_, i) => i !== index))}
        />
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={(e) => {
         handleUploadFiles(Array.from(e.target.files || []));
         e.target.value = '';
      }} className="hidden" />

      <InputToolbar
        imagesCount={images.length}
        charCount={content.length}
        maxChars={10000}
        isSubmitting={isSubmitting}
        canSubmit={canSubmit}
        onCancel={handleCancel}
        onSubmit={handleSubmit}
        onFileSelect={() => fileInputRef.current?.click()}
        showAiToggle={mode === 'create'}
        skipAiTagging={skipAiTagging}
        onToggleAiTagging={() => setSkipAiTagging(prev => !prev)}
      />
    </div>
  )
}
