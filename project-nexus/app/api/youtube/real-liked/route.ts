import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// YouTube 喜欢视频类型定义
interface YouTubeLikedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  url: string;
  likedAt?: string;
}

interface YouTubeVideoApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        medium: { url: string };
        high: { url: string };
      };
      channelTitle: string;
      publishedAt: string;
    };
    contentDetails: {
      duration: string;
    };
    statistics: {
      viewCount: string;
    };
  }>;
}

// 带超时的 fetch 包装器
async function fetchWithTimeout(url: string, accessToken: string, timeoutMs: number = 30000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Authorization': `Bearer ${accessToken}` // 使用传入的访问令牌
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// 获取用户真实的喜欢视频
async function getUserLikedVideos(accessToken: string): Promise<YouTubeLikedVideo[]> {
  try {
    console.log('[YouTube API] Fetching user liked videos with access token');
    
    // 首先获取用户喜欢的视频ID列表
    const likedVideosUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&myRating=like&maxResults=25`;
    
    const likedResponse = await fetchWithTimeout(likedVideosUrl, accessToken, 30000);
    if (!likedResponse.ok) {
      const errorBody = await likedResponse.json();
      console.error('[YouTube API] Failed to get liked videos:', JSON.stringify(errorBody, null, 2));
      throw new Error(`Failed to get liked videos: ${likedResponse.status}`);
    }
    
    const likedData = await likedResponse.json();
    
    if (!likedData.items || likedData.items.length === 0) {
      console.log('[YouTube API] No liked videos found');
      return [];
    }
    
    // 获取视频详细信息
    const videoIds = likedData.items.map((item: { id: string }) => item.id).join(',');
    const videoDetailsUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoIds}`;
    
    const videoResponse = await fetchWithTimeout(videoDetailsUrl, accessToken, 30000);
    if (!videoResponse.ok) {
      const errorBody = await videoResponse.json();
      console.error('[YouTube API] Failed to get video details:', JSON.stringify(errorBody, null, 2));
      throw new Error(`Failed to get video details: ${videoResponse.status}`);
    }
    
    const videoData: YouTubeVideoApiResponse = await videoResponse.json();
    
    const videos: YouTubeLikedVideo[] = videoData.items.map(video => ({
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      viewCount: video.statistics.viewCount,
      url: `https://www.youtube.com/watch?v=${video.id}`,
      likedAt: new Date().toISOString() // 这里应该从API获取真实的喜欢时间
    }));
    
    console.log(`[YouTube API] Successfully fetched ${videos.length} liked videos`);
    return videos;
    
  } catch (error) {
    console.error('[YouTube API] Error fetching user liked videos:', error);
    throw error;
  }
}

// 格式化持续时间
function formatDuration(duration: string): string {
  const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return duration;
  
  const hours = parseInt(match[1] || '0');
  const minutes = parseInt(match[2] || '0');
  const seconds = parseInt(match[3] || '0');
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// 格式化观看次数
function formatViewCount(count: string): string {
  const num = parseInt(count);
  if (num >= 1000000) {
    return `${(num / 1000000).toFixed(1)}M`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(1)}K`;
  }
  return num.toString();
}

export const revalidate = 0; // 不缓存，每次都获取最新数据

export async function GET() {
  try {
    
    // 检查用户是否已登录
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({
        success: false,
        message: '请先登录以获取您的YouTube喜欢视频',
        requiresAuth: true
      }, { status: 401 });
    }

    // 检查用户是否已连接YouTube账户
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { accounts: true }
    });

    if (!user?.accounts?.some(account => account.provider === 'google')) {
      return NextResponse.json({
        success: false,
        message: '请先连接您的Google账户以获取YouTube数据',
        requiresGoogleAuth: true
      }, { status: 401 });
    }

    // 获取用户的访问令牌
    const googleAccount = user.accounts.find(account => account.provider === 'google');
    if (!googleAccount?.access_token) {
      return NextResponse.json({
        success: false,
        message: 'YouTube访问令牌已过期，请重新授权',
        requiresReauth: true
      }, { status: 401 });
    }

    console.log('[YouTube API] Found Google account with access token');

    // 尝试刷新访问令牌（如果存在 refresh_token）
    let accessToken = googleAccount.access_token;
    if (googleAccount.refresh_token) {
      try {
        console.log('[YouTube API] Attempting to refresh access token');
        const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: process.env.GOOGLE_CLIENT_ID!,
            client_secret: process.env.GOOGLE_CLIENT_SECRET!,
            refresh_token: googleAccount.refresh_token,
            grant_type: 'refresh_token',
          }),
        });

        if (refreshResponse.ok) {
          const refreshData = await refreshResponse.json();
          accessToken = refreshData.access_token;
          
          // 更新数据库中的访问令牌
          await prisma.account.update({
            where: { id: googleAccount.id },
            data: { 
              access_token: refreshData.access_token,
              expires_at: Math.floor(Date.now() / 1000) + (refreshData.expires_in || 3600)
            }
          });
          
          console.log('[YouTube API] Successfully refreshed access token');
        } else {
          console.warn('[YouTube API] Failed to refresh token, using existing token');
        }
      } catch (error) {
        console.warn('[YouTube API] Token refresh failed:', error);
      }
    }

    // 获取真实的喜欢视频
    let videos: YouTubeLikedVideo[] = [];
    try {
      videos = await getUserLikedVideos(accessToken);
    } catch (error) {
      console.error('[YouTube API] Failed to fetch videos with refreshed token:', error);
      
      // 如果仍然失败，回退到缓存
      const cachedVideos = await prisma.youTubeVideoCache.findMany({
        where: {
          userId: session.user.id,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          likedAt: 'desc'
        },
        take: 20
      });

      if (cachedVideos.length > 0) {
        console.log(`[YouTube API] Falling back to ${cachedVideos.length} cached videos`);
        
        const cachedFormattedVideos = cachedVideos.map(video => ({
          id: video.videoId,
          title: video.title,
          description: video.description || '',
          thumbnail: video.thumbnail,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt.toLocaleString('zh-CN'),
          duration: formatDuration(video.duration),
          viewCount: formatViewCount(video.viewCount),
          url: video.url,
          likedAt: video.likedAt?.toLocaleString('zh-CN')
        }));

        return NextResponse.json({
          success: true,
          data: cachedFormattedVideos,
          message: '使用缓存数据（API访问失败）',
          cached: true
        });
      }
      
      return NextResponse.json({
        success: false,
        message: 'YouTube API访问失败，且无可用缓存',
        requiresReauth: true
      }, { status: 401 });
    }
    
    if (videos.length === 0) {
      return NextResponse.json({
        success: true,
        data: [],
        message: '您还没有喜欢的视频'
      });
    }
    
    // 格式化数据
    const formattedVideos = videos.map(video => ({
      ...video,
      duration: formatDuration(video.duration),
      viewCount: formatViewCount(video.viewCount),
      publishedAt: new Date(video.publishedAt).toLocaleString('zh-CN'),
      likedAt: video.likedAt ? new Date(video.likedAt).toLocaleString('zh-CN') : undefined
    }));
    
    // 缓存到数据库
    try {
      // 清除过期的缓存
      await prisma.youTubeVideoCache.deleteMany({
        where: {
          userId: session.user.id,
          expiresAt: {
            lt: new Date()
          }
        }
      });

      // 检查是否有有效的缓存
      const cachedVideos = await prisma.youTubeVideoCache.findMany({
        where: {
          userId: session.user.id,
          expiresAt: {
            gt: new Date()
          }
        },
        orderBy: {
          likedAt: 'desc'
        }
      });

      if (cachedVideos.length > 0) {
        console.log(`[YouTube Cache] Found ${cachedVideos.length} cached videos`);
        
        const cachedFormattedVideos = cachedVideos.map(video => ({
          id: video.videoId,
          title: video.title,
          description: video.description || '',
          thumbnail: video.thumbnail,
          channelTitle: video.channelTitle,
          publishedAt: video.publishedAt.toLocaleString('zh-CN'),
          duration: formatDuration(video.duration),
          viewCount: formatViewCount(video.viewCount),
          url: video.url,
          likedAt: video.likedAt?.toLocaleString('zh-CN')
        }));

        return NextResponse.json({
          success: true,
          data: cachedFormattedVideos,
          message: '从缓存获取您的喜欢视频',
          cached: true
        });
      }

      // 如果没有缓存，获取新数据并缓存
      console.log('[YouTube Cache] No valid cache found, fetching fresh data');
      
      // 清除旧缓存
      await prisma.youTubeVideoCache.deleteMany({
        where: {
          userId: session.user.id
        }
      });

      // 缓存新数据
      const cacheExpiry = new Date();
      cacheExpiry.setHours(cacheExpiry.getHours() + 1); // 1小时后过期

      await prisma.youTubeVideoCache.createMany({
        data: videos.map(video => ({
          videoId: video.id,
          title: video.title,
          description: video.description,
          thumbnail: video.thumbnail,
          channelTitle: video.channelTitle,
          publishedAt: new Date(video.publishedAt),
          duration: video.duration,
          viewCount: video.viewCount,
          url: video.url,
          likedAt: video.likedAt ? new Date(video.likedAt) : null,
          userId: session.user.id,
          expiresAt: cacheExpiry
        }))
      });

      console.log(`[YouTube Cache] Cached ${videos.length} videos until ${cacheExpiry.toISOString()}`);

    } catch (cacheError) {
      console.error('[YouTube Cache] Error caching videos:', cacheError);
      // 即使缓存失败，也返回数据
    }
    
    return NextResponse.json({
      success: true,
      data: formattedVideos,
      message: '成功获取您的喜欢视频'
    });
    
  } catch (error) {
    console.error('YouTube Liked Videos API error:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : '获取喜欢视频失败',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
