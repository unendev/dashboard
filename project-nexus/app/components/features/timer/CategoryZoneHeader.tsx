'use client'

import React from 'react';
import { Button } from '@/app/components/ui/button';
import { CategoryGroup, formatTime, getRunningTasks, countAllTasksRecursively } from '@/lib/timer-utils';

interface CategoryZoneHeaderProps {
  group: CategoryGroup;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onQuickCreate: () => void;
}

const CategoryZoneHeader: React.FC<CategoryZoneHeaderProps> = ({
  group,
  isCollapsed,
  onToggleCollapse,
  onQuickCreate
}) => {
  const runningTasks = getRunningTasks(group.tasks);
  const hasRunning = runningTasks.length > 0;
  
  // 颜色配置
  const colorClasses = {
    blue: {
      bg: 'from-blue-50 to-blue-100 dark:from-blue-900/30 dark:to-blue-800/20',
      border: 'border-blue-200 dark:border-blue-700',
      text: 'text-blue-700 dark:text-blue-300',
      button: 'border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800/40 hover:border-blue-400 dark:hover:border-blue-500'
    },
    green: {
      bg: 'from-green-50 to-green-100 dark:from-green-900/30 dark:to-green-800/20',
      border: 'border-green-200 dark:border-green-700',
      text: 'text-green-700 dark:text-green-300',
      button: 'border-green-300 dark:border-green-600 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-800/40 hover:border-green-400 dark:hover:border-green-500'
    },
    purple: {
      bg: 'from-purple-50 to-purple-100 dark:from-purple-900/30 dark:to-purple-800/20',
      border: 'border-purple-200 dark:border-purple-700',
      text: 'text-purple-700 dark:text-purple-300',
      button: 'border-purple-300 dark:border-purple-600 text-purple-700 dark:text-purple-300 hover:bg-purple-100 dark:hover:bg-purple-800/40 hover:border-purple-400 dark:hover:border-purple-500'
    },
    red: {
      bg: 'from-red-50 to-red-100 dark:from-red-900/30 dark:to-red-800/20',
      border: 'border-red-200 dark:border-red-700',
      text: 'text-red-700 dark:text-red-300',
      button: 'border-red-300 dark:border-red-600 text-red-700 dark:text-red-300 hover:bg-red-100 dark:hover:bg-red-800/40 hover:border-red-400 dark:hover:border-red-500'
    },
    gray: {
      bg: 'from-gray-50 to-gray-100 dark:from-gray-800/30 dark:to-gray-700/20',
      border: 'border-gray-200 dark:border-gray-600',
      text: 'text-gray-700 dark:text-gray-300',
      button: 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700/40 hover:border-gray-400 dark:hover:border-gray-500'
    },
    yellow: {
      bg: 'from-yellow-50 to-yellow-100 dark:from-yellow-900/30 dark:to-yellow-800/20',
      border: 'border-yellow-200 dark:border-yellow-700',
      text: 'text-yellow-700 dark:text-yellow-300',
      button: 'border-yellow-300 dark:border-yellow-600 text-yellow-700 dark:text-yellow-300 hover:bg-yellow-100 dark:hover:bg-yellow-800/40 hover:border-yellow-400 dark:hover:border-yellow-500'
    },
    teal: {
      bg: 'from-teal-50 to-teal-100 dark:from-teal-900/30 dark:to-teal-800/20',
      border: 'border-teal-200 dark:border-teal-700',
      text: 'text-teal-700 dark:text-teal-300',
      button: 'border-teal-300 dark:border-teal-600 text-teal-700 dark:text-teal-300 hover:bg-teal-100 dark:hover:bg-teal-800/40 hover:border-teal-400 dark:hover:border-teal-500'
    },
    orange: {
      bg: 'from-orange-50 to-orange-100 dark:from-orange-900/30 dark:to-orange-800/20',
      border: 'border-orange-200 dark:border-orange-700',
      text: 'text-orange-700 dark:text-orange-300',
      button: 'border-orange-300 dark:border-orange-600 text-orange-700 dark:text-orange-300 hover:bg-orange-100 dark:hover:bg-orange-800/40 hover:border-orange-400 dark:hover:border-orange-500'
    },
    pink: {
      bg: 'from-pink-50 to-pink-100 dark:from-pink-900/30 dark:to-pink-800/20',
      border: 'border-pink-200 dark:border-pink-700',
      text: 'text-pink-700 dark:text-pink-300',
      button: 'border-pink-300 dark:border-pink-600 text-pink-700 dark:text-pink-300 hover:bg-pink-100 dark:hover:bg-pink-800/40 hover:border-pink-400 dark:hover:border-pink-500'
    },
    indigo: {
      bg: 'from-indigo-50 to-indigo-100 dark:from-indigo-900/30 dark:to-indigo-800/20',
      border: 'border-indigo-200 dark:border-indigo-700',
      text: 'text-indigo-700 dark:text-indigo-300',
      button: 'border-indigo-300 dark:border-indigo-600 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-800/40 hover:border-indigo-400 dark:hover:border-indigo-500'
    }
  };
  
  const colors = colorClasses[group.color as keyof typeof colorClasses] || colorClasses.gray;
  
  return (
    <div className="relative">
      {/* 主标题栏 */}
      <div className={`
        flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4
        bg-gradient-to-r ${colors.bg}
        border-b-2 ${colors.border}
        hover:shadow-md transition-all duration-200
        rounded-t-lg
        gap-3 sm:gap-0
      `}>
        {/* 左侧：折叠按钮 + 分类信息 */}
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={onToggleCollapse}
            className="p-1 hover:bg-white/50 dark:hover:bg-black/20 flex-shrink-0"
            title={isCollapsed ? '展开' : '折叠'}
          >
            <span className="text-lg">
              {isCollapsed ? '▶' : '▼'}
            </span>
          </Button>
          
          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 min-w-0">
            <span className={`font-bold text-base sm:text-lg ${colors.text} truncate`}>
              {group.displayName}
            </span>
            <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-shrink-0">
              ({countAllTasksRecursively(group)}个任务)
            </span>
          </div>
        </div>
        
        {/* 中间：统计信息 */}
        <div className="flex items-center gap-3 sm:gap-4 text-xs sm:text-sm text-gray-600 dark:text-gray-400 flex-wrap">
          <span className="flex items-center gap-1">
            <span className="hidden sm:inline">总时间:</span>
            <span className={`font-medium ${colors.text}`}>
              {formatTime(group.totalTime)}
            </span>
          </span>
          {hasRunning && (
            <span className={`flex items-center gap-1 ${colors.text} animate-pulse font-medium`}>
              <span>⏱️</span>
              <span>{runningTasks.length}个运行中</span>
            </span>
          )}
        </div>
        
        {/* 右侧：复制任务按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onQuickCreate}
          className={`
            ${colors.button}
            rounded-xl px-3 sm:px-4 py-1.5 sm:py-2
            text-xs sm:text-sm font-medium
            transition-all duration-200
            hover:scale-105 hover:shadow-md
            flex items-center gap-1 sm:gap-2
            whitespace-nowrap
            flex-shrink-0
          `}
          title="复制此分类的任务配置"
        >
          <span className="text-base">➕</span>
          <span>复制任务</span>
        </Button>
      </div>
      
      {/* 运行状态条（折叠时显示） */}
      {isCollapsed && hasRunning && (
        <div className={`
          px-4 py-2
          bg-gradient-to-r ${colors.bg}
          border-b ${colors.border}
          text-xs sm:text-sm ${colors.text}
          flex items-center gap-2
        `}>
          <span className="animate-pulse">⏱️</span>
          <span className="font-medium">
            {runningTasks.length}个任务正在计时
          </span>
          <span className="text-gray-500 dark:text-gray-400">
            ({runningTasks.map(t => t.name).join(', ')})
          </span>
        </div>
      )}
    </div>
  );
};

export default CategoryZoneHeader;

