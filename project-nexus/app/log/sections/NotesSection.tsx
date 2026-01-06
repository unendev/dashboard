'use client'

import React from 'react';
import SimpleMdEditor from '@/app/components/features/notes/SimpleMdEditor';

interface NotesSectionProps {
  className?: string;
  isMobile?: boolean;
}

/**
 * 笔记区域组件
 * 
 * 简单包装 SimpleMdEditor
 */
export function NotesSection({ className = '', isMobile = false }: NotesSectionProps) {
  return (
    <section className={`h-full flex flex-col bg-gray-900/40 backdrop-blur-sm border-l border-white/5 ${isMobile ? 'px-4 py-6 min-h-screen' : 'min-h-screen'} ${className}`}>
      {isMobile && (
        <h3 className="text-xl font-bold text-white mb-4 pb-3 border-b-2 border-gray-600 flex items-center gap-3">
          <span className="text-2xl">📝</span>
          笔记
        </h3>
      )}
      
      <div className="flex-1 min-h-0 relative overflow-hidden">
        <SimpleMdEditor fullHeight={!isMobile} />
      </div>
    </section>
  );
}