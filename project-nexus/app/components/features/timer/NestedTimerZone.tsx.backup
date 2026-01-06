'use client'

import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { fetchWithRetry } from '@/lib/fetch-utils';
import { useTimerControl } from '@/app/hooks/useTimerControl';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TimerTask {
  id: string;
  name: string;
  categoryPath: string;
  instanceTag?: string | null; // 事物项标签
  elapsedTime: number;
  initialTime: number;
  isRunning: boolean;
  startTime: number | null;
  isPaused: boolean;
  pausedTime: number;
  parentId?: string | null;
  children?: TimerTask[];
  totalTime?: number; // 包含子任务的总时间
  order?: number; // 排序字段
  version?: number; // 【乐观锁】版本号
  createdAt: string;
  updatedAt: string;
}

interface NestedTimerZoneProps {
  tasks: TimerTask[];
  onTasksChange: (tasks: TimerTask[]) => void;
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  onTaskClone?: (task: TimerTask) => void; // 新增：任务复制创建回调
  onBeforeOperation?: () => void; // 新增：在操作前执行的回调
  groupFilter?: string[]; // 新增：只显示这些ID的任务（用于分组显示）
  level?: number;
  parentId?: string; // 添加父级ID用于区分不同层级的弹框
  collapsedTasks?: Set<string>; // 传递收缩状态
  onToggleCollapse?: (taskId: string) => void; // 传递收缩切换函数
  // 弹框状态管理
  showAddChildDialog?: string | null; // 当前显示的弹框对应的任务ID
  onShowAddChildDialog?: (taskId: string | null) => void; // 显示/隐藏弹框
  newChildName?: string; // 子任务名称
  onNewChildNameChange?: (name: string) => void; // 更新子任务名称
  newChildCategory?: string; // 子任务分类
  onNewChildCategoryChange?: (category: string) => void; // 更新子任务分类
  newChildInitialTime?: string; // 子任务初始时间
  onNewChildInitialTimeChange?: (time: string) => void; // 更新子任务初始时间
  // 【新增】共享的 timer 控制器（用于全局互斥）
  timerControl?: ReturnType<typeof useTimerControl>;
  // 【新增】请求自动启动回调（通过父组件的 pendingStartTaskId 机制）
  onRequestAutoStart?: (taskId: string) => void;
}

