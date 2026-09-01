import React from 'react';
import { Flame, ListOrdered, Play, Pause, CheckCircle2, Trash2, ArrowUpCircle, ExternalLink, Sparkles } from 'lucide-react';
import { AtomicItem } from '../../../types/atomic';
import { AtomicCard } from './AtomicCard';
import { openObsidianLink } from '../../../lib/atomic-parser';
import { getAllTasks } from '../../../lib/local-timer-storage';

interface ActionMatrixPanelProps {
  nowFocus: AtomicItem | null;
  nextQueue: AtomicItem[];
  obsidianVault?: string;
  timerRunningState?: {
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
  };
  onToggleComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onUpdate?: (id: string, newText: string) => void;
  onMoveToNow: (id: string) => void;
  onMoveToNext?: (id: string) => void;
  onMoveToPool: (id: string) => void;
  onStartTimer: () => void;
  onClearCompleted: () => void;
}

export const ActionMatrixPanel: React.FC<ActionMatrixPanelProps> = ({
  nowFocus,
  nextQueue,
  obsidianVault,
  timerRunningState,
  onToggleComplete,
  onDelete,
  onUpdate,
  onMoveToNow,
  onMoveToNext,
  onMoveToPool,
  onStartTimer,
  onClearCompleted,
}) => {
  const [isNowDragOver, setIsNowDragOver] = React.useState(false);
  const [isNextDragOver, setIsNextDragOver] = React.useState(false);

  const formatTimerSeconds = (totalSec: number) => {
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    if (h > 0) {
      return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const totalAccumulatedSeconds = React.useMemo(() => {
    if (!nowFocus) return 0;
    const taskName = (nowFocus.title || nowFocus.rawText || '').trim();
    let total = 0;
    try {
      const allTasks = getAllTasks();
      allTasks.forEach(t => {
        if (t.name.trim() === taskName) {
          total += (t.elapsedTime || 0);
          if (t.isRunning && !t.isPaused && t.startTime) {
            const nowSec = Math.floor(Date.now() / 1000);
            total += (nowSec - t.startTime);
          }
        }
      });
    } catch { }
    return total;
  }, [nowFocus, timerRunningState]);

  const formatTotalTime = (seconds: number) => {
    if (seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const [isEditingNow, setIsEditingNow] = React.useState(false);
  const [editNowValue, setEditNowValue] = React.useState(nowFocus?.rawText || nowFocus?.title || '');

  React.useEffect(() => {
    setEditNowValue(nowFocus?.rawText || nowFocus?.title || '');
    setIsEditingNow(false);
  }, [nowFocus?.id, nowFocus?.rawText, nowFocus?.title]);

  const handleSaveNow = () => {
    if (!nowFocus) return;
    const trimmed = editNowValue.trim();
    if (trimmed && trimmed !== (nowFocus.rawText || nowFocus.title)) {
      onUpdate?.(nowFocus.id, trimmed);
    }
    setIsEditingNow(false);
  };

  const handleNowKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveNow();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditNowValue(nowFocus?.rawText || nowFocus?.title || '');
      setIsEditingNow(false);
    }
  };

  const handleNowDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsNowDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id) onMoveToNow(id);
  };

  const handleNextDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsNextDragOver(false);
    const id = e.dataTransfer.getData('text/plain');
    if (id && onMoveToNext) onMoveToNext(id);
  };

  return (
    <div className="flex flex-col h-full bg-[#131316] select-none overflow-hidden">
      <div className="flex-1 overflow-y-auto p-3 space-y-4">
        {/* ================= 1. 🔥 当前专注 (NOW FOCUS) ================= */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsNowDragOver(true); }}
          onDragLeave={() => setIsNowDragOver(false)}
          onDrop={handleNowDrop}
          className={`flex flex-col gap-2 p-1.5 rounded-2xl transition-all ${
            isNowDragOver ? 'ring-2 ring-orange-500/70 bg-orange-950/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-200">
              <Flame size={14} className="text-orange-400" />
              <h3 className="text-xs font-semibold tracking-wide">当前</h3>
            </div>
            {nowFocus && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-purple-300 font-mono font-semibold bg-purple-950/60 border border-purple-800/40 px-1.5 py-0.5 rounded shadow-sm" title="该任务历史总计专注总时长">
                  总累计: {formatTotalTime(totalAccumulatedSeconds)}
                </span>
                <span className="text-[10px] text-zinc-500 font-mono">
                  当前专注
                </span>
              </div>
            )}
          </div>

          {nowFocus ? (
            <div
              draggable={!nowFocus.completed && !isEditingNow}
              onDragStart={(e) => {
                if (isEditingNow) {
                  e.preventDefault();
                  return;
                }
                e.dataTransfer.setData('text/plain', nowFocus.id);
                e.dataTransfer.effectAllowed = 'move';
              }}
              className={`relative p-3.5 rounded-xl bg-gradient-to-br from-[#241a22] to-[#1c1926] border border-purple-500/50 shadow-xl shadow-purple-950/30 flex flex-col gap-3 transition-all ${
                isEditingNow ? 'cursor-default ring-1 ring-purple-500' : 'cursor-grab active:cursor-grabbing hover:border-purple-400'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  {isEditingNow ? (
                    <input
                      type="text"
                      autoFocus
                      value={editNowValue}
                      onChange={(e) => setEditNowValue(e.target.value)}
                      onBlur={handleSaveNow}
                      onKeyDown={handleNowKeyDown}
                      onClick={(e) => e.stopPropagation()}
                      onMouseDown={(e) => e.stopPropagation()}
                      className="w-full bg-[#121216] text-sm text-white font-semibold px-2 py-1 rounded border border-purple-500 outline-none shadow-inner"
                      placeholder="修改当前专注待办 (支持 #标签 [[Obsidian]] ~25m)..."
                    />
                  ) : (
                    <h4
                      onClick={(e) => {
                        if (!nowFocus.completed) {
                          e.stopPropagation();
                          setIsEditingNow(true);
                        }
                      }}
                      className={`text-sm font-semibold leading-snug break-words transition-all cursor-text hover:text-purple-200 ${
                        nowFocus.completed ? 'line-through text-zinc-500 opacity-60' : 'text-white'
                      }`}
                      title="点击编辑待办文字"
                    >
                      {nowFocus.title}
                    </h4>
                  )}

                  {/* 胶囊标签栏 */}
                  {!isEditingNow && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {nowFocus.obsidianLinks && nowFocus.obsidianLinks.map((link, idx) => (
                        <button
                          key={idx}
                          type="button"
                          draggable={false}
                          onMouseDown={(e) => e.stopPropagation()}
                          onClick={() => openObsidianLink(link, obsidianVault)}
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-purple-900/80 border border-purple-400 text-purple-200 hover:bg-purple-800 hover:text-white transition-all shadow-sm"
                          title={`点击打开 Obsidian: ${link}`}
                        >
                          <span>[[{link}]]</span>
                          <ExternalLink size={10} />
                        </button>
                      ))}

                      {nowFocus.estimateMinutes && (
                        <span className="px-2 py-0.5 rounded text-[10px] bg-amber-950/60 border border-amber-500/40 text-amber-300 font-mono">
                          ⏱ 预估 {nowFocus.estimateMinutes} 分钟
                        </span>
                      )}

                      {nowFocus.tags && nowFocus.tags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded text-[10px] bg-zinc-800 border border-zinc-700 text-zinc-300"
                        >
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 完成打勾按钮 */}
                <button
                  type="button"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleComplete(nowFocus.id);
                  }}
                  className={`shrink-0 p-1.5 rounded-lg border transition-all ${
                    nowFocus.completed
                      ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500/50 shadow-sm shadow-emerald-950/40'
                      : 'bg-zinc-800/80 hover:bg-emerald-500/20 text-zinc-400 hover:text-emerald-400 border-zinc-700'
                  }`}
                  title={nowFocus.completed ? '已完成 (点击取消)' : '完成此任务'}
                >
                  <CheckCircle2 size={18} className={nowFocus.completed ? 'text-emerald-400 fill-emerald-500/30' : ''} />
                </button>
              </div>

              {/* 底部专注控制条 */}
              <div className="flex items-center justify-between pt-2 border-t border-purple-500/20">
                <button
                  type="button"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={onStartTimer}
                  disabled={nowFocus.completed}
                  className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-all ${
                    nowFocus.completed
                      ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : timerRunningState?.isRunning
                      ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/50'
                      : timerRunningState?.isPaused
                      ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-md shadow-amber-950/40'
                      : 'bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-900/50 hover:shadow-purple-900/80'
                  }`}
                  title={
                    timerRunningState?.isRunning
                      ? '当前正在专注计时中，点击可暂停'
                      : timerRunningState?.isPaused
                      ? '当前已暂停，点击继续计时'
                      : '发送到常驻 Timer 开始计时'
                  }
                >
                  {timerRunningState?.isRunning ? (
                    <>
                      <Pause size={13} fill="currentColor" className="shrink-0" />
                      <span className="font-mono font-bold text-xs tracking-wider">{formatTimerSeconds(timerRunningState.elapsedSeconds)}</span>
                    </>
                  ) : timerRunningState?.isPaused ? (
                    <>
                      <Play size={13} fill="currentColor" className="shrink-0" />
                      <span className="font-mono font-bold text-xs tracking-wider">{formatTimerSeconds(timerRunningState.elapsedSeconds)}</span>
                    </>
                  ) : (
                    <>
                      <Play size={13} fill="currentColor" className="shrink-0" />
                      <span className="font-mono font-bold text-xs tracking-wider">{nowFocus.completed ? '已完成' : '00:00'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  draggable={false}
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => onMoveToPool(nowFocus.id)}
                  className="ml-2 px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 text-xs transition-colors"
                  title="退回任务池"
                >
                  移回池
                </button>
              </div>
            </div>
          ) : (
            <div className="p-4 rounded-xl border border-dashed border-zinc-800 bg-[#16161a] text-center flex flex-col items-center justify-center text-zinc-500">
              <Sparkles size={20} className="text-zinc-600 mb-1.5" />
              <p className="text-xs font-medium text-zinc-400">暂无当前任务</p>
              <p className="text-[11px] text-zinc-600 mt-0.5">
                可直接将左侧任务拖拽至此处，或点击设为当前
              </p>
            </div>
          )}
        </div>

        {/* ================= 2. 📋 接下来 (NEXT QUEUE) ================= */}
        <div
          onDragOver={(e) => { e.preventDefault(); setIsNextDragOver(true); }}
          onDragLeave={() => setIsNextDragOver(false)}
          onDrop={handleNextDrop}
          className={`flex flex-col gap-2 pt-2 border-t border-zinc-800/60 p-1.5 rounded-2xl transition-all ${
            isNextDragOver ? 'ring-2 ring-purple-500/70 bg-purple-950/20' : ''
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-zinc-200">
              <ListOrdered size={14} className="text-purple-400" />
              <h3 className="text-xs font-semibold tracking-wide">接下来</h3>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-zinc-800 text-zinc-400 font-mono">
                {nextQueue.length}
              </span>
            </div>

            {nextQueue.some(i => i.completed) && (
              <button
                onClick={onClearCompleted}
                className="text-[10px] text-zinc-500 hover:text-zinc-300 transition-colors flex items-center gap-1"
                title="清理队列中已完成项"
              >
                <Trash2 size={10} />
                <span>清理已完成</span>
              </button>
            )}
          </div>

          <div className="space-y-2">
            {nextQueue.map((item, idx) => (
              <div key={item.id} className="relative flex items-center gap-2">
                <span className="text-[10px] text-zinc-600 font-mono w-3 text-right">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <AtomicCard
                    item={item}
                    obsidianVault={obsidianVault}
                    onToggleComplete={onToggleComplete}
                    onDelete={onDelete}
                    onUpdate={onUpdate}
                    onMoveToNow={onMoveToNow}
                    onMoveToPool={onMoveToPool}
                  />
                </div>
              </div>
            ))}

            {nextQueue.length === 0 && (
              <div className="p-3 rounded-lg border border-dashed border-zinc-800/80 bg-[#16161a]/60 text-center text-xs text-zinc-600">
                队列为空，可直接将左侧任务拖拽至此处排入后备
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
