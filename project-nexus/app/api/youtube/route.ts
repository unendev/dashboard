import { NextResponse } from 'next/server';

// 带超时的 fetch 包装器
async function fetchWithTimeout(url: string, timeoutMs: number = 15000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

// YouTube 视频类型定义
interface YouTubeVideo {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  channelTitle: string;
  publishedAt: string;
  duration: string;
  viewCount: string;
  url: string;
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

// 获取YouTube API密钥
function getYouTubeApiKey(): string {
  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    throw new Error('YouTube API key not found. Please set YOUTUBE_API_KEY environment variable.');
  }
  return apiKey;
}

// 获取推荐的编程相关视频
async function getRecommendedVideo(): Promise<YouTubeVideo | null> {
  try {
    const apiKey = getYouTubeApiKey();
    
    // 搜索编程相关的主题
    const topics = [
      'javascript tutorial',
      'react tutorial', 
      'vue.js tutorial',
      'typescript tutorial',
      'next.js tutorial',
      'python tutorial',
      'web development'
    ];
    
    // 随机选择一个主题
    const randomTopic = topics[Math.floor(Math.random() * topics.length)];
    
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=relevance&maxResults=1&q=${encodeURIComponent(randomTopic)}&key=${apiKey}`;
    
    const searchResponse = await fetchWithTimeout(searchUrl, 15000);
    if (!searchResponse.ok) {
      throw new Error(`Search failed: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      throw new Error('No videos found');
    }
    
    const videoId = searchData.items[0].id.videoId;
    
    // 获取视频详细信息
    const videoUrl = `https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${videoId}&key=${apiKey}`;
    
    const videoResponse = await fetchWithTimeout(videoUrl, 15000);
    if (!videoResponse.ok) {
      throw new Error(`Video details failed: ${videoResponse.status}`);
    }
    
    const videoData: YouTubeVideoApiResponse = await videoResponse.json();
    
    if (!videoData.items || videoData.items.length === 0) {
      throw new Error('No video details found');
    }
    
    const video = videoData.items[0];
    
    return {
      id: video.id,
      title: video.snippet.title,
      description: video.snippet.description,
      thumbnail: video.snippet.thumbnails.high?.url || video.snippet.thumbnails.medium.url,
      channelTitle: video.snippet.channelTitle,
      publishedAt: video.snippet.publishedAt,
      duration: video.contentDetails.duration,
      viewCount: video.statistics.viewCount,
      url: `https://www.youtube.com/watch?v=${video.id}`
    };
    
  } catch (error) {
    console.error('Failed to get recommended video:', error);
    return null;
  }
}

// 获取模拟的推荐视频数据（备选方案）
function getMockRecommendedVideo(): YouTubeVideo {
  const mockVideos = [
    {
      id: 'mock-recommended-1',
      title: '【Vue.js 3.0 完整教程】从入门到精通 - 现代前端开发',
      description: '深入学习Vue.js 3.0框架，包括Composition API、响应式系统、组件开发等核心概念。适合前端开发者学习。',
      thumbnail: 'https://via.placeholder.com/400x192/667eea/ffffff?text=Vue.js+Tutorial',
      channelTitle: '前端开发学院',
      publishedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      duration: '25:30',
      viewCount: '1250000',
      url: 'https://vuejs.org/tutorial/'
    },
    {
      id: 'mock-recommended-2',
      title: '【JavaScript 高级特性】ES6+ 新特性详解',
      description: '全面介绍JavaScript ES6+的新特性，包括箭头函数、解构赋值、Promise、async/await等。',
      thumbnail: 'https://via.placeholder.com/400x192/f093fb/ffffff?text=JavaScript+ES6',
      channelTitle: '编程学习频道',
      publishedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
      duration: '18:45',
      viewCount: '890000',
      url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript'
    },
    {
      id: 'mock-recommended-3',
      title: '【React Hooks 深度解析】useState、useEffect、useContext',
      description: '深入理解React Hooks的工作原理和使用方法，提升React开发技能。',
      thumbnail: 'https://via.placeholder.com/400x192/4facfe/ffffff?text=React+Hooks',
      channelTitle: 'React 官方频道',
      publishedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      duration: '32:15',
      viewCount: '2100000',
      url: 'https://react.dev/learn'
    }
  ];
  
  // 随机选择一个模拟视频
  return mockVideos[Math.floor(Math.random() * mockVideos.length)];
}

// 格式化持续时间（ISO 8601 格式转换为可读格式）
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

export const revalidate = 600; // 10分钟缓存

export async function GET() {
  try {
    // 首先尝试获取真实的推荐视频
    let video = await getRecommendedVideo();
    
    if (!video) {
      // 如果真实数据获取失败，使用模拟数据
      console.log('Using mock data as fallback');
      video = getMockRecommendedVideo();
    }
    
    // 格式化数据
    const formattedVideo = {
      ...video,
      duration: formatDuration(video.duration),
      viewCount: formatViewCount(video.viewCount),
      publishedAt: new Date(video.publishedAt).toLocaleString('zh-CN')
    };
    
    return NextResponse.json({
      success: true,
      data: formattedVideo,
      message: '推荐视频获取成功'
    });
    
  } catch (error) {
    console.error('YouTube API error:', error);
    
    // 发生错误时返回模拟数据
    const mockVideo = getMockRecommendedVideo();
    const formattedVideo = {
      ...mockVideo,
      duration: formatDuration(mockVideo.duration),
      viewCount: formatViewCount(mockVideo.viewCount),
      publishedAt: new Date(mockVideo.publishedAt).toLocaleString('zh-CN')
    };
    
    return NextResponse.json({
      success: true,
      data: formattedVideo,
      message: '使用模拟数据（API调用失败）'
    });
  }
}
