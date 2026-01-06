'use client'

import React, { createContext, useContext, ReactNode } from 'react';
import { TimerTask, TimerCallbacks } from '../types';
import { useTimerControl } from '@/app/hooks/useTimerControl';

/**
 * Timer Context 接口
 * 
 * 提供全局计时器状态管理，消除 props drilling
 */
interface TimerContextValue {
  // 任务列表
  tasks: TimerTask[];
  setTasks: (tasks: TimerTask[] | ((prev: TimerTask[]) => TimerTask[])) => void;
  
  // Timer 控制器（来自 useTimerControl）
  timerControl: ReturnType<typeof useTimerControl>;
  
  // 回调函数
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  onTaskClone?: (task: TimerTask) => void;
  onBeforeOperation?: () => void;
  onRequestAutoStart?: (taskId: string) => void;
}

const TimerContext = createContext<TimerContextValue | undefined>(undefined);

/**
 * Timer Context Provider Props
 */
interface TimerProviderProps {
  children: ReactNode;
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[] | ((prev: TimerTask[]) => TimerTask[])) => void;
  
  // useTimerControl 的配置
  onVersionConflict?: TimerCallbacks['onVersionConflict'];
  onTasksPaused?: TimerCallbacks['onTasksPaused'];
  
  // 其他回调
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  onTaskClone?: (task: TimerTask) => void;
  onBeforeOperation?: () => void;
  onRequestAutoStart?: (taskId: string) => void;
}

/**
 * Timer Context Provider
 * 
 * 在 /log/page.tsx 中使用，包裹整个计时器区域
 * 
 * @example
 * ```tsx
 * <TimerProvider
 *   tasks={timerTasks}
 *   onTasksChange={setTimerTasks}
 *   onVersionConflict={handleVersionConflict}
 *   onTasksPaused={handleTasksPaused}
 *   onOperationRecord={recordOperation}
 *   onRequestAutoStart={handleRequestAutoStart}
 * >
 *   <CategoryZoneWrapper ... />
 * </TimerProvider>
 * ```
 */
export function TimerProvider({
  children,
  tasks,
  onTasksChange,
  onVersionConflict,
  onTasksPaused,
  onOperationRecord,
  onTaskClone,
  onBeforeOperation,
  onRequestAutoStart,
}: TimerProviderProps) {
  // 创建 Timer 控制器
  const timerControl = useTimerControl({
    tasks,
    onTasksChange,
    onVersionConflict,
    onTasksPaused,
  });

  const contextValue: TimerContextValue = {
    tasks,
    setTasks: onTasksChange,
    timerControl,
    onOperationRecord,
    onTaskClone,
    onBeforeOperation,
    onRequestAutoStart,
  };

  return (
    <TimerContext.Provider value={contextValue}>
      {children}
    </TimerContext.Provider>
  );
}

/**
 * 使用 Timer Context
 * 
 * 在任何 TimerProvider 子组件中使用
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { tasks, timerControl, onOperationRecord } = useTimerContext();
 *   
 *   const handleStart = (id: string) => {
 *     timerControl.handleStart(id);
 *     onOperationRecord?.('启动', taskName);
 *   };
 *   
 *   return <div>{tasks.length} 个任务</div>;
 * }
 * ```
 * 
 * @throws {Error} 如果在 TimerProvider 外部使用
 */
export function useTimerContext(): TimerContextValue {
  const context = useContext(TimerContext);
  
  if (context === undefined) {
    throw new Error('useTimerContext must be used within a TimerProvider');
  }
  
  return context;
}

