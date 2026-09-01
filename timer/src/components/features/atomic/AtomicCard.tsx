import React from 'react';
import { GripVertical, Check, Trash2, Flame, ListOrdered, ExternalLink, Clock } from 'lucide-react';
import { AtomicItem } from '../../../types/atomic';
import { openObsidianLink } from '../../../lib/atomic-parser';

interface AtomicCardProps {
  item: AtomicItem;
  obsidianVault?: string;
  isNowFocus?: boolean;
  onToggleComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onMoveToNow?: (id: string) => void;
  onMoveToNext?: (id: string) => void;
  onMoveToPool?: (id: string) => void;
  dragHandleProps?: any;
}

export const AtomicCard: React.FC<AtomicCardProps> = ({
  item,
  obsidianVault,
  isNowFocus = false,
  onToggleComplete,
  onDelete,
  onMoveToNow,
  onMoveToNext,
  onMoveToPool,
  dragHandleProps,
}) => {
  const handleObsidianClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    openObsidianLink(link, obsidianVault);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable={!item.completed}
      onDragStart={handleDragStart}
      className={`group relative flex flex-col gap-2 p-3 rounded-lg border transition-all select-none cursor-grab active:cursor-grabbing
        ${item.completed
          ? 'bg-[#141416]/60 border-zinc-800/60 opacity-60 cursor-default'
          : isNowFocus
            ? 'bg-[#1c1a24] border-purple-500/40 shadow-lg shadow-purple-950/20'
            : 'bg-[#18181b] border-zinc-800 hover:border-zinc-600 hover:bg-[#202024]'
        }`}
    >
      <div className="flex items-start gap-2.5">
        {/* 拖拽把手图标 */}
        {!item.completed && (
          <div
            className="shrink-0 mt-0.5 text-zinc-600 group-hover:text-zinc-400 p-0.5 -ml-1 rounded transition-colors"
            title="按住可拖拽到右侧专注或排队"
          >
            <GripVertical size={13} />
          </div>
        )}

        {/* 完成复选框 */}
        {onToggleComplete && (
          <button
            onClick={() => onToggleComplete(item.id)}
            className={`shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors
              ${item.completed
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'border-zinc-600 hover:border-purple-400 bg-zinc-800/80 text-transparent hover:text-zinc-400'
              }`}
            title={item.completed ? '标记为未完成' : '标记为已完成'}
          >
            <Check size={11} strokeWidth={3} />
          </button>
        )}

        {/* 标题内容 */}
        <div className="flex-1 min-w-0">
          <p
            className={`text-xs font-medium leading-relaxed break-words
              ${item.completed ? 'line-through text-zinc-500' : 'text-zinc-200'}`}
          >
            {item.title}
          </p>

          {/* 胶囊标签栏 (Obsidian 双链、估时、Tag) */}
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            {/* Obsidian 双向链接胶囊 */}
            {item.obsidianLinks.map((link, idx) => (
              <button
                key={idx}
                onClick={(e) => handleObsidianClick(e, link)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-purple-950/60 border border-purple-500/40 text-purple-300 hover:bg-purple-900/80 hover:border-purple-400 hover:text-white transition-all shadow-sm group/link"
                title={`点击打开 Obsidian 笔记: ${link}`}
              >
                <span>[[{link}]]</span>
                <ExternalLink size={9} className="opacity-70 group-hover/link:opacity-100" />
              </button>
            ))}

            {/* 估时胶囊 */}
            {item.estimateMinutes && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] bg-zinc-800/80 border border-zinc-700/60 text-amber-400 font-mono">
                <Clock size={9} />
                <span>{item.estimateMinutes}m</span>
              </span>
            )}

            {/* 标签胶囊 */}
            {item.tags.map((tag, idx) => (
              <span
                key={idx}
                className="px-1.5 py-0.5 rounded text-[10px] bg-zinc-800 border border-zinc-700/50 text-zinc-400"
              >
                #{tag}
              </span>
            ))}
          </div>
        </div>

        {/* 悬停快捷动作条 */}
        <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {onMoveToNow && !isNowFocus && !item.completed && (
            <button
              onClick={() => onMoveToNow(item.id)}
              className="p-1 rounded text-zinc-500 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
              title="设为当前"
            >
              <Flame size={12} />
            </button>
          )}

          {onMoveToNext && !item.completed && (
            <button
              onClick={() => onMoveToNext(item.id)}
              className="p-1 rounded text-zinc-500 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
              title="排入接下来"
            >
              <ListOrdered size={12} />
            </button>
          )}

          {onMoveToPool && (
            <button
              onClick={() => onMoveToPool(item.id)}
              className="p-1 rounded text-zinc-500 hover:text-zinc-300 hover:bg-zinc-700 transition-colors"
              title="退回任务池"
            >
              <span className="text-[10px]">池</span>
            </button>
          )}

          {onDelete && (
            <button
              onClick={() => onDelete(item.id)}
              className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
              title="删除"
            >
              <Trash2 size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
