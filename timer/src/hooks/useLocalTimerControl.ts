import { useState, useCallback } from 'react';
import type { TimerTask } from '@dashboard/shared';
import { getAllTasks, saveAllTasks } from '@/lib/local-timer-storage';
import { getLogicalDateString } from '@/lib/timer-domain';

interface UseLocalTimerControlOptions {
  onTasksChange?: (tasks: TimerTask[]) => void;
}

export function useLocalTimerControl(options: UseLocalTimerControlOptions = {}) {
  const { onTasksChange } = options;
  const [isProcessing, setIsProcessing] = useState(false);

  const findTaskById = useCallback((taskId: string, taskList?: TimerTask[]): TimerTask | null => {
    const list = taskList ?? getAllTasks();
    for (const task of list) {
      if (task.id === taskId) return task;
      if (task.children) {
        const found = findTaskById(taskId, task.children);
        if (found) return found;
      }
    }
    return null;
  }, []);

  const findAllRunningTasks = useCallback((excludeId: string, taskList?: TimerTask[]): TimerTask[] => {
    const list = taskList ?? getAllTasks();
    const running: TimerTask[] = [];
    for (const task of list) {
      if (task.id !== excludeId && task.isRunning && !task.isPaused) {
        running.push(task);
      }
      if (task.children) {
        running.push(...findAllRunningTasks(excludeId, task.children));
      }
    }
    return running;
  }, []);

  const updateTasksRecursive = useCallback((
    taskList: TimerTask[],
    updater: (task: TimerTask) => TimerTask
  ): TimerTask[] => {
    return taskList.map(task => {
      const updated = updater(task);
      if (task.children) {
        return { ...updated, children: updateTasksRecursive(task.children, updater) };
      }
      return updated;
    });
  }, []);

  const persistAndNotify = useCallback((tasks: TimerTask[]) => {
    saveAllTasks(tasks);
    onTasksChange?.(tasks);
  }, [onTasksChange]);

  /**
   * 按任务名启动/恢复当天的计时 Session
   */
  const startTimerByName = useCallback(async (taskName: string, categoryPath: string = '即时待办', instanceTag: string = '') => {
    if (isProcessing || !taskName.trim()) return { success: false, reason: 'processing' } as const;
    setIsProcessing(true);

    try {
      const tasks = getAllTasks();
      const now = Math.floor(Date.now() / 1000);
      const nowISO = new Date().toISOString();
      const todayStr = getLogicalDateString();
      const trimmedName = taskName.trim();

      // 1. 查找今天属于此任务的 Session
      let todaySession = tasks.find(t => t.name.trim() === trimmedName && t.date === todayStr && !t.parentId);
      let effectiveTasks = [...tasks];

      if (!todaySession) {
        todaySession = {
          id: crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
          name: trimmedName,
          categoryPath,
          instanceTag,
          initialTime: 0,
          elapsedTime: 0,
          isRunning: true,
          isPaused: false,
          startTime: now,
          pausedTime: 0,
          children: [],
          parentId: null,
          date: todayStr,
          createdAt: nowISO,
          updatedAt: nowISO,
        };
        effectiveTasks.unshift(todaySession);
      }

      const targetId = todaySession.id;
      const runningTasks = findAllRunningTasks(targetId, effectiveTasks);
      const updatedTasks = updateTasksRecursive(effectiveTasks, (task) => {
        // 暂停其他所有正在运行的任务，结算并封存它们的秒数
        if (runningTasks.some(r => r.id === task.id)) {
          const runningTime = task.startTime ? Math.max(0, now - task.startTime) : 0;
          return {
            ...task,
            isRunning: false,
            isPaused: true,
            elapsedTime: (task.elapsedTime || 0) + runningTime,
            startTime: null,
            pausedTime: now,
            updatedAt: nowISO,
          };
        }
        // 启动/恢复目标任务
        if (task.id === targetId) {
          const oldSessionTime = (task.isRunning && !task.isPaused && task.startTime) ? Math.max(0, now - task.startTime) : 0;
          return {
            ...task,
            isRunning: true,
            isPaused: false,
            startTime: now,
            elapsedTime: (task.elapsedTime || 0) + oldSessionTime,
            pausedTime: 0,
            updatedAt: nowISO,
          };
        }
        return task;
      });

      persistAndNotify(updatedTasks);
      return { success: true, taskId: targetId } as const;
    } catch (e) {
      return { success: false, reason: 'error', error: e } as const;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, findAllRunningTasks, updateTasksRecursive, persistAndNotify]);

  /**
   * 按 ID 启动计时（自动处理跨天翻篇）
   */
  const startTimer = useCallback(async (taskId: string) => {
    if (isProcessing) return { success: false, reason: 'processing' } as const;
    const tasks = getAllTasks();
    const target = tasks.find(t => t.id === taskId);
    if (target) {
      return startTimerByName(target.name, target.categoryPath || undefined, target.instanceTag || undefined);
    }
    return { success: false, reason: 'not_found' } as const;
  }, [isProcessing, startTimerByName]);

  /**
   * 暂停计时
   */
  const pauseTimer = useCallback(async (taskId?: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const tasks = getAllTasks();
      const now = Math.floor(Date.now() / 1000);
      const nowISO = new Date().toISOString();

      const updatedTasks = updateTasksRecursive(tasks, (task) => {
        const shouldPause = taskId ? task.id === taskId : (task.isRunning && !task.isPaused);
        if (shouldPause && task.isRunning) {
          const runningTime = task.startTime ? Math.max(0, now - task.startTime) : 0;
          return {
            ...task,
            elapsedTime: (task.elapsedTime || 0) + runningTime,
            isPaused: true,
            isRunning: false,
            startTime: null,
            pausedTime: now,
            updatedAt: nowISO,
          };
        }
        return task;
      });

      persistAndNotify(updatedTasks);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, updateTasksRecursive, persistAndNotify]);

  /**
   * 停止计时
   */
  const stopTimer = useCallback(async (taskId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const tasks = getAllTasks();
      const now = Math.floor(Date.now() / 1000);
      const nowISO = new Date().toISOString();
      const target = findTaskById(taskId, tasks);
      if (!target || !target.isRunning) return;

      const runningTime = target.startTime ? Math.max(0, now - target.startTime) : 0;
      const newElapsed = (target.elapsedTime || 0) + runningTime;

      const updatedTasks = updateTasksRecursive(tasks, (task) =>
        task.id === taskId
          ? { ...task, elapsedTime: newElapsed, isRunning: false, isPaused: false, startTime: null, pausedTime: 0, completedAt: now, updatedAt: nowISO }
          : task
      );

      persistAndNotify(updatedTasks);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, findTaskById, updateTasksRecursive, persistAndNotify]);

  return {
    isProcessing,
    startTimer,
    startTimerByName,
    pauseTimer,
    stopTimer,
  };
}
