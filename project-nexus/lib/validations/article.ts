import { z } from 'zod'

export const articleSchema = z.object({
  title: z.string().min(1, '标题不能为空').max(200, '标题最多200字符'),
  subtitle: z.string().max(300, '副标题最多300字符').optional(),
  content: z.string().min(1, '内容不能为空'),
  abstract: z.string().max(500, '摘要最多500字符').optional(),
  coverImage: z.string().url('封面图必须是有效的URL').optional().or(z.literal('')),
  status: z.enum(['DRAFT', 'PUBLISHED', 'ARCHIVED']).default('DRAFT'),
  visibility: z.enum(['PRIVATE', 'PUBLIC', 'UNLISTED']).default('PRIVATE'),
  tags: z.array(z.string()).default([]),
  slug: z.string().min(1, 'URL标识不能为空').max(200, 'URL标识最多200字符')
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'URL标识只能包含小写字母、数字和连字符'),
  keywords: z.array(z.string()).default([]),
})

export type ArticleInput = z.infer<typeof articleSchema>

export const articleUpdateSchema = articleSchema.partial().extend({
  id: z.string(),
})

export type ArticleUpdateInput = z.infer<typeof articleUpdateSchema>




















