/**
 * @file index.ts
 * @description 计时器类型统一导出
 * @created 2025-11-02
 */

// 核心类型
export type {
  TimerTask,
  CategoryGroup,
  TimerCallbacks,
  TimerControl,
  QuickCreateData,
} from '@dashboard/shared';

// API 类型
export type {
  CreateTaskRequest,
  UpdateTaskRequest,
  DeleteTaskRequest,
  BatchUpdateOrderRequest,
  TaskResponse,
  TaskListResponse,
  TaskOperationResponse,
  BatchOperationResponse,
  VersionConflictError,
  APIErrorResponse,
} from './api.types';

