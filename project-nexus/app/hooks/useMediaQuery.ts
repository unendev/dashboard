'use client'

import { useState, useEffect } from 'react'

/**
 * 响应式媒体查询 Hook
 * 用于检测屏幕尺寸和设备类型
 * 
 * @param query CSS 媒体查询字符串，如 '(max-width: 640px)'
 * @returns 是否匹配查询条件
 * 
 * @example
 * const isMobile = useMediaQuery('(max-width: 640px)')
 * const isTablet = useMediaQuery('(min-width: 641px) and (max-width: 1024px)')
 */
export function useMediaQuery(query: string): boolean {
  // SSR 安全：初始状态为 false
  const [matches, setMatches] = useState(false)

  useEffect(() => {
    // 检查是否在浏览器环境
    if (typeof window === 'undefined' || !window.matchMedia) {
      return
    }

    const mediaQuery = window.matchMedia(query)
    
    // 设置初始值
    setMatches(mediaQuery.matches)

    // 监听变化
    const handler = (event: MediaQueryListEvent) => {
      setMatches(event.matches)
    }

    // 兼容旧版浏览器
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handler)
    } else {
      // 旧版 API 兼容 - 使用类型断言处理旧浏览器API
      const mediaQueryWithAddListener = mediaQuery as MediaQueryList & { addListener: (handler: (e: MediaQueryListEvent) => void) => void }
      mediaQueryWithAddListener.addListener(handler)
    }

    // 清理函数
    return () => {
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handler)
      } else {
        // 旧版 API 兼容 - 使用类型断言处理旧浏览器API
        const mediaQueryWithRemoveListener = mediaQuery as MediaQueryList & { removeListener: (handler: (e: MediaQueryListEvent) => void) => void }
        mediaQueryWithRemoveListener.removeListener(handler)
      }
    }
  }, [query])

  return matches
}

/**
 * 预定义的常用断点 Hooks
 */

/** 移动端检测（<= 640px） */
export function useIsMobile(): boolean {
  return useMediaQuery('(max-width: 640px)')
}

/** 平板检测（641px - 1024px） */
export function useIsTablet(): boolean {
  return useMediaQuery('(min-width: 641px) and (max-width: 1024px)')
}

/** 桌面端检测（>= 1025px） */
export function useIsDesktop(): boolean {
  return useMediaQuery('(min-width: 1025px)')
}

