'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/app/components/ui/button'
import { Input } from '@/app/components/ui/input'
import { Textarea } from '@/app/components/ui/textarea'
import { Card } from '@/app/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/app/components/ui/dialog'
import { X, Upload, FileText, Image } from 'lucide-react'

export type TreasureType = 'TEXT' | 'IMAGE'

interface QuickCreateModalProps {
  isOpen: boolean
  onClose: () => void
  type: TreasureType
  onSubmit: (data: CreateTreasureData) => Promise<void>
}

export interface CreateTreasureData {
  title: string
  content?: string
  type: TreasureType
  tags: string[]
  images?: Array<{
    url: string
    alt?: string
    width?: number
    height?: number
    size?: number
  }>
}

export function QuickCreateModal({ 
  isOpen, 
  onClose, 
  type, 
  onSubmit 
}: QuickCreateModalProps) {
  const [formData, setFormData] = useState<CreateTreasureData>({
    title: '',
    content: '',
    type,
    tags: [],
    images: []
  })
  
  const [tagInput, setTagInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isMounted, setIsMounted] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // 确保组件在客户端挂载
  useEffect(() => {
    setIsMounted(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.title.trim()) return

    setIsSubmitting(true)
    try {
      console.log('Submitting form data:', formData)
      await onSubmit(formData)
      console.log('Form submitted successfully')
      handleClose()
    } catch (error) {
      console.error('Error creating treasure:', error)
      alert(`创建失败: ${error instanceof Error ? error.message : '未知错误'}`)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setFormData({
      title: '',
      content: '',
      type,
      tags: [],
      images: []
    })
    setTagInput('')
    onClose()
  }

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()]
      }))
      setTagInput('')
    }
  }

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return

    try {
      // 获取 OSS 上传签名（传递文件信息）
      const signatureUrl = new URL('/api/upload/oss/signature', window.location.origin)
      signatureUrl.searchParams.set('filename', files[0].name)
      signatureUrl.searchParams.set('contentType', files[0].type)
      
      const signatureResponse = await fetch(signatureUrl.toString())

      if (!signatureResponse.ok) {
        const errorData = await signatureResponse.json()
        throw new Error(`获取上传签名失败: ${errorData.error || signatureResponse.statusText}${errorData.missingVariables ? '\n缺失环境变量: ' + errorData.missingVariables.join(', ') : ''}`)
      }

      const signature = await signatureResponse.json()
      
      // 检查是否有错误
      if (signature.error) {
        throw new Error(`OSS 配置错误: ${signature.error}${signature.missingVariables ? '\n缺失: ' + signature.missingVariables.join(', ') : ''}`)
      }
      
      // 使用 FormData 方式上传到 OSS (与 DiscordStyleInput 保持一致)
      const formData = new FormData()
      formData.append('key', signature.key)
      formData.append('policy', signature.policy)
      formData.append('OSSAccessKeyId', signature.accessKeyId)
      formData.append('signature', signature.signature)
      formData.append('success_action_status', '200')
      formData.append('file', files[0])

      const uploadResponse = await fetch(signature.endpoint, {
        method: 'POST',
        body: formData,
      })

      if (!uploadResponse.ok) {
        throw new Error(`文件上传失败: ${uploadResponse.status} ${uploadResponse.statusText}`)
      }

      // 构建图片公开URL
      const publicUrl = `${signature.cdnUrl || signature.endpoint}/${signature.key}`
      
      // 添加上传成功的图片
      const uploadedImage = {
        url: publicUrl,
        alt: files[0].name,
        width: 0,
        height: 0,
        size: files[0].size
      }

      setFormData(prev => ({
        ...prev,
        images: [...(prev.images || []), uploadedImage]
      }))

      console.log('图片上传成功:', publicUrl)
    } catch (error) {
      console.error('图片上传失败:', error)
      alert(`图片上传失败: ${error instanceof Error ? error.message : '未知错误'}`)
    }
  }

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images?.filter((_, i) => i !== index) || []
    }))
  }

  const getTypeIcon = () => {
    switch (type) {
      case 'TEXT': return <FileText className="h-5 w-5" />
      case 'IMAGE': return <Image className="h-5 w-5" />
      default: return <FileText className="h-5 w-5" />
    }
  }

  const getTypeTitle = () => {
    switch (type) {
      case 'TEXT': return '创建文本宝藏'
      case 'IMAGE': return '创建图片宝藏'
      default: return '创建宝藏'
    }
  }

  // 在客户端挂载前不渲染模态框
  if (!isMounted) {
    return null
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent 
        className="max-w-2xl max-h-[90vh] overflow-y-auto"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getTypeIcon()}
            {getTypeTitle()}
          </DialogTitle>
          <DialogDescription>
            记录你的想法、感受或收藏
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 标题 */}
          <div>
            <label className="text-sm font-medium mb-2 block">标题 *</label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder="给你的宝藏起个名字..."
              required
            />
          </div>

          {/* 内容 */}
          {type === 'TEXT' && (
            <div>
              <label className="text-sm font-medium mb-2 block">内容</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData(prev => ({ ...prev, content: e.target.value }))}
                placeholder="写下你的想法..."
                rows={6}
              />
            </div>
          )}

          {/* 图片上传 */}
          {type === 'IMAGE' && (
            <div>
              <label className="text-sm font-medium mb-2 block">图片</label>
              <div className="space-y-4">
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  选择图片
                </Button>
                
                {/* 图片预览 */}
                {formData.images && formData.images.length > 0 && (
                  <div className="grid grid-cols-2 gap-4">
                    {formData.images.map((image, index) => (
                      <Card key={index} className="relative p-2">
                        <img
                          src={image.url}
                          alt={image.alt || `图片 ${index + 1}`}
                          className="w-full h-32 object-cover rounded"
                        />
                        <Button
                          type="button"
                          variant="destructive"
                          size="icon"
                          className="absolute top-2 right-2 h-6 w-6"
                          onClick={() => removeImage(index)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 标签 */}
          <div>
            <label className="text-sm font-medium mb-2 block">标签</label>
            <div className="flex gap-2 mb-2">
              <Input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="添加标签..."
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
              />
              <Button type="button" onClick={addTag} variant="outline">
                添加
              </Button>
            </div>
            {formData.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.tags.map((tag, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                  >
                    {tag}
                    <button
                      type="button"
                      onClick={() => removeTag(tag)}
                      className="hover:text-blue-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleClose}>
              取消
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.title.trim() || isSubmitting}
              className="min-w-[100px]"
            >
              {isSubmitting ? '创建中...' : '创建'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}


