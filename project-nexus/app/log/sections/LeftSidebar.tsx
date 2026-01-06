'use client'

import React, { useState, useEffect, useRef } from 'react';
import { NotesSection } from './NotesSection';
import { WidgetTodoSection } from '@/app/components/features/todo/WidgetTodoSection';
import { GripHorizontal } from 'lucide-react';

const STORAGE_KEY = 'log-page-sidebar-split-ratio';

export function LeftSidebar({ className = '' }: { className?: string }) {
  const [splitRatio, setSplitRatio] = useState(0.55);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) setSplitRatio(parseFloat(saved));
  }, []);

  const handleMouseDown = () => {
    isDragging.current = true;
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging.current || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = (e.clientY - rect.top) / rect.height;
    setSplitRatio(Math.max(0.2, Math.min(0.8, ratio)));
  };

  const handleMouseUp = () => {
    isDragging.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  };

  useEffect(() => { localStorage.setItem(STORAGE_KEY, splitRatio.toString()); }, [splitRatio]);

  return (
    <div ref={containerRef} className={`flex flex-col h-full overflow-hidden ${className}`}>
      <div style={{ height: `${splitRatio * 100}%` }} className="min-h-0 relative">
        <NotesSection className="h-full border-none bg-transparent" />
      </div>
      <div className="h-2 bg-gray-800 hover:bg-blue-500/50 cursor-row-resize flex items-center justify-center shrink-0 border-y border-gray-700/50" onMouseDown={handleMouseDown}>
        <GripHorizontal size={16} className="text-gray-600" />
      </div>
      <div style={{ height: `${(1 - splitRatio) * 100}%` }} className="min-h-0 bg-gray-900/40 relative z-10">
        <WidgetTodoSection className="h-full border-none bg-transparent" />
      </div>
    </div>
  );
}
