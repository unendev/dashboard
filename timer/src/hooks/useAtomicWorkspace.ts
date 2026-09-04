import { useState, useEffect, useCallback } from 'react';
import { AtomicItem, AtomicWorkspaceData } from '../types/atomic';
import { parseAtomicInput, DEFAULT_OBSIDIAN_VAULT } from '../lib/atomic-parser';
import { getUnifiedItem, setUnifiedItem } from '../lib/unified-storage';
import { getAllTasks, saveAllTasks } from '../lib/local-timer-storage';

const STORAGE_KEY = 'atomic-workspace-data-v1';
const VAULT_STORAGE_KEY = 'atomic-workspace-obsidian-vault';

function getInitialData(): AtomicWorkspaceData {
  const defaultData: AtomicWorkspaceData = {
    version: 1,
    pool: [
      {
        id: 'demo-1',
        rawText: '梳理产品架构重构方案 [[设计文档]] #规划 ~45m',
        title: '梳理产品架构重构方案',
        tags: ['规划'],
        obsidianLinks: ['设计文档'],
        estimateMinutes: 45,
        completed: false,
        createdAt: Date.now() - 3600000,
      },
      {
        id: 'demo-2',
        rawText: '买一杯冷萃咖啡 #生活',
        title: '买一杯冷萃咖啡',
        tags: ['生活'],
        obsidianLinks: [],
        completed: false,
        createdAt: Date.now() - 1800000,
      },
      {
        id: 'demo-3',
        rawText: '检查 API 鉴权拦截逻辑 #dev ~20m',
        title: '检查 API 鉴权拦截逻辑',
        tags: ['dev'],
        obsidianLinks: [],
        estimateMinutes: 20,
        completed: false,
        createdAt: Date.now() - 900000,
      }
    ],
    nowFocus: {
      id: 'demo-now',
      rawText: '即时原子工作台模块交互设计 [[Daily/2026-08-31]] #dev ~30m',
      title: '即时原子工作台模块交互设计',
      tags: ['dev'],
      obsidianLinks: ['Daily/2026-08-31'],
      estimateMinutes: 30,
      completed: false,
      createdAt: Date.now(),
    },
    nextQueue: [
      {
        id: 'demo-next-1',
        rawText: '测试跨列拖拽与双链协议跳转 #dev',
        title: '测试跨列拖拽与双链协议跳转',
        tags: ['dev'],
        obsidianLinks: [],
        completed: false,
        createdAt: Date.now() - 300000,
      }
    ],
    obsidianVault: getUnifiedItem<string>(VAULT_STORAGE_KEY, DEFAULT_OBSIDIAN_VAULT),
  };

  return getUnifiedItem<AtomicWorkspaceData>(STORAGE_KEY, defaultData);
}

