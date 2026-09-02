import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Play, Pause, FileText, Trash2, Clock, Link2 } from 'lucide-react';
import { useLocalTimerControl } from '@/hooks/useLocalTimerControl';
import { TimerTask, formatTime } from '@dashboard/shared';
import { getAllTasks, deleteTask } from '@/lib/local-timer-storage';
import { getUnifiedItem, setUnifiedItem } from '@/lib/unified-storage';
import {
  getLogicalDateString,
  getTodayElapsedSeconds,
  getTotalAccumulatedSeconds,
  formatTotalAccumulatedTime,
} from '@/lib/timer-domain';
import type { AtomicWorkspaceData } from '@/types/atomic';
import StopwatchPanel from '@/components/features/timer/StopwatchPanel';
import CountdownPanel from '@/components/features/timer/CountdownPanel';

export interface SwitcherItem {
  id: string;
  name: string;
  categoryPath?: string;
  instanceTag?: string;
  source: 'workspace-next' | 'workspace-pool' | 'task';
  isNext?: boolean;
  rawWorkspaceItem?: any;
}

type TimerMode = 'focus' | 'stopwatch' | 'countdown';

const openCreateWindow = () => {
  if (window.electron) {
    window.electron.send('open-create-window');
  } else {
    window.open(window.location.pathname + '#/create', '_blank');
  }
};
const openMemoWindow = () => {
  if (window.electron) {
    window.electron.send('open-memo-window');
  } else {
    window.open(window.location.pathname + '#/memo', '_blank');
  }
};
const openLinkStationWindow = () => {
  if (window.electron) {
    window.electron.send('open-link-station-window');
  } else {
    window.open(window.location.pathname + '#/link-station', '_blank');
  }
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
  const [taskToDelete, setTaskToDelete] = useState<SwitcherItem | null>(null);
  const [currentMode, setCurrentMode] = useState<TimerMode>('focus');
  const [globalTick, setGlobalTick] = useState(0);
  const [tasks, setTasks] = useState<TimerTask[]>(() => getAllTasks());
  const [workspaceData, setWorkspaceData] = useState<AtomicWorkspaceData | null>(() =>
    getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null)
  );

  const refreshTasks = useCallback(() => {
    setTasks(getAllTasks());
  }, []);

  const refreshWorkspace = useCallback(() => {
    setWorkspaceData(getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null));
  }, []);

  const { startTimerByName, pauseTimer } = useLocalTimerControl({
    onTasksChange: (newTasks) => {
      setTasks(newTasks);
    },
  });

  // 定时驱动 UI 毫秒级重绘，保证跑秒平滑顺畅
  useEffect(() => {
    const id = setInterval(() => setGlobalTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  // 跨窗口事件监听 (IPC & Storage)
  useEffect(() => {
    let unsubscribeStart: (() => void) | undefined;
    let unsubscribeMode: (() => void) | undefined;

    if (window.electron) {
      unsubscribeStart = window.electron.receive('on-start-task', (taskData) => {
        console.log('[Timer Renderer] on-start-task:', taskData);
        setCurrentMode('focus');
        const tag = Array.isArray(taskData.instanceTagNames)
          ? taskData.instanceTagNames[0] || ''
          : (typeof taskData.instanceTagNames === 'string' ? taskData.instanceTagNames : '');
        startTimerByName(taskData.name, taskData.categoryPath || '即时待办', tag);
        refreshTasks();
        refreshWorkspace();
      });

      unsubscribeMode = window.electron.receive('on-mode-selected', (mode) => {
        console.log('[Timer Renderer] on-mode-selected:', mode);
        if (mode === 'focus' || mode === 'stopwatch' || mode === 'countdown') {
          setCurrentMode(mode as TimerMode);
        }
      });
    }

    const handleStorageChange = () => {
      refreshTasks();
      refreshWorkspace();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (unsubscribeStart) unsubscribeStart();
      if (unsubscribeMode) unsubscribeMode();
    };
  }, [startTimerByName, refreshTasks, refreshWorkspace]);

  // 1. 确定当前主计时区展示的目标任务名
  const activeTaskName = useMemo(() => {
    // 优先：当前正在跑秒的任务
    const running = tasks.find(t => t.isRunning && !t.isPaused);
    if (running) return running.name.trim();

    // 其次：工作台「当前专注」(nowFocus)
    if (workspaceData?.nowFocus) {
      const nowTitle = (workspaceData.nowFocus.title || workspaceData.nowFocus.rawText || '').trim();
      if (nowTitle) return nowTitle;
    }

    // 再次：最近暂停的任务
    const paused = tasks.find(t => t.isPaused);
    if (paused) return paused.name.trim();

    // 兜底：首个任务
    if (tasks.length > 0) return tasks[0].name.trim();

    return '';
  }, [tasks, workspaceData?.nowFocus]);

  const todayStr = getLogicalDateString();

  // 查找今天属于该任务的活跃 Session
  const todayActiveSession = useMemo(() => {
    if (!activeTaskName) return null;
    return tasks.find(t => t.name.trim() === activeTaskName && t.date === todayStr) || null;
  }, [tasks, activeTaskName, todayStr]);

  const isRunning = Boolean(todayActiveSession?.isRunning && !todayActiveSession?.isPaused);

  // 纯函数确定性计算：今日已用总秒数（大字）
  const todayElapsedSeconds = useMemo(() => {
    if (!activeTaskName) return 0;
    return getTodayElapsedSeconds(tasks, activeTaskName);
  }, [tasks, activeTaskName, globalTick]);

  // 纯函数确定性计算：终身历史总累计秒数（右上角小角标）
  const totalAccumulatedSeconds = useMemo(() => {
    if (!activeTaskName) return 0;
    return getTotalAccumulatedSeconds(tasks, activeTaskName);
  }, [tasks, activeTaskName, globalTick]);

  // 从工作台（接下来 + 任务池）构建快捷待切任务网格
  const switcherList = useMemo(() => {
    const list: SwitcherItem[] = [];
    const seenNames = new Set<string>();
    const currentName = activeTaskName.trim();

    // 1. 优先展示工作台「接下来」(Next Queue)
    if (workspaceData?.nextQueue) {
      workspaceData.nextQueue.forEach((item) => {
        const title = (item.title || item.rawText || '').trim();
        if (title && title !== currentName && !seenNames.has(title)) {
          seenNames.add(title);
          list.push({
            id: item.id,
            name: title,
            categoryPath: '接下来',
            instanceTag: item.tags?.[0] || '接下来',
            source: 'workspace-next',
            isNext: true,
            rawWorkspaceItem: item,
          });
        }
      });
    }

    // 2. 展示工作台「任务池」(Pool)
    if (workspaceData?.pool) {
      workspaceData.pool.forEach((item) => {
        const title = (item.title || item.rawText || '').trim();
        if (title && title !== currentName && !seenNames.has(title)) {
          seenNames.add(title);
          list.push({
            id: item.id,
            name: title,
            categoryPath: '任务池',
            instanceTag: item.tags?.[0] || '',
            source: 'workspace-pool',
            rawWorkspaceItem: item,
          });
        }
      });
    }

    // 3. 仅当工作台完全没有任何待切项时，回退展示其他独立历史任务
    if (list.length === 0) {
      const topLevelTasks = tasks.filter((t) => !t.parentId && t.categoryPath !== '即时待办');
      topLevelTasks.forEach((t) => {
        const title = t.name.trim();
        if (title && title !== currentName && !seenNames.has(title)) {
          seenNames.add(title);
          list.push({
            id: t.id,
            name: title,
            categoryPath: t.categoryPath || '',
            instanceTag: t.instanceTag || '',
            source: 'task',
          });
        }
      });
    }

    return list;
  }, [workspaceData, tasks, activeTaskName]);

  // 一键切换任务：联动工作台「当前」并启动计时
  const handleSwitchToItem = useCallback(async (item: SwitcherItem) => {
    const currentWorkspace = getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null);
    if (currentWorkspace) {
      const oldNow = currentWorkspace.nowFocus;
      const targetId = item.id;
      const targetInPool = currentWorkspace.pool.find(i => i.id === targetId);
      const targetInNext = currentWorkspace.nextQueue.find(i => i.id === targetId);
      const target = targetInPool || targetInNext || (currentWorkspace.nowFocus?.id === targetId ? currentWorkspace.nowFocus : null) || {
        id: item.id,
        rawText: item.name,
        title: item.name,
        tags: item.instanceTag ? [item.instanceTag] : [],
        obsidianLinks: [],
        completed: false,
        createdAt: Date.now(),
      };

      const filteredNext = currentWorkspace.nextQueue.filter(i => i.id !== targetId);
      const newNext = oldNow && oldNow.id !== targetId ? [oldNow, ...filteredNext] : filteredNext;
      const newPool = currentWorkspace.pool.filter(i => i.id !== targetId);

      const nextWorkspace: AtomicWorkspaceData = {
        ...currentWorkspace,
        pool: newPool,
        nowFocus: target,
        nextQueue: newNext,
      };
      setUnifiedItem('atomic-workspace-data-v1', nextWorkspace);
    }

    await startTimerByName(item.name, item.categoryPath || '即时待办', item.instanceTag || '');
    window.dispatchEvent(new Event('storage'));
    refreshTasks();
    refreshWorkspace();
  }, [startTimerByName, refreshTasks, refreshWorkspace]);

  const removeEmojis = (str: string) => {
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  };

  const handleBackup = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.electron) return;

    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        if (key.startsWith('chat-history-') || key.startsWith('ai-chat-')) continue;
        try {
          const val = localStorage.getItem(key);
          backupData[key] = val ? JSON.parse(val) : null;
        } catch {
          backupData[key] = localStorage.getItem(key);
        }
      }
    }

    window.electron.send('backup-and-push', backupData);
    const btn = e.currentTarget as HTMLElement;
    btn.style.opacity = '0.5';
    setTimeout(() => btn.style.opacity = '1', 200);
  }, []);

  const handleDeleteConfirm = useCallback((item: SwitcherItem) => {
    if (item.source === 'workspace-next' || item.source === 'workspace-pool') {
      const currentWorkspace = getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null);
      if (currentWorkspace) {
        const nextWorkspace: AtomicWorkspaceData = {
          ...currentWorkspace,
          pool: currentWorkspace.pool.filter(i => i.id !== item.id),
          nextQueue: currentWorkspace.nextQueue.filter(i => i.id !== item.id),
          nowFocus: currentWorkspace.nowFocus?.id === item.id ? null : currentWorkspace.nowFocus,
        };
        setUnifiedItem('atomic-workspace-data-v1', nextWorkspace);
        window.dispatchEvent(new Event('storage'));
        refreshTasks();
        refreshWorkspace();
      }
    } else {
      deleteTask(item.id);
      refreshTasks();
    }
    setTaskToDelete(null);
  }, [refreshTasks, refreshWorkspace]);

  return (
    <div className="w-full h-full bg-[#1a1a1a] text-white select-none overflow-hidden flex">
      {/* 左侧功能栏 */}
      <div
        className="w-10 h-full bg-[#141414] border-r border-zinc-800 flex flex-col z-10 relative shrink-0"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        <button
          onClick={() => {
            if (window.electron) {
              window.electron.send('show-mode-menu');
            }
          }}
          onContextMenu={(e) => {
            e.preventDefault();
            if (window.electron) {
              window.electron.send('show-toolbar-context-menu');
            }
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="flex-1 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          title="切换模式 (右键查看更多)"
        >
          <Clock size={18} />
        </button>
        <button
          onClick={openMemoWindow}
          onContextMenu={(e) => {
            e.preventDefault();
            if (window.electron) {
              window.electron.send('show-toolbar-context-menu');
            }
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="flex-1 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          title="即时原子工作台 (右键查看更多)"
        >
          <FileText size={18} />
        </button>
        <button
          onClick={openLinkStationWindow}
          onContextMenu={(e) => {
            e.preventDefault();
            if (window.electron) {
              window.electron.send('show-toolbar-context-menu');
            }
          }}
          style={{ WebkitAppRegion: 'no-drag' } as any}
          className="flex-1 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="链接收纳槽 (右键查看更多)"
        >
          <Link2 size={18} />
        </button>
      </div>

      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        {currentMode === 'focus' ? (
          <>
            {/* 顶部主计时区 */}
            <div
              className="shrink-0 p-3 pb-2.5 flex items-center justify-between gap-2.5 cursor-move"
              style={{ WebkitAppRegion: 'drag' } as any}
              {...doubleTapCreate}
              title="按住此区域可任意拖拽窗口，双击新建任务"
            >
              {activeTaskName ? (
                <>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (isRunning) {
                            await pauseTimer(todayActiveSession?.id);
                          } else {
                            await startTimerByName(activeTaskName);
                          }
                          refreshTasks();
                        }}
                        onContextMenu={handleBackup}
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors shadow-md ${
                          !isRunning
                            ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 border border-yellow-500/30'
                            : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30'
                        }`}
                        title={!isRunning ? "开始计时 (右键备份数据)" : "暂停计时 (右键备份数据)"}
                      >
                        {!isRunning ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                      </button>
                    </div>

                    <div
                      className="flex-1 min-w-0"
                      onClick={() => setIsBlurred(!isBlurred)}
                    >
                      {/* 今日用时：大字 */}
                      <div className={`font-mono text-2xl font-bold tracking-tight transition-all leading-none ${
                        !isRunning ? 'text-yellow-400' : 'text-emerald-400'
                      } ${isBlurred ? 'blur-md' : ''}`}>
                        {formatTime(todayElapsedSeconds)}
                      </div>
                      <div
                        className={`text-xs truncate font-medium mt-1 ${
                          !isRunning ? 'text-yellow-300/80' : 'text-emerald-300/80'
                        }`}
                      >
                        {removeEmojis(activeTaskName)}
                      </div>
                    </div>
                  </div>

                  {/* 右上角：终身总累计专注时间 */}
                  <div
                    className="flex flex-col items-end shrink-0 pr-1 select-none pointer-events-none"
                    title={`《${activeTaskName}》全生命周期历史累计总专注时间`}
                  >
                    <span className="text-[9px] text-zinc-500 font-mono tracking-tighter uppercase leading-none">总累计</span>
                    <span className="text-[11px] text-purple-300 font-mono font-semibold mt-0.5 leading-none">
                      {formatTotalAccumulatedTime(totalAccumulatedSeconds)}
                    </span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
                      <div 
                        className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-context-menu" 
                        onContextMenu={handleBackup}
                        title="右键备份数据"
                      >
                        <Play size={18} />
                      </div>
                    </div>
                    <div
                      className="flex-1 min-w-0"
                      onClick={() => setIsBlurred(!isBlurred)}
                    >
                      <div className={`font-mono text-2xl font-bold text-zinc-600 transition-all leading-none ${isBlurred ? 'blur-md' : ''}`}>
                        00:00:00
                      </div>
                      <div className="text-xs text-zinc-600 mt-1">双击新建任务</div>
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* 待切任务网格 */}
            <div className="flex-1 overflow-y-auto px-1 pb-3">
              <div className="grid grid-cols-2 border-l border-t border-zinc-700/40">
                {switcherList.map((item) => {
                  const isNext = item.source === 'workspace-next';
                  const isPool = item.source === 'workspace-pool';
                  const hasTag = !!(item.instanceTag && item.instanceTag.trim() !== '');

                  return (
                    <div
                      key={item.id}
                      className={`relative transition-colors group border-r border-b border-zinc-700/40 ${
                        isNext
                          ? 'bg-[#241738]/90 hover:bg-[#341e54]'
                          : isPool
                          ? 'bg-[#181822]/90 hover:bg-[#252536]'
                          : hasTag
                          ? 'bg-[#2a1d10] hover:bg-[#332414]'
                          : 'bg-zinc-800/60 hover:bg-zinc-700/60'
                      }`}
                      data-drag="false"
                    >
                      <div className="w-full flex items-stretch h-7">
                        <div
                          onClick={() => handleSwitchToItem(item)}
                          className="shrink-0 w-7 flex items-center justify-center cursor-pointer group/play hover:bg-emerald-500/20 transition-colors"
                          title="切换并开始计时"
                        >
                          <Play
                            size={9}
                            className={`transition-colors ${
                              isNext
                                ? 'text-purple-400 group-hover/play:text-purple-300'
                                : isPool
                                ? 'text-zinc-400 group-hover/play:text-emerald-400'
                                : hasTag
                                ? 'text-amber-500 group-hover/play:text-amber-400'
                                : 'text-zinc-500 group-hover/play:text-zinc-300'
                            }`}
                            fill="currentColor"
                          />
                        </div>
                        <div
                          onClick={() => handleSwitchToItem(item)}
                          className={`flex-1 min-w-0 pr-2 flex items-center cursor-pointer transition-all ${isBlurred ? 'blur-sm' : ''}`}
                          title={`点击一键切换为当前专注\n[${item.categoryPath}] ${item.name}${hasTag ? ` #${item.instanceTag}` : ''}`}
                        >
                          <span className={`text-[11px] truncate leading-none ${
                            isNext
                              ? 'text-purple-200 font-medium'
                              : isPool
                              ? 'text-zinc-200'
                              : hasTag
                              ? 'text-amber-100'
                              : 'text-zinc-200'
                          }`}>
                            {removeEmojis(item.name)}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setTaskToDelete(item);
                        }}
                        className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all z-10"
                        title="删除待办"
                        data-drag="false"
                      >
                        <Trash2 size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
              {switcherList.length === 0 && !activeTaskName && (
                <div className="text-center text-zinc-600 text-sm py-4">暂无待办</div>
              )}
            </div>
          </>
        ) : currentMode === 'stopwatch' ? (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <StopwatchPanel tick={globalTick} />
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-hidden">
              <CountdownPanel tick={globalTick} />
            </div>
          </div>
        )}
      </div>

      {taskToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setTaskToDelete(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0"><Trash2 size={20} className="text-red-400" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1">删除待办</h3>
                <p className="text-sm text-zinc-400">确定要删除 <span className="text-white font-medium">"{taskToDelete.name}"</span> 吗？</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setTaskToDelete(null)} className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors">取消</button>
              <button onClick={() => handleDeleteConfirm(taskToDelete)} className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
