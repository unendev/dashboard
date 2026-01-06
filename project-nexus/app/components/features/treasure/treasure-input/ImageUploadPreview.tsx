'use client'

import { useState } from 'react'
import { X, Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LazyImageRaw } from '@/app/components/shared/LazyImage'

interface UploadingImage {
  id: string
  file: File
  progress: number
}

interface UploadedImage {
  url: string
  alt?: string
  width?: number
  height?: number
  size?: number
}

interface ImageUploadPreviewProps {
  images: UploadedImage[]
  uploadingImages: UploadingImage[]
  onRemove: (index: number) => void
}

function ImagePreviewItem({ 
  image, 
  index, 
  onRemove 
}: { 
  image: UploadedImage
  index: number
  onRemove: (index: number) => void
}) {
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  // 根据图片实际宽高比设置容器样式
  const aspectRatio = image.width && image.height 
    ? `${image.width} / ${image.height}` 
    : undefined

  return (
    <div
      className="relative group rounded-lg overflow-hidden bg-gray-100 border border-gray-200 min-h-[200px]"
      style={aspectRatio ? { aspectRatio } : undefined}
    >
      {/* 加载状态 */}
      {isLoading && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-200">
          <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-red-50 text-red-500">
          <AlertCircle className="h-8 w-8 mb-2" />
          <span className="text-xs">加载失败</span>
        </div>
      )}

      {/* 图片 */}
      <LazyImageRaw
        src={image.url}
        alt={image.alt || `图片 ${index + 1}`}
        className={cn(
          "w-full h-full object-contain transition-opacity",
          isLoading && "opacity-0",
          hasError && "hidden"
        )}
        onLoad={() => {
          setIsLoading(false)
          setHasError(false)
        }}
        onError={() => {
          console.error('图片加载失败:', image.url)
          setIsLoading(false)
          setHasError(true)
        }}
        rootMargin="50px"
      />
      
      {/* 删除按钮 */}
      <button
        type="button"
        onClick={() => onRemove(index)}
        className={cn(
          "absolute top-2 right-2",
          "w-6 h-6 rounded-full",
          "bg-black/50 hover:bg-black/70",
          "text-white",
          "flex items-center justify-center",
          "opacity-0 group-hover:opacity-100",
          "transition-opacity duration-200"
        )}
      >
        <X className="h-4 w-4" />
      </button>

      {/* 文件大小 */}
      {image.size && !hasError && (
        <div className="absolute bottom-2 left-2 px-2 py-0.5 bg-black/50 text-white text-xs rounded">
          {formatFileSize(image.size)}
        </div>
      )}
    </div>
  )
}

export function ImageUploadPreview({ 
  images, 
  uploadingImages, 
  onRemove 
}: ImageUploadPreviewProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-600">图片</label>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {/* 已上传的图片 */}
        {images.map((image, index) => (
          <ImagePreviewItem
            key={index}
            image={image}
            index={index}
            onRemove={onRemove}
          />
        ))}

        {/* 上传中的图片 */}
        {uploadingImages.map((uploading) => {
          // 尝试从文件获取图片尺寸（如果可能）
          const file = uploading.file
          return (
          <div
            key={uploading.id}
            className="relative rounded-lg overflow-hidden bg-gray-100 border border-gray-200 min-h-[200px]"
          >
            {/* 预览图 */}
            <img
              src={URL.createObjectURL(uploading.file)}
              alt="上传中"
              className="w-full h-full object-cover opacity-50"
            />
            
            {/* 上传进度 */}
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/20">
              <Loader2 className="h-8 w-8 text-white animate-spin mb-2" />
              <div className="text-white text-sm font-medium">
                {uploading.progress}%
              </div>
            </div>

            {/* 进度条 */}
            <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/20">
              <div
                className="h-full bg-blue-500 transition-all duration-300"
                style={{ width: `${uploading.progress}%` }}
              />
            </div>
          </div>
          )
        })}
      </div>
    </div>
  )
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}



