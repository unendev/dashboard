import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// 公开读取缓存：无需登录，返回最近缓存的喜欢视频
// 支持通过 ?userId= 指定用户；默认使用 PUBLIC_YOUTUBE_USER_ID 或 'user-1'

export const dynamic = 'force-dynamic'
export const revalidate = 60

interface YouTubeLikedVideo {
  id: string
  title: string
  description: string
  thumbnail: string
  channelTitle: string
  publishedAt: string
  duration: string
  viewCount: string
  url: string
  likedAt?: string
}

export async function GET(request: Request) {
  try {
    
    const url = new URL(request.url)
    const defaultUserId = process.env.PUBLIC_YOUTUBE_USER_ID || 'user-1'
    const userId = url.searchParams.get('userId') || defaultUserId

    // 读取未过期的缓存，按喜欢时间倒序
    const now = new Date()
    const cached = await prisma.youTubeVideoCache.findMany({
      where: {
        userId,
        expiresAt: {
          gt: now,
        },
      },
      orderBy: {
        likedAt: 'desc',
      },
      take: 20,
    })

    if (!cached || cached.length === 0) {
      return NextResponse.json({
        success: false,
        message: '暂无有效的缓存数据',
      })
    }

    const formatted: YouTubeLikedVideo[] = cached.map((v) => ({
      id: v.videoId,
      title: v.title,
      description: v.description || '',
      thumbnail: v.thumbnail,
      channelTitle: v.channelTitle,
      publishedAt: v.publishedAt.toLocaleString('zh-CN'),
      duration: v.duration,
      viewCount: v.viewCount,
      url: v.url,
      likedAt: v.likedAt ? v.likedAt.toLocaleString('zh-CN') : undefined,
    }))

    return NextResponse.json({
      success: true,
      data: formatted,
      cached: true,
      userId,
    })
  } catch (error) {
    console.error('[YouTube Cached] Failed to read cache:', error)
    return NextResponse.json({
      success: false,
      message: '读取缓存失败',
    })
  }
}
