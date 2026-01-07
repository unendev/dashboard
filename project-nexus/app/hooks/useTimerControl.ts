/**
 * 通用计时器控制 Hook（简化版）
 * 核心功能：互斥、异步锁、版本冲突检测、乐观更新
 */

import { useState, useCallback } from 'react';
import { getDeviceId } from '@/lib/device-fingerprint';
import { TimerTask } from '@dashboard/shared';



interface UseTimerControlOptions {
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[]) => void;
  onVersionConflict?: () => void; // 版本冲突回调
  onTasksPaused?: (pausedTasks: Array<{ id: string; name: string }>) => void; // 互斥暂停回调
}

export function useTimerControl(options: UseTimerControlOptions) {
  const { tasks, onTasksChange, onVersionConflict, onTasksPaused } = options;

  // 简化异步锁：单个布尔值，防止重复点击
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * 递归查找任务（支持子任务）
   */
  const findTaskById = useCallback((taskId: string, taskList: TimerTask[] = tasks): TimerTask | null => {
    for (const task of taskList) {
      if (task.id === taskId) return task;
      if (task.children) {
        const found = findTaskById(taskId, task.children);
        if (found) return found;
      }
    }
    return null;
  }, [tasks]);

  /**
   * 递归查找所有运行中的任务（支持子任务）
   */
  const findAllRunningTasks = useCallback((excludeId: string, taskList: TimerTask[] = tasks): TimerTask[] => {
    const running: TimerTask[] = [];
    for (const task of taskList) {
      if (task.id !== excludeId && task.isRunning && !task.isPaused) {
        running.push(task);
      }
      if (task.children) {
        running.push(...findAllRunningTasks(excludeId, task.children));
      }
    }
    return running;
  }, [tasks]);

  /**
   * 递归更新任务状态（支持子任务）
   */
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

  /**
   * 启动计时器返回结果类型
   */
  type StartTimerResult =
    | { success: true }
    | { success: false; reason: 'version_conflict'; conflictTaskName?: string }
    | { success: false; reason: 'not_found' }
    | { success: false; reason: 'processing' }
    | { success: false; reason: 'error'; error: unknown };

  /**
   * 启动计时器（简化版 + 递归支持）
   * 逻辑：防重复 → 查找运行中任务 → 乐观更新UI → 串行API调用 → 冲突检测
   * 
   * 【重要】版本管理策略：
   * - 使用 versionMap 在整个操作过程中追踪最新版本号
   * - 避免因 React 状态异步更新导致使用过期的 version
   */
  const startTimer = useCallback(async (taskId: string): Promise<StartTimerResult> => {
    // 1. 异步锁：防止重复点击
    console.log('🔍 [startTimer] 检查 isProcessing:', isProcessing, 'taskId:', taskId);
    if (isProcessing) {
      console.log('⏸️ [startTimer] 操作进行中，请稍候...');
      return { success: false, reason: 'processing' };
    }

    // 2. 递归查找目标任务
    const targetTask = findTaskById(taskId);
    if (!targetTask) {
      console.error('❌ 未找到目标任务:', taskId);
      return { success: false, reason: 'not_found' };
    }

    // 3. 递归查找所有运行中的任务（互斥检查，包含子任务）
    const runningTasks = findAllRunningTasks(taskId);
    console.log('🔍 [互斥检查] 找到运行中任务:', runningTasks.map(t => ({ id: t.id, name: t.name })));

    console.log('🔒 [startTimer] 设置 isProcessing = true');
    setIsProcessing(true);

    // 【关键】创建版本追踪 Map，在整个操作过程中维护最新版本
    // 这样即使 React 状态还没更新，我们也能使用正确的版本号
    const versionMap = new Map<string, number>();
    tasks.forEach(task => {
      if (task.version !== undefined) {
        versionMap.set(task.id, task.version);
      }
    });

    try {
      const currentTime = Math.floor(Date.now() / 1000);

      // 4. 乐观更新UI（递归更新，暂停所有运行中的任务）
      const runningTaskIds = new Set(runningTasks.map(t => t.id));
      const updatedTasks = updateTasksRecursive(tasks, (task) => {
        // 暂停所有运行中的任务
        if (runningTaskIds.has(task.id)) {
          const runningTime = task.startTime ? currentTime - task.startTime : 0;
          return {
            ...task,
            isRunning: false,
            isPaused: true,
            elapsedTime: task.elapsedTime + runningTime,
            startTime: null,
            pausedTime: 0
          };
        }
        // 启动目标任务
        if (task.id === taskId) {
          return {
            ...task,
            isRunning: true,
            isPaused: false,
            startTime: currentTime,
            pausedTime: 0
          };
        }
        return task;
      });
      onTasksChange(updatedTasks);

      // 5. 后台同步到服务器（串行执行）
      // 5.1 先暂停所有运行中的任务
      let currentTasks = updatedTasks;  // 【修复】使用乐观更新后的 tasks，而不是旧的 tasks
      const deviceId = getDeviceId();

      if (runningTasks.length > 0) {
        console.log(`⏸️ 暂停 ${runningTasks.length} 个运行中的任务`);
        for (const runningTask of runningTasks) {
          const runningTime = runningTask.startTime ? currentTime - runningTask.startTime : 0;
          // 【关键】使用 versionMap 中的版本号，而不是可能过期的 runningTask.version
          const currentVersion = versionMap.get(runningTask.id) ?? runningTask.version;

          const pauseResponse = await fetch(`/api/timer-tasks`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: runningTask.id,
              version: currentVersion,
              deviceId,
              elapsedTime: runningTask.elapsedTime + runningTime,
              isPaused: true,
              isRunning: false,
              startTime: null,
              pausedTime: 0
            })
          });

          // 检测版本冲突
          if (pauseResponse.status === 409) {
            const conflictData = await pauseResponse.json();
            console.error('⚠️ [暂停操作] 版本冲突 409，任务:', runningTask.name, '冲突数据:', conflictData);

            // 只有不同设备的冲突才弹出提示
            if (!conflictData.isFromSameDevice) {
              alert(`⚠️ 数据冲突\n\n任务"${runningTask.name}"的数据已在其他设备修改。\n\n页面将自动刷新以获取最新数据。`);
            }

            setIsProcessing(false);
            return {
              success: false,
              reason: 'version_conflict',
              conflictTaskName: runningTask.name
            };
          }

          // 成功：解析服务器返回的新数据（包含新version）
          const updatedPausedTask = await pauseResponse.json();
          console.log('✅ [暂停操作] 服务器返回新数据，任务:', runningTask.name, 'version:', updatedPausedTask.version);

          // 【关键】更新 versionMap 中的版本号
          versionMap.set(runningTask.id, updatedPausedTask.version);

          // 累积更新前端tasks，确保version同步
          currentTasks = updateTasksRecursive(currentTasks, (task) => {
            if (task.id === runningTask.id) {
              return {
                ...task,
                version: updatedPausedTask.version,  // ← 关键：更新version
                elapsedTime: updatedPausedTask.elapsedTime,
                isPaused: true,
                isRunning: false,
                startTime: null,
                pausedTime: 0
              };
            }
            return task;
          });
        }

        // 通知上层（互斥暂停）
        onTasksPaused?.(runningTasks.map(t => ({ id: t.id, name: t.name })));
      }

      // 5.2 启动目标任务
      // 【关键】使用 versionMap 中的版本号
      const targetVersion = versionMap.get(taskId) ?? targetTask.version;

      const startResponse = await fetch(`/api/timer-tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          version: targetVersion,
          deviceId,
          isRunning: true,
          isPaused: false,
          startTime: currentTime,
          pausedTime: 0
        })
      });

      // 检测版本冲突
      if (startResponse.status === 409) {
        const conflictData = await startResponse.json();
        console.error('⚠️ [启动操作] 版本冲突 409，任务:', targetTask.name, '冲突数据:', conflictData);

        // 只有不同设备的冲突才弹出提示
        if (!conflictData.isFromSameDevice) {
          alert(`⚠️ 数据冲突\n\n任务"${targetTask.name}"的数据已在其他设备修改。\n\n页面将自动刷新以获取最新数据。`);
        }

        setIsProcessing(false);
        return {
          success: false,
          reason: 'version_conflict',
          conflictTaskName: targetTask.name
        };
      }

      // 成功：解析服务器返回的新数据（包含新version）
      const updatedTask = await startResponse.json();
      console.log('✅ [启动操作] 服务器返回新数据，version:', updatedTask.version);

      // 更新前端tasks，确保version同步（基于累积的 currentTasks）
      const finalTasks = updateTasksRecursive(currentTasks, (task) => {
        if (task.id === taskId) {
          return {
            ...task,
            version: updatedTask.version,  // ← 关键：更新version
            isRunning: true,
            startTime: currentTime,
            isPaused: false,
            pausedTime: 0
          };
        }
        return task;
      });
      onTasksChange(finalTasks);

      // 成功
      return { success: true };

    } catch (error) {
      console.error('❌ [startTimer] 启动计时器失败:', error);
      console.log('🔓 [startTimer] catch 块：设置 isProcessing = false');
      setIsProcessing(false);
      return { success: false, reason: 'error', error };
    } finally {
      console.log('🔓 [startTimer] finally 块：设置 isProcessing = false');
      setIsProcessing(false);
    }
  }, [tasks, onTasksChange, onTasksPaused, isProcessing, findTaskById, findAllRunningTasks, updateTasksRecursive]);

  /**
   * 暂停计时器（简化版 + 递归支持）
   */
  const pauseTimer = useCallback(async (taskId: string) => {
    if (isProcessing) return;

    const targetTask = findTaskById(taskId);
    if (!targetTask || !targetTask.isRunning) return;

    setIsProcessing(true);

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const runningTime = targetTask.startTime ? currentTime - targetTask.startTime : 0;
      const newElapsedTime = targetTask.elapsedTime + runningTime;
      const deviceId = getDeviceId();

      // 乐观更新UI（递归更新，包含子任务）
      const updatedTasks = updateTasksRecursive(tasks, (task) =>
        task.id === taskId
          ? { ...task, elapsedTime: newElapsedTime, isPaused: true, isRunning: false, startTime: null, pausedTime: 0 }
          : task
      );
      onTasksChange(updatedTasks);

      // 同步到服务器
      const response = await fetch(`/api/timer-tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          version: targetTask.version,
          deviceId,
          elapsedTime: newElapsedTime,
          isPaused: true,
          isRunning: false,
          startTime: null,
          pausedTime: 0
        })
      });

      // 版本冲突检测
      if (response.status === 409) {
        const conflictData = await response.json();
        console.warn('⚠️ 检测到数据冲突，正在刷新...', conflictData);

        // 只有不同设备的冲突才弹出提示
        if (!conflictData.isFromSameDevice) {
          alert(`⚠️ 数据冲突\n\n任务"${targetTask.name}"的数据已在其他设备修改。\n\n页面将自动刷新以获取最新数据。`);
        }

        onVersionConflict?.();
        return;
      }

      // 【修复】成功后更新本地 version，避免后续操作使用过期版本
      if (response.ok) {
        const updatedTask = await response.json();
        const finalTasks = updateTasksRecursive(updatedTasks, (task) =>
          task.id === taskId
            ? { ...task, version: updatedTask.version }
            : task
        );
        onTasksChange(finalTasks);
      }

    } catch (error) {
      console.error('暂停计时器失败:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [tasks, onTasksChange, onVersionConflict, isProcessing, findTaskById, updateTasksRecursive]);

  /**
   * 停止计时器（简化版 + 递归支持）
   */
  const stopTimer = useCallback(async (taskId: string) => {
    if (isProcessing) return;

    const targetTask = findTaskById(taskId);
    if (!targetTask || !targetTask.isRunning) return;

    setIsProcessing(true);

    try {
      const currentTime = Math.floor(Date.now() / 1000);
      const runningTime = targetTask.startTime ? currentTime - targetTask.startTime : 0;
      const newElapsedTime = targetTask.elapsedTime + runningTime;
      const deviceId = getDeviceId();

      // 乐观更新UI（递归更新，包含子任务）
      const updatedTasks = updateTasksRecursive(tasks, (task) =>
        task.id === taskId
          ? { ...task, elapsedTime: newElapsedTime, isRunning: false, isPaused: false, startTime: null, pausedTime: 0, completedAt: currentTime }
          : task
      );
      onTasksChange(updatedTasks);

      // 同步到服务器
      const response = await fetch(`/api/timer-tasks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: taskId,
          version: targetTask.version,
          deviceId,
          elapsedTime: newElapsedTime,
          isRunning: false,
          isPaused: false,
          startTime: null,
          pausedTime: 0,
          completedAt: currentTime
        })
      });

      // 版本冲突检测
      if (response.status === 409) {
        const conflictData = await response.json();
        console.warn('⚠️ 检测到数据冲突，正在刷新...', conflictData);

        // 只有不同设备的冲突才弹出提示
        if (!conflictData.isFromSameDevice) {
          alert(`⚠️ 数据冲突\n\n任务"${targetTask.name}"的数据已在其他设备修改。\n\n页面将自动刷新以获取最新数据。`);
        }

        onVersionConflict?.();
        return;
      }

      // 【修复】成功后更新本地 version，避免后续操作使用过期版本
      if (response.ok) {
        const updatedTask = await response.json();
        const finalTasks = updateTasksRecursive(updatedTasks, (task) =>
          task.id === taskId
            ? { ...task, version: updatedTask.version }
            : task
        );
        onTasksChange(finalTasks);
      }

    } catch (error) {
      console.error('停止计时器失败:', error);
    } finally {
      setIsProcessing(false);
    }
  }, [tasks, onTasksChange, onVersionConflict, isProcessing, findTaskById, updateTasksRecursive]);

  return {
    startTimer,
    pauseTimer,
    stopTimer,
    isProcessing
  };
}






