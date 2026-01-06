"use client";

import { useState, useRef, useEffect, useCallback } from 'react';
import { useTTS } from './useTTS';
import { createNote } from '../../russian/actions';
import { Volume2, BookPlus } from 'lucide-react';
import { useRouter } from 'next/navigation';

// Debounce helper function
function debounce<F extends (...args: any[]) => any>(func: F, waitFor: number) {
  let timeout: NodeJS.Timeout;
  return (...args: Parameters<F>): void => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), waitFor);
  };
}

interface TextInteractionWrapperProps {
  children: string;
}

export function TextInteractionWrapper({ children }: TextInteractionWrapperProps) {
  const { speak } = useTTS();
  const router = useRouter();
  const [selectionMenu, setSelectionMenu] = useState<{ x: number, y: number, text: string } | null>(null);
  const containerRef = useRef<HTMLSpanElement>(null);

  // Debounced menu display logic
  const showSelectionMenu = useCallback(() => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      setSelectionMenu(null);
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    if (containerRef.current && containerRef.current.contains(selection.anchorNode)) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      setSelectionMenu({
        x: rect.left + rect.width / 2,
        y: rect.top - 10,
        text: text
      });
    }
  }, []);

  const debouncedShowMenu = useCallback(debounce(showSelectionMenu, 300), [showSelectionMenu]);

  // Use selectionchange for more reliable text selection tracking
  useEffect(() => {
    document.addEventListener('selectionchange', debouncedShowMenu);
    return () => document.removeEventListener('selectionchange', debouncedShowMenu);
  }, [debouncedShowMenu]);

  // Close menu on click elsewhere
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (selectionMenu && !(e.target as Element).closest('.selection-menu')) {
        setSelectionMenu(null);
        // No need to remove ranges here, let user manage their selection
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [selectionMenu]);

  // Helper: Handle word click
  const handleWordClick = (word: string) => {
    if (/[а-яА-ЯёЁ]/.test(word)) {
      speak(word, 'ru-RU');
    }
  };

  const handleSaveNote = async () => {
    if (!selectionMenu) return;
    await createNote({
      content: selectionMenu.text,
      sourceText: selectionMenu.text.split(' ').length > 1 ? '句段' : '单词'
    });
    setSelectionMenu(null);
    window.getSelection()?.removeAllRanges();
    router.refresh();
  };

  return (
    <span 
      ref={containerRef} 
      className="relative"
    >
      {children.split(/([а-яА-ЯёЁ]+)/g).map((part, i) => (
        /[а-яА-ЯёЁ]/.test(part) ? (
          <span
            key={i}
            className="cursor-pointer hover:bg-blue-200/20 hover:text-blue-300 transition-colors rounded px-0.5"
            onClick={(e) => {
              e.stopPropagation();
              handleWordClick(part);
            }}
            title="点击朗读"
          >
            {part}
          </span>
        ) : (
          <span key={i}>{part}</span>
        )
      ))}

      {selectionMenu && (
        <span 
          className="selection-menu fixed z-50 flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg shadow-xl p-1.5 -translate-x-1/2 -translate-y-full"
          style={{ left: selectionMenu.x, top: selectionMenu.y }}
        >
          <button 
            onClick={() => speak(selectionMenu.text)}
            className="p-1.5 hover:bg-gray-700 rounded text-blue-400"
            title="朗读"
          >
            <Volume2 size={16} />
          </button>
          <div className="w-px h-4 bg-gray-700 mx-1"></div>
          <button 
            onClick={handleSaveNote}
            className="p-1.5 hover:bg-gray-700 rounded text-green-400"
            title="存入笔记"
          >
            <BookPlus size={16} />
          </button>
        </span>
      )}
    </span>
  );
}
