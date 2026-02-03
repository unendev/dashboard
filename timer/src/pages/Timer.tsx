import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import useSWR, { mutate } from 'swr';
import { Play, Pause, FileText, FolderOpen, Bot, Loader2, Trash2 } from 'lucide-react';
import { useTimerControl } from '@/hooks/useTimerControl';
import { TimerTask, formatTime } from '@dashboard/shared';
import { fetcher, getApiUrl } from '@/lib/api';
import { getUser } from '@/lib/auth-token';

const openCreateWindow = () => {
  console.log('[Navigation] Opening Create window');
  if (window.electron) {
    window.electron.send('open-create-window');
  } else {
    window.open(window.location.pathname + '#/create', '_blank');
  }
};
const openMemoWindow = () => {
  console.log('[Navigation] Opening Memo window');
  if (window.electron) {
    window.electron.send('open-memo-window');
  } else {
    window.open(window.location.pathname + '#/memo', '_blank');
  }
};
const openTodoWindow = () => {
  console.log('[Navigation] Opening Todo window');
  if (window.electron) {
    window.electron.send('open-todo-window');
  } else {
    window.open(window.location.pathname + '#/todo', '_blank');
  }
};
const openAiWindow = () => {
  console.log('[Navigation] Opening AI window');
  if (window.electron) {
    window.electron.send('open-ai-window');
  } else {
    window.open(window.location.pathname + '#/ai', '_blank');
  }
};
const openPromptLibraryWindow = () => {
  console.log('[Navigation] Opening Prompt Library window');
  if (window.electron) {
    window.electron.send('open-prompt-library-window');
  } else {
    window.open(window.location.pathname + '#/prompt-library', '_blank');
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
  const [taskToDelete, setTaskToDelete] = useState<{ id: string; name: string; hasLogs: boolean } | null>(null);
  const [deleteLogsOption, setDeleteLogsOption] = useState(false);

  const user = getUser();
  const userId = user?.id;

  // 恢复日期过滤，只显示今天的任务（保持界面简洁）
  const today = new Date().toISOString().split('T')[0];
  const apiUrl = userId ? `/api/timer-tasks?userId=${userId}&date=${today}` : null;

  const { data: tasks = [], mutate: mutateTasks } = useSWR<TimerTask[]>(
    apiUrl,
    fetcher,
    {
      refreshInterval: 0,           // 禁用自动轮询，节省 Vercel 资源
      revalidateOnFocus: true,      // 窗口聚焦时自动刷新
      revalidateOnReconnect: true,  // 网络重连时刷新
      dedupingInterval: 2000
    }
  );

  // 递归查找所有运行中的任务（包括子任务）
  const findAllRunningTasks = useCallback((taskList: TimerTask[]): TimerTask[] => {
    const running: TimerTask[] = [];
    for (const task of taskList) {
      if (task.isRunning && !task.isPaused) {
        running.push(task);
      }
      if (task.children && task.children.length > 0) {
        running.push(...findAllRunningTasks(task.children));
      }
    }
    return running;
  }, []);

  // 递归停止任务状态
  const stopTasksRecursive = useCallback((taskList: TimerTask[]): TimerTask[] => {
    return taskList.map(task => {
      const updatedChildren = task.children ? stopTasksRecursive(task.children) : [];
      if (task.isRunning) {
        return { ...task, isRunning: false, startTime: null, children: updatedChildren };
      }
      return { ...task, children: updatedChildren };
    });
  }, []);

  const handleStartTask = useCallback(async (taskData: any) => {
    console.log('[Timer] Processing start-task:', taskData.name);

    // 1. 本地乐观更新 (Optimistic UI)
    const now = Math.floor(Date.now() / 1000);
    const optimisticTask: TimerTask = {
      id: `temp-${Date.now()}`,
      name: taskData.name,
      categoryPath: taskData.categoryPath || '未分类',
      instanceTag: Array.isArray(taskData.instanceTagNames)
        ? taskData.instanceTagNames[0] || ''
        : (typeof taskData.instanceTagNames === 'string' ? taskData.instanceTagNames : ''),
      initialTime: taskData.initialTime || 0,
      elapsedTime: taskData.initialTime || 0,
      isRunning: true,
      startTime: now,
      isPaused: false,
      pausedTime: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      children: [],
      parentId: taskData.parentId || null, // Added parentId
      date: new Date().toISOString().split('T')[0], // Added missing date
    };

    // 立即更新 UI，让用户感觉到“秒开”
    console.log('[Timer] Applying optimistic update for:', taskData.name);
    await mutateTasks((currentTasks) => {
      const current = currentTasks || [];
      // 递归停止所有正在运行的任务
      const stoppedTasks = stopTasksRecursive(current);
      return [optimisticTask, ...stoppedTasks];
    }, false);

    // 2. 备份到 LocalStorage (容错)
    localStorage.setItem('widget-pending-task', JSON.stringify(taskData));

    try {
      // 3. 后台同步
      // 使用递归查找确保找到所有层级的运行任务
      const runningTasks = findAllRunningTasks(tasks);

      if (runningTasks.length > 0) {
        await Promise.all(runningTasks.map(task =>
          fetch(getApiUrl('/api/timer-tasks'), {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              id: task.id,
              isRunning: false,
              startTime: null,
              elapsedTime: task.elapsedTime + (task.startTime ? now - task.startTime : 0),
            }),
          })
        ));
      }

      const createBody = {
        name: taskData.name,
        userId: taskData.userId || userId, // Fallback to current user
        categoryPath: taskData.categoryPath,
        date: taskData.date || today, // Fallback to today
        initialTime: taskData.initialTime || 0,
        elapsedTime: taskData.initialTime || 0,
        instanceTagNames: taskData.instanceTagNames
          ? (typeof taskData.instanceTagNames === 'string'
            ? taskData.instanceTagNames.split(',').map((t: string) => t.trim()).filter((t: string) => t)
            : taskData.instanceTagNames)
          : (taskData.instanceTags || []), // Map AI instanceTags
        isRunning: true,
        startTime: now,
        parentId: taskData.parentId || null,
      };

      console.log('[Timer] Sending POST request to create task...');
      const createResponse = await fetch(getApiUrl('/api/timer-tasks'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(createBody),
      });

      if (!createResponse.ok) {
        const errorText = await createResponse.text();
        console.error('[Timer] Task creation failed. Status:', createResponse.status, 'Body:', errorText);
        throw new Error(errorText);
      } else {
        console.log('[Timer] Task created successfully. Triggering revalidation.');
        localStorage.removeItem('widget-pending-task'); // 同步成功，移除备份
        await mutateTasks(); // 重新验证，获取真实 ID
        console.log('[Timer] Revalidation complete.');
      }
    } catch (err) {
      console.error('[Timer] Error processing start-task:', err);
      // 注意：出错时不移除 widget-pending-task，保留以供重试
      // 这里的乐观状态会被 SWR 的下一次自动验证冲掉，变回原样（符合预期，提示失败）
      // 但数据留在了 LocalStorage
    }
  }, [tasks, mutateTasks]);

  // 启动时检查是否有未完成的任务 (Retry Pending Task)
  useEffect(() => {
    const pendingTask = localStorage.getItem('widget-pending-task');
    if (pendingTask) {
      try {
        console.log('[Timer] Found pending task, retrying...');
        const taskData = JSON.parse(pendingTask);
        // 稍微延迟，避免和 SWR 初始化冲突
        setTimeout(() => handleStartTask(taskData), 1000);
      } catch (e) {
        localStorage.removeItem('widget-pending-task');
      }
    }
  }, []); // Run once on mount

  useEffect(() => {
    // 1. IPC Listener (Preferred)
    let unsubscribeStart: (() => void) | undefined;

    if (window.electron) {
      console.log('[Timer] Subscribing to IPC');
      unsubscribeStart = window.electron.receive('on-start-task', (taskData) => {
        console.log('[Timer] IPC Received on-start-task:', taskData);
        handleStartTask(taskData);
      });

      // Listen for logs from Main Process
      window.electron.receive('on-console-log', ({ type, message }) => {
        if (type === 'error') console.error(message);
        else console.log(message);
      });
    }

    // 2. Storage Event (Fallback)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'widget-pending-task' && e.newValue) {
        try {
          const taskData = JSON.parse(e.newValue);
          handleStartTask(taskData);
        } catch (err) {
          console.error('[Timer] Storage parse error:', err);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (unsubscribeStart) unsubscribeStart();
    };
  }, [handleStartTask]);

  const { startTimer, pauseTimer } = useTimerControl({
    tasks,
    onTasksChange: (newTasks) => { if (apiUrl) mutate(apiUrl, newTasks, false); },
    onVersionConflict: () => mutateTasks(),
  });

  const activeTask = useMemo(() => {
    const findActive = (list: TimerTask[]): TimerTask | null => {
      for (const task of list) {
        if (task.isRunning) return task;
        if (task.children) {
          const found = findActive(task.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findActive(tasks);
  }, [tasks]);

  const recentTasks = useMemo(() => {
    const topLevelTasks = tasks.filter((t) => !t.parentId);
    return topLevelTasks
      .filter((t) => t.id !== activeTask?.id)
      .sort((a, b) => {
        const timeA = new Date(a.updatedAt || 0).getTime();
        const timeB = new Date(b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
  }, [tasks, activeTask]);

  // 移除 Emoji 的辅助函数
  const removeEmojis = (str: string) => {
    return str.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, '').trim();
  };

  const displayTaskName = activeTask ? removeEmojis(activeTask.name) : '';

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

  // 右键备份处理
  const handleBackup = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (!window.electron) return;

    // 1. 收集 localStorage 数据
    const backupData: Record<string, any> = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        // 过滤掉 AI 聊天记录等大数据 (根据前缀或特定 key)
        if (key.startsWith('chat-history-') || key.startsWith('ai-chat-')) continue;
        
        try {
          const val = localStorage.getItem(key);
          backupData[key] = val ? JSON.parse(val) : null;
        } catch (e) {
          backupData[key] = localStorage.getItem(key);
        }
      }
    }

    // 2. 发送到主进程进行保存和推送
    console.log('[Timer] Triggering backup-and-push');
    window.electron.send('backup-and-push', backupData);
    
    // 视觉反馈：按钮闪烁一下
    const btn = e.currentTarget as HTMLElement;
    btn.style.opacity = '0.5';
    setTimeout(() => btn.style.opacity = '1', 200);
  }, []);

  // 右键菜单处理
  const openChartWindow = useCallback((params: { mode: 'task' | 'tag' | 'category'; value: string; title: string; custom?: boolean }) => {
    const query = new URLSearchParams({
      mode: params.mode,
      value: params.value,
      title: params.title,
      custom: params.custom ? '1' : '0'
    }).toString();

    if (window.electron) {
      window.electron.send('open-chart-window', { query });
    } else {
      window.open(window.location.pathname + `#/chart?${query}`, '_blank');
    }
  }, []);

  const handleContextMenu = useCallback((task: TimerTask, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    openChartWindow({ mode: 'task', value: task.id, title: task.name, custom: true });
  }, [openChartWindow]);

  const handleCategoryClick = useCallback((task: TimerTask) => {
    const categoryPath = task.categoryPath || '';
    if (categoryPath) {
      openChartWindow({ mode: 'category', value: categoryPath, title: categoryPath, custom: false });
    } else {
      openChartWindow({ mode: 'task', value: task.id, title: task.name, custom: false });
    }
  }, [openChartWindow]);

  // 删除任务处理
  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!taskToDelete) return;

    console.log('[Timer] Attempting to delete task:', taskId);
    console.log('[Timer] Task details:', taskToDelete);

    try {
      const deleteQuery = deleteLogsOption ? `&deleteLogs=true` : '';
      const url = `${getApiUrl('/api/timer-tasks')}?id=${taskId}${deleteQuery}`;
      console.log('[Timer] DELETE URL:', url);
      
      // 乐观更新：立即从 UI 移除
      await mutateTasks((currentTasks) => {
        if (!currentTasks) return currentTasks;
        return currentTasks.filter(t => t.id !== taskId);
      }, false);

      const response = await fetch(url, {
        method: 'DELETE',
        credentials: 'include',
      });

      console.log('[Timer] DELETE response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Timer] DELETE failed:', errorText);
        throw new Error(`删除失败: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      console.log('[Timer] Task deleted successfully:', result);
      
      // 重新验证以确保数据一致性
      await mutateTasks();
      
    } catch (error) {
      console.error('[Timer] Delete task failed:', error);
      alert(`删除任务失败: ${error instanceof Error ? error.message : '未知错误'}`);
      // 失败时重新加载数据
      await mutateTasks();
    } finally {
      setTaskToDelete(null);
      setDeleteLogsOption(false);
    }
  }, [taskToDelete, deleteLogsOption, mutateTasks]);

  // 准备删除任务（显示确认对话框）
  const prepareDeleteTask = useCallback((task: TimerTask, e: React.MouseEvent) => {
    e.stopPropagation();
    
    // 检查是否是临时 ID（乐观更新创建的）
    if (task.id.startsWith('temp-')) {
      alert('任务正在同步中，请稍后再试');
      return;
    }
    
    // 检查是否有关联日志（简化版：假设有 elapsedTime > 0 就可能有日志）
    const hasLogs = task.elapsedTime > 0;
    
    setTaskToDelete({
      id: task.id,
      name: task.name,
      hasLogs,
    });
    setDeleteLogsOption(false);
  }, []);



  if (!userId) {
    return (
      <div className="flex flex-col items-center justify-center w-full h-full bg-[#1a1a1a] text-zinc-400 gap-3 p-4">
        <span className="text-sm">请先登录</span>
        <Link
          to="/login"
          className="text-sm text-emerald-400 hover:text-emerald-300 underline"
          onClick={() => console.log('[Navigation] Clicking login link')}
        >
          点击登录
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#1a1a1a] text-white select-none overflow-hidden flex">
      <div className="w-10 h-full bg-[#141414] border-r border-zinc-800 flex flex-col z-10 relative shrink-0">
        <button
          onClick={openMemoWindow}
          onContextMenu={(e) => {
            e.preventDefault();
            if (window.electron) {
              window.electron.send('show-toolbar-context-menu');
            }
          }}
          className="flex-1 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          title="备忘录 (右键查看更多)"
        >
          <FileText size={18} />
        </button>
        <button
          onClick={openTodoWindow}
          onContextMenu={(e) => {
            e.preventDefault();
            if (window.electron) {
              window.electron.send('show-toolbar-context-menu');
            }
          }}
          className="flex-1 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors border-b border-zinc-800"
          title="项目 (右键查看更多)"
        >
          <FolderOpen size={18} />
        </button>
        <button
          onClick={openAiWindow}
          onContextMenu={(e) => {
            e.preventDefault();
            if (window.electron) {
              window.electron.send('show-toolbar-context-menu');
            }
          }}
          className="flex-1 w-full flex items-center justify-center text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
          title="AI 助手 (右键查看更多)"
        >
          <Bot size={18} />
        </button>
      </div>

      <div className="flex-1 h-full flex flex-col overflow-hidden relative">
        <div className="shrink-0 p-3 pb-2 flex items-center gap-3" data-drag="true">
          {activeTask ? (
            <>
              <div
                className="shrink-0 w-12 h-12 flex items-center justify-center"
                data-drag="false"
                title="拖拽此圆形区域移动窗口"
              >
                <button
                  onClick={(e) => { e.stopPropagation(); activeTask.isPaused ? startTimer(activeTask.id) : pauseTimer(activeTask.id); }}
                  onContextMenu={handleBackup}
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${activeTask.isPaused ? 'bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400' : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400'}`}
                  title={activeTask.isPaused ? "开始 (右键备份数据)" : "暂停 (右键备份数据)"}
                  data-drag="false"
                >
                  {activeTask.isPaused ? <Play size={18} fill="currentColor" /> : <Pause size={18} fill="currentColor" />}
                </button>
              </div>
              <div
                className={`flex-1 min-w-0 cursor-pointer transition-all ${activeTask.isPaused ? 'text-yellow-400' : 'text-emerald-400'}`}
                data-drag="true"
                {...doubleTapCreate}
                title="拖拽此区域移动窗口"
              >
                <div
                  onClick={() => setIsBlurred(!isBlurred)}
                  data-drag="false"
                  title="单击模糊 / 双击新建"
                >
                  <div className={`font-mono text-2xl font-bold transition-all ${isBlurred ? 'blur-md' : ''}`}>
                    {formatTime(displayTime)}
                  </div>
                  <div className={`text-xs truncate ${activeTask.isPaused ? 'text-yellow-300/70' : 'text-emerald-300/70'}`} title={activeTask.categoryPath}>
                    {displayTaskName}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className="shrink-0 w-12 h-12 flex items-center justify-center"
                data-drag="false"
                title="拖拽此圆形区域移动窗口"
              >
                <div 
                  className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-500 cursor-context-menu" 
                  data-drag="false"
                  onContextMenu={handleBackup}
                  title="右键备份数据"
                >
                  <Play size={18} />
                </div>
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                data-drag="true"
                {...doubleTapCreate}
                title="拖拽此区域移动窗口"
              >
                <div
                  onClick={() => setIsBlurred(!isBlurred)}
                  data-drag="false"
                  title="单击模糊 / 双击新建"
                >
                  <div className={`font-mono text-2xl font-bold text-zinc-600 transition-all ${isBlurred ? 'blur-md' : ''}`}>
                    00:00:00
                  </div>
                  <div className="text-xs text-zinc-600">双击新建任务</div>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-3 pb-3">
          <div className="grid grid-cols-2 gap-2">
            {recentTasks.map((task) => {
              const hasInstanceTag = !!(task.instanceTag && task.instanceTag.trim() !== '');
              return (
                <div
                  key={task.id}
                  className={`relative rounded-lg transition-colors group border
                    ${hasInstanceTag
                      ? 'bg-orange-950/30 border-orange-500/30 hover:bg-orange-900/40'
                      : 'bg-zinc-800/50 border-transparent hover:bg-zinc-700/50'
                    }`}
                  data-drag="false"
                >
                  <div
                    onClick={() => handleCategoryClick(task)}
                    onContextMenu={(e) => handleContextMenu(task, e)}
                    className="w-full flex items-center gap-2 p-2 text-left"
                    title={`${task.categoryPath}${hasInstanceTag ? ` #${task.instanceTag}` : ''}\n左键分类统计 / 右键自定义统计`}
                  >
                    <button
                      onClick={(e) => { e.stopPropagation(); startTimer(task.id); }}
                      className="shrink-0"
                      title="开始计时"
                    >
                      <Play size={12} className={`transition-colors ${hasInstanceTag ? 'text-orange-400 group-hover:text-orange-300' : 'text-zinc-500 group-hover:text-emerald-400'}`} fill="currentColor" />
                    </button>
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
                  </div>
                  {/* 删除按钮 */}
                  <button
                    onClick={(e) => prepareDeleteTask(task, e)}
                    className="absolute top-1 right-1 w-5 h-5 rounded flex items-center justify-center bg-red-500/20 hover:bg-red-500/40 text-red-400 hover:text-red-300 opacity-0 group-hover:opacity-100 transition-all z-10"
                    title="删除任务"
                    data-drag="false"
                  >
                    <Trash2 size={10} />
                  </button>
                </div>
              );
            })}
          </div>
          {recentTasks.length === 0 && !activeTask && (
            <div className="text-center text-zinc-600 text-sm py-4">暂无任务</div>
          )}
        </div>
      </div>

      {/* 删除确认对话框 */}
      {taskToDelete && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setTaskToDelete(null)}>
          <div className="bg-zinc-900 border border-zinc-700 rounded-xl p-6 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-red-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-white mb-1">删除任务</h3>
                <p className="text-sm text-zinc-400">
                  确定要删除 <span className="text-white font-medium">"{taskToDelete.name}"</span> 吗？
                </p>
              </div>
            </div>

            {taskToDelete.hasLogs && (
              <div className="mb-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={deleteLogsOption}
                    onChange={(e) => setDeleteLogsOption(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded border-yellow-500/50 bg-yellow-500/10 text-yellow-500 focus:ring-yellow-500/50"
                  />
                  <span className="text-xs text-yellow-200">
                    同时删除关联的日志记录
                  </span>
                </label>
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setTaskToDelete(null)}
                className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDeleteTask(taskToDelete.id)}
                className="flex-1 px-4 py-2 rounded-lg bg-red-500 hover:bg-red-600 text-white text-sm font-bold transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
