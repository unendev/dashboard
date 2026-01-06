"use client";

import React from 'react';

export type ToolbarAction = 'explain' | 'add-note' | 'add-card';

interface FloatingToolbarProps {
  show: boolean;
  top: number;
  left: number;
  onAction: (action: ToolbarAction) => void;
}

export function FloatingToolbar({ show, top, left, onAction }: FloatingToolbarProps) {
  if (!show) {
    return null;
  }

  const handleActionClick = (action: ToolbarAction) => {
    onAction(action);
  };

  return (
    <div
      className="absolute z-10 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg flex items-center p-1 space-x-1"
      style={{ top, left, transform: 'translateY(-120%)' }} // Position above the selection
      // Prevent the toolbar from triggering the parent's onMouseUp/onClick
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Removed "Speak" button as it's now automatic */}
      <button onClick={() => handleActionClick('explain')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="AI 解释">
        ✨
      </button>
      <button onClick={() => handleActionClick('add-note')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="创建笔记">
        📝
      </button>
      <button onClick={() => handleActionClick('add-card')} className="p-2 rounded hover:bg-gray-100 dark:hover:bg-gray-800" title="创建卡片">
        🃏
      </button>
    </div>
  );
}
