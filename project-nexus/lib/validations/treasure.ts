import { z } from 'zod'

/**
 * 宝藏类型枚举
 */
export const TreasureType = z.enum(['TEXT', 'IMAGE'])

/**
 * 图片数据 Schema
 */
export const ImageSchema = z.object({
  url: z.string().url('图片URL格式不正确'),
  alt: z.string().max(200, '图片说明不能超过200字符').optional(),
  caption: z.string().max(200, '图片说明不能超过200字符').optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  size: z.number().int().positive().optional(), // 文件大小（字节）
})

/**
 * 创建宝藏 Schema
 */
export const createTreasureSchema = z.object({
  title: z
    .string()
    .min(1, '标题不能为空')
    .max(200, '标题不能超过200字符'),
  
  content: z
    .string()
    .max(10000, '内容不能超过10000字符')
    .optional(),
  
  type: TreasureType,
  
  tags: z
    .array(z.string().max(50, '标签不能超过50字符'))
    .max(20, '标签数量不能超过20个')
    .default([]),

  theme: z
    .union([
      z.string().max(100, '主题不能超过100字符'),
      z.array(z.string().max(100, '主题不能超过100字符')).max(10, '主题数量不能超过10个')
    ])
    .optional(),
  
  // 图片数组（当 type 为 IMAGE 时）
  images: z
    .array(ImageSchema)
    .max(20, '图片数量不能超过20张')
    .default([]),
})

/**
 * 更新宝藏 Schema（所有字段都是可选的）
 */
export const updateTreasureSchema = createTreasureSchema.partial()

/**
 * 类型导出
 */
export type CreateTreasureInput = z.infer<typeof createTreasureSchema>
export type UpdateTreasureInput = z.infer<typeof updateTreasureSchema>
