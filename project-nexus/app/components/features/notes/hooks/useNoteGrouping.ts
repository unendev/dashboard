'use client'

import { useState, useCallback, useEffect } from 'react'

/**
 * 笔记分组数据结构
 * Key: parentNoteId, Value: 子笔记ID数组
 */
type NoteGrouping = Record<string, string[]>

/**
 * Hook: 管理笔记的分组、展开状态和拖拽
 * 
 * 使用方法:
 * ```
 * const grouping = useNoteGrouping(userId)
 * 
 * // 展开/收缩笔记
 * grouping.toggleExpand(noteId)
 * 
 * // 将笔记添加到分组
 * grouping.addToGroup(parentId, childId)
 * 
 * // 获取子笔记
 * const children = grouping.getChildren(noteId)
 * 
 * // 拖拽排序
 * grouping.reorderInGroup(parentId, fromIndex, toIndex)
 * grouping.reorderTopLevel(fromIndex, toIndex, allNoteIds)
 * ```
 */
export function useNoteGrouping(userId: string | undefined) {
  const [grouping, setGrouping] = useState<NoteGrouping>({})
  const [expandedNotes, setExpandedNotes] = useState<Set<string>>(new Set())
  const [isLoaded, setIsLoaded] = useState(false)

  const storageKey = `notes-grouping-${userId}`
  const expandedKey = `notes-expanded-${userId}`

  // 从 localStorage 加载分组配置
  useEffect(() => {
    if (!userId) return

    try {
      const savedGrouping = localStorage.getItem(storageKey)
      const savedExpanded = localStorage.getItem(expandedKey)

      if (savedGrouping) {
        setGrouping(JSON.parse(savedGrouping))
      }
      if (savedExpanded) {
        setExpandedNotes(new Set(JSON.parse(savedExpanded)))
      }
    } catch (error) {
      console.error('Failed to load note grouping:', error)
    } finally {
      setIsLoaded(true)
    }
  }, [userId])

  // 保存分组配置到 localStorage
  const saveGrouping = useCallback(
    (newGrouping: NoteGrouping) => {
      if (!userId) return
      try {
        localStorage.setItem(storageKey, JSON.stringify(newGrouping))
      } catch (error) {
        console.error('Failed to save note grouping:', error)
      }
    },
    [userId, storageKey]
  )

  // 保存展开状态到 localStorage
  const saveExpanded = useCallback(
    (newExpanded: Set<string>) => {
      if (!userId) return
      try {
        localStorage.setItem(expandedKey, JSON.stringify([...newExpanded]))
      } catch (error) {
        console.error('Failed to save expanded notes:', error)
      }
    },
    [userId, expandedKey]
  )

  // 切换展开/收缩
  const toggleExpand = useCallback(
    (noteId: string) => {
      const newExpanded = new Set(expandedNotes)
      if (newExpanded.has(noteId)) {
        newExpanded.delete(noteId)
      } else {
        newExpanded.add(noteId)
      }
      setExpandedNotes(newExpanded)
      saveExpanded(newExpanded)
    },
    [expandedNotes, saveExpanded]
  )

  // 获取笔记的子笔记
  const getChildren = useCallback(
    (parentId: string): string[] => {
      return grouping[parentId] || []
    },
    [grouping]
  )

  // 将笔记添加到分组
  const addToGroup = useCallback(
    (parentId: string, childId: string) => {
      setGrouping((prev) => {
        const newGrouping = { ...prev }
        if (!newGrouping[parentId]) {
          newGrouping[parentId] = []
        }
        if (!newGrouping[parentId].includes(childId)) {
          newGrouping[parentId].push(childId)
        }
        saveGrouping(newGrouping)
        return newGrouping
      })
    },
    [saveGrouping]
  )

  // 从分组中移除笔记
  const removeFromGroup = useCallback(
    (parentId: string, childId: string) => {
      setGrouping((prev) => {
        const newGrouping = { ...prev }
        if (newGrouping[parentId]) {
          newGrouping[parentId] = newGrouping[parentId].filter(id => id !== childId)
          if (newGrouping[parentId].length === 0) {
            delete newGrouping[parentId]
          }
        }
        saveGrouping(newGrouping)
        return newGrouping
      })
    },
    [saveGrouping]
  )

  // 在分组内重新排序
  const reorderInGroup = useCallback(
    (parentId: string, fromIndex: number, toIndex: number) => {
      setGrouping((prev) => {
        const newGrouping = { ...prev }
        const children = [...(newGrouping[parentId] || [])]
        
        if (fromIndex >= 0 && fromIndex < children.length &&
            toIndex >= 0 && toIndex < children.length) {
          const [item] = children.splice(fromIndex, 1)
          children.splice(toIndex, 0, item)
          newGrouping[parentId] = children
          saveGrouping(newGrouping)
        }
        
        return newGrouping
      })
    },
    [saveGrouping]
  )

  // 在顶级重新排序（传入所有笔记ID）
  const reorderTopLevel = useCallback(
    (fromIndex: number, toIndex: number, allNoteIds: string[]) => {
      const reordered = [...allNoteIds]
      if (fromIndex >= 0 && fromIndex < reordered.length &&
          toIndex >= 0 && toIndex < reordered.length) {
        const [item] = reordered.splice(fromIndex, 1)
        reordered.splice(toIndex, 0, item)
        // 调用者需要处理更新笔记列表顺序
        return reordered
      }
      return allNoteIds
    },
    []
  )

  // 检查笔记是否有子笔记
  const hasChildren = useCallback(
    (noteId: string): boolean => {
      return (grouping[noteId] || []).length > 0
    },
    [grouping]
  )

  // 检查笔记是否展开
  const isExpanded = useCallback(
    (noteId: string): boolean => {
      return expandedNotes.has(noteId)
    },
    [expandedNotes]
  )

  // 获取分组（getGroup 的别名，用于兼容）
  const getGroup = useCallback(
    (parentId: string): string[] | undefined => {
      return grouping[parentId]
    },
    [grouping]
  )

  // 更新整个组的顺序
  const updateGroup = useCallback(
    (parentId: string, childIds: string[]) => {
      setGrouping((prev) => {
        const newGrouping = { ...prev }
        newGrouping[parentId] = childIds
        saveGrouping(newGrouping)
        return newGrouping
      })
    },
    [saveGrouping]
  )

  return {
    grouping,
    expandedNotes,
    isLoaded,
    toggleExpand,
    getChildren,
    getGroup,
    addToGroup,
    removeFromGroup,
    reorderInGroup,
    reorderTopLevel,
    hasChildren,
    isExpanded,
    updateGroup,
  }
}


