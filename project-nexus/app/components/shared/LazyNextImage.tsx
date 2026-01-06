'use client'

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LazyNextImageProps {
  /** 图片 URL */
  src: string
  /** 替代文本 */
  alt: string
  /** 图片原始宽度（用于 Next.js Image 优化） */
  width?: number
  /** 图片原始高度（用于 Next.js Image 优化） */
  height?: number
  /** 响应式尺寸配置 */
  sizes?: string
  /** 图片质量 (1-100) */
  quality?: number
  /** 图片优先级（首屏图片设为 true） */
  priority?: boolean
  /** 提前加载距离（默认 50px） */
  rootMargin?: string
  /** CSS 类名 */
  className?: string
  /** 容器类名 */
  containerClassName?: string
  /** 自定义占位符 */
  placeholder?: React.ReactNode
  /** 是否显示加载状态（默认 true） */
  showLoader?: boolean
  /** 是否显示错误状态（默认 true） */
  showError?: boolean
  /** 图片加载成功回调 */
  onLoad?: () => void
  /** 图片加载失败回调 */
  onError?: (error: string) => void
  /** 对象适配方式 */
  objectFit?: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down'
  /** 对象位置 */
  objectPosition?: string
  /** 填充模式（不需要设置 width/height） */
  fill?: boolean
}

/**
 * 懒加载 Next.js Image 组件
 * 结合 Next.js Image 优化和自定义精确懒加载
 * 
 * 优势：
 * - ✅ 精确控制加载时机（仅提前 50-100px）
 * - ✅ 自动生成响应式图片（srcset）
 * - ✅ 自动格式转换（WebP、AVIF）
 * - ✅ 自动尺寸优化
 * - ✅ 防止布局抖动
 * 
 * @example
 * <LazyNextImage
 *   src="https://example.oss.aliyuncs.com/image.jpg"
 *   alt="示例图片"
 *   width={1200}
 *   height={800}
 *   sizes="(max-width: 640px) 640px, (max-width: 1024px) 1024px, 1200px"
 *   rootMargin="100px"
 * />
 */
export function LazyNextImage({
  src,
  alt,
  width,
  height,
  sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw',
  quality = 85,
  priority = false,
  rootMargin = '50px',
  className,
  containerClassName,
  placeholder,
  showLoader = true,
  showError = true,
  onLoad,
  onError,
  objectFit = 'cover',
  objectPosition = 'center',
  fill = false,
}: LazyNextImageProps) {
  const [shouldLoad, setShouldLoad] = useState(priority) // priority 图片立即加载
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Intersection Observer 精确控制加载时机
  useEffect(() => {
    // priority 图片跳过懒加载
    if (priority) {
      setIsLoading(true)
      return
    }

    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true)
          setIsLoading(true)
          observer.disconnect()
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0.01
      }
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [priority, rootMargin])

  // 处理图片加载成功
  const handleLoad = () => {
    setIsLoading(false)
    setIsLoaded(true)
    setHasError(false)
    onLoad?.()
  }

  // 处理图片加载失败
  const handleError = () => {
    setIsLoading(false)
    setHasError(true)
    const errorMsg = `图片加载失败: ${src}`
    console.error(errorMsg)
    onError?.(errorMsg)
  }

  return (
    <div 
      ref={containerRef} 
      className={cn(
        "relative overflow-hidden",
        containerClassName
      )}
      style={
        !fill && width && height
          ? { aspectRatio: `${width} / ${height}` }
          : undefined
      }
    >
      {/* 占位符或加载状态 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/10">
          {placeholder || (
            showLoader && isLoading && (
              <div className="animate-pulse flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-white/40 animate-spin" />
              </div>
            )
          )}
        </div>
      )}

      {/* 错误状态 */}
      {hasError && showError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900/20">
          <AlertCircle className="h-8 w-8 text-red-400/60 mb-2" />
          <span className="text-xs text-red-400/60">加载失败</span>
        </div>
      )}

      {/* Next.js 优化图片 */}
      {shouldLoad && !hasError && (
        fill ? (
          <Image
            src={src}
            alt={alt}
            fill
            sizes={sizes}
            quality={quality}
            className={cn(
              "transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0",
              className
            )}
            style={{ objectFit, objectPosition }}
            onLoad={handleLoad}
            onError={handleError}
            priority={priority}
          />
        ) : (
          <Image
            src={src}
            alt={alt}
            width={width || 1200}
            height={height || 800}
            sizes={sizes}
            quality={quality}
            className={cn(
              "transition-opacity duration-300",
              isLoaded ? "opacity-100" : "opacity-0",
              className
            )}
            style={{ objectFit, objectPosition }}
            onLoad={handleLoad}
            onError={handleError}
            priority={priority}
          />
        )
      )}

      {/* 占位背景（防止布局抖动） */}
      {!isLoaded && !hasError && shouldLoad && (
        <div className="absolute inset-0 bg-gray-900/5 animate-pulse" />
      )}
    </div>
  )
}

/**
 * 预设配置：移动端优先
 */
export function LazyNextImageMobile(props: LazyNextImageProps) {
  return (
    <LazyNextImage
      {...props}
      sizes="(max-width: 640px) 640px, (max-width: 768px) 768px, 1024px"
      quality={80}
    />
  )
}

/**
 * 预设配置：桌面端优先
 */
export function LazyNextImageDesktop(props: LazyNextImageProps) {
  return (
    <LazyNextImage
      {...props}
      sizes="(max-width: 1024px) 1024px, (max-width: 1280px) 1280px, 1920px"
      quality={90}
    />
  )
}



