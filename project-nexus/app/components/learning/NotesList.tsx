"use client";

import React, { useState, useEffect } from 'react';
import { RussianLearningNote } from '@prisma/client';
import { deleteNote, updateNote, syncFlashcard } from '../../russian/actions';
import { Trash2, Edit2, Check, X } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useRouter } from 'next/navigation';

interface NotesListProps {
  initialNotes: RussianLearningNote[];
}

export function NotesList({ initialNotes }: NotesListProps) {
  const router = useRouter();
  const [notes, setNotes] = useState(initialNotes);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editContent, setEditContent] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  // Sync state whenever props change (from router.refresh)
  useEffect(() => {
      setNotes(initialNotes);
  }, [initialNotes]);

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条笔记吗？')) return;
    setNotes(prev => prev.filter(n => n.id !== id));
    await deleteNote(id);
    router.refresh();
  };

  const startEdit = (note: RussianLearningNote) => {
    setEditingId(note.id);
    setEditContent(note.content);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditContent('');
  };

  const saveEdit = async (id: string) => {
    if (editContent.trim() === '') return;
    setIsUpdating(true);
    try {
        setNotes(prev => prev.map(n => n.id === id ? { ...n, content: editContent } : n));
        await updateNote(id, editContent);
        setEditingId(null);
        router.refresh();
    } catch (e) {
        console.error("Failed to update note", e);
    } finally {
        setIsUpdating(false);
    }
  };

  const toggleHighlight = async (note: RussianLearningNote, word: string, isRemove: boolean) => {
    let newContent = note.content;
    
    // Escape special regex characters in word
    const escapedWord = word.replace(/[.*+?^${}()|[\\]/g, '\\$&');
    
    if (isRemove) {
        // Remove bold markers around the word (global)
        newContent = newContent.replace(new RegExp(`\\*\\*${escapedWord}\\*\\*`, 'g'), word);
        // Sync: Remove flashcard
        await syncFlashcard('remove', word, note.content);
    } else {
        // Add bold markers (global)
        newContent = newContent.replace(new RegExp(escapedWord, 'g'), `**${word}**`);
        // Cleanup: Fix double wrapping like ****word**** if it happened
        newContent = newContent.replace(new RegExp(`\\*\\*\\*\\*${escapedWord}\\*\\*\\*\\*`, 'g'), `**${word}**`);
        
        // Sync: Add flashcard
        // Use note.content (original context) or newContent? 
        // We use note.content as the context for creation.
        await syncFlashcard('add', word, note.content);
    }

    if (newContent === note.content) {
        console.warn("Toggle Highlight: No change in content", { word, old: note.content });
        return;
    }

    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, content: newContent } : n));
    
    const result = await updateNote(note.id, newContent);
    if (!result.success) {
        console.error("Failed to save note highlight:", result);
    } else {
        router.refresh();
    }
  };

  // Helper component for splitting text into clickable words
  const InteractiveHighlighter = ({ children, onWordClick }: { children: React.ReactNode, onWordClick: (w: string) => void }) => {
    return (
      <>
        {React.Children.map(children, (child) => {
          if (typeof child === 'string') {
            // Split by words (Russian & English), keeping delimiters
            return child.split(/([а-яА-ЯёЁa-zA-Z-]+)/g).map((part, i) => {
              if (/[а-яА-ЯёЁa-zA-Z]/.test(part)) {
                return (
                  <span 
                    key={i} 
                    onClick={(e) => {
                      e.stopPropagation();
                      onWordClick(part);
                    }}
                    className="cursor-pointer hover:text-blue-300 hover:underline transition-colors"
                    title="点击高亮"
                  >
                    {part}
                  </span>
                );
              }
              return <span key={i}>{part}</span>;
            });
          }
          return child;
        })}
      </>
    );
  };

  if (notes.length === 0) {
    return (
      <div className="text-gray-500 text-sm text-center py-8">
        暂无笔记。<br/>在聊天中划词即可添加。
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {notes.map((note) => (
        <div key={note.id} className="bg-gray-800 border border-gray-700 rounded-lg p-3 text-sm shadow-sm group hover:border-gray-600 transition-colors">
          {/* Header */}
          <div className="flex justify-between items-start mb-2">
            {note.sourceText && (
              <div className="text-xs text-blue-400 font-medium truncate max-w-[70%] bg-blue-500/10 px-1.5 py-0.5 rounded">
                {note.sourceText === 'word' ? '单词' : note.sourceText === 'phrase' ? '句段' : '笔记'}
              </div>
            )}
            
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingId !== note.id && (
                <>
                  <button 
                    onClick={() => startEdit(note)}
                    className="text-gray-400 hover:text-blue-400 p-0.5 rounded hover:bg-gray-700"
                    title="编辑"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(note.id)}
                    className="text-gray-400 hover:text-red-400 p-0.5 rounded hover:bg-gray-700"
                    title="删除"
                  >
                    <Trash2 size={14} />
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Content Area */}
          {editingId === note.id ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => setEditContent(e.target.value)}
                className="w-full bg-gray-900 border border-gray-600 rounded p-2 text-gray-200 text-sm focus:ring-1 focus:ring-blue-500 outline-none resize-none"
                rows={4}
                autoFocus
              />
              <div className="flex justify-end gap-2">
                <button onClick={cancelEdit} className="flex items-center gap-1 px-2 py-1 text-xs text-gray-400 hover:text-white hover:bg-gray-700 rounded"><X size={12} /> 取消</button>
                <button onClick={() => saveEdit(note.id)} disabled={isUpdating} className="flex items-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white hover:bg-blue-500 rounded disabled:opacity-50"><Check size={12} /> 保存</button>
              </div>
            </div>
          ) : (
            <div className="prose prose-sm prose-invert max-w-none text-gray-300 leading-relaxed">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                    p: ({children}) => (
                        <p className="m-0">
                            <InteractiveHighlighter onWordClick={(w) => toggleHighlight(note, w, false)}>
                                {children}
                            </InteractiveHighlighter>
                        </p>
                    ),
                    strong: ({children}) => {
                        const text = String(children);
                        return (
                            <strong 
                                className="text-yellow-300 font-bold bg-yellow-500/10 px-1 rounded cursor-pointer hover:bg-yellow-500/20 hover:line-through"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    toggleHighlight(note, text, true);
                                }}
                                title="点击取消高亮"
                            >
                                {children}
                            </strong>
                        );
                    }
                }}
              >
                {note.content}
              </ReactMarkdown>
            </div>
          )}
          
          {editingId !== note.id && (
            <p className="text-[10px] text-gray-600 mt-2 text-right">
                {new Date(note.createdAt).toLocaleDateString()}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
