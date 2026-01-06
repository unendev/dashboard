'use client'

import { useCallback, useRef, useEffect } from 'react'

interface CachedNote {
  content: string
  timestamp: number
}

interface NoteCache {
  [noteId: string]: CachedNote
}

/**
 * Hook: 管理笔记内容缓存
 * 
 * 提供内存缓存和 localStorage 持久化
 * 确保切换笔记时立即显示，同时后台静默更新
 */
export function useNoteCache(userId: string) {
  const memoryCache = useRef<Map<string, CachedNote>>(new Map())
  const storageKey = `notes-cache-${userId}`
  const CACHE_EXPIRY_MS = 30 * 1000 // 30秒，超过此时间后台静默更新

  // 从 localStorage 加载缓存
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      if (saved) {
        const cache: NoteCache = JSON.parse(saved)
        // 加载到内存缓存
        Object.entries(cache).forEach(([noteId, cached]) => {
          memoryCache.current.set(noteId, cached)
        })
      }
    } catch (error) {
      console.error('Failed to load note cache:', error)
    }
  }, [storageKey])

  // 保存到 localStorage
  const saveToStorage = useCallback(() => {
    try {
      const cache: NoteCache = {}
      memoryCache.current.forEach((value, key) => {
        cache[key] = value
      })
      localStorage.setItem(storageKey, JSON.stringify(cache))
    } catch (error) {
      console.error('Failed to save note cache:', error)
    }
  }, [storageKey])

  /**
   * 获取缓存的笔记内容
   * @param noteId 笔记ID
   * @returns 缓存的内容，如果不存在或过期则返回 null
   */
  const getCached = useCallback((noteId: string): string | null => {
    const cached = memoryCache.current.get(noteId)
    if (!cached) return null
    
    // 检查是否过期（超过5分钟建议后台更新）
    const age = Date.now() - cached.timestamp
    if (age > CACHE_EXPIRY_MS) {
      // 缓存过期，但依然返回内容（用于立即显示），后台会更新
      return cached.content
    }
    
    return cached.content
  }, [CACHE_EXPIRY_MS])

  /**
   * 检查缓存是否需要后台更新
   * @param noteId 笔记ID
   * @returns 是否需要后台更新
   */
  const needsBackgroundUpdate = useCallback((noteId: string): boolean => {
    const cached = memoryCache.current.get(noteId)
    if (!cached) return true
    
    const age = Date.now() - cached.timestamp
    return age > CACHE_EXPIRY_MS
  }, [CACHE_EXPIRY_MS])

  /**
   * 设置缓存
   * @param noteId 笔记ID
   * @param content 笔记内容
   */
  const setCached = useCallback((noteId: string, content: string) => {
    memoryCache.current.set(noteId, {
      content,
      timestamp: Date.now()
    })
    saveToStorage()
  }, [saveToStorage])

  /**
   * 清除指定笔记的缓存
   * @param noteId 笔记ID
   */
  const invalidateCache = useCallback((noteId: string) => {
    memoryCache.current.delete(noteId)
    saveToStorage()
  }, [saveToStorage])

  /**
   * 清除所有缓存
   */
  const clearCache = useCallback(() => {
    memoryCache.current.clear()
    try {
      localStorage.removeItem(storageKey)
    } catch (error) {
      console.error('Failed to clear cache:', error)
    }
  }, [storageKey])

  return {
    getCached,
    setCached,
    invalidateCache,
    clearCache,
    needsBackgroundUpdate
  }
}

