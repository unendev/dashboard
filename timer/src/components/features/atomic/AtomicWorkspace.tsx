import React, { useState, useEffect } from 'react';
import { Settings, X, Trash2, CheckCircle2 } from 'lucide-react';
import { useAtomicWorkspace } from '../../../hooks/useAtomicWorkspace';
import { AtomicQuickInput } from './AtomicQuickInput';
import { AtomicPoolPanel } from './AtomicPoolPanel';
import { ActionMatrixPanel } from './ActionMatrixPanel';
import { ObsidianVaultModal } from './ObsidianVaultModal';
import { CompletedArchiveModal } from './CompletedArchiveModal';

interface AtomicWorkspaceProps {
  onClose?: () => void;
}

export const AtomicWorkspace: React.FC<AtomicWorkspaceProps> = ({ onClose }) => {
  const {
    pool,
    nowFocus,
    nextQueue,
    completedArchive,
    obsidianVault,
    allTags,
    selectedTag,
    setSelectedTag,
    timerRunningState,
    addAtomicItem,
    updateItem,
    deleteItem,
    toggleComplete,
    restoreCompletedItem,
    deleteCompletedItem,
    clearAllCompleted,
    moveToNow,
    moveToNext,
    moveToPool,
    setObsidianVault,
    startTimerForNow,
  } = useAtomicWorkspace();

  const [isVaultModalOpen, setIsVaultModalOpen] = useState(false);
  const [isCompletedModalOpen, setIsCompletedModalOpen] = useState(false);

  const handleClose = () => {
    if (onClose) {
      onClose();
    } else {
      window.close();
    }
  };

  // 全局键盘监听: Esc 关闭窗口
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isVaultModalOpen && !isCompletedModalOpen) {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isVaultModalOpen, isCompletedModalOpen]);

  // 当点击开始专注计时后，触发 Timer 并可优雅收起
  const handleStartTimerAndMinimize = () => {
    startTimerForNow();
    // 延迟 200ms 关闭工作台窗口，让用户看到 Timer 启动后桌面变清爽
    setTimeout(() => {
      handleClose();
    }, 200);
  };

  return (
    <div className="flex flex-col h-screen w-screen bg-[#111113] text-zinc-200 select-none overflow-hidden font-sans border border-zinc-800/80 rounded-xl shadow-2xl">
      {/* 1. 顶部标题栏 + 快捷工具 */}
      <div className="flex items-center justify-between px-3 py-2 bg-[#18181c] border-b border-zinc-800/80 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50" />
          <h2 className="text-xs font-bold tracking-wider text-zinc-100 uppercase">
            工作台
          </h2>
          <span className="text-[11px] text-zinc-500 font-medium">
            (待办 {pool.length + (nowFocus ? 1 : 0) + nextQueue.length})
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Obsidian Vault 绑定按钮 */}
          <button
            onClick={() => setIsVaultModalOpen(true)}
            className="p-1 rounded-lg text-zinc-400 hover:text-purple-300 hover:bg-purple-950/40 border border-transparent hover:border-purple-500/30 transition-all text-[11px] flex items-center gap-1"
            title="绑定 Obsidian 笔记库"
          >
            <Settings size={13} />
          </button>

          {/* 关闭窗口 */}
          <button
            onClick={handleClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="关闭 (Esc)"
          >
            <X size={13} />
          </button>
        </div>
      </div>

      {/* 2. 快速输入条 */}
      <div className="p-3 pb-2 shrink-0">
        <AtomicQuickInput
          onAdd={addAtomicItem}
          selectedTag={selectedTag}
        />
      </div>

      {/* 3. 主双栏工作区 */}
      <div className="flex-1 grid grid-cols-12 gap-3 px-3 pb-2 overflow-hidden min-h-0">
        {/* 左侧 45%：任务池 */}
        <div className="col-span-5 h-full overflow-hidden">
          <AtomicPoolPanel
            items={pool}
            allTags={allTags}
            selectedTag={selectedTag}
            obsidianVault={obsidianVault}
            onSelectTag={setSelectedTag}
            onToggleComplete={toggleComplete}
            onDelete={deleteItem}
            onUpdate={updateItem}
            onMoveToNow={moveToNow}
            onMoveToNext={moveToNext}
            onMoveToPool={moveToPool}
          />
        </div>

        {/* 右侧 55%：当下行动流水线 (Now + Next) */}
        <div className="col-span-7 h-full overflow-hidden">
          <ActionMatrixPanel
            nowFocus={nowFocus}
            nextQueue={nextQueue}
            obsidianVault={obsidianVault}
            timerRunningState={timerRunningState}
            onToggleComplete={toggleComplete}
            onDelete={deleteItem}
            onUpdate={updateItem}
            onMoveToNow={moveToNow}
            onMoveToNext={moveToNext}
            onMoveToPool={moveToPool}
            onStartTimer={startTimerForNow}
            onClearCompleted={clearAllCompleted}
          />
        </div>
      </div>

      {/* 4. 底部状态与快捷键提示栏 */}
      <div className="flex items-center justify-between px-3 py-1.5 bg-[#0f0f12] border-t border-zinc-800/80 text-[10px] text-zinc-500 shrink-0">
        <div className="flex items-center gap-2">
          <span>快捷键:</span>
          <span className="bg-zinc-800 px-1 py-0.2 rounded text-zinc-400">↵ 快速添加</span>
          <span className="bg-zinc-800 px-1 py-0.2 rounded text-zinc-400">Esc 专注/关闭</span>
        </div>

        <div className="flex items-center gap-3">
          {obsidianVault && (
            <span className="text-purple-400/80 font-mono">
              Vault: {obsidianVault}
            </span>
          )}
          <button
            onClick={() => setIsCompletedModalOpen(true)}
            className="hover:text-emerald-300 text-zinc-400 transition-colors flex items-center gap-1.5 px-2 py-0.5 rounded hover:bg-zinc-800/80"
            title="查看与管理所有已完成归档记录"
          >
            <CheckCircle2 size={12} className={completedArchive.length > 0 ? 'text-emerald-400' : 'text-zinc-600'} />
            <span>已完成 ({completedArchive.length})</span>
          </button>
        </div>
      </div>

      {/* Obsidian Vault 设置弹窗 */}
      <ObsidianVaultModal
        isOpen={isVaultModalOpen}
        currentVault={obsidianVault}
        onClose={() => setIsVaultModalOpen(false)}
        onSave={setObsidianVault}
      />

      {/* 已完成任务独立归档弹窗 */}
      <CompletedArchiveModal
        isOpen={isCompletedModalOpen}
        completedList={completedArchive}
        obsidianVault={obsidianVault}
        onClose={() => setIsCompletedModalOpen(false)}
        onRestore={restoreCompletedItem}
        onDeleteSingle={deleteCompletedItem}
        onClearAll={clearAllCompleted}
      />
    </div>
  );
};
