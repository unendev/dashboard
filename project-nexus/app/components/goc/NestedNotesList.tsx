"use client";

import { useState, useCallback } from "react";
import { ChevronRight, ChevronDown, Plus, Trash2, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { MarkdownView } from "@/app/components/shared/MarkdownView";

interface NestedNote {
  id: string;
  title: string;
  content: string;
  children?: NestedNote[];
  isExpanded?: boolean;
}

interface NestedNotesListProps {
  notes: NestedNote[];
  onUpdate: (notes: NestedNote[]) => void;
  onEdit?: (noteId: string, content: string) => void;
  onDelete?: (noteId: string) => void;
  level?: number;
}

export const NestedNotesList: React.FC<NestedNotesListProps> = ({
  notes,
  onUpdate,
  onEdit,
  onDelete,
  level = 0
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [newChildTitle, setNewChildTitle] = useState<string | null>(null);
  const [newChildContent, setNewChildContent] = useState('');

  // 切换展开/收起
  const toggleExpand = useCallback((noteId: string) => {
    const updateNotes = (items: NestedNote[]): NestedNote[] => {
      return items.map(note => {
        if (note.id === noteId) {
          return { ...note, isExpanded: !note.isExpanded };
        }
        if (note.children) {
          return { ...note, children: updateNotes(note.children) };
        }
        return note;
      });
    };
    onUpdate(updateNotes(notes));
  }, [notes, onUpdate]);

  // 添加子笔记
  const addChild = useCallback((parentId: string) => {
    if (!newChildContent.trim()) return;

    const updateNotes = (items: NestedNote[]): NestedNote[] => {
      return items.map(note => {
        if (note.id === parentId) {
          const newNote: NestedNote = {
            id: `note-${Date.now()}`,
            title: newChildTitle || '新笔记',
            content: newChildContent,
            children: []
          };
          return {
            ...note,
            children: [...(note.children || []), newNote],
            isExpanded: true
          };
        }
        if (note.children) {
          return { ...note, children: updateNotes(note.children) };
        }
        return note;
      });
    };

    onUpdate(updateNotes(notes));
    setNewChildTitle(null);
    setNewChildContent('');
  }, [notes, onUpdate, newChildTitle, newChildContent]);

  // 删除笔记
  const deleteNote = useCallback((noteId: string) => {
    const updateNotes = (items: NestedNote[]): NestedNote[] => {
      return items
        .filter(note => note.id !== noteId)
        .map(note => {
          if (note.children) {
            return { ...note, children: updateNotes(note.children) };
          }
          return note;
        });
    };

    onUpdate(updateNotes(notes));
    onDelete?.(noteId);
  }, [notes, onUpdate, onDelete]);

  // 编辑笔记
  const saveEdit = useCallback((noteId: string) => {
    onEdit?.(noteId, editContent);
    setEditingId(null);
    setEditContent('');
  }, [editContent, onEdit]);

  const renderNote = (note: NestedNote, parentLevel: number) => {
    const hasChildren = note.children && note.children.length > 0;
    const isExpanded = note.isExpanded !== false; // 默认展开
    const isEditing = editingId === note.id;

    return (
      <div key={note.id} className="mb-2">
        {/* 笔记标题行 */}
        <div className="flex items-center gap-2 p-2 rounded hover:bg-white/5 group">
          {/* 展开/收起按钮 */}
          {hasChildren ? (
            <button
              onClick={() => toggleExpand(note.id)}
              className="p-0.5 hover:bg-white/10 rounded transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-cyan-400" />
              ) : (
                <ChevronRight className="w-4 h-4 text-cyan-400" />
              )}
            </button>
          ) : (
            <div className="w-5" />
          )}

          {/* 笔记标题 */}
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-sm font-semibold truncate transition-colors",
              parentLevel === 0 ? "text-cyan-300" : "text-cyan-200/80"
            )}>
              {note.title}
            </h3>
          </div>

          {/* 操作按钮 */}
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                setEditingId(note.id);
                setEditContent(note.content);
              }}
              className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
              title="编辑"
            >
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
            </button>
            {parentLevel < 1 && (
              <button
                onClick={() => setNewChildTitle(note.id)}
                className="p-1 hover:bg-cyan-500/20 rounded transition-colors"
                title="添加子笔记"
              >
                <Plus className="w-3.5 h-3.5 text-cyan-400" />
              </button>
            )}
            <button
              onClick={() => deleteNote(note.id)}
              className="p-1 hover:bg-red-500/20 rounded transition-colors"
              title="删除"
            >
              <Trash2 className="w-3.5 h-3.5 text-red-400" />
            </button>
          </div>
        </div>

        {/* 编辑模式 */}
        {isEditing && (
          <div className="ml-6 p-3 bg-white/5 rounded-lg border border-cyan-500/30 mb-2">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full h-32 bg-black/50 text-cyan-300 text-sm p-2 rounded border border-white/10 focus:border-cyan-500 focus:outline-none resize-none"
              placeholder="编辑笔记内容..."
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => saveEdit(note.id)}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded transition-colors"
              >
                保存
              </button>
              <button
                onClick={() => setEditingId(null)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-cyan-300 text-xs rounded transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}

        {/* 预览模式 */}
        {!isEditing && (
          <div className="ml-6 p-2 text-xs text-zinc-400 line-clamp-2">
            <MarkdownView content={note.content} variant="goc" />
          </div>
        )}

        {/* 子笔记列表 */}
        {hasChildren && isExpanded && (
          <div className="ml-4 mt-2 border-l border-cyan-500/20 pl-2">
            {note.children!.map(child => renderNote(child, parentLevel + 1))}
          </div>
        )}

        {/* 添加子笔记输入框 */}
        {newChildTitle === note.id && parentLevel < 1 && (
          <div className="ml-6 p-3 bg-white/5 rounded-lg border border-cyan-500/30 mt-2">
            <input
              type="text"
              placeholder="子笔记标题"
              value={newChildTitle === note.id ? newChildTitle : ''}
              onChange={(e) => setNewChildTitle(e.target.value)}
              className="w-full bg-black/50 text-cyan-300 text-sm p-2 rounded border border-white/10 focus:border-cyan-500 focus:outline-none mb-2"
            />
            <textarea
              placeholder="子笔记内容..."
              value={newChildContent}
              onChange={(e) => setNewChildContent(e.target.value)}
              className="w-full h-24 bg-black/50 text-cyan-300 text-sm p-2 rounded border border-white/10 focus:border-cyan-500 focus:outline-none resize-none mb-2"
            />
            <div className="flex gap-2">
              <button
                onClick={() => addChild(note.id)}
                className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white text-xs rounded transition-colors"
              >
                添加
              </button>
              <button
                onClick={() => setNewChildTitle(null)}
                className="px-3 py-1 bg-white/10 hover:bg-white/20 text-cyan-300 text-xs rounded transition-colors"
              >
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-1">
      {notes.map(note => renderNote(note, 0))}
    </div>
  );
};
