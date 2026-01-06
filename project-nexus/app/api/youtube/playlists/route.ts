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

// YouTube 播放列表类型定义
interface YouTubePlaylist {
  id: string;
  title: string;
  description: string;
  thumbnail: string;
  itemCount: number;
  publishedAt: string;
  url: string;
}

interface YouTubePlaylistApiResponse {
  items: Array<{
    id: string;
    snippet: {
      title: string;
      description: string;
      thumbnails: {
        medium: { url: string };
        high: { url: string };
      };
      publishedAt: string;
    };
    contentDetails: {
      itemCount: number;
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

// 获取热门播放列表
async function getPopularPlaylists(): Promise<YouTubePlaylist[]> {
  try {
    const apiKey = getYouTubeApiKey();
    
    // 搜索编程相关的播放列表
    const searchUrl = `https://www.googleapis.com/youtube/v3/search?part=snippet&type=playlist&order=relevance&maxResults=3&q=programming&key=${apiKey}`;
    
    const searchResponse = await fetchWithTimeout(searchUrl, 15000);
    if (!searchResponse.ok) {
      const errorData = await searchResponse.json();
      console.error('YouTube Playlist Search API error:', errorData);
      throw new Error(`YouTube Playlist Search API error: ${searchResponse.status}`);
    }
    
    const searchData = await searchResponse.json();
    
    if (!searchData.items || searchData.items.length === 0) {
      return [];
    }
    
    // 获取播放列表详细信息
    const playlistIds = searchData.items.map((item: { id: { playlistId: string } }) => item.id.playlistId).join(',');
    const playlistUrl = `https://www.googleapis.com/youtube/v3/playlists?part=snippet,contentDetails&id=${playlistIds}&key=${apiKey}`;
    
    const playlistResponse = await fetchWithTimeout(playlistUrl, 15000);
    if (!playlistResponse.ok) {
      throw new Error(`YouTube Playlist API error: ${playlistResponse.status}`);
    }
    
    const playlistData: YouTubePlaylistApiResponse = await playlistResponse.json();
    
    return playlistData.items.map((playlist) => ({
      id: playlist.id,
      title: playlist.snippet.title,
      description: playlist.snippet.description,
      thumbnail: playlist.snippet.thumbnails.high?.url || playlist.snippet.thumbnails.medium.url,
      itemCount: playlist.contentDetails.itemCount,
      publishedAt: playlist.snippet.publishedAt,
      url: `https://www.youtube.com/playlist?list=${playlist.id}`
    }));
    
  } catch (error) {
    console.error('Failed to get YouTube playlists:', error);
    return [];
  }
}

export const revalidate = 600; // 10分钟缓存

export async function GET() {
  try {
    const playlists = await getPopularPlaylists();
    
    if (playlists.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No playlists found'
      });
    }
    
    return NextResponse.json({
      success: true,
      data: playlists
    });
    
  } catch (error) {
    console.error('YouTube Playlist API error:', error);
    
    return NextResponse.json({
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error',
      error: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}

