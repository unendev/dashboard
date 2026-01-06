import { z } from 'zod'

/**
 * 环境变量验证 Schema
 * 在应用启动时验证所有必需的环境变量
 */
const envSchema = z.object({
  // ==========================================
  // 数据库配置 (必需)
  // ==========================================
  // 允许三种来源之一：DATABASE_URL / POSTGRES_PRISMA_URL / POSTGRES_URL_NON_POOLING
  DATABASE_URL: z.string().optional(),
  POSTGRES_PRISMA_URL: z.string().optional(),
  POSTGRES_URL_NON_POOLING: z.string().optional(),

  // ==========================================
  // NextAuth 配置 (必需)
  // ==========================================
  NEXTAUTH_URL: z
    .string()
    .url('NEXTAUTH_URL 必须是有效的 URL'),

  NEXTAUTH_SECRET: z
    .string()
    .min(32, 'NEXTAUTH_SECRET 至少需要 32 个字符'),

  // ==========================================
  // 超级管理员密钥 (可选)
  // ==========================================
  SUPER_ADMIN_KEY: z.string().optional(),

  // ==========================================
  // Node 环境 (必需)
  // ==========================================
  NODE_ENV: z
    .enum(['development', 'production', 'test'])
    .default('development'),

  // ==========================================
  // Google OAuth (可选)
  // ==========================================
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),

  // ==========================================
  // 阿里云 OSS (可选)
  // ==========================================
  ALIYUN_OSS_ACCESS_KEY_ID: z.string().optional(),
  ALIYUN_OSS_ACCESS_KEY_SECRET: z.string().optional(),
  ALIYUN_OSS_BUCKET: z.string().optional(),
  ALIYUN_OSS_REGION: z.string().optional(),
  ALIYUN_OSS_ENDPOINT: z.string().optional(),
  ALIYUN_OSS_CDN_URL: z.string().url().optional(),

  // ==========================================
  // Spotify API (可选)
  // ==========================================
  SPOTIFY_CLIENT_ID: z.string().optional(),
  SPOTIFY_CLIENT_SECRET: z.string().optional(),

  // ==========================================
  // YouTube API (可选)
  // ==========================================
  YOUTUBE_API_KEY: z.string().optional(),

  // ==========================================
  // 游戏集成 (可选)
  // ==========================================
  ER_NICKNAME: z.string().optional(),

  // ==========================================
  // AI 服务 (可选)
  // ==========================================
  DEEPSEEK_API_KEY: z.string().optional(),
  GOOGLE_AI_STUDIO_API_KEY: z.string().optional(),
  
  // ==========================================
  // 代理配置 (可选，用于本地开发)
  // ==========================================
  HTTPS_PROXY: z.string().optional(),
  HTTP_PROXY: z.string().optional(),

  // ==========================================
  // Liveblocks (必需 - 用于多人协作)
  // ==========================================
  LIVEBLOCKS_SECRET_KEY: z.string().optional(),

  // ==========================================
  // 开发环境配置 (可选)
  // ==========================================
  NEXT_PUBLIC_DISABLE_DEV_AUTO_LOGIN: z
    .string()
    .optional()
    .transform((val) => val === 'true'),
})

/**
 * 验证环境变量
 * 如果验证失败，会抛出详细的错误信息
 */
function pickDatabaseUrl(env: Record<string, string | undefined>): string {
  // 优先级：POSTGRES_PRISMA_URL > DATABASE_URL > POSTGRES_URL_NON_POOLING
  const candidates = [env.POSTGRES_PRISMA_URL, env.DATABASE_URL, env.POSTGRES_URL_NON_POOLING].filter(Boolean)
  if (!candidates.length) {
    throw new Error('未找到数据库连接：请配置 POSTGRES_PRISMA_URL 或 DATABASE_URL 或 POSTGRES_URL_NON_POOLING')
  }
  const url = candidates[0] as string
  try {
    // 基本 URL 校验
    const parsed = new URL(url)
    if (!/^postgres/.test(parsed.protocol)) {
      throw new Error('数据库连接必须使用 postgresql 协议')
    }
    return url
  } catch (e) {
    throw new Error('数据库连接字符串不是有效的 URL')
  }
}

function validateEnv() {
  try {
    const parsed = envSchema.safeParse(process.env)

    if (!parsed.success) {
      console.error('❌ 环境变量验证失败:')
      console.error(parsed.error.format())
      throw new Error('环境变量配置错误，请检查 .env 文件')
    }

    const data = parsed.data as z.infer<typeof envSchema>
    // 归一化 DATABASE_URL，供 Prisma 使用
    const normalizedDatabaseUrl = pickDatabaseUrl(process.env as Record<string, string | undefined>)
    return { ...data, DATABASE_URL: normalizedDatabaseUrl }
  } catch (error) {
    console.error('环境变量验证错误:', error)
    throw error
  }
}

/**
 * 导出经过验证的环境变量
 * 使用方式: import { env } from '@/lib/env'
 */
export const env = validateEnv()

/**
 * 类型安全的环境变量
 */
export type Env = z.infer<typeof envSchema>

