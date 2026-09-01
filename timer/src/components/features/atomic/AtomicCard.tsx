import React, { useState, useEffect } from 'react';
import { Check, Trash2, Flame, ListOrdered, ExternalLink, Clock } from 'lucide-react';
import { AtomicItem } from '../../../types/atomic';
import { openObsidianLink } from '../../../lib/atomic-parser';

interface AtomicCardProps {
  item: AtomicItem;
  obsidianVault?: string;
  isNowFocus?: boolean;
  onToggleComplete?: (id: string) => void;
  onDelete?: (id: string) => void;
  onUpdate?: (id: string, newText: string) => void;
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
  onUpdate,
  onMoveToNow,
  onMoveToNext,
  onMoveToPool,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(item.rawText || item.title);

  useEffect(() => {
    setEditValue(item.rawText || item.title);
  }, [item.rawText, item.title]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== (item.rawText || item.title)) {
      onUpdate?.(item.id, trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditValue(item.rawText || item.title);
      setIsEditing(false);
    }
  };

  const handleObsidianClick = (e: React.MouseEvent, link: string) => {
    e.stopPropagation();
    openObsidianLink(link, obsidianVault);
  };

  const handleDragStart = (e: React.DragEvent) => {
    if (isEditing) {
      e.preventDefault();
      return;
    }
    e.dataTransfer.setData('text/plain', item.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      draggable={!item.completed && !isEditing}
      onDragStart={handleDragStart}
      className={`group relative p-2.5 rounded-xl border transition-all select-none ${
        isEditing
          ? 'ring-1 ring-purple-500 bg-[#1e1c26] border-purple-500/80 cursor-default'
          : item.completed
          ? 'bg-[#141416]/60 border-zinc-800/60 opacity-60 cursor-default'
          : isNowFocus
          ? 'bg-[#1c1a24] border-purple-500/50 shadow-lg shadow-purple-950/20 cursor-grab active:cursor-grabbing'
          : 'bg-[#18181d] border-zinc-800/80 hover:border-zinc-700 hover:bg-[#1f1f26] cursor-grab active:cursor-grabbing'
      }`}
    >
      <div className="flex items-start gap-2">
        {/* 完成复选框 */}
        {onToggleComplete && (
          <button
            type="button"
            draggable={false}
            onMouseDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete(item.id);
            }}
            className={`shrink-0 mt-0.5 w-4 h-4 rounded flex items-center justify-center border transition-colors ${
              item.completed
                ? 'bg-purple-600 border-purple-500 text-white'
                : 'border-zinc-600 hover:border-purple-400 bg-zinc-800/80 text-transparent hover:text-zinc-400'
            }`}
            title={item.completed ? '标记为未完成' : '标记为已完成'}
          >
            <Check size={11} strokeWidth={3} />
          </button>
        )}

        {/* 标题内容区：支持点击内联编辑 */}
        <div className="flex-1 min-w-0 pr-1">
          {isEditing ? (
            <input
              type="text"
              autoFocus
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onBlur={handleSave}
              onKeyDown={handleKeyDown}
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              className="w-full bg-[#121216] text-xs text-white px-2 py-1 rounded border border-purple-500 outline-none shadow-inner"
              placeholder="修改待办内容 (支持 #标签 [[Obsidian]] ~25m)..."
            />
          ) : (
            <p
              onClick={(e) => {
                if (!item.completed) {
                  e.stopPropagation();
                  setIsEditing(true);
                }
              }}
              className={`text-xs font-normal leading-relaxed break-words cursor-text hover:text-white transition-colors ${
                item.completed ? 'line-through text-zinc-500' : 'text-zinc-200'
              }`}
              title="点击编辑待办文字"
            >
              {item.title}
            </p>
          )}

          {/* 胶囊标签栏 (Obsidian 双链、估时、Tag) - 仅在非编辑态且有内容时渲染 */}
          {!isEditing && (item.obsidianLinks.length > 0 || item.estimateMinutes || item.tags.length > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Obsidian 双向链接胶囊 */}
              {item.obsidianLinks.map((link, idx) => (
                <button
                  key={idx}
                  type="button"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
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
          )}
        </div>

        {/* 悬停快捷动作条：绝对定位浮动在右上角 */}
        {!isEditing && (
          <div className="absolute top-1.5 right-1.5 flex items-center gap-0.5 p-0.5 rounded-lg bg-[#141419]/95 backdrop-blur-md border border-zinc-700/80 opacity-0 group-hover:opacity-100 transition-all shadow-lg shadow-black/50 pointer-events-none group-hover:pointer-events-auto">
            {onMoveToNow && !isNowFocus && !item.completed && (
              <button
                type="button"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onMoveToNow(item.id)}
                className="p-1 rounded text-zinc-400 hover:text-orange-400 hover:bg-orange-500/10 transition-colors"
                title="设为当前"
              >
                <Flame size={12} />
              </button>
            )}

            {onMoveToNext && !item.completed && (
              <button
                type="button"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onMoveToNext(item.id)}
                className="p-1 rounded text-zinc-400 hover:text-purple-400 hover:bg-purple-500/10 transition-colors"
                title="排入接下来"
              >
                <ListOrdered size={12} />
              </button>
            )}

            {onMoveToPool && (
              <button
                type="button"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onMoveToPool(item.id)}
                className="p-1 rounded text-zinc-400 hover:text-zinc-200 hover:bg-zinc-700 transition-colors"
                title="退回任务池"
              >
                <span className="text-[10px] font-medium px-0.5">池</span>
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                draggable={false}
                onMouseDown={(e) => e.stopPropagation()}
                onClick={() => onDelete(item.id)}
                className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="删除"
              >
                <Trash2 size={12} />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
