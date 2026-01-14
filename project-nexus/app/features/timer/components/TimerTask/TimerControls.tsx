/**
 * @file TimerControls.tsx
 * @description 计时器控制按钮组件
 * @created 2025-11-02
 */

'use client'

import React from 'react';
import { Button } from '@/app/components/ui/button';
import type { TimerTask } from '../../types';

interface TimerControlsProps {
  /** 任务数据 */
  task: TimerTask;
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
  /** 是否禁用 */
  disabled?: boolean;
  /** 是否有事物标签 */
  hasInstanceTag?: boolean;
}

/**
 * 计时器控制按钮组件
 * 
 * 包含：
 * - 开始/继续/暂停按钮
 * - 添加子任务按钮
 * - 删除按钮
 * 
 * @example
 * ```tsx
 * <TimerControls
 *   task={task}
 *   onStart={handleStart}
 *   onPause={handlePause}
 *   onDelete={handleDelete}
 *   onAddSubtask={handleAddSubtask}
 *   isProcessing={false}
 * />
 * ```
 */
export function TimerControls({
  task,
  onStart,
  onPause,
  onDelete,
  onAddSubtask,
  isProcessing = false,
  disabled = false,
  hasInstanceTag = false,
}: TimerControlsProps) {
  const isDisabled = isProcessing || disabled;

  return (
    <div 
      className="flex gap-1.5 md:gap-2 md:ml-4 flex-shrink-0 flex-wrap justify-center md:justify-end group-hover:show-secondary-buttons" 
      style={{ 
        zIndex: 10,
        touchAction: 'manipulation',
        pointerEvents: 'auto'
      }}
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => {
        e.stopPropagation();
      }}
    >
      {/* 主按钮：开始/暂停/继续 */}
      {task.isRunning ? (
        task.isPaused ? (
          // 已暂停 → 显示"继续"按钮
          <Button 
            onClick={() => onStart(task.id)}
            disabled={isDisabled}
            size="sm"
            className={`text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 h-auto ${
              hasInstanceTag 
                ? "bg-orange-600 hover:bg-orange-700 text-white" 
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {isProcessing ? '处理中...' : '继续'}
          </Button>
        ) : (
          // 运行中 → 显示"暂停"按钮
          <Button 
            onClick={() => onPause(task.id)}
            disabled={isDisabled}
            variant="outline"
            size="sm"
            className={`text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 h-auto ${
              hasInstanceTag 
                ? "border-orange-300 text-orange-300 hover:bg-orange-800" 
                : ""
            }`}
          >
            {isProcessing ? '处理中...' : '暂停'}
          </Button>
        )
      ) : (
        // 未运行 → 显示"开始"按钮
        <Button 
          onClick={() => onStart(task.id)}
          disabled={isDisabled}
          size="sm"
          className={`text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 h-auto ${
            hasInstanceTag 
              ? "bg-orange-600 hover:bg-orange-700 text-white" 
              : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {isProcessing ? '处理中...' : '开始'}
        </Button>
      )}
      
      {/* 添加子任务按钮 */}
      <Button 
        onClick={() => onAddSubtask(task.id)}
        variant="outline"
        size="sm"
        disabled={isDisabled}
        title="添加子任务"
        className={`text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 h-auto min-w-[32px] md:min-w-[36px] ${
          hasInstanceTag 
            ? "border-orange-300 text-orange-300 hover:bg-orange-800" 
            : "border-green-300 text-green-600 hover:bg-green-50"
        }`}
      >
        ➕
      </Button>
      
      {/* 删除按钮 */}
      <Button 
        onClick={() => onDelete(task.id)}
        variant="outline"
        size="sm"
        disabled={isDisabled}
        title="删除任务"
        className={`text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 h-auto min-w-[32px] md:min-w-[36px] ${
          hasInstanceTag 
            ? "text-red-400 hover:text-red-300 border-red-400 hover:bg-red-800" 
            : "text-red-600 hover:text-red-700 border-red-300 hover:bg-red-50"
        }`}
      >
        ➖
      </Button>
    </div>
  );
}

