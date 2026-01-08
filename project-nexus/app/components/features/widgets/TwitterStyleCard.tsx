'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { MarkdownRenderer } from '@/lib/markdown'
import { Button } from '@/app/components/ui/button'
import Image from 'next/image'
import { LazyNextImage } from '@/app/components/shared/LazyNextImage'
import { ImageLightbox } from '../treasure/ImageLightbox'
import {
  Tag,
  Trash2,
  Edit,
  Image as ImageIcon,
  Wand
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getImageDisplayStrategy } from '@/lib/image-display-utils'
import { useIsMobile } from '@/app/hooks/useMediaQuery'

interface TwitterStyleCardProps {
  treasure: {
    id: string
    title: string
    content?: string
    type: 'TEXT' | 'IMAGE'
    tags: string[]
    createdAt: string
    updatedAt: string
    aiTags?: string[]
    images: Array<{
      id: string
      url: string
      alt?: string
      width?: number
      height?: number
    }>
  }
  onEdit?: (id: string) => void
  onDelete?: (id: string) => void
  className?: string
  hideCategoryAvatar?: boolean // 是否隐藏卡片内的分类头像区域
}

function TwitterStyleCardComponent({
  treasure,
  onEdit,
  onDelete,
  className,
  hideCategoryAvatar = false
}: TwitterStyleCardProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null)

  // 检测移动端
  const isMobile = useIsMobile()

  // 使用 useMemo 缓存格式化的日期，避免每次渲染都计算
  const formattedDate = useMemo(() => {
    const date = new Date(treasure.createdAt)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) {
      const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60))
      return `${diffInMinutes}分钟前`
    } else if (diffInHours < 24) {
      return `${diffInHours}小时前`
    } else if (diffInHours < 48) {
      return '昨天'
    } else if (diffInHours < 168) { // 一周内
      const days = Math.floor(diffInHours / 24)
      return `${days}天前`
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }
  }, [treasure.createdAt])

  const renderContent = () => {
    if (!treasure.content) return null

    // 自定义组件样式
    const customComponents = {
      h1: ({ children }: { children?: React.ReactNode }) => (
        <h1 className="text-2xl font-bold text-white mt-4 mb-3">
          {children}
        </h1>
      ),
      h2: ({ children }: { children?: React.ReactNode }) => (
        <h2 className="text-xl font-bold text-white mt-4 mb-2">
          {children}
        </h2>
      ),
      h3: ({ children }: { children?: React.ReactNode }) => (
        <h3 className="text-lg font-semibold text-white mt-3 mb-2">
          {children}
        </h3>
      ),
      p: ({ children }: { children?: React.ReactNode }) => (
        <p className="mb-2 text-white/90">
          {children}
        </p>
      ),
      strong: ({ children }: { children?: React.ReactNode }) => (
        <strong className="font-semibold text-white">
          {children}
        </strong>
      ),
      em: ({ children }: { children?: React.ReactNode }) => (
        <em className="italic text-white/80">
          {children}
        </em>
      ),
      blockquote: ({ children }: { children?: React.ReactNode }) => (
        <blockquote className="border-l-2 border-white/30 pl-3 italic text-white/70 my-2">
          {children}
        </blockquote>
      ),
      code: ({ children, className }: { children?: React.ReactNode; className?: string }) => {
        const isInline = !className
        if (isInline) {
          return (
            <code className="bg-white/10 px-1 py-0.5 rounded text-sm text-white/90">
              {children}
            </code>
          )
        }
        return (
          <code className={cn("text-white/90", className)}>
            {children}
          </code>
        )
      },
      pre: ({ children }: { children?: React.ReactNode }) => (
        <pre className="bg-[#0d1117] border border-white/10 rounded-lg p-3 my-2 text-sm overflow-x-auto">
          {children}
        </pre>
      ),
      ul: ({ children }: { children?: React.ReactNode }) => (
        <ul className="ml-4 mb-2 space-y-1 list-disc">
          {children}
        </ul>
      ),
      ol: ({ children }: { children?: React.ReactNode }) => (
        <ol className="ml-4 mb-2 space-y-1 list-decimal">
          {children}
        </ol>
      ),
      li: ({ children }: { children?: React.ReactNode }) => (
        <li className="text-white/90">
          {children}
        </li>
      ),
      a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-400 hover:text-blue-300 underline"
        >
          {children}
        </a>
      ),
      hr: () => (
        <hr className="border-white/20 my-4" />
      ),
      table: ({ children }: { children?: React.ReactNode }) => (
        <div className="overflow-x-auto my-4">
          <table className="min-w-full border border-white/20 rounded-lg">
            {children}
          </table>
        </div>
      ),
      th: ({ children }: { children?: React.ReactNode }) => (
        <th className="border border-white/20 px-3 py-2 bg-white/5 text-white font-semibold text-left">
          {children}
        </th>
      ),
      td: ({ children }: { children?: React.ReactNode }) => (
        <td className="border border-white/10 px-3 py-2 text-white/90">
          {children}
        </td>
      )
    }

    return (
      <div className="prose prose-sm prose-invert max-w-none">
        <MarkdownRenderer
          content={treasure.content}
          variant="dark"
          components={customComponents}
        />
      </div>
    )
  }

  const renderMedia = () => {
    // 只要有图片就显示，不限制类型
    if (treasure.images && treasure.images.length > 0) {
      const imageCount = treasure.images.length

      // 1张图：大图完整展示，有冲击力
      if (imageCount === 1) {
        const firstImage = treasure.images[0]
        const strategy = getImageDisplayStrategy(firstImage, isMobile)

        // 根据图片宽高比设置容器样式
        const aspectRatio = firstImage.width && firstImage.height
          ? `${firstImage.width} / ${firstImage.height}`
          : undefined

        return (
          <div
            className="mt-3 rounded-2xl overflow-hidden border border-white/10 bg-gray-900/20 flex items-center justify-center cursor-pointer group min-h-[200px]"
            onClick={() => setSelectedImageIndex(0)}
            style={aspectRatio ? { aspectRatio, maxHeight: strategy.maxHeight } : { maxHeight: strategy.maxHeight }}
          >
            <LazyNextImage
              src={firstImage.url}
              alt={firstImage.alt || treasure.title}
              width={firstImage.width || 1200}
              height={firstImage.height || 800}
              sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1200px"
              quality={85}
              className={cn(
                "w-full transition-transform duration-300",
                strategy.shouldScale ? "scale-105" : "group-hover:scale-105"
              )}
              containerClassName="w-full"
              objectFit={strategy.objectFit}
              rootMargin="100px"
            />
          </div>
        )
      }
      // 2张图：左右平铺，完整展示
      else if (imageCount === 2) {
        return (
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl overflow-hidden">
            {treasure.images.map((image, index) => {
              const strategy = getImageDisplayStrategy(image, isMobile)
              const aspectRatio = image.width && image.height
                ? `${image.width} / ${image.height}`
                : undefined
              return (
                <div
                  key={image.id}
                  className="relative bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center min-h-[200px]"
                  onClick={() => setSelectedImageIndex(index)}
                  style={aspectRatio ? { aspectRatio } : undefined}
                >
                  <LazyNextImage
                    src={image.url}
                    alt={image.alt || treasure.title}
                    width={image.width || 600}
                    height={image.height || 400}
                    sizes="(max-width: 640px) 320px, 600px"
                    quality={85}
                    className={cn(
                      "transition-transform duration-300",
                      strategy.shouldScale ? "scale-105" : "group-hover:scale-105"
                    )}
                    containerClassName="w-full h-full"
                    objectFit={strategy.objectFit}
                    rootMargin="100px"
                  />
                </div>
              )
            })}
          </div>
        )
      }
      // 3张图：1大2小布局，完整展示
      else if (imageCount === 3) {
        const firstImageStrategy = getImageDisplayStrategy(treasure.images[0], isMobile)

        const firstImageAspectRatio = treasure.images[0].width && treasure.images[0].height
          ? `${treasure.images[0].width} / ${treasure.images[0].height}`
          : undefined

        return (
          <div className="mt-3 grid grid-cols-2 gap-2">
            {/* 第一张大图 */}
            <div
              className="col-span-2 bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center min-h-[300px]"
              onClick={() => setSelectedImageIndex(0)}
              style={firstImageAspectRatio ? { aspectRatio: firstImageAspectRatio } : undefined}
            >
              <LazyNextImage
                src={treasure.images[0].url}
                alt={treasure.images[0].alt || treasure.title}
                width={treasure.images[0].width || 1000}
                height={treasure.images[0].height || 600}
                sizes="(max-width: 640px) 640px, 1000px"
                quality={85}
                className={cn(
                  "transition-transform duration-300",
                  firstImageStrategy.shouldScale ? "scale-105" : "group-hover:scale-105"
                )}
                containerClassName="w-full h-full"
                objectFit={firstImageStrategy.objectFit}
                rootMargin="100px"
              />
            </div>
            {/* 后两张小图 */}
            {treasure.images.slice(1, 3).map((image, index) => {
              const strategy = getImageDisplayStrategy(image, isMobile)
              const aspectRatio = image.width && image.height
                ? `${image.width} / ${image.height}`
                : undefined
              return (
                <div
                  key={image.id}
                  className="bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center min-h-[200px]"
                  onClick={() => setSelectedImageIndex(index + 1)}
                  style={aspectRatio ? { aspectRatio } : undefined}
                >
                  <LazyNextImage
                    src={image.url}
                    alt={image.alt || treasure.title}
                    width={image.width || 400}
                    height={image.height || 300}
                    sizes="(max-width: 640px) 160px, 400px"
                    quality={85}
                    className={cn(
                      "transition-transform duration-300",
                      strategy.shouldScale ? "scale-105" : "group-hover:scale-105"
                    )}
                    containerClassName="w-full h-full"
                    objectFit={strategy.objectFit}
                    rootMargin="100px"
                  />
                </div>
              )
            })}
          </div>
        )
      }
      // 4+张图：展示前3张，第4张显示"+N"
      else {
        const firstImageStrategy = getImageDisplayStrategy(treasure.images[0], isMobile)

        const firstImageAspectRatio = treasure.images[0].width && treasure.images[0].height
          ? `${treasure.images[0].width} / ${treasure.images[0].height}`
          : undefined

        return (
          <div className="mt-3">
            <div className="grid grid-cols-2 gap-2">
              {/* 第一张大图 */}
              <div
                className="col-span-2 bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center min-h-[300px]"
                onClick={() => setSelectedImageIndex(0)}
                style={firstImageAspectRatio ? { aspectRatio: firstImageAspectRatio } : undefined}
              >
                <LazyNextImage
                  src={treasure.images[0].url}
                  alt={treasure.images[0].alt || treasure.title}
                  width={treasure.images[0].width || 1000}
                  height={treasure.images[0].height || 600}
                  sizes="(max-width: 640px) 640px, 1000px"
                  quality={85}
                  className={cn(
                    "transition-transform duration-300",
                    firstImageStrategy.shouldScale ? "scale-105" : "group-hover:scale-105"
                  )}
                  containerClassName="w-full h-full"
                  objectFit={firstImageStrategy.objectFit}
                  rootMargin="100px"
                />
              </div>
              {/* 第2、3张小图 */}
              {treasure.images.slice(1, 3).map((image, index) => {
                const strategy = getImageDisplayStrategy(image, isMobile)
                const aspectRatio = image.width && image.height
                  ? `${image.width} / ${image.height}`
                  : undefined
                return (
                  <div
                    key={image.id}
                    className="bg-gray-900/20 rounded-xl overflow-hidden border border-white/10 cursor-pointer group flex items-center justify-center min-h-[200px]"
                    onClick={() => setSelectedImageIndex(index + 1)}
                    style={aspectRatio ? { aspectRatio } : undefined}
                  >
                    <LazyNextImage
                      src={image.url}
                      alt={image.alt || treasure.title}
                      width={image.width || 400}
                      height={image.height || 300}
                      sizes="(max-width: 640px) 160px, 400px"
                      quality={85}
                      className={cn(
                        "transition-transform duration-300",
                        strategy.shouldScale ? "scale-105" : "group-hover:scale-105"
                      )}
                      containerClassName="w-full h-full"
                      objectFit={strategy.objectFit}
                      rootMargin="100px"
                    />
                  </div>
                )
              })}
            </div>
            {/* 查看更多按钮 */}
            <button
              onClick={() => setSelectedImageIndex(0)}
              className="mt-2 w-full py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-white/70 hover:text-white transition-all flex items-center justify-center gap-2 group"
            >
              <ImageIcon className="w-4 h-4" />
              <span className="text-sm font-medium">查看全部 {imageCount} 张图片</span>
              <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        )
      }
    }

    return null
  }

  const shouldTruncate = treasure.content && treasure.content.length > 280

  return (
    <>
      <article className={cn(
        "relative border border-white/10 rounded-2xl bg-[#161b22] hover:bg-[#1c2128] transition-all duration-300 p-6 group shadow-lg hover:shadow-xl",
        className
      )}>
        <div className="flex-1 min-w-0">
          {/* 头部信息 */}
          <div className="flex items-start gap-3">
            {/* 头像区域 - 包含分类名称和头像 */}
            {!hideCategoryAvatar && (
              <div className="flex flex-col items-center gap-1">
                {/* 分类名称 */}
                {(() => {
                  const primaryCategory = treasure.tags.find(tag =>
                    ['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
                  )
                  if (primaryCategory) {
                    const categoryLabel: Record<string, string> = {
                      'Life': '生活',
                      'Knowledge': '知识',
                      'Thought': '思考',
                      'Root': '根源'
                    }
                    return (
                      <span className="text-xs text-white/60 font-medium whitespace-nowrap">
                        {categoryLabel[primaryCategory]}
                      </span>
                    )
                  }
                  return null
                })()}
                {/* 头像 - 使用主要分类emoji或首字母 */}
                <div className="w-10 h-10 rounded-full flex items-center justify-center bg-white/5 border border-white/10 group-hover:scale-110 transition-transform duration-300">
                  {(() => {
                    // 如果有主要分类，显示emoji
                    const primaryCategory = treasure.tags.find(tag =>
                      ['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)
                    )
                    if (primaryCategory) {
                      const categoryEmoji: Record<string, string> = {
                        'Life': '??',
                        'Knowledge': '??',
                        'Thought': '??',
                        'Root': '??'
                      }
                      return <span className="text-xl">{categoryEmoji[primaryCategory]}</span>
                    }
                    // 否则显示标题首字母
                    return <span className="text-white font-semibold text-sm">{treasure.title.charAt(0).toUpperCase()}</span>
                  })()}
                </div>
              </div>
            )}

            {/* 内容区域 */}
            <div className="flex-1 min-w-0">
              {/* 时间信息 */}
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white/60 text-sm">{formattedDate}</span>
              </div>

              {/* 标题 - 引用框风格 */}
              <div className={cn(
                "border-l-4 pl-4 mb-4",
                "text-white text-xl font-bold",
                treasure.type === 'TEXT' && "border-blue-400",
                treasure.type === 'IMAGE' && "border-green-400",
              )}>
                {treasure.title}
              </div>

              {/* 内容 */}
              {treasure.content && (
                <div className="text-white/90 mb-2">
                  <div className={cn(
                    "prose prose-sm max-w-none",
                    !isExpanded && shouldTruncate && "line-clamp-4"
                  )}>
                    {renderContent()}
                  </div>

                  {shouldTruncate && (
                    <button
                      onClick={() => setIsExpanded(!isExpanded)}
                      className="text-blue-400 hover:text-blue-300 text-sm mt-1 transition-colors"
                    >
                      {isExpanded ? '收起' : '展开'}
                    </button>
                  )}
                </div>
              )}

              {/* 媒体内容 */}
              {renderMedia()}

              {/* 主题标签 - 只显示非主要分类的标签 */}
              {treasure.tags.some(tag => !['Life', 'Knowledge', 'Thought', 'Root'].includes(tag)) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {treasure.tags
                    .filter(tag => !['Life', 'Knowledge', 'Thought', 'Root'].includes(tag))
                    .map((tag, index) => {
                      // 处理层级标签的显示
                      const parts = tag.split('/')
                      const isHierarchical = parts.length > 1

                      return (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors bg-white/10 border-white/20 text-white/80 hover:bg-white/20"
                        >
                          <Tag className="h-3 w-3" />
                          {isHierarchical ? (
                            <span className="flex items-center gap-0.5">
                              {parts.map((part, i) => (
                                <span key={i} className="flex items-center">
                                  {i > 0 && <span className="text-white/40 mx-0.5">/</span>}
                                  <span className={i === parts.length - 1 ? "font-medium" : "text-white/60"}>
                                    {part}
                                  </span>
                                </span>
                              ))}
                            </span>
                          ) : (
                            tag
                          )}
                        </span>
                      )
                    })}
                </div>
              )}

              {/* AI 生成的标签 */}
              {treasure.aiTags && treasure.aiTags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2 pt-2 border-t border-dashed border-white/10">
                  {treasure.aiTags.map((tag, index) => {
                    const parts = tag.split('/');
                    const isHierarchical = parts.length > 1;
                    return (
                      <span
                        key={`ai-${index}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border transition-colors bg-green-500/10 border-green-500/20 text-green-300 hover:bg-green-500/20"
                      >
                        <Wand className="h-3 w-3" />
                        {isHierarchical ? (
                          <span className="flex items-center gap-0.5">
                            {parts.map((part, i) => (
                              <span key={i} className="flex items-center">
                                {i > 0 && <span className="text-green-300/50 mx-0.5">/</span>}
                                <span className={i === parts.length - 1 ? "font-medium" : "text-green-300/70"}>
                                  {part}
                                </span>
                              </span>
                            ))}
                          </span>
                        ) : (
                          tag
                        )}
                      </span>
                    );
                  })}
                </div>
              )}

              {/* 操作按钮 */}
              <div className="flex items-center justify-end mt-3 gap-2">
                {onEdit && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onEdit(treasure.id)
                    }}
                    className="gap-2 text-white/60 hover:text-yellow-400 hover:bg-yellow-500/10 transition-all duration-200"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                )}

                {onDelete && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDelete(treasure.id)
                    }}
                    className="gap-2 text-white/60 hover:text-red-400 hover:bg-red-500/10 transition-all duration-200"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* 图片预览模态框 - 使用新的 ImageLightbox 组件 */}
      <ImageLightbox
        images={treasure.images.map((img) => ({
          id: img.id,
          url: img.url,
          alt: img.alt,
          width: img.width,
          height: img.height,
        }))}
        initialIndex={selectedImageIndex ?? 0}
        isOpen={selectedImageIndex !== null}
        onClose={() => setSelectedImageIndex(null)}
        title={treasure.title}
      />
    </>
  )
}

// 使用 React.memo 优化性能，避免不必要的重渲染
export const TwitterStyleCard = memo(TwitterStyleCardComponent, (prevProps, nextProps) => {
  // 自定义比较函数，只在关键属性变化时才重新渲染
  return (
    prevProps.treasure.id === nextProps.treasure.id &&
    prevProps.treasure.updatedAt === nextProps.treasure.updatedAt &&
    prevProps.hideCategoryAvatar === nextProps.hideCategoryAvatar &&
    prevProps.className === nextProps.className
  )
})

TwitterStyleCard.displayName = 'TwitterStyleCard'
