import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { Play, Pause, FileText, Folder, Bot, GripVertical, Loader2 } from 'lucide-react';
import { useTimerControl } from '@/hooks/useTimerControl';
import { TimerTask, formatTime } from '@dashboard/shared';
import { fetcher, getApiUrl } from '@/lib/api';
import { getUser } from '@/lib/auth-token';

const openCreateWindow = () => {
  console.log('[Navigation] Opening Create window');
  window.open(window.location.pathname + '#/create', '_blank');
};
const openMemoWindow = () => {
  console.log('[Navigation] Opening Memo window');
  window.open(window.location.pathname + '#/memo', '_blank');
};
const openTodoWindow = () => {
  console.log('[Navigation] Opening Todo window');
  window.open(window.location.pathname + '#/todo', '_blank');
};
const openAiWindow = () => {
  console.log('[Navigation] Opening AI window');
  window.open(window.location.pathname + '#/ai', '_blank');
};

function useDoubleTap(callback: () => void, delay = 300) {
  const lastTap = useRef(0);
  const handleTap = useCallback(() => {
    const now = Date.now();
    if (now - lastTap.current < delay) {
      callback();
      lastTap.current = 0;
      return true;
    } else {
      lastTap.current = now;
    }
    return false;
  }, [callback, delay]);
  return {
    onDoubleClick: callback,
    onTouchEnd: (e: React.TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest('button,a,input,textarea,select')) return;
      if (handleTap()) e.preventDefault();
    },
  };
}

export default function TimerPage() {
  const doubleTapCreate = useDoubleTap(openCreateWindow);
  const [isBlurred, setIsBlurred] = useState(false);

  const user = getUser();
  const userId = user?.id;

  // 恢复日期过滤，只显示今天的任务（保持界面简洁）
  const today = new Date().toISOString().split('T')[0];
  const apiUrl = userId ? `/api/timer-tasks?userId=${userId}&date=${today}` : null;

  const { data: tasks = [], mutate: mutateTasks, isValidating } = useSWR<TimerTask[]>(
    apiUrl,
    fetcher,
    { refreshInterval: 0, revalidateOnFocus: true, dedupingInterval: 2000 }
  );

  // ... (existing code for finding/stopping tasks) ...

  const handleStartTask = useCallback(async (taskData: any) => {
    // ... (existing handleStartTask implementation) ...
  }, [tasks, mutateTasks]); // Removed duplicate definition if any, ensuring single definition

  // ... (existing effects) ...

  const { startTimer, pauseTimer } = useTimerControl({
    tasks,
    onTasksChange: (newTasks) => { if (apiUrl) mutate(apiUrl, newTasks, false); },
    onVersionConflict: () => mutateTasks(),
  });

  const activeTask = useMemo(() => {
    // ... (existing activeTask calculation) ...
  }, [tasks]);

  const recentTasks = useMemo(() => {
    // ... (existing recentTasks calculation) ...
  }, [tasks, activeTask]);

  // ... (rest of helper functions and effects) ...

  if (!userId) {
    // ... (existing login view) ...
  }

  return (
    <div className="w-full h-full bg-[#1a1a1a] text-white select-none overflow-hidden flex">
      <div className="w-10 h-full bg-[#141414] border-r border-zinc-800 flex flex-col z-10 relative shrink-0">
        <button onClick={openMemoWindow} className="h-10 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800" title="备忘录">
          <FileText size={18} />
        </button>
        <button onClick={openTodoWindow} className="h-10 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800" title="项目管理">
          <Folder size={18} />
        </button>
        <button onClick={openAiWindow} className="h-10 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800" title="AI 助手">
          <Bot size={18} />
        </button>
        <div className="flex-1" /> {/* Spacer */}
        <button
          onClick={() => mutateTasks()}
          className={`h-10 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors ${isValidating ? 'animate-spin text-emerald-500' : ''}`}
          title="刷新数据"
        >
          <RotateCw size={16} />
        </button>
      </div>

      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        <div className="shrink-0 p-3 pb-2 flex items-center gap-3">
          {activeTask ? (
            <>
              <button
                onClick={(e) => { e.stopPropagation(); activeTask.isPaused ? startTimer(activeTask.id) : pauseTimer(activeTask.id); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shrink-0 ${activeTask.isPaused ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'}`}
                title={activeTask.isPaused ? "开始" : "暂停"}
                data-drag="false"
              >
                {activeTask.isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
              </button>
              <div
                className={`flex-1 min-w-0 cursor-pointer transition-all ${activeTask.isPaused ? 'text-yellow-400' : 'text-emerald-400'}`}
                onClick={() => setIsBlurred(!isBlurred)}
                {...doubleTapCreate}
                title="单击模糊 / 双击新建"
                data-drag="false"
              >
                <div className={`transition-all ${isBlurred ? 'blur-md' : ''}`}>
                  <div className="font-mono text-2xl font-bold">{formatTime(displayTime)}</div>
                  <div className={`text-xs truncate ${activeTask.isPaused ? 'text-yellow-300/70' : 'text-emerald-300/70'}`} title={activeTask.categoryPath}>
                    {displayTaskName}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 shrink-0" data-drag="false">
                <Play size={18} />
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => setIsBlurred(!isBlurred)}
                {...doubleTapCreate}
                title="单击模糊 / 双击新建"
                data-drag="false"
              >
                <div className={`transition-all ${isBlurred ? 'blur-md' : ''}`}>
                  <div className="font-mono text-2xl font-bold text-zinc-600">00:00:00</div>
                  <div className="text-xs text-zinc-600">双击新建任务</div>
                </div>
              </div>
            </>
          )}
          <div className="shrink-0 w-6 h-10 flex items-center justify-center cursor-move text-zinc-700 hover:text-zinc-500 transition-colors" data-drag="true" title="拖拽">
            <GripVertical size={16} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {recentTasks.map((task) => {
              const hasInstanceTag = !!(task.instanceTag && task.instanceTag.trim() !== '');
              return (
                <button
                  key={task.id}
                  onClick={(e) => { e.stopPropagation(); startTimer(task.id); }}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-colors text-left group relative border
                    ${hasInstanceTag
                      ? 'bg-orange-950/30 border-orange-500/30 hover:bg-orange-900/40'
                      : 'bg-zinc-800/50 border-transparent hover:bg-zinc-700/50'
                    }`}
                  data-drag="false"
                  title={`${task.categoryPath}${hasInstanceTag ? ` #${task.instanceTag}` : ''}`}
                >
                  <Play size={12} className={`shrink-0 transition-colors ${hasInstanceTag ? 'text-orange-400 group-hover:text-orange-300' : 'text-zinc-500 group-hover:text-emerald-400'}`} fill="currentColor" />
                  <div className={`flex flex-col min-w-0 transition-all ${isBlurred ? 'blur-sm' : ''}`}>
                    <span className={`text-xs truncate ${hasInstanceTag ? 'text-orange-200 font-medium' : 'text-zinc-300'}`}>
                      {removeEmojis(task.name)}
                    </span>
                    {hasInstanceTag && (
                      <span className="text-[10px] text-orange-400/80 truncate opacity-0 group-hover:opacity-100 transition-opacity absolute top-[2px] right-2 bg-black/50 px-1 rounded">
                        #{task.instanceTag}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
          {recentTasks.length === 0 && !activeTask && (
            <div className="text-center text-zinc-600 text-sm py-4">暂无任务</div>
          )}
        </div>
      </div>
    </div>
  );
}
