'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Button } from '@/app/components/ui/button'
import { Plus, FileText, ChevronRight, ChevronDown, Trash2 } from 'lucide-react'

interface Note {
  id: string
  title: string
  order: number;
}

interface NotesExpandedListProps {
  parentNote: Note | null
  childNotes: Note[]
  activeNoteId: string | null
  onSelectNote: (id: string) => void
  onCreateNote: () => void
  onDeleteNote?: (id: string) => void
  onUpdateNoteTitle: (id: string, newTitle: string) => void
  isCreating: boolean
  expandedChildId?: string | null
  onToggleExpand?: (id: string) => void
  onReorderChildNotes: (parentId: string, reorderedChildNotes: Note[]) => void
  onUpdateParentTitle?: (id: string, newTitle: string) => void  // 父笔记标题编辑
}

export const NotesExpandedList: React.FC<NotesExpandedListProps> = ({
  parentNote,
  childNotes,
  activeNoteId,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onUpdateNoteTitle,
  isCreating,
  expandedChildId,
  onToggleExpand,
  onReorderChildNotes,
  onUpdateParentTitle,
}) => {
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null)
  const [editingTitle, setEditingTitle] = useState('')
  const [editingParentTitle, setEditingParentTitle] = useState(false)
  const [parentTitleValue, setParentTitleValue] = useState('')
  const inputRef = React.useRef<HTMLInputElement>(null)
  const parentInputRef = React.useRef<HTMLInputElement>(null)

  // Drag and Drop state
  const draggedItemRef = useRef<number | null>(null)
  const dragOverItemRef = useRef<number | null>(null)

  useEffect(() => {
    if (editingNoteId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [editingNoteId])

  useEffect(() => {
    if (editingParentTitle && parentInputRef.current) {
      parentInputRef.current.focus()
      parentInputRef.current.select()
    }
  }, [editingParentTitle])

  const sortedChildNotes = [...childNotes].sort((a, b) => (a.order || 0) - (b.order || 0));

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
    if (onToggleExpand) {
      onToggleExpand(noteId)
    }
  }

  const handleDeleteNote = (e: React.MouseEvent, noteId: string) => {
    e.stopPropagation()
    if (!onDeleteNote) return
    
    const note = childNotes.find(n => n.id === noteId) || parentNote
    const noteTitle = note?.title || '此笔记'
    if (window.confirm(`确定要删除笔记 "${noteTitle}" 吗？此操作无法撤销。`)) {
      onDeleteNote(noteId)
    }
  }

  // Drag and Drop Handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    draggedItemRef.current = index;
    e.dataTransfer!.effectAllowed = 'move';
    e.dataTransfer!.setData('text/plain', sortedChildNotes[index].id);
  };

  const handleDragEnter = (e: React.DragEvent<HTMLDivElement>, index: number) => {
    e.preventDefault();
    dragOverItemRef.current = index;
  };
  
  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    // 只在完全离开元素时清除
    if (e.currentTarget === e.target) {
      dragOverItemRef.current = null;
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer!.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const draggedIndex = draggedItemRef.current;
    const dropIndex = dragOverItemRef.current;

    if (draggedIndex === null || dropIndex === null || draggedIndex === dropIndex || !parentNote) {
      draggedItemRef.current = null;
      dragOverItemRef.current = null;
      return;
    }

    const reorderedChildNotes = [...sortedChildNotes];
    const [draggedNote] = reorderedChildNotes.splice(draggedIndex, 1);
    reorderedChildNotes.splice(dropIndex, 0, draggedNote);

    const updatedNotes = reorderedChildNotes.map((note, idx) => ({ ...note, order: idx }));
    onReorderChildNotes(parentNote.id, updatedNotes);

    draggedItemRef.current = null;
    dragOverItemRef.current = null;
  };

  const handleDragEnd = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    draggedItemRef.current = null;
    dragOverItemRef.current = null;
  };

  // 父笔记标题保存
  const handleSaveParentTitle = () => {
    if (parentNote && parentTitleValue.trim() !== '' && onUpdateParentTitle) {
      onUpdateParentTitle(parentNote.id, parentTitleValue.trim())
    }
    setEditingParentTitle(false)
  }

  const handleParentTitleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleSaveParentTitle()
    } else if (e.key === 'Escape') {
      setEditingParentTitle(false)
    }
  }

  const handleParentDoubleClick = () => {
    if (parentNote && onUpdateParentTitle) {
      setEditingParentTitle(true)
      setParentTitleValue(parentNote.title)
    }
  }

  if (!parentNote) return null

  return (
    <div className="bg-gray-900/40 backdrop-blur-sm border-b border-gray-700/50 px-2 relative z-30">
      {/* 父笔记作为分类标题，双击可编辑名称 */}
      <div 
        className="py-1.5 px-2 text-xs text-gray-500 border-b border-gray-700/20 mb-1 flex items-center gap-2 group"
        onDoubleClick={handleParentDoubleClick}
      >
        <span>📁</span>
        {editingParentTitle ? (
          <input
            ref={parentInputRef}
            type="text"
            value={parentTitleValue}
            onChange={(e) => setParentTitleValue(e.target.value)}
            onBlur={handleSaveParentTitle}
            onKeyDown={handleParentTitleKeyDown}
            className="bg-gray-700 text-white text-xs p-0.5 rounded border border-blue-500 focus:outline-none flex-1"
          />
        ) : (
          <span className="cursor-default group-hover:text-gray-400 transition-colors">
            {parentNote.title}
          </span>
        )}
        {onDeleteNote && !editingParentTitle && (
          <button
            onClick={(e) => handleDeleteNote(e, parentNote.id)}
            className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-red-500/20 rounded transition-all ml-auto"
            title="删除分类"
          >
            <Trash2 size={10} className="text-red-400 hover:text-red-300" />
          </button>
        )}
      </div>

      {/* 移动端：垂直列表 */}
      <div className="md:hidden max-h-[40vh] overflow-y-auto">
        {sortedChildNotes.map((note, index) => {
          const isActive = activeNoteId === note.id
          const isEditing = editingNoteId === note.id

          return (
            <div
              key={note.id}
              onClick={(e) => {
                e.stopPropagation()
                if (!isEditing) onSelectNote(note.id)
              }}
              onDoubleClick={() => handleDoubleClick(note)}
              className={`flex items-center justify-between px-3 py-2 cursor-pointer border-b border-gray-700/30 ${
                isActive ? 'bg-gray-800 border-l-2 border-l-blue-500' : 'hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
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
              {!isEditing && onDeleteNote && (
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
        <div className="p-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={onCreateNote}
            disabled={isCreating}
            className="w-full h-8 hover:bg-gray-700"
            title="在此分组中创建新文件"
          >
            {isCreating ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
            ) : (
              <>
                <Plus size={16} className="mr-1" />
                <span className="text-xs">新建子笔记</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 桌面端：水平标签栏 */}
      <div className="hidden md:flex items-center gap-1 py-2 pl-2 overflow-x-auto">
        
        {sortedChildNotes.map((note, index) => {
          const isActive = activeNoteId === note.id
          const isEditing = editingNoteId === note.id
          const isExpanded = expandedChildId === note.id
          const isDraggingOver = dragOverItemRef.current === index && draggedItemRef.current !== index;

          return (
            <div
              key={note.id}
              draggable={!isEditing}
              onDragStart={(e) => handleDragStart(e, index)}
              onDragEnter={(e) => handleDragEnter(e, index)}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              onClick={(e) => {
                e.stopPropagation()
                if (!isEditing) onSelectNote(note.id)
              }}
              onDoubleClick={() => handleDoubleClick(note)}
              className={`relative group flex items-center justify-between px-3 py-2 rounded-t-md cursor-pointer border-b-2 transition-colors duration-200 flex-shrink-0 max-w-[200px] ${
                isActive && !isEditing
                  ? 'bg-gray-800 border-blue-500'
                  : 'bg-transparent border-transparent hover:bg-gray-800/50'
              } ${isDraggingOver ? 'border-dashed border-blue-500 bg-blue-900/20' : ''}`}
            >
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <button
                  onClick={(e) => handleToggleExpand(e, note.id)}
                  className="p-0.5 hover:bg-gray-600 rounded transition-colors flex-shrink-0"
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
              {!isEditing && onDeleteNote && (
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

        <Button
          size="sm"
          variant="ghost"
          onClick={onCreateNote}
          disabled={isCreating}
          className="flex-shrink-0 h-8 w-8 p-0 rounded-full hover:bg-gray-700"
          title="在此分组中创建新文件"
        >
          {isCreating ? (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-300"></div>
          ) : (
            <Plus size={16} />
          )}
        </Button>
      </div>
    </div>
  )
}