/**
 * @file TimerTaskList.tsx
 * @description 计时器任务列表组件（支持拖拽排序）
 * @created 2025-11-02
 */

'use client'

import React from 'react';
import { DndContext, closestCenter } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { TimerTask } from '../TimerTask/TimerTask';
import { useTimerDragDrop } from '../../hooks/useTimerDragDrop';
import type { TimerTask as Task } from '../../types';

interface TimerTaskListProps {
  /** 任务列表 */
  tasks: Task[];
  /** 任务变更回调 */
  onTasksChange: (tasks: Task[]) => void;
  /** 启动回调 */
  onStart: (taskId: string) => void;
  /** 暂停回调 */
  onPause: (taskId: string) => void;
  /** 删除回调 */
  onDelete: (taskId: string) => void;
  /** 添加子任务回调 */
  onAddSubtask: (taskId: string) => void;
  /** 是否正在处理操作 */
  isProcessing?: boolean;
  /** 操作记录回调 */
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  /** 折叠状态集合 */
  collapsedTasks?: Set<string>;
  /** 折叠切换回调 */
  onToggleCollapse?: (taskId: string) => void;
  /** 计算当前显示时间的函数 */
  getCurrentDisplayTime?: (task: Task) => number;
  /** 只显示指定ID的任务（用于分组显示） */
  groupFilter?: string[];
}

/**
 * 计时器任务列表组件
 * 
 * 功能：
 * - 渲染任务列表
 * - 支持拖拽排序
 * - 支持分组过滤
 * - 移动端优化
 * 
 * @example
 * ```tsx
 * <TimerTaskList
 *   tasks={tasks}
 *   onTasksChange={setTasks}
 *   onStart={handleStart}
 *   onPause={handlePause}
 *   onDelete={handleDelete}
 *   onAddSubtask={handleAddSubtask}
 * />
 * ```
 */
export function TimerTaskList({
  tasks,
  onTasksChange,
  onStart,
  onPause,
  onDelete,
  onAddSubtask,
  isProcessing = false,
  onOperationRecord,
  collapsedTasks,
  onToggleCollapse,
  getCurrentDisplayTime,
  groupFilter,
}: TimerTaskListProps) {
  // 拖拽功能
  const { sensors, handleDragStart, handleDragEnd } = useTimerDragDrop({
    tasks,
    onTasksChange,
    onOperationRecord,
  });

  // 过滤任务（如果提供了 groupFilter）
  const filteredTasks = groupFilter
    ? tasks.filter(task => groupFilter.includes(task.id))
    : tasks;

  // 如果没有任务，显示空状态
  if (filteredTasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <p>暂无任务</p>
        <p className="text-sm mt-2">{'点击 "快速创建" 添加新任务'}</p>
      </div>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div 
        className="space-y-3 overflow-x-hidden pr-2 timer-scroll-area"
        style={{
          // 移动端优化：防止拖拽时的滚动冲突
          touchAction: 'pan-y',
          // 改善滚动性能
          WebkitOverflowScrolling: 'touch',
        }}
      >
        <SortableContext
          items={filteredTasks.map(task => task.id)}
          strategy={verticalListSortingStrategy}
        >
          {filteredTasks.map(task => (
            <TimerTask
              key={task.id}
              task={task}
              level={0}
              onStart={onStart}
              onPause={onPause}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              isProcessing={isProcessing}
              collapsedTasks={collapsedTasks}
              onToggleCollapse={onToggleCollapse}
              getCurrentDisplayTime={getCurrentDisplayTime}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  );
}