export function useAtomicWorkspace() {
  const [data, setData] = useState<AtomicWorkspaceData>(getInitialData);
  const [selectedTag, setSelectedTag] = useState<string>('all');

  // 保存到统一存储 (双写: localStorage + Electron 物理文件)
  const persistData = useCallback((nextData: AtomicWorkspaceData) => {
    setData(nextData);
    setUnifiedItem(STORAGE_KEY, nextData);
    if (nextData.obsidianVault !== undefined) {
      setUnifiedItem(VAULT_STORAGE_KEY, nextData.obsidianVault);
    }
  }, []);

  // 跨窗口同步
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setData(prev => ({
            ...prev,
            pool: parsed.pool || [],
            nowFocus: parsed.nowFocus || null,
            nextQueue: parsed.nextQueue || [],
            obsidianVault: parsed.obsidianVault || prev.obsidianVault,
          }));
        } catch (err) {
          console.error('[useAtomicWorkspace] Sync storage error:', err);
        }
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, []);

  // 1. 添加原子项 (支持当前选中标签自动继承 + now 目标自动启动计时)
  const addAtomicItem = useCallback((rawText: string, targetList: 'pool' | 'now' | 'next' = 'pool') => {
    let effectiveText = rawText.trim();
    if (selectedTag && selectedTag !== 'all' && selectedTag !== 'none' && !effectiveText.includes('#')) {
      effectiveText = `${effectiveText} #${selectedTag}`;
    }

    const parsed = parseAtomicInput(effectiveText);
    if (!parsed.title && !parsed.rawText) return;

    const newItem: AtomicItem = {
      id: `atom-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      rawText: parsed.rawText,
      title: parsed.title,
      tags: parsed.tags,
      obsidianLinks: parsed.obsidianLinks,
      estimateMinutes: parsed.estimateMinutes,
      completed: false,
      createdAt: Date.now(),
    };

    setData(prev => {
      let nextData: AtomicWorkspaceData;
      if (targetList === 'now') {
        const oldNow = prev.nowFocus;
        const newNext = oldNow ? [oldNow, ...prev.nextQueue] : prev.nextQueue;
        nextData = { ...prev, nowFocus: newItem, nextQueue: newNext };
      } else if (targetList === 'next') {
        nextData = { ...prev, nextQueue: [newItem, ...prev.nextQueue] };
      } else {
        nextData = { ...prev, pool: [newItem, ...prev.pool] };
      }
      persistData(nextData);
      return nextData;
    });

    // 如果目标是「当前」，直接自动启动计时！
    if (targetList === 'now' && window.electron) {
      const taskName = newItem.title || newItem.rawText;
      const tag = newItem.tags[0] || '即时待办';
      const initialSeconds = (newItem.estimateMinutes || 0) * 60;
      window.electron.send('start-task', {
        name: taskName,
        categoryPath: '即时待办',
        instanceTagNames: [tag],
        initialTime: initialSeconds,
        autoStart: true,
      });
    }
  }, [persistData, selectedTag]);

  // 辅助函数：当某个正在计时的任务被打勾完成/移除当前时，优雅结算并暂停其计时流水
  const settleRunningTimerByName = useCallback((taskName?: string) => {
    if (!taskName || !taskName.trim()) return;
    try {
      const currentTasks = getAllTasks();
      const now = Math.floor(Date.now() / 1000);
      const nowISO = new Date().toISOString();
      const trimmed = taskName.trim();
      let hasChanged = false;

      const updated = currentTasks.map(t => {
        if (t.name.trim() === trimmed && t.isRunning && !t.isPaused) {
          const runningTime = t.startTime ? Math.max(0, now - t.startTime) : 0;
          hasChanged = true;
          return {
            ...t,
            isRunning: false,
            isPaused: true,
            elapsedTime: (t.elapsedTime || 0) + runningTime,
            startTime: null,
            pausedTime: now,
            updatedAt: nowISO,
          };
        }
        return t;
      });

      if (hasChanged) {
        saveAllTasks(updated);
        window.dispatchEvent(new Event('storage'));
      }
    } catch (err) {
      console.error('[useAtomicWorkspace] Failed to settle running timer:', err);
    }
  }, []);

  // 2. 删除原子项 (仅从工作台待办中移除，保留历史已计时间流水)
  const deleteItem = useCallback((id: string) => {
    setData(prev => {
      if (prev.nowFocus?.id === id) {
        settleRunningTimerByName(prev.nowFocus.title || prev.nowFocus.rawText);
      }
      const nextData: AtomicWorkspaceData = {
        ...prev,
        pool: prev.pool.filter(item => item.id !== id),
        nowFocus: prev.nowFocus?.id === id ? null : prev.nowFocus,
        nextQueue: prev.nextQueue.filter(item => item.id !== id),
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData, settleRunningTimerByName]);

  // 3. 更新原子项文本 (支持编辑后重新解析 #标签 [[双链]] ~估时，并级联继承历史时间账本)
  const updateItem = useCallback((id: string, newRawText: string) => {
    const parsed = parseAtomicInput(newRawText.trim());
    const newTitle = (parsed.title || parsed.rawText || '').trim();
    if (!newTitle) return;

    setData(prev => {
      // 1. 查找旧标题
      const targetItem =
        prev.pool.find(i => i.id === id) ||
        (prev.nowFocus?.id === id ? prev.nowFocus : null) ||
        prev.nextQueue.find(i => i.id === id) ||
        (prev.completedArchive || []).find(i => i.id === id);

      const oldTitle = targetItem ? (targetItem.title || targetItem.rawText || '').trim() : '';

      // 2. 若标题发生修改，级联将时间流水账本中的历史记录同步更名，无缝继承累计时间
      if (oldTitle && oldTitle !== newTitle) {
        try {
          const currentTasks = getAllTasks();
          let tasksChanged = false;
          const updatedTasks = currentTasks.map(t => {
            if (t.name.trim() === oldTitle) {
              tasksChanged = true;
              return {
                ...t,
                name: newTitle,
                updatedAt: new Date().toISOString(),
              };
            }
            return t;
          });
          if (tasksChanged) {
            saveAllTasks(updatedTasks);
            window.dispatchEvent(new Event('storage'));
          }
        } catch (err) {
          console.error('[useAtomicWorkspace] Failed to cascade rename timer tasks:', err);
        }
      }

      const updateFn = (item: AtomicItem): AtomicItem => {
        if (item.id !== id) return item;
        return {
          ...item,
          rawText: parsed.rawText,
          title: parsed.title,
          tags: parsed.tags,
          obsidianLinks: parsed.obsidianLinks,
          estimateMinutes: parsed.estimateMinutes,
        };
      };

      const nextData: AtomicWorkspaceData = {
        ...prev,
        pool: prev.pool.map(updateFn),
        nowFocus: prev.nowFocus && prev.nowFocus.id === id ? updateFn(prev.nowFocus) : prev.nowFocus,
        nextQueue: prev.nextQueue.map(updateFn),
        completedArchive: (prev.completedArchive || []).map(updateFn),
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 4. 切换完成状态（打勾后自动归入已完成归档，若为当前项则结算计时并自动推进下一项）
  const toggleComplete = useCallback((id: string) => {
    setData(prev => {
      const currentArchive = prev.completedArchive || [];

      // 1. 如果在 nowFocus
      if (prev.nowFocus?.id === id) {
        settleRunningTimerByName(prev.nowFocus.title || prev.nowFocus.rawText);
        const completedItem: AtomicItem = {
          ...prev.nowFocus,
          completed: true,
          completedAt: Date.now(),
        };
        const [promoted, ...restNext] = prev.nextQueue;
        const nextData: AtomicWorkspaceData = {
          ...prev,
          nowFocus: promoted || null,
          nextQueue: restNext || [],
          completedArchive: [completedItem, ...currentArchive],
        };
        persistData(nextData);
        return nextData;
      }

      // 2. 如果在 pool
      const poolItem = prev.pool.find(i => i.id === id);
      if (poolItem) {
        settleRunningTimerByName(poolItem.title || poolItem.rawText);
        const completedItem: AtomicItem = {
          ...poolItem,
          completed: true,
          completedAt: Date.now(),
        };
        const nextData: AtomicWorkspaceData = {
          ...prev,
          pool: prev.pool.filter(i => i.id !== id),
          completedArchive: [completedItem, ...currentArchive],
        };
        persistData(nextData);
        return nextData;
      }

      // 3. 如果在 nextQueue
      const nextItem = prev.nextQueue.find(i => i.id === id);
      if (nextItem) {
        settleRunningTimerByName(nextItem.title || nextItem.rawText);
        const completedItem: AtomicItem = {
          ...nextItem,
          completed: true,
          completedAt: Date.now(),
        };
        const nextData: AtomicWorkspaceData = {
          ...prev,
          nextQueue: prev.nextQueue.filter(i => i.id !== id),
          completedArchive: [completedItem, ...currentArchive],
        };
        persistData(nextData);
        return nextData;
      }

      return prev;
    });
  }, [persistData, settleRunningTimerByName]);

  // 4. 恢复已完成项回到「当前专注」并自动启动计时
  const restoreCompletedItem = useCallback((id: string) => {
    let restoredTarget: AtomicItem | undefined;

    setData(prev => {
      const currentArchive = prev.completedArchive || [];
      const target = currentArchive.find(i => i.id === id);
      if (!target) return prev;

      // 如果当前已有正在计时的 nowFocus，先安全结算并暂停
      if (prev.nowFocus) {
        settleRunningTimerByName(prev.nowFocus.title || prev.nowFocus.rawText);
      }

      const restoredItem: AtomicItem = {
        ...target,
        completed: false,
        completedAt: undefined,
      };
      restoredTarget = restoredItem;

      // 如果原先有 nowFocus，将其推入 nextQueue 队列顶部
      const oldNow = prev.nowFocus;
      const newNext = oldNow ? [oldNow, ...prev.nextQueue] : prev.nextQueue;

      const nextData: AtomicWorkspaceData = {
        ...prev,
        completedArchive: currentArchive.filter(i => i.id !== id),
        nowFocus: restoredItem,
        nextQueue: newNext,
      };
      persistData(nextData);
      return nextData;
    });

    // 自动触发启动计时，无缝衔接专注心流
    if (restoredTarget && window.electron) {
      const taskName = (restoredTarget.title || restoredTarget.rawText || '').trim();
      const tag = (restoredTarget.tags && restoredTarget.tags[0]) || '即时待办';
      const initialSeconds = (restoredTarget.estimateMinutes || 0) * 60;
      window.electron.send('start-task', {
        name: taskName,
        categoryPath: '即时待办',
        instanceTagNames: [tag],
        initialTime: initialSeconds,
        autoStart: true,
      });
    }
  }, [persistData, settleRunningTimerByName]);

  // 5. 单独删除一条已完成记录 (仅从归档视图移除，保留历史时间账本)
  const deleteCompletedItem = useCallback((id: string) => {
    setData(prev => {
      const currentArchive = prev.completedArchive || [];
      const nextData: AtomicWorkspaceData = {
        ...prev,
        completedArchive: currentArchive.filter(i => i.id !== id),
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 6. 清空所有已完成归档 (仅清空归档视图，保留历史时间账本)
  const clearAllCompleted = useCallback(() => {
    setData(prev => {
      const nextData: AtomicWorkspaceData = {
        ...prev,
        completedArchive: [],
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 7. 移动到「当前」(拖拽/点击进入立即自动启动计时)
  const moveToNow = useCallback((id: string) => {
    let movedTarget: AtomicItem | undefined;

    setData(prev => {
      let target: AtomicItem | undefined =
        prev.pool.find(i => i.id === id) ||
        prev.nextQueue.find(i => i.id === id) ||
        (prev.nowFocus?.id === id ? prev.nowFocus : undefined);

      if (!target || prev.nowFocus?.id === id) return prev;
      movedTarget = target;

      const oldNow = prev.nowFocus;
      const filteredNext = prev.nextQueue.filter(i => i.id !== id);
      const newNext = oldNow ? [oldNow, ...filteredNext] : filteredNext;

      const nextData: AtomicWorkspaceData = {
        ...prev,
        pool: prev.pool.filter(i => i.id !== id),
        nowFocus: target,
        nextQueue: newNext,
      };
      persistData(nextData);
      return nextData;
    });

    if (movedTarget && window.electron) {
      const taskName = movedTarget.title || movedTarget.rawText;
      const tag = movedTarget.tags[0] || '即时待办';
      const initialSeconds = (movedTarget.estimateMinutes || 0) * 60;
      window.electron.send('start-task', {
        name: taskName,
        categoryPath: '即时待办',
        instanceTagNames: [tag],
        initialTime: initialSeconds,
        autoStart: true,
      });
    }
  }, [persistData]);

  // 8. 移动到「接下来」
  const moveToNext = useCallback((id: string) => {
    setData(prev => {
      let target: AtomicItem | undefined =
        prev.pool.find(i => i.id === id) ||
        (prev.nowFocus?.id === id ? prev.nowFocus : undefined);

      if (!target) return prev;

      // 如果移走的是当前 nowFocus：安全结算并暂停 Timer，保存用时
      if (prev.nowFocus?.id === id) {
        try {
          const nowSec = Math.floor(Date.now() / 1000);
          const nowISO = new Date().toISOString();
          const targetTitle = (prev.nowFocus.title || prev.nowFocus.rawText || '').trim();
          const currentTasks = getAllTasks();
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
          window.dispatchEvent(new Event('storage'));
        } catch (_) {}
      }

      const nextData: AtomicWorkspaceData = {
        ...prev,
        pool: prev.pool.filter(i => i.id !== id),
        nowFocus: prev.nowFocus?.id === id ? null : prev.nowFocus,
        nextQueue: [target, ...prev.nextQueue.filter(i => i.id !== id)],
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 9. 移动到「任务池」
  const moveToPool = useCallback((id: string) => {
    setData(prev => {
      let target: AtomicItem | undefined =
        prev.nextQueue.find(i => i.id === id) ||
        (prev.nowFocus?.id === id ? prev.nowFocus : undefined);

      if (!target) return prev;

      // 如果移走的是当前 nowFocus：安全结算并暂停 Timer，保存用时
      if (prev.nowFocus?.id === id) {
        try {
          const nowSec = Math.floor(Date.now() / 1000);
          const nowISO = new Date().toISOString();
          const targetTitle = (prev.nowFocus.title || prev.nowFocus.rawText || '').trim();
          const currentTasks = getAllTasks();
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
          window.dispatchEvent(new Event('storage'));
        } catch (_) {}
      }

      const nextData: AtomicWorkspaceData = {
        ...prev,
        pool: [target, ...prev.pool.filter(i => i.id !== id)],
        nowFocus: prev.nowFocus?.id === id ? null : prev.nowFocus,
        nextQueue: prev.nextQueue.filter(i => i.id !== id),
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 10. Next 队列重排
  const reorderNextQueue = useCallback((newQueue: AtomicItem[]) => {
    setData(prev => {
      const nextData: AtomicWorkspaceData = {
        ...prev,
        nextQueue: newQueue,
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 11. 设置 Obsidian Vault
  const setObsidianVault = useCallback((vault: string) => {
    setData(prev => {
      const nextData = { ...prev, obsidianVault: vault.trim() };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 12. 实时监测与同步 Timer 挂件的真实计时状态
  const [timerRunningState, setTimerRunningState] = useState<{
    isRunning: boolean;
    isPaused: boolean;
    elapsedSeconds: number;
  }>({
    isRunning: false,
    isPaused: false,
    elapsedSeconds: 0,
  });

  const checkTimerState = useCallback(() => {
    if (!data.nowFocus) {
      setTimerRunningState({ isRunning: false, isPaused: false, elapsedSeconds: 0 });
      return;
    }
    const targetTitle = (data.nowFocus.title || data.nowFocus.rawText || '').trim();
    const tasks = getAllTasks();
    const matchedTask = tasks.find(t => t.name.trim() === targetTitle && !t.parentId);

    if (!matchedTask) {
      setTimerRunningState({ isRunning: false, isPaused: false, elapsedSeconds: 0 });
      return;
    }

    const nowSec = Math.floor(Date.now() / 1000);
    const currentRunningTime = matchedTask.isRunning && !matchedTask.isPaused && matchedTask.startTime
      ? nowSec - matchedTask.startTime
      : 0;
    const totalElapsed = (matchedTask.elapsedTime || 0) + currentRunningTime;

    setTimerRunningState({
      isRunning: !!(matchedTask.isRunning && !matchedTask.isPaused),
      isPaused: !!matchedTask.isPaused,
      elapsedSeconds: totalElapsed,
    });
  }, [data.nowFocus]);

  useEffect(() => {
    checkTimerState();
    const timerId = setInterval(checkTimerState, 500);
    const handleStorage = () => checkTimerState();
    window.addEventListener('storage', handleStorage);
    return () => {
      clearInterval(timerId);
      window.removeEventListener('storage', handleStorage);
    };
  }, [checkTimerState]);

  // 13. 联动启动/暂停/继续 Timer
  const toggleTimerForNow = useCallback(() => {
    if (!data.nowFocus) return;
    const taskName = (data.nowFocus.title || data.nowFocus.rawText || '').trim();
    const tag = data.nowFocus.tags[0] || '即时待办';
    const initialSeconds = (data.nowFocus.estimateMinutes || 0) * 60;
    const nowSec = Math.floor(Date.now() / 1000);
    const nowISO = new Date().toISOString();

    const tasks = getAllTasks();
    const existingIndex = tasks.findIndex(t => t.name.trim() === taskName && !t.parentId);

    if (existingIndex > -1) {
      const task = tasks[existingIndex];
      if (task.isRunning && !task.isPaused) {
        // 当前正在跑：暂停它！
        const runningTime = task.startTime ? nowSec - task.startTime : 0;
        const updated = tasks.map((t, i) =>
          i === existingIndex
            ? {
                ...t,
                isRunning: false,
                isPaused: true,
                elapsedTime: (t.elapsedTime || 0) + runningTime,
                startTime: null,
                pausedTime: nowSec,
                updatedAt: nowISO,
              }
            : t
        );
        saveAllTasks(updated);
        window.dispatchEvent(new Event('storage'));
      } else {
        // 当前暂停或未跑：启动/继续它！
        const updated = tasks.map((t, i) => {
          if (i === existingIndex) {
            return {
              ...t,
              isRunning: true,
              isPaused: false,
              startTime: nowSec,
              updatedAt: nowISO,
            };
          }
          // 暂停其他
          return t.isRunning && !t.isPaused
            ? { ...t, isRunning: false, isPaused: true, pausedTime: nowSec, updatedAt: nowISO }
            : t;
        });
        saveAllTasks(updated);
        window.dispatchEvent(new Event('storage'));
      }
    } else {
      // 发送 IPC 启动
      if (window.electron) {
        window.electron.send('start-task', {
          name: taskName,
          categoryPath: '即时待办',
          instanceTagNames: [tag],
          initialTime: initialSeconds,
          autoStart: true,
        });
      }
    }
  }, [data.nowFocus]);

  // 计算所有的可用标签列表
  const allTags = Array.from(
    new Set([
      ...data.pool.flatMap(i => i.tags),
      ...(data.nowFocus ? data.nowFocus.tags : []),
      ...data.nextQueue.flatMap(i => i.tags),
    ])
  );

  return {
    pool: data.pool,
    nowFocus: data.nowFocus,
    nextQueue: data.nextQueue,
    completedArchive: data.completedArchive || [],
    obsidianVault: data.obsidianVault,
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
    reorderNextQueue,
    setObsidianVault,
    startTimerForNow: toggleTimerForNow,
  };
}
