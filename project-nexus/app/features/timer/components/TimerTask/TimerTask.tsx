/**
 * @file TimerTask.tsx
 * @description 单个计时器任务组件（支持拖拽和递归渲染）
 * @created 2025-11-02
 */

'use client'

import React, { useState } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { TimerProgress } from './TimerProgress';
import { TimerControls } from './TimerControls';
import type { TimerTask as Task } from '../../types';

interface TimerTaskProps {
  /** 任务数据 */
  task: Task;
  /** 嵌套层级 */
  level?: number;
  /** 启动回调 */
  onStart: (taskId: string) => void;
  /** 暂停回调 */
  onPause: (taskId: string) => void;
  /** 删除回调 */
  onDelete: (taskId: string) => void;
  /** 添加子任务回调 */
  onAddSubtask: (taskId: string) => void;
  /** 子任务变更回调 */
  onChildrenChange?: (taskId: string, children: Task[]) => void;
  /** 是否正在处理操作 */
  isProcessing?: boolean;
  /** 折叠状态集合 */
  collapsedTasks?: Set<string>;
  /** 折叠切换回调 */
  onToggleCollapse?: (taskId: string) => void;
  /** 计算当前显示时间的函数 */
  getCurrentDisplayTime?: (task: Task) => number;
  /** 完成任务回调 */
  onComplete?: (taskId: string) => void;
}

/**
 * 计算任务总时间（包含子任务）
 */
function calculateTotalTime(task: Task, getCurrentDisplayTime: (t: Task) => number): number {
  let total = getCurrentDisplayTime(task);
  let childrenTotal = 0;

  if (task.children && task.children.length > 0) {
    task.children.forEach(child => {
      const childTime = calculateTotalTime(child, getCurrentDisplayTime);
      childrenTotal += childTime;
    });
  }

  total += childrenTotal;
  return total;
}

/**
 * 默认的当前显示时间计算函数
 */
function defaultGetCurrentDisplayTime(task: Task): number {
  if (task.isRunning && !task.isPaused && task.startTime) {
    const currentTime = Math.floor(Date.now() / 1000);
    const runningTime = currentTime - task.startTime;
    return task.elapsedTime + runningTime;
  }
  return task.elapsedTime;
}

/**
 * 单个计时器任务组件
 * 
 * 特性：
 * - 支持拖拽排序
 * - 支持子任务递归渲染
 * - 支持折叠/展开
 * - 响应式设计（移动端/桌面端）
 * 
 * @example
 * ```tsx
 * <TimerTask
 *   task={task}
 *   level={0}
 *   onStart={handleStart}
 *   onPause={handlePause}
 *   onDelete={handleDelete}
 *   onAddSubtask={handleAddSubtask}
 * />
 * ```
 */
