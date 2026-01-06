'use client'

import React from 'react';
import { Button } from '@/app/components/ui/button';
import { CategoryGroup, formatTime, getRunningTasks, countAllTasksRecursively } from '@/lib/timer-utils';
import { cn } from '@/lib/utils';

interface CategorySubHeaderProps {
  group: CategoryGroup;
  level: 2 | 3;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  parentColor?: string;
}

/**
 * 二级/三级分组头部组件
 * - Level 2: 中等样式（纯色背景、中号字体）
 * - Level 3: 最简样式（灰色边框、小字体）
 */
const CategorySubHeader: React.FC<CategorySubHeaderProps> = ({
  group,
  level,
  isCollapsed,
  onToggleCollapse,
  parentColor = 'blue'
}) => {
  const runningTasks = getRunningTasks(group.tasks);
  const hasRunning = runningTasks.length > 0;
  
  // 颜色配置（继承父级）
  const colorMap: Record<string, { bg: string; text: string; border: string }> = {
    blue: {
      bg: 'bg-blue-50/50 dark:bg-blue-900/10',
      text: 'text-blue-600 dark:text-blue-400',
      border: 'border-blue-200/50 dark:border-blue-700/50'
    },
    green: {
      bg: 'bg-green-50/50 dark:bg-green-900/10',
      text: 'text-green-600 dark:text-green-400',
      border: 'border-green-200/50 dark:border-green-700/50'
    },
    purple: {
      bg: 'bg-purple-50/50 dark:bg-purple-900/10',
      text: 'text-purple-600 dark:text-purple-400',
      border: 'border-purple-200/50 dark:border-purple-700/50'
    },
    red: {
      bg: 'bg-red-50/50 dark:bg-red-900/10',
      text: 'text-red-600 dark:text-red-400',
      border: 'border-red-200/50 dark:border-red-700/50'
    },
    orange: {
      bg: 'bg-orange-50/50 dark:bg-orange-900/10',
      text: 'text-orange-600 dark:text-orange-400',
      border: 'border-orange-200/50 dark:border-orange-700/50'
    },
    indigo: {
      bg: 'bg-indigo-50/50 dark:bg-indigo-900/10',
      text: 'text-indigo-600 dark:text-indigo-400',
      border: 'border-indigo-200/50 dark:border-indigo-700/50'
    },
  };
  
  const colors = colorMap[parentColor] || colorMap.blue;
  
  // Level 2: 中等样式
  if (level === 2) {
    return (
      <div
        className={cn(
          "flex items-center justify-between px-3 py-2.5 rounded-lg border",
          "transition-all duration-200",
          colors.border,
          colors.bg,
          "hover:shadow-sm"
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1 h-auto hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
            title={isCollapsed ? '展开' : '折叠'}
          >
            <span className="text-base">
              {isCollapsed ? '▶' : '▼'}
            </span>
          </Button>
          
          <span className={cn("font-semibold text-base truncate", colors.text)}>
            {group.categoryName}
          </span>
          
          <span className="text-xs text-gray-500 dark:text-gray-400 shrink-0">
            ({countAllTasksRecursively(group)})
          </span>
        </div>
        
        <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
          <span className={cn("font-medium", colors.text)}>
            {formatTime(group.totalTime)}
          </span>
          {hasRunning && (
            <span className={cn("flex items-center gap-1 animate-pulse font-medium", colors.text)}>
              <span>⏱️</span>
              <span>{runningTasks.length}</span>
            </span>
          )}
        </div>
      </div>
    );
  }
  
  // Level 3: 最简样式
  return (
    <div
      className={cn(
        "flex items-center justify-between px-2 py-1.5 rounded border",
        "transition-all duration-200",
        "border-gray-300/50 dark:border-gray-600/50",
        "bg-gray-50/30 dark:bg-gray-800/20",
        "hover:bg-gray-100/50 dark:hover:bg-gray-800/30"
      )}
    >
      <div className="flex items-center gap-1.5 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggleCollapse}
          className="p-0.5 h-auto hover:bg-black/5 dark:hover:bg-white/5 shrink-0"
          title={isCollapsed ? '展开' : '折叠'}
        >
          <span className="text-xs">
            {isCollapsed ? '▶' : '▼'}
          </span>
        </Button>
        
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {group.categoryName}
        </span>
        
        <span className="text-xs text-gray-500 shrink-0">
          ({countAllTasksRecursively(group)})
        </span>
      </div>
      
      <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-500">
        <span className="font-medium">
          {formatTime(group.totalTime)}
        </span>
        {hasRunning && (
          <span className="flex items-center gap-0.5 animate-pulse text-blue-500">
            <span>⏱️</span>
            <span>{runningTasks.length}</span>
          </span>
        )}
      </div>
    </div>
  );
};

export default CategorySubHeader;






