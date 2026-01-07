/**
 * @file taskService.ts
 * @description 统一任务服务 - 抽象父子任务的通用操作逻辑
 * @created 2025-12-16
 * 
 * 解决的问题：
 * - 父任务和子任务创建逻辑分散在不同组件
 * - 每次新增功能都需要在多处分别处理
 * - 递归操作代码重复
 * 
 * 设计原则：
 * - 统一的任务操作接口
 * - 自动处理父子任务差异
 * - 支持乐观更新和回滚
 */

import { timerAPI } from '../api/timerAPI';
import type { TimerTask } from '../types';

// ============ 类型定义 ============

export interface CreateTaskOptions {
  name: string;
  categoryPath: string;
  initialTime?: number;        // 秒
  instanceTagNames?: string[];
  parentId?: string | null;
  userId: string;
  date: string;
  autoStart?: boolean;
  order?: number;
}

export interface TaskServiceCallbacks {
  onTasksChange: (tasks: TimerTask[]) => void;
  onRequestAutoStart?: (taskId: string) => void;
  onOperationRecord?: (action: string, taskName: string, details?: string) => void;
  onBeforeOperation?: () => void;
}

// ============ 递归工具函数 ============

/**
 * 递归查找任务
 */
export function findTaskById(taskList: TimerTask[], taskId: string): TimerTask | null {
  for (const task of taskList) {
    if (task.id === taskId) return task;
    if (task.children) {
      const found = findTaskById(task.children, taskId);
      if (found) return found;
    }
  }
  return null;
}

/**
 * 递归更新任务
 */
export function updateTaskInList(
  taskList: TimerTask[],
  taskId: string,
  updater: (task: TimerTask) => TimerTask
): TimerTask[] {
  return taskList.map(task => {
    if (task.id === taskId) {
      return updater(task);
    }
    if (task.children) {
      return { ...task, children: updateTaskInList(task.children, taskId, updater) };
    }
    return task;
  });
}

/**
 * 递归删除任务
 */
export function removeTaskFromList(taskList: TimerTask[], taskId: string): TimerTask[] {
  return taskList.filter(task => {
    if (task.id === taskId) return false;
    if (task.children) {
      task.children = removeTaskFromList(task.children, taskId);
    }
    return true;
  });
}

/**
 * 递归添加子任务
 */
export function addChildToParent(
  taskList: TimerTask[],
  parentId: string,
  childTask: TimerTask
): TimerTask[] {
  return taskList.map(task => {
    if (task.id === parentId) {
      return {
        ...task,
        children: [...(task.children || []), childTask]
      };
    }
    if (task.children) {
      return { ...task, children: addChildToParent(task.children, parentId, childTask) };
    }
    return task;
  });
}

/**
 * 递归替换任务（用于替换临时ID）
 */
export function replaceTaskInList(
  taskList: TimerTask[],
  oldTaskId: string,
  newTask: TimerTask
): TimerTask[] {
  return taskList.map(task => {
    if (task.id === oldTaskId) {
      return newTask;
    }
    if (task.children) {
      return { ...task, children: replaceTaskInList(task.children, oldTaskId, newTask) };
    }
    return task;
  });
}

/**
 * 获取所有运行中的任务（递归）
 */
export function getRunningTasks(taskList: TimerTask[]): TimerTask[] {
  const running: TimerTask[] = [];
  for (const task of taskList) {
    if (task.isRunning && !task.isPaused) {
      running.push(task);
    }
    if (task.children) {
      running.push(...getRunningTasks(task.children));
    }
  }
  return running;
}

// ============ 统一任务服务 ============

