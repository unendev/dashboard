import React from 'react';
import { X, Loader2 } from 'lucide-react';
import { TodoBoard } from '../components/features/todo/TodoBoard';

export default function TodoPage() {
  return (
    <div className="flex flex-col h-screen w-full bg-zinc-900 text-zinc-100 select-none overflow-hidden">
      {/* 标题栏 */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b border-zinc-700 bg-zinc-800 shrink-0"
        data-drag="true"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-xs font-medium text-zinc-300">待办事项</h2>
        </div>
        <button
          onClick={() => window.close()}
          className="w-5 h-5 rounded flex items-center justify-center text-zinc-500 hover:text-white hover:bg-zinc-600 transition-colors"
          data-drag="false"
        >
          <X size={12} />
        </button>
      </div>

      {/* 内容区域 */}
      <div className="flex-1 min-h-0 overflow-hidden relative">
        <TodoBoard />
      </div>
    </div>
  );
}
