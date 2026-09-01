import React, { useState, useRef, useMemo } from 'react';
import { Plus, CornerDownLeft, Sparkles, Clock, ExternalLink } from 'lucide-react';
import { parseAtomicInput } from '../../../lib/atomic-parser';

interface AtomicQuickInputProps {
  selectedTag?: string;
  onAdd: (text: string, targetList: 'pool' | 'now' | 'next') => void;
}

export const AtomicQuickInput: React.FC<AtomicQuickInputProps> = ({ selectedTag, onAdd }) => {
  const [text, setText] = useState('');
  const [target, setTarget] = useState<'pool' | 'now' | 'next'>('pool');
  const inputRef = useRef<HTMLInputElement>(null);

  const isInheritedTagActive = selectedTag && selectedTag !== 'all' && selectedTag !== 'none';

  // 实时解析预览
  const parsedPreview = useMemo(() => {
    if (!text.trim()) return null;
    return parseAtomicInput(text);
  }, [text]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text.trim(), target);
    setText('');
    setTarget('pool'); // 提交后自动回归默认原子池，避免后续误入专注
  };

  return (
    <div className="flex flex-col gap-1.5 p-2.5 bg-[#141417] border-b border-zinc-800 shrink-0">
      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        {/* 输入框主容器 */}
        <div className="flex-1 relative flex items-center bg-[#1c1c21] rounded-lg border border-zinc-700/60 focus-within:border-purple-500 focus-within:ring-1 focus-within:ring-purple-500/40 transition-all">
          <div className="pl-3 text-zinc-500 flex items-center">
            <Sparkles size={14} className="text-purple-400 shrink-0" />
          </div>
          
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={
              isInheritedTagActive
                ? `随手记待办... (按回车自动归入 #${selectedTag})`
                : "随手记待办... (按回车秒级入库，支持 #标签 [[Obsidian笔记]] ~25m)"
            }
            className="w-full bg-transparent px-2.5 py-2 text-xs text-zinc-200 placeholder-zinc-500 outline-none"
            autoFocus
          />

          {/* 右侧提交回车按钮 */}
          <button
            type="submit"
            disabled={!text.trim()}
            className={`mr-1.5 px-2 py-1 rounded flex items-center gap-1 text-[11px] font-medium transition-all
              ${text.trim()
                ? 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-900/40'
                : 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
              }`}
          >
            <span>添加</span>
            <CornerDownLeft size={10} />
          </button>
        </div>

        {/* 目标落点快速选择 */}
        <div className="flex items-center bg-[#1c1c21] p-0.5 rounded-lg border border-zinc-800 text-[10px] shrink-0">
            <button
              type="button"
              onClick={() => setTarget('pool')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                target === 'pool'
                  ? 'bg-zinc-700 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="落入任务池"
            >
              任务池
            </button>
            <button
              type="button"
              onClick={() => setTarget('now')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                target === 'now'
                  ? 'bg-orange-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="直接设为当前并启动计时"
            >
              当前
            </button>
            <button
              type="button"
              onClick={() => setTarget('next')}
              className={`px-2 py-1 rounded font-medium transition-all ${
                target === 'next'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
              title="排入接下来"
            >
              接下来
            </button>
          </div>
      </form>

      {/* 实时解析提示条（如果有标签、双链或估时） */}
      {parsedPreview && (parsedPreview.tags.length > 0 || parsedPreview.obsidianLinks.length > 0 || parsedPreview.estimateMinutes) && (
        <div className="flex items-center gap-1.5 px-2 py-1 rounded bg-[#18181c] border border-zinc-800/80 text-[10px] text-zinc-400">
          <span className="text-zinc-500">已识别:</span>
          {parsedPreview.obsidianLinks.map((link, i) => (
            <span key={i} className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-purple-950/70 border border-purple-500/30 text-purple-300">
              [[{link}]]
            </span>
          ))}
          {parsedPreview.estimateMinutes && (
            <span className="inline-flex items-center gap-0.5 px-1 py-0.2 rounded bg-amber-950/40 border border-amber-500/30 text-amber-300 font-mono">
              ⏱ {parsedPreview.estimateMinutes}m
            </span>
          )}
          {parsedPreview.tags.map((tag, i) => (
            <span key={i} className="px-1 py-0.2 rounded bg-zinc-800 text-zinc-400">
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
};
