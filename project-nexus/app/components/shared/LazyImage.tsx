'use client'

import { useState, useEffect, useRef, ImgHTMLAttributes } from 'react'
import { Loader2, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onLoad' | 'onError'> {
  /** 图片 URL */
  src: string
  /** 替代文本 */
  alt: string
  /** 提前加载距离（默认 50px） */
  rootMargin?: string
  /** 自定义占位符（默认使用内置加载动画） */
  placeholder?: React.ReactNode
  /** 图片加载成功回调 */
  onLoad?: () => void
  /** 图片加载失败回调 */
  onError?: (error: string) => void
  /** 容器类名（用于占位符） */
  containerClassName?: string
  /** 是否显示加载状态（默认 true） */
  showLoader?: boolean
  /** 是否显示错误状态（默认 true） */
  showError?: boolean
}

/**
 * 懒加载图片组件
 * 使用 Intersection Observer 实现精确懒加载，节省带宽
 * 
 * @example
 * <LazyImage
 *   src="https://example.com/image.jpg"
 *   alt="示例图片"
 *   className="w-full h-auto"
 *   rootMargin="50px"
 * />
 */
export function LazyImage({
  src,
  alt,
  rootMargin = '50px',
  placeholder,
  onLoad,
  onError,
  className,
  containerClassName,
  showLoader = true,
  showError = true,
  ...props
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const imgRef = useRef<HTMLDivElement>(null)
  const imgElementRef = useRef<HTMLImageElement>(null)

  // Intersection Observer 监听可见性
  useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          setIsLoading(true)
          observer.disconnect()
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0.01 // 1% 可见即触发
      }
    )

    observer.observe(imgRef.current)

    return () => {
      observer.disconnect()
    }
  }, [rootMargin])

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
    <div ref={imgRef} className={cn("relative overflow-hidden", containerClassName)}>
      {/* 占位符或加载状态 */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
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

      {/* 图片 */}
      {isVisible && (
        <img
          ref={imgElementRef}
          src={src}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            isLoaded ? "opacity-100" : "opacity-0",
            hasError && "invisible",
            className
          )}
          onLoad={handleLoad}
          onError={handleError}
          {...props}
        />
      )}

      {/* 占位背景（防止布局抖动） */}
      {!isLoaded && !hasError && (
        <div className="absolute inset-0 bg-gray-900/10 animate-pulse" />
      )}
    </div>
  )
}

/**
 * 懒加载图片组件（无容器版本）
 * 适用于需要直接使用 img 标签的场景
 */
export function LazyImageRaw({
  src,
  alt,
  rootMargin = '50px',
  onLoad,
  onError,
  className,
  ...props
}: LazyImageProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [actualSrc, setActualSrc] = useState<string>()
  const imgRef = useRef<HTMLImageElement>(null)

  useEffect(() => {
    if (!imgRef.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      {
        root: null,
        rootMargin,
        threshold: 0.01
      }
    )

    observer.observe(imgRef.current)

    return () => {
      observer.disconnect()
    }
  }, [rootMargin])

  useEffect(() => {
    if (isVisible) {
      setActualSrc(src)
    }
  }, [isVisible, src])

  return (
    <img
      ref={imgRef}
      src={actualSrc}
      alt={alt}
      className={className}
      onLoad={onLoad}
      onError={() => onError?.(`图片加载失败: ${src}`)}
      {...props}
    />
  )
}



