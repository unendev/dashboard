import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, RotateCcw, Trash2, ExternalLink, Sparkles, Search } from 'lucide-react';
import { AtomicItem } from '../../../types/atomic';
import { openObsidianLink } from '../../../lib/atomic-parser';

interface CompletedArchiveModalProps {
  isOpen: boolean;
  completedList: AtomicItem[];
  obsidianVault?: string;
  onClose: () => void;
  onRestore: (id: string) => void;
  onDeleteSingle: (id: string) => void;
  onClearAll: () => void;
}

export const CompletedArchiveModal: React.FC<CompletedArchiveModalProps> = ({
  isOpen,
  completedList,
  obsidianVault,
  onClose,
  onRestore,
  onDeleteSingle,
  onClearAll,
}) => {
  const [selectedTag, setSelectedTag] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // 提取所有已完成任务中的所有标签
  const allTags = useMemo(() => {
    return Array.from(new Set(completedList.flatMap(i => i.tags || [])));
  }, [completedList]);

  // 无标签任务数量
  const untaggedCount = useMemo(() => {
    return completedList.filter(i => !i.tags || i.tags.length === 0).length;
  }, [completedList]);

  // 过滤后的列表
  const filteredList = useMemo(() => {
    return completedList.filter(item => {
      // 1. 标签过滤
      if (selectedTag === 'none') {
        if (item.tags && item.tags.length > 0) return false;
      } else if (selectedTag !== 'all') {
        if (!item.tags || !item.tags.includes(selectedTag)) return false;
      }

      // 2. 搜索过滤
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
  }, [completedList, selectedTag, searchQuery]);

  if (!isOpen) return null;

  const formatCompletedTime = (timestamp?: number) => {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const mins = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${mins}`;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-[#16161a] border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* 1. 弹窗头部 */}
        <div className="flex flex-col border-b border-zinc-800/80 bg-[#1a1a1f] shrink-0">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center gap-2 text-emerald-400">
              <CheckCircle2 size={16} />
              <h3 className="text-xs font-bold text-white tracking-wide">已完成任务归档</h3>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-950/80 border border-emerald-500/30 text-emerald-300 font-mono">
                {completedList.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* 搜索框 */}
              <div className="relative flex items-center">
                <Search size={11} className="absolute left-2 text-zinc-500" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索已完成..."
                  className="w-24 focus:w-36 bg-[#121215] border border-zinc-700/60 focus:border-purple-500 rounded-md pl-6 pr-2 py-0.5 text-[11px] text-zinc-300 placeholder-zinc-500 outline-none transition-all"
                />
              </div>

              <button
                onClick={onClose}
                className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                title="关闭 (Esc)"
              >
                <X size={14} />
              </button>
            </div>
          </div>

          {/* 标签分类切换栏：自适应折行 */}
          {(allTags.length > 0 || untaggedCount > 0) && (
            <div className="flex flex-wrap items-center gap-1.5 max-h-[64px] overflow-y-auto px-4 pb-2.5 pt-0.5">
              <button
                onClick={() => setSelectedTag('all')}
                className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
                  selectedTag === 'all'
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                全部 ({completedList.length})
              </button>

              {untaggedCount > 0 && (
                <button
                  onClick={() => setSelectedTag('none')}
                  className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all ${
                    selectedTag === 'none'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                  }`}
                >
                  无标签 ({untaggedCount})
                </button>
              )}

              {allTags.map(tag => {
                const count = completedList.filter(i => i.tags && i.tags.includes(tag)).length;
                const isSelected = selectedTag === tag;
                return (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag)}
                    className={`px-2 py-0.5 rounded text-[10px] font-medium shrink-0 transition-all flex items-center gap-1 ${
                      isSelected
                        ? 'bg-emerald-600 text-white shadow-sm'
                        : 'bg-zinc-800/80 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200'
                    }`}
                  >
                    <span>#{tag}</span>
                    <span className="text-[9px] opacity-75">({count})</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 2. 已完成任务列表 */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {filteredList.map(item => (
            <div
              key={item.id}
              className="p-2.5 rounded-xl bg-[#1f1f26]/80 border border-zinc-800/80 hover:border-zinc-700/80 transition-all flex items-start justify-between gap-2.5 group"
            >
              <div className="flex items-start gap-2 flex-1 min-w-0">
                <div className="shrink-0 mt-0.5 text-emerald-400">
                  <CheckCircle2 size={14} />
                </div>

                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-medium text-zinc-400 line-through leading-snug break-words">
                    {item.title}
                  </h4>

                  <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                    {item.completedAt && (
                      <span className="text-[10px] text-zinc-600 font-mono">
                        完成于 {formatCompletedTime(item.completedAt)}
                      </span>
                    )}

                    {item.obsidianLinks && item.obsidianLinks.map((link, idx) => (
                      <button
                        key={idx}
                        onClick={() => openObsidianLink(link, obsidianVault)}
                        className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded text-[10px] bg-purple-950/60 border border-purple-500/30 text-purple-300 hover:bg-purple-900/60 hover:text-white transition-colors"
                      >
                        <span>[[{link}]]</span>
                        <ExternalLink size={9} />
                      </button>
                    ))}

                    {item.tags && item.tags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="px-1 py-0.2 rounded text-[9px] bg-zinc-800 text-zinc-500"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* 右侧动作条：恢复 & 单项删除 */}
              <div className="shrink-0 flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  onClick={() => onRestore(item.id)}
                  className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-purple-600 hover:text-white text-zinc-400 text-[10px] font-medium flex items-center gap-1 transition-all"
                  title="恢复回任务池"
                >
                  <RotateCcw size={11} />
                  <span>恢复</span>
                </button>

                <button
                  onClick={() => onDeleteSingle(item.id)}
                  className="p-1.5 rounded-lg bg-zinc-800/90 hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all"
                  title="彻底删除此项"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            </div>
          ))}

          {filteredList.length === 0 && (
            <div className="flex flex-col items-center justify-center h-48 text-center px-4 text-zinc-600">
              <Sparkles size={24} className="mb-2 text-zinc-700" />
              <p className="text-xs font-medium text-zinc-400">
                {completedList.length === 0 ? '暂无已完成归档' : '该分类下暂无已完成任务'}
              </p>
              <p className="text-[11px] text-zinc-600 mt-1">
                {completedList.length === 0
                  ? '所有打勾完成的任务都会被安全存放在这里，随时可查阅或恢复'
                  : '切换上方标签或清空搜索条件查看更多'}
              </p>
            </div>
          )}
        </div>

        {/* 3. 底部操作栏 */}
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-zinc-800/80 bg-[#1a1a1f] shrink-0 text-xs">
          <button
            onClick={onClearAll}
            disabled={completedList.length === 0}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              completedList.length > 0
                ? 'text-red-400/80 hover:text-red-300 hover:bg-red-950/30'
                : 'text-zinc-600 cursor-not-allowed'
            }`}
          >
            <Trash2 size={12} />
            <span>清空所有已完成</span>
          </button>

          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