export const taskService = {
  /**
   * 创建任务（统一处理父任务和子任务）
   * 
   * @param tasks - 当前任务列表
   * @param options - 创建选项
   * @param callbacks - 回调函数
   * @returns 创建的任务
   */
  async create(
    tasks: TimerTask[],
    options: CreateTaskOptions,
    callbacks: TaskServiceCallbacks
  ): Promise<TimerTask | null> {
    const {
      name,
      categoryPath,
      initialTime = 0,
      instanceTagNames = [],
      parentId,
      userId,
      date,
      autoStart = false,
      order
    } = options;

    const { onTasksChange, onRequestAutoStart, onOperationRecord, onBeforeOperation } = callbacks;

    // 触发操作前回调
    onBeforeOperation?.();

    // 如果是子任务，获取父任务信息
    let finalCategoryPath = categoryPath;
    let finalOrder = order;

    if (parentId) {
      const parentTask = findTaskById(tasks, parentId);
      if (!parentTask) {
        console.error('❌ [taskService.create] 未找到父任务:', parentId);
        return null;
      }
      // 子任务继承父任务的分类路径
      finalCategoryPath = parentTask.categoryPath;
      // 子任务的顺序基于现有子任务数量
      finalOrder = (parentTask.children || []).length;
    }

    // 创建临时任务（乐观更新）
    const tempId = `temp-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const tempTask: TimerTask = {
      id: tempId,
      name,
      categoryPath: finalCategoryPath,
      instanceTag: instanceTagNames.length > 0 ? instanceTagNames.join(',') : null,
      initialTime,
      elapsedTime: initialTime,
      isRunning: false,
      startTime: null,
      isPaused: false,
      pausedTime: 0,
      parentId: parentId || null,
      order: finalOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      date: date || new Date().toISOString().split('T')[0],
    };

    // 乐观更新 UI
    let updatedTasks: TimerTask[];
    if (parentId) {
      updatedTasks = addChildToParent(tasks, parentId, tempTask);
    } else {
      updatedTasks = [...tasks, tempTask];
    }
    onTasksChange(updatedTasks);

    // 记录操作
    onOperationRecord?.(parentId ? '添加子任务' : '创建任务', name);

    try {
      // 调用 API 创建任务
      const newTask = await timerAPI.createTask({
        name,
        categoryPath: finalCategoryPath,
        initialTime,
        elapsedTime: initialTime,  // 初始已用时间等于初始时间
        instanceTag: instanceTagNames.length > 0 ? instanceTagNames.join(',') : null,
        parentId: parentId || undefined,
        userId,
        date,
        order: finalOrder,
      });

      // 替换临时任务为真实任务
      const finalTasks = replaceTaskInList(updatedTasks, tempId, newTask);
      onTasksChange(finalTasks);

      console.log('✅ [taskService.create] 成功:', newTask.name, newTask.id);

      // 自动开始计时
      if (autoStart && onRequestAutoStart) {
        console.log('📝 [taskService.create] 请求自动启动:', newTask.id);
        onRequestAutoStart(newTask.id);
      }

      return newTask;
    } catch (error) {
      console.error('❌ [taskService.create] 失败:', error);

      // 回滚：移除临时任务
      const rolledBackTasks = removeTaskFromList(updatedTasks, tempId);
      onTasksChange(rolledBackTasks);

      throw error;
    }
  },

  /**
   * 删除任务（统一处理父任务和子任务）
   */
  async delete(
    tasks: TimerTask[],
    taskId: string,
    callbacks: TaskServiceCallbacks,
    skipConfirm = false
  ): Promise<boolean> {
    const { onTasksChange, onOperationRecord, onBeforeOperation } = callbacks;

    onBeforeOperation?.();

    const task = findTaskById(tasks, taskId);
    if (!task) {
      console.error('❌ [taskService.delete] 未找到任务:', taskId);
      return false;
    }

    // 确认删除
    if (!skipConfirm) {
      const hasChildren = task.children && task.children.length > 0;
      const message = hasChildren
        ? `确定要删除任务"${task.name}"吗？\n\n这将永久删除该任务及其 ${task.children!.length} 个子任务。`
        : `确定要删除任务"${task.name}"吗？`;

      if (!confirm(message)) {
        return false;
      }
    }

    // 乐观更新
    const previousTasks = tasks;
    const updatedTasks = removeTaskFromList(tasks, taskId);
    onTasksChange(updatedTasks);

    onOperationRecord?.('删除任务', task.name);

    try {
      await timerAPI.deleteTask(taskId);
      console.log('✅ [taskService.delete] 成功:', task.name);
      return true;
    } catch (error) {
      console.error('❌ [taskService.delete] 失败:', error);
      // 回滚
      onTasksChange(previousTasks);
      throw error;
    }
  },

  // 导出工具函数供外部使用
  utils: {
    findTaskById,
    updateTaskInList,
    removeTaskFromList,
    addChildToParent,
    replaceTaskInList,
    getRunningTasks,
  }
};

export default taskService;
