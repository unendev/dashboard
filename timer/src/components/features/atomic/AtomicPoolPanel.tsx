import React, { useState, useMemo } from 'react';
import { Sparkles, Search, Filter, Layers, Inbox } from 'lucide-react';
import { AtomicItem } from '../../../types/atomic';
import { AtomicCard } from './AtomicCard';

interface AtomicPoolPanelProps {
  items: AtomicItem[];
  allTags: string[];
  selectedTag: string;
  obsidianVault?: string;
  onSelectTag: (tag: string) => void;
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onMoveToNow: (id: string) => void;
  onMoveToNext: (id: string) => void;
  onMoveToPool?: (id: string) => void;
  onUpdate?: (id: string, newText: string) => void;
}

export const AtomicPoolPanel: React.FC<AtomicPoolPanelProps> = ({
  items,
  allTags,
  selectedTag,
  obsidianVault,
  onSelectTag,
  onToggleComplete,
  onDelete,
  onUpdate,
  onMoveToNow,
  onMoveToNext,
  onMoveToPool,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  // 无标签待办数量
  const untaggedCount = useMemo(() => {
    return items.filter(i => !i.tags || i.tags.length === 0).length;
  }, [items]);

  // 过滤后的列表
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      // 标签过滤
      if (selectedTag === 'none') {
        if (item.tags && item.tags.length > 0) return false;
      } else if (selectedTag !== 'all' && (!item.tags || !item.tags.includes(selectedTag))) {
        return false;
      }
      // 搜索过滤
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          item.title.toLowerCase().includes(q) ||
          item.rawText.toLowerCase().includes(q) ||
          (item.tags && item.tags.some(t => t.toLowerCase().includes(q))) ||
          (item.obsidianLinks && item.obsidianLinks.some(l => l.toLowerCase().includes(q)))
        );
      }
      return true;
    });
  }, [items, selectedTag, searchQuery]);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id && onMoveToPool) {
      onMoveToPool(id);
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex flex-col h-full bg-[#111114] border-r border-zinc-800 select-none overflow-hidden transition-all ${
        isDragOver ? 'ring-2 ring-inset ring-purple-500/50 bg-[#16141c]' : ''
      }`}
    >
      {/* 头部面板标题与搜索 */}
      <div className="p-2.5 pb-2 flex flex-col gap-2 border-b border-zinc-800/80 bg-[#141418]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-zinc-200">
            <Inbox size={14} className="text-purple-400" />
            <h3 className="text-xs font-semibold tracking-wide">任务池</h3>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-400 font-mono">
              {filteredItems.length}
            </span>
          </div>

          {/* 搜索框 */}
          <div className="relative flex items-center">
            <Search size={11} className="absolute left-2 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="快速过滤..."
              className="w-24 focus:w-36 bg-[#1b1b20] border border-zinc-800 focus:border-zinc-700 rounded-md pl-6 pr-2 py-0.5 text-[11px] text-zinc-300 placeholder-zinc-600 outline-none transition-all"
            />
          </div>
        </div>

        {/* 标签切换栏 */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => onSelectTag('all')}
            className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
              selectedTag === 'all'
                ? 'bg-purple-600/90 text-white shadow-sm'
                : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            全部 ({items.length})
          </button>

          {untaggedCount > 0 && (
            <button
              onClick={() => onSelectTag('none')}
              className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
                selectedTag === 'none'
                  ? 'bg-purple-600/90 text-white shadow-sm'
                  : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              无标签 ({untaggedCount})
            </button>
          )}

          {allTags.map(tag => {
            const count = items.filter(i => i.tags && i.tags.includes(tag)).length;
            const isSelected = selectedTag === tag;
            return (
              <button
                key={tag}
                onClick={() => onSelectTag(tag)}
                className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all flex items-center gap-1 ${
                  isSelected
                    ? 'bg-purple-600/90 text-white shadow-sm'
                    : 'bg-zinc-800/70 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <span>#{tag}</span>
                <span className="text-[9px] opacity-70">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 滚动卡片列表 */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-2">
        {filteredItems.map(item => (
          <AtomicCard
            key={item.id}
            item={item}
            obsidianVault={obsidianVault}
            onToggleComplete={onToggleComplete}
            onDelete={onDelete}
            onUpdate={onUpdate}
            onMoveToNow={onMoveToNow}
            onMoveToNext={onMoveToNext}
            onMoveToPool={onMoveToPool}
          />
        ))}

        {filteredItems.length === 0 && (
          <div className="flex flex-col items-center justify-center h-48 text-center px-4 text-zinc-600">
            <Sparkles size={24} className="mb-2 text-zinc-700" />
            <p className="text-xs font-medium text-zinc-500">任务池暂无待办</p>
            <p className="text-[11px] text-zinc-600 mt-1">
              在上方输入待办，按回车秒级入库
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