export function TimerTask({
  task,
  level = 0,
  onStart,
  onPause,
  onDelete,
  onAddSubtask,
  onChildrenChange,
  isProcessing = false,
  collapsedTasks: externalCollapsedTasks,
  onToggleCollapse: externalOnToggleCollapse,
  getCurrentDisplayTime = defaultGetCurrentDisplayTime,
  onComplete,
}: TimerTaskProps) {
  // 本地折叠状态（如果外部没有提供）
  const [localCollapsedTasks, setLocalCollapsedTasks] = useState<Set<string>>(new Set());

  const collapsedTasks = externalCollapsedTasks || localCollapsedTasks;
  const onToggleCollapse = externalOnToggleCollapse || ((taskId: string) => {
    setLocalCollapsedTasks(prev => {
      const newSet = new Set(prev);
      if (newSet.has(taskId)) {
        newSet.delete(taskId);
      } else {
        newSet.add(taskId);
      }
      return newSet;
    });
  });

  // 拖拽功能
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  // 计算任务属性
  const totalTime = calculateTotalTime(task, getCurrentDisplayTime);
  const currentTime = getCurrentDisplayTime(task);
  const hasChildren = task.children && task.children.length > 0;
  const isCollapsed = collapsedTasks.has(task.id);

  // 单标签逻辑：直接使用 instanceTag
  const hasInstanceTag = !!(task.instanceTag && task.instanceTag.trim() !== '');
  const indentStyle = { marginLeft: `${level * 20}px` };

  // 子任务变更处理（暂未使用）
  // const handleChildrenChange = (updatedChildren: Task[]) => {
  //   if (onChildrenChange) {
  //     onChildrenChange(task.id, updatedChildren);
  //     }
  // };

  return (
    <div ref={setNodeRef} style={{ ...style, ...indentStyle }} {...attributes}>
      <Card
        className={`transition-all duration-200 mb-3 text-white ${
          // 基础背景色 - 玻璃态改造
          hasInstanceTag ? 'bg-orange-900/20 backdrop-blur-sm' : 'bg-gray-900/40 backdrop-blur-sm'
          } ${
          // 边框颜色
          task.isRunning
            ? (hasInstanceTag ? 'border-orange-400' : 'border-blue-300')
            : (hasInstanceTag ? 'border-orange-600' : 'border-gray-600')
          } ${
          // 子任务左边框
          hasChildren ? (hasInstanceTag ? 'border-l-4 border-l-orange-400' : 'border-l-4 border-l-green-400') : ''
          } ${
          // 拖拽效果
          isDragging ? 'shadow-lg rotate-1 scale-105' : 'hover:shadow-md'
          } ${
          // 事物项特殊效果
          hasInstanceTag ? 'shadow-orange-500/30 shadow-lg' : ''
          }`}
        style={{
          userSelect: 'none',
          WebkitUserSelect: 'none',
          MozUserSelect: 'none',
          msUserSelect: 'none',
          minHeight: '44px',
          WebkitTapHighlightColor: 'transparent',
          overscrollBehavior: 'none',
        }}
      >
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* 移动端拖拽手柄 - 顶部居中 */}
            <div className="flex justify-center mb-2 md:hidden">
              <div
                {...listeners}
                data-drag-handle
                className="cursor-grab active:cursor-grabbing p-2 rounded-lg hover:bg-gray-800/50 transition-colors duration-200 flex items-center justify-center"
                style={{
                  minWidth: '44px',
                  minHeight: '44px',
                  touchAction: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  // 强制禁止选择，主要解决“长按划不动”的问题
                  userSelect: 'none',
                  WebkitUserSelect: 'none',
                }}
                title="拖拽重新排序"
              >
                <div className="flex gap-1">
                  {[...Array(6)].map((_, i) => (
                    <div key={i} className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  ))}
                </div>
              </div>
            </div>

            {/* 桌面端拖拽手柄 - 左侧 */}
            <div
              {...listeners}
              data-drag-handle
              className="hidden md:flex flex-shrink-0 cursor-grab active:cursor-grabbing p-2 -m-2 rounded-lg hover:bg-gray-800/50 transition-colors duration-200 items-center justify-center"
              style={{
                minWidth: '44px',
                minHeight: '44px',
                touchAction: 'none',
                WebkitTapHighlightColor: 'transparent',
                // 强制禁止选择，确保拖拽流畅
                userSelect: 'none',
                WebkitUserSelect: 'none',
              }}
              title="拖拽重新排序"
            >
              <div className="flex flex-col gap-1">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="w-1 h-1 bg-gray-400 rounded-full"></div>
                ))}
              </div>
            </div>

            {/* 任务信息区域 */}
            <div className="flex-1 min-w-0 flex flex-col items-center md:items-start text-center md:text-left">
              {/* 任务标题行 */}
              <div className="flex items-center justify-center md:justify-start gap-2 mb-1 flex-wrap w-full">
                {/* 折叠/展开按钮 */}
                {hasChildren && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapse(task.id);
                    }}
                    variant="ghost"
                    size="sm"
                    className={`p-1 h-6 w-6 flex-shrink-0 ${hasInstanceTag
                      ? "text-orange-400 hover:text-orange-300 hover:bg-orange-400/20"
                      : "text-green-400 hover:text-green-300 hover:bg-green-400/20"
                      }`}
                    title={isCollapsed ? "展开子任务" : "收缩子任务"}
                  >
                    {isCollapsed ? "▶" : "▼"}
                  </Button>
                )}

                {/* 状态指示点 */}
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${hasChildren
                  ? (hasInstanceTag ? 'bg-orange-400' : 'bg-green-400')
                  : (hasInstanceTag ? 'bg-orange-300' : 'bg-gray-400')
                  }`}></div>

                {/* 任务名称 */}
                <h3 className="font-medium text-white break-words min-w-0 flex-1 text-sm md:text-base">
                  {task.name}
                  {hasInstanceTag && (
                    <span className="text-xs text-orange-300 bg-orange-900/40 px-1.5 py-0.5 rounded border border-orange-500/30 ml-2">
                      🏷️ {task.instanceTag}
                    </span>
                  )}
                  {hasChildren && (
                    <span className={`text-xs ml-2 ${hasInstanceTag ? 'text-orange-300' : 'text-green-400'
                      }`}>
                      ({task.children!.length}个子任务)
                    </span>
                  )}
                </h3>
              </div>

              {/* 分类路径 */}
              <p className="text-xs md:text-sm text-gray-300 break-words truncate w-full">
                {task.categoryPath}
              </p>

              {/* 进度显示 */}
              <TimerProgress
                elapsedTime={currentTime}
                initialTime={task.initialTime}
                isRunning={task.isRunning}
                hasChildren={hasChildren}
                totalTime={totalTime}
                hasInstanceTag={!!hasInstanceTag}
              />
            </div>

            {/* 控制按钮 */}
            <TimerControls
              task={task}
              onStart={onStart}
              onPause={onPause}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              isProcessing={isProcessing}
              hasInstanceTag={!!hasInstanceTag}
              onComplete={onComplete}
            />
          </div>
        </CardContent>
      </Card>

      {/* 递归渲染子任务 */}
      {hasChildren && !isCollapsed && (
        <div className="ml-4 md:ml-6">
          {task.children!.map(child => (
            <TimerTask
              key={child.id}
              task={child}
              level={level + 1}
              onStart={onStart}
              onPause={onPause}
              onDelete={onDelete}
              onAddSubtask={onAddSubtask}
              isProcessing={isProcessing}
              collapsedTasks={collapsedTasks}
              onToggleCollapse={onToggleCollapse}
              getCurrentDisplayTime={getCurrentDisplayTime}
              onComplete={onComplete}
            />
          ))}
        </div>
      )}
    </div>
  );
}

