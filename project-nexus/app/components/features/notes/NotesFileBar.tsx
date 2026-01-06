'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/button'
import { Plus, FileText, ChevronRight, ChevronDown, Trash2, ChevronUp, FolderOpen } from 'lucide-react'
import { useNoteGrouping } from './hooks/useNoteGrouping'

// 使用与 SimpleMdEditor.tsx 统一的 Note 接口
interface Note {
  id: string
  title: string
  order: number // 增加 order 属性
}

interface NotesFileBarProps {
  notes: Note[]
  currentNoteId: string | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onDeleteNote: (id: string) => void
  onUpdateNoteTitle: (id: string, newTitle: string) => void
  userId?: string
  onSelectParent?: (parentId: string) => void
  onToggleExpand?: (parentId: string, isExpanded: boolean) => void
  groupingData?: Record<string, string[]>  // 从父组件接收 grouping 数据
  onReorderNotes: (reorderedNotes: Note[]) => void // 添加新的排序回调
}

export const NotesFileBar: React.FC<NotesFileBarProps> = ({
  notes,
  currentNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onUpdateNoteTitle,
  userId = 'user-1',
  onSelectParent,
  onToggleExpand,
  groupingData,
  onReorderNotes, // 接收排序回调
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [isMobileExpanded, setIsMobileExpanded] = useState(false) // 移动端笔记列表展开状态，默认收起
  const inputRef = React.useRef<HTMLInputElement>(null)

  const localGrouping = useNoteGrouping(userId)
  const grouping = groupingData ? { grouping: groupingData, isExpanded: (id: string) => localGrouping.isExpanded(id) } : { grouping: localGrouping.grouping, isExpanded: (id: string) => localGrouping.isExpanded(id) }

  // 拖拽相关状态
  const draggedItemRef = useRef<number | null>(null) // 记录被拖拽项在 topLevelNotes 中的索引
  const dragOverItemRef = useRef<number | null>(null) // 记录拖拽进入的目标项在 topLevelNotes 中的索引

  useEffect(() => {
    if (editingNoteId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingNoteId])

  const handleSaveTitle = () => {
    if (editingNoteId && editingTitle.trim() !== '') {
      onUpdateNoteTitle(editingNoteId, editingTitle.trim())
    }
    setEditingNoteId(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveTitle()
    } else if (e.key === 'Escape') {
      setEditingNoteId(null)
    }
  }

  const handleDoubleClick = (note: Note) => {
    setEditingNoteId(note.id)
    setEditingTitle(note.title)
  }

  const handleToggleExpand = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    const isCurrentlyExpanded = localGrouping.isExpanded(noteId)
    localGrouping.toggleExpand(noteId)
    onToggleExpand?.(noteId, !isCurrentlyExpanded)
  }

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    const note = notes.find(n => n.id === noteId)
    const noteTitle = note?.title || '此笔记'
    if (window.confirm(`确定要删除笔记 "${noteTitle}" 吗？此操作无法撤销。`)) {
      onDeleteNote(noteId)
    }
  }

  const topLevelNotes = notes
    .filter(note => {
      if (!localGrouping.isLoaded) return true
      const currentGrouping = groupingData || localGrouping.grouping
      for (const children of Object.values(currentGrouping)) {
        if (children.includes(note.id)) {
          return false
        }
      }
      return true
    })
    .sort((a, b) => (a.order || 0) - (b.order || 0)); // 按 order 字段排序

  // ========== 拖拽处理函数 ==========
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemRef.current = index
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', topLevelNotes[index].id) // 传递笔记ID
  }

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault()
    dragOverItemRef.current = index
  }

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // dragOverItemRef.current = null;
  }

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault() // 必须阻止默认行为才能触发 drop 事件
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    const draggedIndex = draggedItemRef.current
    const dropIndex = dragOverItemRef.current

    if (draggedIndex === null || dropIndex === null || draggedIndex === dropIndex) {
      draggedItemRef.current = null
      dragOverItemRef.current = null
      return
    }

    const reorderedTopLevelNotes = [...topLevelNotes]
    const [draggedNote] = reorderedTopLevelNotes.splice(draggedIndex, 1)
    reorderedTopLevelNotes.splice(dropIndex, 0, draggedNote)

    // 更新 order 字段
    const updatedNotes = reorderedTopLevelNotes.map((note, idx) => ({ ...note, order: idx }))
    onReorderNotes(updatedNotes) // 通知父组件进行持久化

    draggedItemRef.current = null
    dragOverItemRef.current = null
  }

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    draggedItemRef.current = null
    dragOverItemRef.current = null
  }


  // 获取当前选中笔记的标题
  const currentNote = notes.find(n => n.id === currentNoteId)
  const currentNoteTitle = currentNote?.title || '选择笔记'

  // 移动端选择笔记后自动收起
  const handleMobileSelectNote = (noteId: string) => {
    onSelectNote(noteId)
    onSelectParent?.(noteId)
    setIsMobileExpanded(false) // 选择后收起
  }

  return (
    <div className="bg-gray-900/70 backdrop-blur-sm border-b border-gray-700/50">
      {/* 移动端：收缩状态显示当前笔记标题和展开按钮 */}
      <div className="md:hidden">
        <div 
          className="flex items-center justify-between px-3 py-2 cursor-pointer"
          onClick={() => setIsMobileExpanded(!isMobileExpanded)}
        >
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <FolderOpen size={16} className="text-blue-400 flex-shrink-0" />
            <span className="text-sm text-white truncate">{currentNoteTitle}</span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => {
                e.stopPropagation()
                onCreateNote()
              }}
              className="h-7 w-7 p-0 rounded-full hover:bg-gray-700"
              title="创建新笔记"
            >
              <Plus size={14} />
            </Button>
            <button className="p-1 hover:bg-gray-700 rounded transition-colors">
              {isMobileExpanded ? (
                <ChevronUp size={18} className="text-gray-400" />
              ) : (
                <ChevronDown size={18} className="text-gray-400" />
              )}
            </button>
          </div>
        </div>
        
        {/* 移动端展开的笔记列表 */}
        {isMobileExpanded && (
          <div className="border-t border-gray-700/50 max-h-[50vh] overflow-y-auto">
            {topLevelNotes.map((note, index) => {
              const isActive = currentNoteId === note.id
              const isEditing = editingNoteId === note.id
              const isExpanded = localGrouping.isExpanded(note.id)

              return (
                <div
                  key={note.id}
                  onClick={() => {
                    if (!isEditing) {
                      handleMobileSelectNote(note.id)
                    }
                  }}
                  onDoubleClick={() => handleDoubleClick(note)}
                  className={`flex items-center justify-between px-3 py-2.5 cursor-pointer border-b border-gray-700/30 ${
                    isActive ? 'bg-gray-800 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
                  }`}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <button
                      onClick={(e) => handleToggleExpand(e, note.id)}
                      className="p-0.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                      title={isExpanded ? '收缩' : '展开'}
                    >
                      {isExpanded ? (
                        <ChevronDown size={14} className="text-gray-400" />
                      ) : (
                        <ChevronRight size={14} className="text-gray-400" />
                      )}
                    </button>
                    <FileText size={14} className={isActive ? 'text-blue-300' : 'text-gray-400'} />
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingTitle}
                        onChange={(e) => setEditingTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={handleKeyDown}
                        className="bg-gray-700 text-white text-sm p-0.5 rounded border border-blue-500 focus:outline-none flex-1"
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <span className={`text-sm truncate flex-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                        {note.title || 'Untitled'}
                      </span>
                    )}
                  </div>
                  {!isEditing && (
                    <button
                      onClick={(e) => handleDeleteNote(e, note.id)}
                      className="p-1.5 hover:bg-red-500/20 rounded transition-all flex-shrink-0"
                      title="删除笔记"
                    >
                      <Trash2 size={14} className="text-red-400 hover:text-red-300" />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* 桌面端：原有的水平标签栏 */}
      <div className="hidden md:flex items-center pr-2">
        <div className="flex items-center gap-1 overflow-x-auto py-2 pl-2">
        {topLevelNotes.map((note, index) => {
          const isActive = currentNoteId === note.id
          const isEditing = editingNoteId === note.id
          const isExpanded = localGrouping.isExpanded(note.id)
          const isDraggingOver = dragOverItemRef.current === index && draggedItemRef.current !== index;


          return (
            <div
              key={note.id}
              // 拖拽属性
              draggable={!isEditing} // 编辑状态下不可拖拽
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              data-note-id={note.id} // 用于调试和识别
              data-note-title={note.title} // 用于调试和识别

              onClick={() => {
                if (!isEditing) {
                  onSelectNote(note.id)
                  onSelectParent?.(note.id)
                }
              }}
              onDoubleClick={() => handleDoubleClick(note)}
              className={`relative group flex items-center justify-between px-3 py-2 rounded-t-md cursor-pointer border-b-2 transition-colors duration-200 flex-shrink-0 max-w-[200px] ${
                isActive && !isEditing
                  ? 'bg-gray-800 border-blue-500'
                  : 'bg-transparent border-transparent hover:bg-gray-800/50'
              } ${isDraggingOver ? 'border-dashed border-blue-500 bg-blue-900/20' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                {/* 展开/收缩按钮 - 总是显示 */}
                <button
                  onClick={(e) => handleToggleExpand(e, note.id)}
                  className="p-0.5 hover:bg-gray-700 rounded transition-colors flex-shrink-0"
                  title={isExpanded ? '收缩' : '展开'}
                >
                  {isExpanded ? (
                    <ChevronDown size={14} className="text-gray-400" />
                  ) : (
                    <ChevronRight size={14} className="text-gray-400" />
                  )}
                </button>

                <FileText
                  size={14}
                  className={isActive ? 'text-blue-300' : 'text-gray-400'}
                />
                {isEditing ? (
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onBlur={handleSaveTitle}
                    onKeyDown={handleKeyDown}
                    className="bg-gray-700 text-white text-sm p-0.5 rounded border border-blue-500 focus:outline-none w-full"
                  />
                ) : (
                  <span className={`text-sm truncate flex-1 ${isActive ? 'text-white' : 'text-gray-300'}`}>
                    {note.title || 'Untitled'}
                  </span>
                )}
              </div>
              {/* 删除按钮 - hover 时显示 */}
              {!isEditing && (
                <button
                  onClick={(e) => handleDeleteNote(e, note.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all flex-shrink-0 ml-1"
                  title="删除笔记"
                >
                  <Trash2 size={12} className="text-red-400 hover:text-red-300" />
                </button>
              )}
            </div>
          )
        })}
        </div>
        <Button
          size="sm"
          variant="ghost"
          onClick={onCreateNote}
          className="flex-shrink-0 ml-2 h-8 w-8 p-0 rounded-full hover:bg-gray-700"
          title="创建新笔记"
        >
          <Plus size={16} />
        </Button>
      </div>
    </div>
  )
}