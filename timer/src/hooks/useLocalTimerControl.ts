import { useState, useCallback } from 'react';
import type { TimerTask } from '@dashboard/shared';
import { getAllTasks, saveAllTasks } from '@/lib/local-timer-storage';

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

  const startTimer = useCallback(async (taskId: string) => {
    if (isProcessing) return { success: false, reason: 'processing' } as const;
    setIsProcessing(true);

    try {
      const tasks = getAllTasks();
      const now = Math.floor(Date.now() / 1000);
      const nowISO = new Date().toISOString();

      const runningTasks = findAllRunningTasks(taskId, tasks);
      let updatedTasks = updateTasksRecursive(tasks, (task) => {
        if (runningTasks.some(r => r.id === task.id)) {
          const runningTime = task.startTime ? now - task.startTime : 0;
          return {
            ...task,
            isRunning: false,
            isPaused: true,
            elapsedTime: task.elapsedTime + runningTime,
            startTime: null,
            pausedTime: 0,
            updatedAt: nowISO,
          };
        }
        if (task.id === taskId) {
          return {
            ...task,
            isRunning: true,
            isPaused: false,
            startTime: now,
            pausedTime: 0,
            updatedAt: nowISO,
          };
        }
        return task;
      });

      persistAndNotify(updatedTasks);
      return { success: true } as const;
    } catch {
      return { success: false, reason: 'error', error: new Error('local storage error') } as const;
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, findAllRunningTasks, updateTasksRecursive, persistAndNotify]);

  const pauseTimer = useCallback(async (taskId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const tasks = getAllTasks();
      const now = Math.floor(Date.now() / 1000);
      const nowISO = new Date().toISOString();
      const target = findTaskById(taskId, tasks);
      if (!target || !target.isRunning) return;

      const runningTime = target.startTime ? now - target.startTime : 0;
      const newElapsed = target.elapsedTime + runningTime;

      const updatedTasks = updateTasksRecursive(tasks, (task) =>
        task.id === taskId
          ? { ...task, elapsedTime: newElapsed, isPaused: true, isRunning: false, startTime: null, pausedTime: 0, updatedAt: nowISO }
          : task
      );

      persistAndNotify(updatedTasks);
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, findTaskById, updateTasksRecursive, persistAndNotify]);

  const stopTimer = useCallback(async (taskId: string) => {
    if (isProcessing) return;
    setIsProcessing(true);

    try {
      const tasks = getAllTasks();
      const now = Math.floor(Date.now() / 1000);
      const nowISO = new Date().toISOString();
      const target = findTaskById(taskId, tasks);
      if (!target || !target.isRunning) return;

      const runningTime = target.startTime ? now - target.startTime : 0;
      const newElapsed = target.elapsedTime + runningTime;

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

  return { startTimer, pauseTimer, stopTimer, isProcessing };
}
