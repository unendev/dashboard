'use client'

import React from 'react';
import { useTimerControl } from '@/app/hooks/useTimerControl';
import { TimerProvider } from '@/app/features/timer/context/TimerContext';
import NestedTimerZone from '@/app/components/features/timer/NestedTimerZone';
import CategoryZoneWrapper from '@/app/components/features/timer/CategoryZoneWrapper';
import { TimerTask } from '@/app/features/timer/types';
import { QuickCreateData } from '@/app/components/features/timer/QuickCreateDialog';

interface TimerSectionProps {
  // 数据
  tasks: TimerTask[];
  userId: string;
  selectedDate: string;
  
  // 布局
  isMobile: boolean;
  className?: string;
  
  // 回调
  onTasksChange: (tasks: TimerTask[] | ((prev: TimerTask[]) => TimerTask[])) => void;
  onDateChange: (date: string) => void;
  onQuickCreate: (data: QuickCreateData) => Promise<void>;
  onVersionConflict: () => void;
  onTasksPaused: (tasks: Array<{ id: string; name: string }>) => void;
  onOperationRecord: (action: string, taskName: string, details?: string) => void;
  onRequestAutoStart: (taskId: string) => void;
  
  // Timer 控制
  timerControl: ReturnType<typeof useTimerControl>;
  
  // 滚动控制
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
  onSaveScrollPosition?: () => void;
  onSaveScrollPositionNow?: () => void;
}

/**
 * 计时器区域组件
 * 
 * 支持移动端和桌面端布局，包含：
 * - 日期选择器
 * - Timer 任务列表
 * - 快速创建功能
 * - 滚动位置管理
 */
export function TimerSection({
  tasks,
  userId,
  selectedDate,
  isMobile,
  className = '',
  onTasksChange,
  onDateChange,
  onQuickCreate,
  onVersionConflict,
  onTasksPaused,
  onOperationRecord,
  onRequestAutoStart,
  timerControl,
  scrollContainerRef,
  onSaveScrollPosition,
  onSaveScrollPositionNow,
}: TimerSectionProps) {
  return (
    <section className={`h-full flex flex-col ${isMobile ? 'px-4 py-6 min-h-[650px]' : 'border-r border-white/5 min-h-screen'} ${className}`}>
        {/* 日期选择器（移动端） */}
        {isMobile && (
          <div className="mb-4 pb-3 border-b border-white/10">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-xl font-bold text-white flex items-center gap-3">
                <span className="text-2xl">⏱️</span>
                计时器
              </h3>
              {/* 单天日期选择器 */}
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-300">日期:</label>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => onDateChange(e.target.value)}
                  max={new Date().toISOString().split('T')[0]}
                  className="border border-white/10 bg-gray-900/40 backdrop-blur-sm rounded px-2 py-1 text-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
                />
              </div>
            </div>
          </div>
        )}
        
        {/* Timer 任务列表 */}
        <div
          ref={scrollContainerRef}
          onScroll={onSaveScrollPosition}
          className={isMobile ? 'max-h-[600px] overflow-y-auto' : 'flex-1 overflow-y-auto'}
        style={isMobile ? {
          touchAction: 'pan-y',
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          scrollBehavior: 'smooth'
        } : undefined}
      >
        <TimerProvider
          tasks={tasks}
          onTasksChange={onTasksChange}
          onVersionConflict={onVersionConflict}
          onTasksPaused={onTasksPaused}
          onOperationRecord={onOperationRecord}
          onRequestAutoStart={onRequestAutoStart}
        >
          <CategoryZoneWrapper
            tasks={tasks}
            userId={userId}
            onQuickCreate={onQuickCreate}
            onBeforeOperation={onSaveScrollPositionNow}
            selectedDate={selectedDate}
            renderTaskList={(groupTasks, onTaskClone, onBeforeOperation) => (
              <NestedTimerZone
                tasks={tasks}
                onTasksChange={onTasksChange}
                onOperationRecord={onOperationRecord}
                onTaskClone={onTaskClone}
                groupFilter={groupTasks.map(t => t.id)}
                onBeforeOperation={onBeforeOperation}
                timerControl={timerControl}
                onRequestAutoStart={onRequestAutoStart}
              />
            )}
          />
        </TimerProvider>
      </div>
    </section>
  );
}






