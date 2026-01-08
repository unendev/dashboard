'use client'

import { Search, X, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

const CATEGORY_MAP: Record<string, { emoji: string, label: string }> = {
  'life': { emoji: '🌱', label: '生活' },
  'knowledge': { emoji: '📚', label: '知识' },
  'thought': { emoji: '💭', label: '思考' },
  'root': { emoji: '🌳', label: '根源' }
};

interface TreasureFilterBarProps {
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  isSearching: boolean;
  selectedTag: string;
  setSelectedTag: (t: string) => void;
  selectedTheme: string;  // 新增
  setSelectedTheme: (t: string) => void;  // 新增
}

export function TreasureFilterBar({
  searchQuery,
  setSearchQuery,
  isSearching,
  selectedTag,
  setSelectedTag,
  selectedTheme,  // 新增
  setSelectedTheme  // 新增
}: TreasureFilterBarProps) {
  return (
    <div className="sticky top-4 z-10 pb-4 pt-2 px-2 xl:px-4 mb-4">
      <div className="max-w-2xl mx-auto">
        {/* 主题筛选按钮 */}
        <div className="flex gap-2 mb-3">
          {Object.entries(CATEGORY_MAP).map(([theme, { emoji, label }]) => (
            <button
              key={theme}
              onClick={() => setSelectedTheme(selectedTheme === theme ? '' : theme)}
              className={cn(
                "px-3 py-1.5 rounded-full text-sm transition-all flex items-center gap-1.5",
                selectedTheme === theme
                  ? "bg-blue-500/30 text-blue-300 border border-blue-500/50"
                  : "bg-white/5 text-white/60 border border-white/10 hover:bg-white/10"
              )}
            >
              <span>{emoji}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
          <input
            type="text"
            placeholder="搜索宝藏...（输入 #标签 可筛选标签）"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-10 py-2.5 text-sm bg-transparent border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearching && (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {searchQuery && !isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="p-1 hover:bg-white/10 rounded transition-colors"
              >
                <X className="h-4 w-4 text-white/60" />
              </button>
            )}
          </div>
        </div>

        {(selectedTag || (searchQuery && searchQuery.startsWith('#'))) && (
          <div className="mt-2 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-white/60">筛选:</span>

            {searchQuery && searchQuery.startsWith('#') && (
              <button
                onClick={() => setSearchQuery('')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                <Hash className="h-3 w-3" />
                {searchQuery.slice(1)}
                <X className="h-3 w-3" />
              </button>
            )}

            {selectedTag && (
              <button
                onClick={() => setSelectedTag('')}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-500/20 border border-blue-500/30 rounded-full text-xs text-blue-300 hover:bg-blue-500/30 transition-colors"
              >
                {selectedTag}
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