const NestedTimerZone: React.FC<NestedTimerZoneProps> = ({ 
  tasks, 
  onTasksChange, 
  onOperationRecord,
  onTaskClone,
  onBeforeOperation,
  groupFilter,
  level = 0,
  collapsedTasks: externalCollapsedTasks,
  onToggleCollapse: externalOnToggleCollapse,
  // 弹框状态
  showAddChildDialog: externalShowAddChildDialog,
  onShowAddChildDialog: externalOnShowAddChildDialog,
  newChildName: externalNewChildName,
  onNewChildNameChange: externalOnNewChildNameChange,
  newChildCategory: externalNewChildCategory,
  onNewChildCategoryChange: externalOnNewChildCategoryChange,
  newChildInitialTime: externalNewChildInitialTime,
  onNewChildInitialTimeChange: externalOnNewChildInitialTimeChange,
  // 【新增】接收外部的 timerControl
  timerControl: externalTimerControl,
  // 【新增】接收自动启动回调
  onRequestAutoStart
}) => {
  // 本地状态作为后备
  const [localShowAddChildDialog, setLocalShowAddChildDialog] = useState<string | null>(null);
  const [localNewChildName, setLocalNewChildName] = useState('');
  const [localNewChildCategory, setLocalNewChildCategory] = useState('');
  const [localNewChildInitialTime, setLocalNewChildInitialTime] = useState('');
  const [localCollapsedTasks, setLocalCollapsedTasks] = useState<Set<string>>(new Set());
  
  // 使用外部状态或本地状态
  const showAddChildDialog = externalShowAddChildDialog !== undefined ? externalShowAddChildDialog : localShowAddChildDialog;
  const setShowAddChildDialog = externalOnShowAddChildDialog || setLocalShowAddChildDialog;
  const newChildName = externalNewChildName !== undefined ? externalNewChildName : localNewChildName;
  const setNewChildName = externalOnNewChildNameChange || setLocalNewChildName;
  const newChildCategory = externalNewChildCategory !== undefined ? externalNewChildCategory : localNewChildCategory;
  const setNewChildCategory = externalOnNewChildCategoryChange || setLocalNewChildCategory;
  const newChildInitialTime = externalNewChildInitialTime !== undefined ? externalNewChildInitialTime : localNewChildInitialTime;
  const setNewChildInitialTime = externalOnNewChildInitialTimeChange || setLocalNewChildInitialTime;
  
  // 使用外部传入的收缩状态，如果没有则使用本地状态
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

  // 【关键修复】使用外部传入的 timerControl（全局互斥），或创建本地的（向后兼容）
  const localTimerControl = useTimerControl({
    tasks,
    onTasksChange,
    // 本地实例不设置回调（由外部 timerControl 提供）
  });
  const timerControl = externalTimerControl || localTimerControl;
  const { startTimer: hookStartTimer, pauseTimer: hookPauseTimer, stopTimer: hookStopTimer, isProcessing } = timerControl;

  // 【新增】工具函数：递归同步任务的 version
  const syncTaskVersion = useCallback((taskList: TimerTask[], taskId: string, newVersion: number): TimerTask[] => {
    return taskList.map(task => {
      if (task.id === taskId) {
        return { ...task, version: newVersion };
      }
      if (task.children && task.children.length > 0) {
        return { ...task, children: syncTaskVersion(task.children, taskId, newVersion) };
      }
      return task;
    });
  }, []);

  // 拖拽传感器配置 - 优化移动端支持
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 增加距离，减少误触
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 150, // 增加延迟，避免误触
        tolerance: 8, // 增加容差
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // 拖拽开始处理函数
  const handleDragStart = (event: DragStartEvent) => {
    // 在移动端提供触觉反馈
    if ('vibrate' in navigator) {
      navigator.vibrate(30); // 轻微震动反馈
    }
    
    // 添加视觉反馈：高亮拖拽手柄
    const activeElement = document.querySelector(`[data-rbd-draggable-id="${event.active.id}"]`);
    if (activeElement) {
      const dragHandle = activeElement.querySelector('[data-drag-handle]');
      if (dragHandle) {
        dragHandle.classList.add('bg-gray-700');
      }
    }
    
  };

  // 拖拽结束处理函数
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    
    // 清理视觉反馈
    const activeElement = document.querySelector(`[data-rbd-draggable-id="${active.id}"]`);
    if (activeElement) {
      const dragHandle = activeElement.querySelector('[data-drag-handle]');
      if (dragHandle) {
        dragHandle.classList.remove('bg-gray-700');
      }
    }

    if (active.id !== over?.id && over) {
      const oldIndex = tasks.findIndex((task) => task.id === active.id);
      const newIndex = tasks.findIndex((task) => task.id === over.id);

      if (oldIndex !== -1 && newIndex !== -1) {
        const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
        
        // 更新任务数组，同时更新每个任务的 order 字段
        const updatedTasks = reorderedTasks.map((task, index) => ({
          ...task,
          order: index
        }));

        // 更新本地状态
        onTasksChange(updatedTasks);

        // 保存排序到数据库（带重试机制）
        try {
          const taskOrders = updatedTasks.map((task, index) => ({
            id: task.id,
            order: index
          }));

          const response = await fetchWithRetry('/api/timer-tasks', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'updateOrder',
              taskOrders: taskOrders
            }),
          });

          if (response.ok) {
            console.log('任务排序已保存到数据库');
          } else {
            const errorText = await response.text();
            console.error('保存排序失败 after retries:', response.status, errorText);
          }
        } catch (error) {
          console.error('保存排序时出错 after all retries:', error);
        }
        
        if (onOperationRecord) {
          onOperationRecord('移动任务', `${tasks[oldIndex]?.name} 移动到位置 ${newIndex + 1}`);
        }
      }
    }
  };

  // 对任务进行排序和过滤
  const sortedTasks = React.useMemo(() => {
    // 如果有 groupFilter，只显示这些任务
    let filteredTasks = tasks;
    if (groupFilter && groupFilter.length > 0) {
      filteredTasks = tasks.filter(t => groupFilter.includes(t.id));
    }
    
    const sorted = [...filteredTasks].sort((a, b) => {
      // 如果两个任务都有order字段且order >= 0，按order排序
      if (a.order !== undefined && b.order !== undefined && a.order >= 0 && b.order >= 0) {
        // 如果order相同，按createdAt降序排序（新任务在前）
        if (a.order === b.order) {
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
        return a.order - b.order;
      }
      // 如果只有一个有有效的order字段，有order的排在前面
      if (a.order !== undefined && a.order >= 0 && (b.order === undefined || b.order < 0)) {
        return -1;
      }
      if (b.order !== undefined && b.order >= 0 && (a.order === undefined || a.order < 0)) {
        return 1;
      }
      // 如果都没有有效的order字段，按创建时间降序排序（新任务在前）
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
    
    return sorted;
  }, [tasks, groupFilter]);

  // 计算任务的当前显示时间（不修改原始数据）
  const getCurrentDisplayTime = (task: TimerTask): number => {
    let displayTime;
    if (task.isRunning && !task.isPaused && task.startTime) {
      const elapsed = Math.floor((Date.now() / 1000 - task.startTime));
      displayTime = task.elapsedTime + elapsed;
    } else {
      displayTime = task.elapsedTime;
    }
    return displayTime;
  };

  // 强制重新渲染组件以更新时间显示
  const [, forceUpdate] = useState({});
  const triggerUpdate = useCallback(() => {
    forceUpdate({});
  }, []);

  // 只用于触发重新渲染，不修改任务数据
  useEffect(() => {
    const hasRunningTask = (taskList: TimerTask[]): boolean => {
      for (const task of taskList) {
        if (task.isRunning && !task.isPaused && task.startTime) {
          return true;
        }
        if (task.children && hasRunningTask(task.children)) {
          return true;
        }
      }
      return false;
    };

    if (hasRunningTask(tasks)) {
      const interval = setInterval(() => {
        // 只在有运行中任务时才触发更新
        if (hasRunningTask(tasks)) {
          triggerUpdate();
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [tasks, triggerUpdate]);

  const deleteTimer = async (taskId: string) => {
    // 操作前保存当前位置
    onBeforeOperation?.();
    const findTask = (taskList: TimerTask[]): TimerTask | null => {
      for (const task of taskList) {
        if (task.id === taskId) return task;
        if (task.children) {
          const found = findTask(task.children);
          if (found) return found;
        }
      }
      return null;
    };

    const task = findTask(tasks);
    if (!task) return;

    const isConfirmed = confirm(`确定要删除任务"${task.name}"吗？\n\n这将永久删除该任务及其所有子任务和计时数据。`);
    if (!isConfirmed) return;

    // 乐观删除：立即更新前端状态
    const removeTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.filter(t => {
        if (t.id === taskId) return false;
        if (t.children) {
          t.children = removeTaskRecursive(t.children);
        }
        return true;
      });
    };

    const updatedTasks = removeTaskRecursive(tasks);
    const previousTasks = tasks; // 保存原始状态，以便失败时恢复
    
    // 立即更新UI
    onTasksChange(updatedTasks);
    
    if (onOperationRecord) {
      onOperationRecord('删除任务', task.name);
    }

    // 异步调用API
    try {
      const response = await fetchWithRetry(`/api/timer-tasks?id=${taskId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete API error after retries:', response.status, errorText);
        throw new Error(`Failed to delete task: ${response.status} ${errorText}`);
      }
      
      // 删除成功，不需要额外操作
    } catch (error) {
      console.error('Failed to delete timer:', error);
      // 删除失败，恢复原始状态
      onTasksChange(previousTasks);
      alert(`删除失败: ${error instanceof Error ? error.message : '未知错误'}\n已恢复任务。`);
    }
  };

  const addChildTask = async (parentId: string) => {
    if (!newChildName.trim()) {
      alert('请输入任务名称');
      return;
    }

    const initialTimeInSeconds = newChildInitialTime ? parseInt(newChildInitialTime, 10) * 60 : 0;

    // 找到父任务，获取其子任务数量来确定新任务的order
    const findParentTask = (taskList: TimerTask[]): TimerTask | null => {
      for (const task of taskList) {
        if (task.id === parentId) return task;
        if (task.children) {
          const found = findParentTask(task.children);
          if (found) return found;
        }
      }
      return null;
    };

    const parentTask = findParentTask(tasks);
    // const existingChildrenCount = parentTask?.children?.length || 0;
    
    // 计算新任务的order值：现有子任务的最大order值 + 1，如果没有子任务则为0
    const maxOrder = parentTask?.children && parentTask.children.length > 0 
      ? Math.max(...parentTask.children.map(child => child.order || 0))
      : -1;
    const newOrder = maxOrder + 1;
    
    // 创建临时任务对象用于乐观更新
    // 创建临时任务，默认自动开始计时
    const currentTime = Math.floor(Date.now() / 1000);
    const tempTask: TimerTask = {
      id: `temp-${Date.now()}`, // 临时ID
      name: newChildName.trim(),
      categoryPath: newChildCategory.trim() || '未分类',
      elapsedTime: initialTimeInSeconds,
      initialTime: initialTimeInSeconds,
      isRunning: false, // 初始不运行，通过互斥逻辑启动
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      parentId: parentId,
      children: [],
      order: newOrder, // 设置为正确的order值，确保新任务显示在最下面
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // 立即更新UI（乐观更新）
    const addChildRecursive = (taskList: TimerTask[]): TimerTask[] => {
      return taskList.map(task => {
        if (task.id === parentId) {
          return {
            ...task,
            children: [...(task.children || []), tempTask]
          };
        }
        if (task.children) {
          return { ...task, children: addChildRecursive(task.children) };
        }
        return task;
      });
    };

    const updatedTasks = addChildRecursive(tasks);
    onTasksChange(updatedTasks);
    
    // 重置表单
    setNewChildName('');
    setNewChildCategory('');
    setNewChildInitialTime('');
    setShowAddChildDialog(null);
    
    // 记录操作
    if (onOperationRecord) {
      onOperationRecord('创建子任务', newChildName.trim());
    }

    // 异步处理数据库操作（带重试机制）
    let retryCount = 0;
    console.log('📤 创建子任务请求:', {
      name: newChildName.trim(),
      categoryPath: newChildCategory.trim() || '未分类',
      parentId,
      date: new Date().toISOString().split('T')[0],
      initialTime: initialTimeInSeconds,
      isRunning: false,
      startTime: null,
      order: newOrder
    });
    
    try {
      const response = await fetchWithRetry(
        '/api/timer-tasks',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: newChildName.trim(),
            categoryPath: newChildCategory.trim() || '未分类',
            parentId: parentId,
            date: new Date().toISOString().split('T')[0],
            initialTime: initialTimeInSeconds,
            elapsedTime: initialTimeInSeconds,
            isRunning: false, // 初始不运行，通过互斥逻辑启动
            startTime: null,
            isPaused: false,
            pausedTime: 0,
            order: newOrder
          }),
        },
        3,
        (attempt, error) => {
          retryCount = attempt;
          console.warn(`创建子任务重试 ${attempt}/3:`, error.message);
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ 子任务创建失败:', errorText);
        throw new Error(`创建失败 (${response.status}): ${errorText}`);
      }

      const newTask = await response.json();
      console.log('✅ 子任务创建成功:', newTask);

      // 用真实的任务数据替换临时任务
      const replaceTempTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              children: task.children?.map(child => 
                child.id === tempTask.id ? newTask : child
              ) || []
            };
          }
          if (task.children) {
            return { ...task, children: replaceTempTaskRecursive(task.children) };
          }
          return task;
        });
      };

      const finalTasks = replaceTempTaskRecursive(updatedTasks);
      onTasksChange(finalTasks);
      
      console.log('✅ 子任务创建成功:', newTask.name);
      
      // 通过父组件的 pendingStartTaskId 机制自动启动（推荐）
      if (onRequestAutoStart) {
        console.log('📤 [子任务] 请求父组件自动启动:', newTask.id);
        onRequestAutoStart(newTask.id);
      } else if (timerControl) {
        // 降级方案：直接使用 timerControl（保留向后兼容，但可能有状态同步问题）
        console.warn('⚠️ [子任务] onRequestAutoStart 未提供，使用降级方案');
        setTimeout(async () => {
          const result = await timerControl.startTimer(newTask.id);
          if (result.success) {
            console.log('✅ 子任务自动启动成功:', newTask.name);
            if (onOperationRecord) {
              onOperationRecord('开始计时', newTask.name, '子任务自动开始');
            }
          } else {
            console.error('❌ 子任务自动启动失败:', result.reason);
          }
        }, 300);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : '未知错误';
      console.error('❌ 子任务创建失败（已重试3次）:', errorMsg);
      
      // 如果数据库操作失败，回滚UI状态
      const removeTempTaskRecursive = (taskList: TimerTask[]): TimerTask[] => {
        return taskList.map(task => {
          if (task.id === parentId) {
            return {
              ...task,
              children: task.children?.filter(child => child.id !== tempTask.id) || []
            };
          }
          if (task.children) {
            return { ...task, children: removeTempTaskRecursive(task.children) };
          }
          return task;
        });
      };

      const rolledBackTasks = removeTempTaskRecursive(updatedTasks);
      onTasksChange(rolledBackTasks);
      
      alert(`创建子任务失败（已重试${retryCount}次）：\n${errorMsg}\n\n请检查网络连接或查看控制台日志。`);
    }
  };

  const calculateTotalTime = (task: TimerTask): number => {
    let total = getCurrentDisplayTime(task);
    let childrenTotal = 0;
    
    if (task.children && task.children.length > 0) {
      task.children.forEach(child => {
        const childTime = calculateTotalTime(child);
        childrenTotal += childTime;
      });
    }
    
    total += childrenTotal;
    
    return total;
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h${minutes > 0 ? `${minutes}m` : ''}`;
    } else {
      return `${minutes}m`;
    }
  };

  const formatDisplayTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hours > 0) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  // 可拖拽的任务项组件
  const SortableTaskItem: React.FC<{ task: TimerTask }> = ({ task }) => {
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

    const totalTime = calculateTotalTime(task);
    const hasChildren = task.children && task.children.length > 0;
    const isCollapsed = collapsedTasks.has(task.id);
    const hasInstanceTag = task.instanceTag && task.instanceTag.trim() !== '';
    const indentStyle = { marginLeft: `${level * 20}px` };

    return (
      <div ref={setNodeRef} style={{ ...style, ...indentStyle }} {...attributes}>
        <Card 
          className={`transition-all duration-200 mb-3 text-white ${
            // 基础背景色 - 使用明确的颜色值避免DarkReader问题
            hasInstanceTag ? 'bg-slate-800' : 'bg-gray-900'
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
            // 移动端优化：改善触摸体验
            userSelect: 'none', // 防止文本选择
            WebkitUserSelect: 'none',
            MozUserSelect: 'none',
            msUserSelect: 'none',
            // 确保拖拽区域有足够的触摸目标
            minHeight: '44px', // iOS 推荐的最小触摸目标
            // 改善拖拽体验
            WebkitTapHighlightColor: 'transparent',
            // 确保拖拽时不会触发其他手势
            overscrollBehavior: 'none'
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
                    // 移动端优化：确保触摸目标足够大
                    minWidth: '44px',
                    minHeight: '44px',
                    touchAction: 'none', // 防止默认触摸行为干扰拖拽
                    // 确保拖拽手柄区域不会触发其他手势
                    WebkitTapHighlightColor: 'transparent',
                  }}
                  title="拖拽重新排序"
                >
                  <div className="flex gap-1">
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                    <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  </div>
                </div>
              </div>

              {/* 桌面端拖拽手柄 - 左侧 */}
              <div 
                {...listeners}
                data-drag-handle
                className="hidden md:flex flex-shrink-0 cursor-grab active:cursor-grabbing p-2 -m-2 rounded-lg hover:bg-gray-800/50 transition-colors duration-200 items-center justify-center"
                style={{
                  // 移动端优化：确保触摸目标足够大
                  minWidth: '44px',
                  minHeight: '44px',
                  touchAction: 'none', // 防止默认触摸行为干扰拖拽
                  // 确保拖拽手柄区域不会触发其他手势
                  WebkitTapHighlightColor: 'transparent',
                }}
                title="拖拽重新排序"
              >
                <div className="flex flex-col gap-1">
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                  <div className="w-1 h-1 bg-gray-400 rounded-full"></div>
                </div>
              </div>

              <div className="flex-1 min-w-0 flex flex-col items-center md:items-start text-center md:text-left">
                <div className="flex items-center justify-center md:justify-start gap-2 mb-1 flex-wrap w-full">
                  {hasChildren && (
                    <Button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleCollapse(task.id);
                      }}
                      variant="ghost"
                      size="sm"
                      className={`p-1 h-6 w-6 flex-shrink-0 ${
                        hasInstanceTag 
                          ? "text-orange-400 hover:text-orange-300 hover:bg-orange-400/20" 
                          : "text-green-400 hover:text-green-300 hover:bg-green-400/20"
                      }`}
                      title={isCollapsed ? "展开子任务" : "收缩子任务"}
                    >
                      {isCollapsed ? "▶" : "▼"}
                    </Button>
                  )}
                  <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    hasChildren 
                      ? (hasInstanceTag ? 'bg-orange-400' : 'bg-green-400')
                      : (hasInstanceTag ? 'bg-orange-300' : 'bg-gray-400')
                  }`}></div>
                  <h3 className="font-medium text-white break-words min-w-0 flex-1 text-sm md:text-base">
                    {/* 始终显示任务名称作为主标题 */}
                    {task.name}
                    {hasInstanceTag && (
                      <span className="text-xs text-orange-300 ml-2">
                        🏷️ {task.instanceTag}
                      </span>
                    )}
                    {hasChildren && (
                      <span className={`text-xs ml-2 ${
                        hasInstanceTag ? 'text-orange-300' : 'text-green-400'
                      }`}>
                        ({task.children!.length}个子任务)
                      </span>
                    )}
                  </h3>
                </div>
                <p className="text-xs md:text-sm text-gray-300 break-words truncate w-full">
                  {task.categoryPath}
                </p>
                <div className={`text-base md:text-lg font-mono mt-1 w-full ${
                  hasInstanceTag ? 'text-orange-300' : 'text-blue-400'
                }`}>
                  {formatDisplayTime(getCurrentDisplayTime(task))}
                  {task.initialTime > 0 && task.elapsedTime === task.initialTime && (
                    <span className="text-xs text-gray-400 ml-2">(预设时间)</span>
                  )}
                </div>
                {hasChildren && (
                  <div className={`text-xs md:text-sm mt-1 w-full ${
                    hasInstanceTag ? 'text-orange-300' : 'text-green-400'
                  }`}>
                    总计: {formatTime(totalTime)}
                  </div>
                )}
              </div>
              
              <div 
                className="flex gap-1.5 md:gap-2 md:ml-4 flex-shrink-0 flex-wrap justify-center md:justify-end group-hover:show-secondary-buttons" 
                style={{ 
                  zIndex: 10,
                  // 确保按钮区域不会干扰拖拽
                  touchAction: 'manipulation',
                  // 防止按钮区域触发拖拽
                  pointerEvents: 'auto'
                }}
                onClick={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onTouchStart={(e) => {
                  e.stopPropagation();
                  // 注意：不能在这里调用 preventDefault()，因为事件监听器是 passive 的
                  // 拖拽库会自动处理触摸事件
                }}
              >
                {/* 主要按钮：始终可见 */}
                {task.isRunning ? (
                  task.isPaused ? (
                    <Button 
                      onClick={() => hookStartTimer(task.id)}
                      disabled={isProcessing}
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
                  <Button 
                    onClick={() => hookPauseTimer(task.id)}
                    disabled={isProcessing}
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
                  <Button 
                    onClick={() => hookStartTimer(task.id)}
                    disabled={isProcessing}
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
                
                {/* 次要按钮：始终显示 */}
                <Button 
                  onClick={() => setShowAddChildDialog(task.id)}
                  variant="outline"
                  size="sm"
                  title="添加子任务"
                  className={`text-xs md:text-sm px-2 md:px-3 py-1.5 md:py-2 h-auto min-w-[32px] md:min-w-[36px] ${
                    hasInstanceTag 
                      ? "border-orange-300 text-orange-300 hover:bg-orange-800" 
                      : "border-green-300 text-green-600 hover:bg-green-50"
                  }`}
                >
                  ➕
                </Button>
                
                <Button 
                  onClick={() => deleteTimer(task.id)}
                  variant="outline"
                  size="sm"
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
            </div>
          </CardContent>
        </Card>

        {/* 递归渲染子任务 */}
        {hasChildren && !isCollapsed && (
          <NestedTimerZone
            tasks={task.children!}
            onTasksChange={(updatedChildren) => {
              const updateChildrenRecursive = (taskList: TimerTask[]): TimerTask[] => {
                return taskList.map(t => {
                  if (t.id === task.id) {
                    return { ...t, children: updatedChildren };
                  }
                  if (t.children) {
                    return { ...t, children: updateChildrenRecursive(t.children) };
                  }
                  return t;
                });
              };
              onTasksChange(updateChildrenRecursive(tasks));
            }}
            onOperationRecord={onOperationRecord}
            onTaskClone={onTaskClone}
            level={level + 1}
            parentId={task.id}
            collapsedTasks={collapsedTasks}
            onToggleCollapse={onToggleCollapse}
            // 传递弹框状态
            showAddChildDialog={showAddChildDialog}
            onShowAddChildDialog={setShowAddChildDialog}
            newChildName={newChildName}
            onNewChildNameChange={setNewChildName}
            newChildCategory={newChildCategory}
            onNewChildCategoryChange={setNewChildCategory}
            newChildInitialTime={newChildInitialTime}
            onNewChildInitialTimeChange={setNewChildInitialTime}
            timerControl={timerControl}
            onRequestAutoStart={onRequestAutoStart}
          />
        )}
      </div>
    );
  };


  if (tasks.length === 0) {
    return (
      <Card className="bg-gray-800/30">
        <CardContent className="p-6 text-center">
          <p className="text-gray-400">暂无计时任务</p>
          <p className="text-sm text-gray-400 mt-2">请先点击右上角的&ldquo;添加顶级任务&rdquo;按钮创建任务</p>
          <div className="mt-4 p-3 bg-blue-900/30 border border-blue-700/50 rounded-lg">
            <p className="text-sm text-blue-300 font-medium">💡 嵌套功能提示：</p>
            <p className="text-xs text-blue-400 mt-1">
              创建任务后，每个任务卡片右侧都有&ldquo;➕ 添加子任务&rdquo;按钮，点击可以创建无限层级的子任务
            </p>
          </div>
          <div className="mt-4 p-3 bg-yellow-900/30 border border-yellow-700/50 rounded-lg">
            <p className="text-sm text-yellow-300 font-medium">📋 使用步骤：</p>
            <ol className="text-xs text-yellow-400 mt-1 ml-4 list-decimal">
              <li>点击右上角&ldquo;添加顶级任务&rdquo;按钮</li>
              <li>输入任务名称创建任务</li>
              <li>在任务卡片右侧找到绿色&ldquo;➕ 添加子任务&rdquo;按钮</li>
              <li>点击即可创建子任务，实现无限嵌套</li>
              <li>长按拖拽手柄可重新排序（手机端在顶部，桌面端在左侧）</li>
            </ol>
          </div>
          <div className="mt-4 p-3 bg-green-900/30 border border-green-700/50 rounded-lg">
            <p className="text-sm text-green-300 font-medium">📱 手机端拖拽提示：</p>
            <p className="text-xs text-green-400 mt-1">
              在手机上，长按任务卡片顶部的拖拽手柄（六个小圆点）约0.1秒后即可开始拖拽重新排序。拖拽时会有轻微震动反馈。
            </p>
          </div>
        </CardContent>
      </Card>
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
          touchAction: 'pan-y pinch-zoom',
          WebkitOverflowScrolling: 'touch',
          // 确保滚动容器不会干扰拖拽
          overscrollBehavior: 'contain',
          // 优化滚动性能
          scrollBehavior: 'smooth',
          // 防止滚动边界反弹
          overscrollBehaviorY: 'contain'
        }}
      >
        <SortableContext items={sortedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
          {sortedTasks.map((task) => (
            <SortableTaskItem key={task.id} task={task} />
          ))}
        </SortableContext>

        {/* 添加子任务弹框 - 只在顶级层级显示 */}
        {level === 0 && (
          <Dialog open={!!showAddChildDialog} onOpenChange={(open) => !open && setShowAddChildDialog(null)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>添加子任务</DialogTitle>
              </DialogHeader>
              <div className="py-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    任务名称
                  </label>
                  <Input
                    value={newChildName}
                    onChange={(e) => setNewChildName(e.target.value)}
                    placeholder="输入子任务名称..."
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类 (可选)
                  </label>
                  <Input
                    value={newChildCategory}
                    onChange={(e) => setNewChildCategory(e.target.value)}
                    placeholder="输入分类..."
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    初始时间 (分钟, 可选)
                  </label>
                  <Input
                    type="number"
                    value={newChildInitialTime}
                    onChange={(e) => setNewChildInitialTime(e.target.value)}
                    placeholder="例如: 30"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setShowAddChildDialog(null)}>
                  取消
                </Button>
                <Button variant="outline" size="sm" onClick={() => showAddChildDialog && addChildTask(showAddChildDialog)}>
                  ➕ 添加子任务
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </DndContext>
  );
};

export default NestedTimerZone;



