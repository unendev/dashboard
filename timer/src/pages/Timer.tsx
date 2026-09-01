import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Play, Pause, FileText, Trash2, Clock, Link2 } from 'lucide-react';
import { useLocalTimerControl } from '@/hooks/useLocalTimerControl';
import { TimerTask, formatTime } from '@dashboard/shared';
import { getAllTasks, saveAllTasks, deleteTask, createTask } from '@/lib/local-timer-storage';
import { getUnifiedItem, setUnifiedItem } from '@/lib/unified-storage';
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

const modeLabels: Record<TimerMode, string> = {
  focus: '专注',
  stopwatch: '秒表',
  countdown: '倒计时',
};

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
const openTodoWindow = () => {
  if (window.electron) {
    window.electron.send('open-todo-window');
  } else {
    window.open(window.location.pathname + '#/todo', '_blank');
  }
};
const openAiWindow = () => {
  if (window.electron) {
    window.electron.send('open-ai-window');
  } else {
    window.open(window.location.pathname + '#/ai', '_blank');
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

// 自动对齐并清理已在工作台中删除的孤儿即时待办
function cleanOrphanInstantTasks(currentTasks: TimerTask[]): TimerTask[] {
  const workspaceData = getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null);
  if (!workspaceData) return currentTasks;

  const validWorkspaceTitles = new Set<string>();
  if (workspaceData.nowFocus) {
    validWorkspaceTitles.add((workspaceData.nowFocus.title || workspaceData.nowFocus.rawText).trim());
  }
  workspaceData.nextQueue?.forEach(item => {
    validWorkspaceTitles.add((item.title || item.rawText).trim());
  });
  workspaceData.pool?.forEach(item => {
    validWorkspaceTitles.add((item.title || item.rawText).trim());
  });
  workspaceData.completedArchive?.forEach(item => {
    validWorkspaceTitles.add((item.title || item.rawText).trim());
  });

  const filtered = currentTasks.filter(t => {
    if (t.categoryPath === '即时待办') {
      return validWorkspaceTitles.has(t.name.trim());
    }
    return true;
  });

  if (filtered.length !== currentTasks.length) {
    saveAllTasks(filtered);
    return filtered;
  }
  return currentTasks;
}

export default function TimerPage() {
  const doubleTapCreate = useDoubleTap(openCreateWindow);
  const [isBlurred, setIsBlurred] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<SwitcherItem | null>(null);
  const [currentMode, setCurrentMode] = useState<TimerMode>('focus');
  const [globalTick, setGlobalTick] = useState(0);
  const [tasks, setTasks] = useState<TimerTask[]>(() => cleanOrphanInstantTasks(getAllTasks()));
  const [workspaceData, setWorkspaceData] = useState<AtomicWorkspaceData | null>(() =>
    getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null)
  );

  const refreshTasks = useCallback(() => {
    const raw = getAllTasks();
    const cleaned = cleanOrphanInstantTasks(raw);
    setTasks(cleaned);
  }, []);

  const refreshWorkspace = useCallback(() => {
    setWorkspaceData(getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null));
  }, []);

  const { startTimer, pauseTimer } = useLocalTimerControl({
    onTasksChange: (newTasks) => {
      setTasks(cleanOrphanInstantTasks(newTasks));
    },
  });

  useEffect(() => {
    const id = setInterval(() => setGlobalTick((t) => t + 1), 200);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let unsubscribeStart: (() => void) | undefined;
    let unsubscribeMode: (() => void) | undefined;

    if (window.electron) {
      unsubscribeStart = window.electron.receive('on-start-task', (taskData) => {
        console.log('[Timer Renderer] on-start-task:', taskData);
        setCurrentMode('focus');

        // 查找是否已经存在同名顶级任务
        const currentTasks = getAllTasks();
        const nowSec = Math.floor(Date.now() / 1000);
        const existingIndex = currentTasks.findIndex(t => t.name === taskData.name && !t.parentId);

        if (existingIndex > -1) {
          // 已经存在该任务：复用并置顶启动，安全继承并累加历史已用时
          const existingTask = currentTasks[existingIndex];
          const oldSessionTime = (existingTask.isRunning && !existingTask.isPaused && existingTask.startTime)
            ? nowSec - existingTask.startTime
            : 0;
          const remainingTasks = currentTasks.filter((t, i) => i !== existingIndex);
          const updatedExisting = {
            ...existingTask,
            isRunning: true,
            isPaused: false,
            startTime: nowSec,
            elapsedTime: (existingTask.elapsedTime || 0) + oldSessionTime,
            updatedAt: new Date().toISOString(),
          };
          const nextList = [
            updatedExisting,
            ...remainingTasks.map(t => (t.isRunning && !t.isPaused ? { ...t, isRunning: false, isPaused: true, pausedTime: nowSec } : t))
          ];
          saveAllTasks(nextList);
        } else {
          // 不存在：暂停其他正在运行的任务并新建
          const updated = currentTasks.map(t => (t.isRunning && !t.isPaused ? { ...t, isRunning: false, isPaused: true, pausedTime: nowSec } : t));
          saveAllTasks(updated);

          const tag = Array.isArray(taskData.instanceTagNames)
            ? taskData.instanceTagNames[0] || ''
            : (typeof taskData.instanceTagNames === 'string' ? taskData.instanceTagNames : '');

          createTask({
            name: taskData.name,
            categoryPath: taskData.categoryPath || '即时待办',
            instanceTag: tag,
            initialTime: taskData.initialTime || 0,
            elapsedTime: 0,
            isRunning: true,
            startTime: nowSec,
            isPaused: false,
            pausedTime: 0,
            children: [],
            parentId: taskData.parentId || null,
            date: new Date().toISOString().split('T')[0],
          });
        }
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
  }, [refreshTasks, refreshWorkspace]);

  const activeTask = useMemo(() => {
    // 1. 优先查找正在运行中的任务 (isRunning && !isPaused)
    const findRunning = (list: TimerTask[]): TimerTask | null => {
      for (const task of list) {
        if (task.isRunning && !task.isPaused) return task;
        if (task.children) {
          const found = findRunning(task.children);
          if (found) return found;
        }
      }
      return null;
    };

    const running = findRunning(tasks);
    if (running) return running;

    // 2. 匹配工作台「当前专注」(nowFocus)，哪怕暂停也保持挂载
    if (workspaceData?.nowFocus) {
      const nowTitle = (workspaceData.nowFocus.title || workspaceData.nowFocus.rawText || '').trim();
      const matched = tasks.find(t => t.name.trim() === nowTitle);
      if (matched) return matched;
    }

    // 3. 查找处于暂停状态的任务 (isPaused)
    const findPaused = (list: TimerTask[]): TimerTask | null => {
      for (const task of list) {
        if (task.isPaused) return task;
        if (task.children) {
          const found = findPaused(task.children);
          if (found) return found;
        }
      }
      return null;
    };

    const paused = findPaused(tasks);
    if (paused) return paused;

    // 4. 若已有历史任务列表，保留第一个任务就绪展示，不卸载
    if (tasks.length > 0) {
      return tasks[0];
    }

    return null;
  }, [tasks, workspaceData?.nowFocus]);

  // 从工作台（接下来 + 任务池）以及已有任务中智能聚合待切任务流
  const switcherList = useMemo(() => {
    const list: SwitcherItem[] = [];
    const seenNames = new Set<string>();
    const activeName = activeTask ? activeTask.name.trim() : '';

    // 1. 优先展示工作台「接下来」(Next Queue)
    if (workspaceData?.nextQueue) {
      workspaceData.nextQueue.forEach((item) => {
        const title = (item.title || item.rawText || '').trim();
        if (title && title !== activeName && !seenNames.has(title)) {
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
        if (title && title !== activeName && !seenNames.has(title)) {
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

    // 3. 其他顶级 Timer 历史任务
    const topLevelTasks = tasks.filter((t) => !t.parentId);
    topLevelTasks.forEach((t) => {
      const title = t.name.trim();
      if (title && title !== activeName && !seenNames.has(title)) {
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

    return list;
  }, [workspaceData, tasks, activeTask]);

  // 一键切换任务：同时联动更新工作台「当前」与 Timer 计时器
  const handleSwitchToItem = useCallback((item: SwitcherItem) => {
    const currentWorkspace = getUnifiedItem<AtomicWorkspaceData | null>('atomic-workspace-data-v1', null);
    const nowSec = Math.floor(Date.now() / 1000);
    const nowISO = new Date().toISOString();

    if (currentWorkspace) {
      const oldNow = currentWorkspace.nowFocus;

      // 结算旧 nowFocus
      if (oldNow) {
        const currentTasks = getAllTasks();
        const targetTitle = (oldNow.title || oldNow.rawText || '').trim();
        const updated = currentTasks.map(t => {
          if (t.name.trim() === targetTitle && t.isRunning && !t.isPaused) {
            const sessionTime = t.startTime ? nowSec - t.startTime : 0;
            return {
              ...t,
              isRunning: false,
              isPaused: true,
              elapsedTime: (t.elapsedTime || 0) + sessionTime,
              startTime: null,
              pausedTime: nowSec,
              updatedAt: nowISO,
            };
          }
          return t;
        });
        saveAllTasks(updated);
      }

      // 查找并转移新目标
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

    // 启动目标计时
    const taskName = item.name.trim();
    const tag = item.instanceTag || '即时待办';
    const currentTasks = getAllTasks();
    const existingIndex = currentTasks.findIndex(t => t.name.trim() === taskName && !t.parentId);

    if (existingIndex > -1) {
      const existingTask = currentTasks[existingIndex];
      const oldSessionTime = (existingTask.isRunning && !existingTask.isPaused && existingTask.startTime)
        ? nowSec - existingTask.startTime
        : 0;
      const remainingTasks = currentTasks.filter((t, i) => i !== existingIndex);
      const updatedExisting = {
        ...existingTask,
        isRunning: true,
        isPaused: false,
        startTime: nowSec,
        elapsedTime: (existingTask.elapsedTime || 0) + oldSessionTime,
        updatedAt: nowISO,
      };
      saveAllTasks([
        updatedExisting,
        ...remainingTasks.map(t => (t.isRunning && !t.isPaused ? { ...t, isRunning: false, isPaused: true, pausedTime: nowSec, updatedAt: nowISO } : t))
      ]);
    } else {
      const paused = currentTasks.map(t => (t.isRunning && !t.isPaused ? { ...t, isRunning: false, isPaused: true, pausedTime: nowSec, updatedAt: nowISO } : t));
      saveAllTasks(paused);
      createTask({
        name: taskName,
        categoryPath: item.categoryPath || '即时待办',
        instanceTag: tag,
        initialTime: 0,
        elapsedTime: 0,
        isRunning: true,
        startTime: nowSec,
        isPaused: false,
        pausedTime: 0,
        children: [],
        parentId: null,
        date: new Date().toISOString().split('T')[0],
      });
    }

    window.dispatchEvent(new Event('storage'));
    refreshTasks();
    refreshWorkspace();
  }, [refreshTasks, refreshWorkspace]);

  const removeEmojis = (str: string) => {
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  };

  const displayTaskName = activeTask ? removeEmojis(activeTask.name) : '';

  // 累计该任务在所有历史记录中的全量专注时长
  const totalAccumulatedSeconds = useMemo(() => {
    if (!activeTask) return 0;
    const taskName = activeTask.name.trim();
    let total = 0;
    tasks.forEach(t => {
      if (t.name.trim() === taskName) {
        total += (t.elapsedTime || 0);
        if (t.isRunning && !t.isPaused && t.startTime) {
          const nowSec = Math.floor(Date.now() / 1000);
          total += (nowSec - t.startTime);
        }
      }
    });
    return total;
  }, [activeTask, tasks, globalTick]);

  const formatTotalTime = (seconds: number) => {
    if (seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const [displayTime, setDisplayTime] = useState(0);
  useEffect(() => {
    if (!activeTask) { setDisplayTime(0); return; }
    const calculateTime = () => {
      if (activeTask.startTime) {
        const now = Math.floor(Date.now() / 1000);
        return activeTask.elapsedTime + (now - activeTask.startTime);
      }
      return activeTask.elapsedTime;
    };
    setDisplayTime(calculateTime());
    const interval = setInterval(() => setDisplayTime(calculateTime()), 1000);
    return () => clearInterval(interval);
  }, [activeTask]);

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

  const openChartWindow = useCallback((params: { mode: 'task' | 'tag' | 'category'; value: string; title: string; custom?: boolean }) => {
    const query = new URLSearchParams({
      mode: params.mode,
      value: params.value,
      title: params.title,
      custom: params.custom ? '1' : '0',
    }).toString();

    if (window.electron) {
      window.electron.send('open-chart-window', { query });
    } else {
      window.open(window.location.pathname + `#/chart?${query}`, '_blank');
    }
  }, []);

  const handleContextMenu = useCallback((task: SwitcherItem, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openChartWindow({ mode: 'task', value: task.id, title: task.name, custom: true });
  }, [openChartWindow]);

  const handleCategoryClick = useCallback((task: SwitcherItem) => {
    const categoryPath = task.categoryPath || '';
    if (categoryPath) {
      openChartWindow({ mode: 'category', value: categoryPath, title: categoryPath, custom: false });
    } else {
      openChartWindow({ mode: 'task', value: task.id, title: task.name, custom: false });
    }
  }, [openChartWindow]);

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
        deleteTask(item.id);
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

  const prepareDeleteTask = useCallback((item: SwitcherItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setTaskToDelete(item);
  }, []);

  return (
    <div className="w-full h-full bg-[#1a1a1a] text-white select-none overflow-hidden flex">
      {/* 左侧功能栏：支持拖拽，按钮独立响应 */}
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
            {/* 顶部主计时区：整块区域无障碍拖拽，双击新建，点击模糊 */}
            <div
              className="shrink-0 p-3 pb-2.5 flex items-center justify-between gap-2.5 cursor-move"
              style={{ WebkitAppRegion: 'drag' } as any}
              {...doubleTapCreate}
              title="按住此区域可任意拖拽窗口，双击新建任务"
            >
              {activeTask ? (
                (() => {
                  const isRunning = Boolean(activeTask.isRunning && !activeTask.isPaused);
                  return (
                    <>
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className="shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (isRunning) {
                                pauseTimer(activeTask.id);
                              } else {
                                startTimer(activeTask.id);
                              }
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
                          <div className={`font-mono text-2xl font-bold tracking-tight transition-all leading-none ${
                            !isRunning ? 'text-yellow-400' : 'text-emerald-400'
                          } ${isBlurred ? 'blur-md' : ''}`}>
                            {formatTime(displayTime)}
                          </div>
                          <div
                            className={`text-xs truncate font-medium mt-1 ${
                              !isRunning ? 'text-yellow-300/80' : 'text-emerald-300/80'
                            }`}
                            title={activeTask.categoryPath}
                          >
                            {displayTaskName}
                          </div>
                        </div>
                      </div>

                      {/* 右上角：历史总累计专注时间 */}
                      <div
                        className="flex flex-col items-end shrink-0 pr-1 select-none pointer-events-none"
                        title={`《${activeTask.name}》历史累计总专注时间`}
                      >
                        <span className="text-[9px] text-zinc-500 font-mono tracking-tighter uppercase leading-none">总累计</span>
                        <span className="text-[11px] text-purple-300 font-mono font-semibold mt-0.5 leading-none">
                          {formatTotalTime(totalAccumulatedSeconds)}
                        </span>
                      </div>
                    </>
                  );
                })()
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
              {switcherList.length === 0 && !activeTask && (
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
