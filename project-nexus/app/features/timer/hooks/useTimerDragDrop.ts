/**
 * @file useTimerDragDrop.ts
 * @description 计时器拖拽排序 Hook
 * @created 2025-11-02
 */

import { useCallback } from 'react';
import {
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  TouchSensor,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates, arrayMove } from '@dnd-kit/sortable';
import { fetchWithRetry } from '@/lib/fetch-utils';
import type { TimerTask } from '../types';

interface UseTimerDragDropOptions {
  /** 任务列表 */
  tasks: TimerTask[];
  /** 任务变更回调 */
  onTasksChange: (tasks: TimerTask[]) => void;
  /** 操作记录回调 */
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
}

/**
 * 计时器拖拽排序 Hook
 * 
 * 功能：
 * - 配置拖拽传感器（支持鼠标、触摸、键盘）
 * - 处理拖拽开始/结束事件
 * - 自动保存排序到数据库
 * - 触觉反馈（移动端）
 * 
 * @example
 * ```tsx
 * const { sensors, handleDragStart, handleDragEnd } = useTimerDragDrop({
 *   tasks,
 *   onTasksChange: setTasks,
 *   onOperationRecord: handleRecord,
 * });
 * 
 * <DndContext 
 *   sensors={sensors}
 *   onDragStart={handleDragStart}
 *   onDragEnd={handleDragEnd}
 * >
 *   ...
 * </DndContext>
 * ```
 */
export function useTimerDragDrop({
  tasks,
  onTasksChange,
  onOperationRecord,
}: UseTimerDragDropOptions) {
  // 拖拽传感器配置 - 优化移动端支持
  const sensors = useSensors(
    // 鼠标/触控板传感器
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 增加距离，减少误触
      },
    }),
    // 触摸传感器（移动端）
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 增加延迟，避免误触
        tolerance: 8, // 增加容差
      },
    }),
    // 键盘传感器（无障碍支持）
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  /**
   * 拖拽开始处理
   * - 移动端触觉反馈
   * - 视觉高亮反馈
   */
  const handleDragStart = useCallback((event: DragStartEvent) => {
    // 移动端触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(30); // 轻微震动
    }
    
    // 视觉反馈：高亮拖拽手柄
    const activeElement = document.querySelector(`[data-rbd-draggable-id="${event.active.id}"]`);
    if (activeElement) {
      const dragHandle = activeElement.querySelector('[data-drag-handle]');
      if (dragHandle) {
        dragHandle.classList.add('bg-gray-700');
      }
    }
  }, []);

  /**
   * 拖拽结束处理
   * - 重新排序任务
   * - 保存到数据库
   * - 记录操作
   */
  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // 清理视觉反馈
    const activeElement = document.querySelector(`[data-rbd-draggable-id="${active.id}"]`);
    if (activeElement) {
      const dragHandle = activeElement.querySelector('[data-drag-handle]');
      if (dragHandle) {
        dragHandle.classList.remove('bg-gray-700');
      }
    }

    // 如果没有放置目标或者放置到原位置，不做处理
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = tasks.findIndex((task) => task.id === active.id);
    const newIndex = tasks.findIndex((task) => task.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      console.warn('拖拽任务未找到:', { activeId: active.id, overId: over.id });
      return;
    }

    // 重新排序任务数组
    const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
    
    // 更新每个任务的 order 字段
    const updatedTasks = reorderedTasks.map((task, index) => ({
      ...task,
      order: index
    }));

    // 立即更新本地状态（乐观更新）
    onTasksChange(updatedTasks);

    // 保存排序到数据库（后台异步）
    try {
      const taskOrders = updatedTasks.map((task, index) => ({
        id: task.id,
        order: index
      }));

      const response = await fetchWithRetry(
        '/api/timer-tasks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'updateOrder',
            taskOrders: taskOrders
          }),
        },
        3, // 最多重试3次
        (attempt, error) => {
          console.warn(`保存排序重试 ${attempt}/3:`, error.message);
        }
      );

      if (response.ok) {
        console.log('✅ 任务排序已保存到数据库');
      } else {
        const errorText = await response.text();
        console.error('❌ 保存排序失败:', response.status, errorText);
        // 注意：这里不回滚本地状态，因为用户体验优先
      }
    } catch (error) {
      console.error('❌ 保存排序时出错:', error);
      // 注意：这里不回滚本地状态，因为用户体验优先
    }
    
    // 记录操作历史
    if (onOperationRecord) {
      const movedTask = tasks[oldIndex];
      if (movedTask) {
        onOperationRecord(
          '移动任务',
          movedTask.name,
          `从位置 ${oldIndex + 1} 移动到位置 ${newIndex + 1}`
        );
      }
    }
  }, [tasks, onTasksChange, onOperationRecord]);

  return {
    sensors,
    handleDragStart,
    handleDragEnd,
  };
}

