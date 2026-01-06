import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readSpotifyCache, writeSpotifyCache } from '@/lib/spotify-cache';

export const runtime = 'nodejs';

// Spotify API 数据类型
interface SpotifyArtist {
  name: string;
}

const CLIENT_ID = process.env.SPOTIFY_CLIENT_ID;
const CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET;
const BASIC_AUTH = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString('base64');

const TOKEN_ENDPOINT = `https://accounts.spotify.com/api/token`;
const CURRENTLY_PLAYING_ENDPOINT = `https://api.spotify.com/v1/me/player/currently-playing`;
const RECENTLY_PLAYED_ENDPOINT = `https://api.spotify.com/v1/me/player/recently-played`;

// 缓存设置：文件与内存双层缓存
const CACHE_FILE_PATH = path.join(process.cwd(), 'data', 'spotify-cache.json');
const IN_MEMORY_TTL_MS = 60 * 1000; // 内存缓存 60 秒，降低外部请求频率

type MusicData = {
  isPlaying: boolean;
  trackName: string;
  artist: string;
  album: string;
  albumArtUrl?: string;
  source: string;
  isFromCache?: boolean;
  cachedAt?: string;
} | { message: string; isFromCache?: boolean; cachedAt?: string };

let inMemoryCache: MusicData | null = null;
let inMemoryCacheUpdatedAt = 0;

function readFileCache(): MusicData | null {
  try {
    if (!fs.existsSync(CACHE_FILE_PATH)) return null;
    const raw = fs.readFileSync(CACHE_FILE_PATH, 'utf8');
    if (!raw) return null;
    const parsed = JSON.parse(raw) as MusicData;
    return parsed;
  } catch (error) {
    console.error('读取 Spotify 缓存失败:', error);
    return null;
  }
}

function writeFileCache(data: Exclude<MusicData, { message: string }>): void {
  try {
    const payload: MusicData = { ...data, isFromCache: true, cachedAt: new Date().toISOString() };
    fs.mkdirSync(path.dirname(CACHE_FILE_PATH), { recursive: true });
    fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(payload, null, 2), 'utf8');
  } catch (error) {
    console.error('写入 Spotify 缓存失败:', error);
  }
}

function setInMemoryCache(data: MusicData): void {
  inMemoryCache = data;
  inMemoryCacheUpdatedAt = Date.now();
}

export const revalidate = 60; // 尝试让路由层具备 60 秒再验证（实际以平台为准）

// 这是一个辅助函数，用于通过 refresh_token 获取新的 access_token
async function getAccessToken(refreshToken: string) {
  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${BASIC_AUTH}`,
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    // 如果 refresh_token 失效，Spotify 会在这里返回错误
    throw new Error(data.error_description || 'Failed to refresh token');
  }

  return data.access_token;
}

// API 路由的主处理函数
export async function GET(request: NextRequest) {
  // 1) 优先返回内存缓存（命中后直接响应，避免频繁外部请求）
  if (inMemoryCache && Date.now() - inMemoryCacheUpdatedAt < IN_MEMORY_TTL_MS) {
    return NextResponse.json(inMemoryCache);
  }

  // 2) 从环境变量或 cookie 中读取 refresh_token（优先使用环境变量）
  const refreshToken = process.env.SPOTIFY_REFRESH_TOKEN || request.cookies.get('spotify_refresh_token')?.value;

  // 没有 refresh token：直接回退到文件缓存（不返回 401，避免前端提示登录）
  if (!refreshToken) {
    // 先查 DB 缓存
    const dbCached = await readSpotifyCache();
    if (dbCached) {
      const responseData: MusicData = { ...dbCached, isFromCache: true } as MusicData;
      setInMemoryCache(responseData);
      return NextResponse.json(responseData);
    }
    // 再查文件缓存
    const cached = readFileCache();
    if (cached) {
      const responseData: MusicData = { ...cached, isFromCache: true };
      setInMemoryCache(responseData);
      return NextResponse.json(responseData);
    }
    // 没有缓存则返回占位消息
    return NextResponse.json({ message: '暂无 Spotify 数据' });
  }

  try {
    // 3) 获取 access token
    const accessToken = await getAccessToken(refreshToken);

    // 4) 获取当前播放
    const response = await fetch(CURRENTLY_PLAYING_ENDPOINT, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // 4.1) 当前未播放或接口错误，回退到最近播放
    if (response.status === 204 || response.status > 400) {
      const recentlyPlayedResponse = await fetch(RECENTLY_PLAYED_ENDPOINT, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!recentlyPlayedResponse.ok) {
        // 再次回退到文件缓存
        const cached = readFileCache();
        if (cached) {
          const responseData: MusicData = { ...cached, isFromCache: true };
          setInMemoryCache(responseData);
          return NextResponse.json(responseData);
        }
        return NextResponse.json({ message: '暂无最近播放数据' });
      }

      const recentlyPlayed = await recentlyPlayedResponse.json();
      const track = recentlyPlayed?.items?.[0]?.track;
      if (!track) {
        const cached = readFileCache();
        if (cached) {
          const responseData: MusicData = { ...cached, isFromCache: true };
          setInMemoryCache(responseData);
          return NextResponse.json(responseData);
        }
        return NextResponse.json({ message: '暂无最近播放数据' });
      }

      const formattedData = {
        isPlaying: false,
        trackName: track.name,
        artist: track.artists.map((_artist: SpotifyArtist) => _artist.name).join(', '),
        album: track.album.name,
        albumArtUrl: track.album.images?.[0]?.url,
        source: 'Spotify',
      };
      // 写缓存并返回
      await writeSpotifyCache({ ...formattedData, isFromCache: true, cachedAt: new Date().toISOString() });
      writeFileCache(formattedData);
      setInMemoryCache(formattedData);
      return NextResponse.json(formattedData);
    }

    // 4.2) 有当前播放
    const song = await response.json();
    if (!song || !song.item) {
      const cached = readFileCache();
      if (cached) {
        const responseData: MusicData = { ...cached, isFromCache: true };
        setInMemoryCache(responseData);
        return NextResponse.json(responseData);
      }
      return NextResponse.json({ isPlaying: false, message: '暂无正在播放数据' });
    }

    const formattedData = {
      isPlaying: song.is_playing,
      trackName: song.item.name,
      artist: song.item.artists.map((_artist: SpotifyArtist) => _artist.name).join(', '),
      album: song.item.album.name,
      albumArtUrl: song.item.album.images?.[0]?.url,
      source: 'Spotify',
    };
    // 写缓存并返回
    await writeSpotifyCache({ ...formattedData, isFromCache: true, cachedAt: new Date().toISOString() });
    writeFileCache(formattedData);
    setInMemoryCache(formattedData);
    return NextResponse.json(formattedData);

  } catch (error: unknown) {
    // 出错时回退到缓存
    const dbCached = await readSpotifyCache();
    if (dbCached) {
      const responseData: MusicData = { ...dbCached, isFromCache: true } as MusicData;
      setInMemoryCache(responseData);
      return NextResponse.json(responseData);
    }
    const cached = readFileCache();
    if (cached) {
      const responseData: MusicData = { ...cached, isFromCache: true };
      setInMemoryCache(responseData);
      return NextResponse.json(responseData);
    }
    return NextResponse.json({ message: error instanceof Error ? error.message : 'Spotify 暂不可用' });
  }
}