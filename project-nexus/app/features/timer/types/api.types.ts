/**
 * @file api.types.ts
 * @description 计时器 API 请求/响应类型定义
 * @created 2025-11-02
 */

import type { TimerTask } from '@dashboard/shared';

/**
 * 创建任务请求
 */
export interface CreateTaskRequest {
  name: string;
  categoryPath: string;
  instanceTag?: string | null;
  initialTime: number;
  elapsedTime?: number;  // 初始已用时间，通常等于 initialTime
  userId: string;
  date: string;
  parentId?: string | null;
  autoStart?: boolean;
  order?: number;
}

/**
 * 更新任务请求
 */
export interface UpdateTaskRequest {
  id: string;
  version?: number;
  elapsedTime?: number;
  isRunning?: boolean;
  isPaused?: boolean;
  startTime?: number | null;
  pausedTime?: number;
  name?: string;
  categoryPath?: string;
  instanceTag?: string | null;
  order?: number;
  initialTime?: number;
}

/**
 * 删除任务请求
 */
export interface DeleteTaskRequest {
  id: string;
  version?: number;
}

/**
 * 批量更新任务顺序请求
 */
export interface BatchUpdateOrderRequest {
  updates: Array<{
    id: string;
    order: number;
  }>;
}

/**
 * 任务响应（单个任务）
 */
export type TaskResponse = TimerTask;

/**
 * 任务列表响应
 */
export interface TaskListResponse {
  tasks: TimerTask[];
  total?: number;
}

/**
 * 任务操作响应（成功）
 */
export interface TaskOperationResponse {
  success: boolean;
  task?: TimerTask;
  message?: string;
}

/**
 * 批量操作响应
 */
export interface BatchOperationResponse {
  success: boolean;
  updated: number;
  failed: number;
  errors?: Array<{
    id: string;
    error: string;
  }>;
}

/**
 * 版本冲突错误
 */
export interface VersionConflictError {
  code: 'VERSION_CONFLICT';
  message: string;
  currentVersion: number;
  requestVersion: number;
}

/**
 * API 错误响应
 */
export interface APIErrorResponse {
  error: string;
  message: string;
  statusCode: number;
  details?: unknown;
}

