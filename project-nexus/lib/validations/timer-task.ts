import { z } from 'zod'

/**
 * 创建计时任务 Schema
 */
export const createTimerTaskSchema = z.object({
  name: z
    .string()
    .min(1, '任务名称不能为空')
    .max(200, '任务名称不能超过200字符'),
  
  categoryPath: z
    .string()
    .max(500, '分类路径不能超过500字符')
    .default('未分类'),
  
  parentId: z
    .string()
    .nullable()
    .optional(),
  
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  
  elapsedTime: z
    .number()
    .int('运行时间必须是整数')
    .min(0, '运行时间不能为负数')
    .default(0),
  
  initialTime: z
    .number()
    .int('初始时间必须是整数')
    .min(0, '初始时间不能为负数')
    .default(0),
  
  instanceTag: z
    .string()
    .max(100, '事务标签不能超过100字符')
    .nullable()
    .optional(),
  
  // 运行状态相关字段
  isRunning: z.boolean().optional(),
  
  startTime: z
    .number()
    .int('开始时间必须是整数')
    .nullable()
    .optional(),
  
  isPaused: z.boolean().optional(),
  
  pausedTime: z
    .number()
    .int('暂停时间必须是整数')
    .min(0, '暂停时间不能为负数')
    .optional(),
  
  // 排序字段
  order: z
    .number()
    .int('排序必须是整数')
    .optional(),
  
  // 用户ID
  userId: z.string().optional(),
  
  // 事务项名称数组
  instanceTagNames: z.array(z.string()).optional(),
  
  // 完成时间
  completedAt: z.string().nullable().optional(),
}).passthrough() // 允许额外的字段通过，提高容错性

/**
 * 更新计时任务 Schema
 */
export const updateTimerTaskSchema = z.object({
  name: z
    .string()
    .min(1, '任务名称不能为空')
    .max(200, '任务名称不能超过200字符')
    .optional(),
  
  categoryPath: z
    .string()
    .max(500, '分类路径不能超过500字符')
    .optional(),
  
  elapsedTime: z
    .number()
    .int('运行时间必须是整数')
    .min(0, '运行时间不能为负数')
    .optional(),
  
  isRunning: z.boolean().optional(),
  
  isPaused: z.boolean().optional(),
  
  pausedTime: z
    .number()
    .int('暂停时间必须是整数')
    .min(0, '暂停时间不能为负数')
    .optional(),
  
  instanceTag: z
    .string()
    .max(100, '事务标签不能超过100字符')
    .nullable()
    .optional(),
}).passthrough()

/**
 * 类型导出
 */
export type CreateTimerTaskInput = z.infer<typeof createTimerTaskSchema>
export type UpdateTimerTaskInput = z.infer<typeof updateTimerTaskSchema>

