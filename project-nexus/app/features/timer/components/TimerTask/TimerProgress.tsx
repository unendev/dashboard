/**
 * @file TimerProgress.tsx
 * @description 计时器进度显示组件
 * @created 2025-11-02
 */

'use client'

import React from 'react';

interface TimerProgressProps {
  /** 当前耗时（秒） */
  elapsedTime: number;
  /** 初始时间（秒） */
  initialTime: number;
  /** 是否运行中 */
  isRunning: boolean;
  /** 是否有子任务 */
  hasChildren?: boolean;
  /** 子任务总时间 */
  totalTime?: number;
  /** 是否有事物标签 */
  hasInstanceTag?: boolean;
}

/**
 * 格式化显示时间（HH:MM:SS 或 MM:SS）
 */
function formatDisplayTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
}

/**
 * 格式化紧凑时间（1h30m 或 45m）
 */
function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  
  if (hours > 0) {
    return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
  } else {
    return `${minutes}m`;
  }
}

/**
 * 计时器进度显示组件
 * 
 * 显示任务的当前耗时、初始时间提示、子任务总时间等
 * 
 * @example
 * ```tsx
 * <TimerProgress
 *   elapsedTime={3600}
 *   initialTime={7200}
 *   isRunning={true}
 * />
 * ```
 */
export function TimerProgress({
  elapsedTime,
  initialTime,
  isRunning,
  hasChildren = false,
  totalTime,
  hasInstanceTag = false,
}: TimerProgressProps) {
  const isPresetTime = initialTime > 0 && elapsedTime === initialTime;

  return (
    <div className="w-full">
      {/* 主要耗时显示 */}
      <div 
        className={`text-base md:text-lg font-mono mt-1 w-full ${
          hasInstanceTag ? 'text-orange-300' : 'text-blue-400'
        }`}
      >
        {formatDisplayTime(elapsedTime)}
        {isPresetTime && (
          <span className="text-xs text-gray-400 ml-2">(预设时间)</span>
        )}
      </div>

      {/* 子任务总时间 */}
      {hasChildren && totalTime !== undefined && (
        <div 
          className={`text-xs md:text-sm mt-1 w-full ${
            hasInstanceTag ? 'text-orange-300' : 'text-green-400'
          }`}
        >
          总计: {formatTime(totalTime)}
        </div>
      )}
    </div>
  );
}

