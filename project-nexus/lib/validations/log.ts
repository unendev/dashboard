import { z } from 'zod'

/**
 * 日志活动 Schema
 */
const LogActivitySchema = z.object({
  name: z
    .string()
    .min(1, '活动名称不能为空')
    .max(200, '活动名称不能超过200字符'),
  
  duration: z
    .string()
    .max(50, '活动时长格式不能超过50字符'),
})

/**
 * 日志子分类 Schema
 */
const LogSubCategorySchema = z.object({
  name: z
    .string()
    .min(1, '子分类名称不能为空')
    .max(100, '子分类名称不能超过100字符'),
  
  activities: z
    .array(LogActivitySchema)
    .max(50, '活动数量不能超过50个')
    .default([]),
})

/**
 * 日志分类 Schema
 */
const LogCategorySchema = z.object({
  name: z
    .string()
    .min(1, '分类名称不能为空')
    .max(100, '分类名称不能超过100字符'),
  
  subCategories: z
    .array(LogSubCategorySchema)
    .max(20, '子分类数量不能超过20个')
    .default([]),
})

/**
 * 创建日志 Schema
 */
export const createLogSchema = z.object({
  content: z
    .string()
    .max(5000, '日志内容不能超过5000字符')
    .optional(),
  
  questId: z
    .string()
    .nullable()
    .optional(),
  
  categories: z
    .array(LogCategorySchema)
    .max(10, '分类数量不能超过10个')
    .default([]),
  
  timestamp: z
    .string()
    .datetime('时间戳格式不正确')
    .optional(),
})

/**
 * 类型导出
 */
export type CreateLogInput = z.infer<typeof createLogSchema>
export type LogActivity = z.infer<typeof LogActivitySchema>
export type LogSubCategory = z.infer<typeof LogSubCategorySchema>
export type LogCategory = z.infer<typeof LogCategorySchema>

