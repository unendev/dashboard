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

  // 2. 删除原子项 (级联同步清理 Timer 挂件任务)
  const deleteItem = useCallback((id: string) => {
    setData(prev => {
      const targetItem = prev.pool.find(i => i.id === id) || (prev.nowFocus?.id === id ? prev.nowFocus : null) || prev.nextQueue.find(i => i.id === id);

      const nextData: AtomicWorkspaceData = {
        ...prev,
        pool: prev.pool.filter(item => item.id !== id),
        nowFocus: prev.nowFocus?.id === id ? null : prev.nowFocus,
        nextQueue: prev.nextQueue.filter(item => item.id !== id),
      };
      persistData(nextData);

      // 同步级联清理 Timer 悬浮挂件上的对应任务记录
      if (targetItem) {
        try {
          const currentTimerTasks = getAllTasks();
          const targetTitle = (targetItem.title || targetItem.rawText || '').trim();
          const targetRaw = (targetItem.rawText || '').trim();
          const filteredTimerTasks = currentTimerTasks.filter(t => {
            const name = t.name.trim();
            return name !== targetTitle && name !== targetRaw;
          });
          if (filteredTimerTasks.length !== currentTimerTasks.length) {
            saveAllTasks(filteredTimerTasks);
            window.dispatchEvent(new Event('storage'));
          }
        } catch (e) {
          console.error('[useAtomicWorkspace] Failed to cascade delete timer task:', e);
        }
      }

      return nextData;
    });
  }, [persistData]);

  // 3. 切换完成状态（打勾后自动归入已完成归档，若为当前项则自动推进下一项）
  const toggleComplete = useCallback((id: string) => {
    setData(prev => {
      const currentArchive = prev.completedArchive || [];

      // 1. 如果在 nowFocus
      if (prev.nowFocus?.id === id) {
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
  }, [persistData]);

  // 4. 恢复已完成项回到任务池
  const restoreCompletedItem = useCallback((id: string) => {
    setData(prev => {
      const currentArchive = prev.completedArchive || [];
      const target = currentArchive.find(i => i.id === id);
      if (!target) return prev;

      const restoredItem: AtomicItem = {
        ...target,
        completed: false,
        completedAt: undefined,
      };

      const nextData: AtomicWorkspaceData = {
        ...prev,
        completedArchive: currentArchive.filter(i => i.id !== id),
        pool: [restoredItem, ...prev.pool],
      };
      persistData(nextData);
      return nextData;
    });
  }, [persistData]);

  // 5. 单独删除一条已完成记录
  const deleteCompletedItem = useCallback((id: string) => {
    setData(prev => {
      const currentArchive = prev.completedArchive || [];
      const target = currentArchive.find(i => i.id === id);
      const nextData: AtomicWorkspaceData = {
        ...prev,
        completedArchive: currentArchive.filter(i => i.id !== id),
      };
      persistData(nextData);

      if (target) {
        try {
          const currentTimerTasks = getAllTasks();
          const targetTitle = (target.title || target.rawText || '').trim();
          const filtered = currentTimerTasks.filter(t => t.name.trim() !== targetTitle);
          if (filtered.length !== currentTimerTasks.length) {
            saveAllTasks(filtered);
            window.dispatchEvent(new Event('storage'));
          }
        } catch (_) {}
      }

      return nextData;
    });
  }, [persistData]);

  // 6. 清空所有已完成归档
  const clearAllCompleted = useCallback(() => {
    setData(prev => {
      const currentArchive = prev.completedArchive || [];
      const completedTitles = new Set(currentArchive.map(i => (i.title || i.rawText).trim()));

      const nextData: AtomicWorkspaceData = {
        ...prev,
        completedArchive: [],
      };
      persistData(nextData);

      try {
        const currentTimerTasks = getAllTasks();
        const filtered = currentTimerTasks.filter(t => !completedTitles.has(t.name.trim()));
        if (filtered.length !== currentTimerTasks.length) {
          saveAllTasks(filtered);
          window.dispatchEvent(new Event('storage'));
        }
      } catch (e) {
        console.error('[useAtomicWorkspace] Failed to cascade clear completed timer tasks:', e);
      }

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

  // 12. 联动启动 Timer
  const startTimerForNow = useCallback(() => {
    if (!data.nowFocus) return;
    const taskName = data.nowFocus.title || data.nowFocus.rawText;
    const tag = data.nowFocus.tags[0] || '即时待办';
    const initialSeconds = (data.nowFocus.estimateMinutes || 0) * 60;

    if (window.electron) {
      window.electron.send('start-task', {
        name: taskName,
        categoryPath: '即时待办',
        instanceTagNames: [tag],
        initialTime: initialSeconds,
        autoStart: true,
      });
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
    addAtomicItem,
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
    startTimerForNow,
  };
}
