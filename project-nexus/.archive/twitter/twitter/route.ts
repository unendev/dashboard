import { NextRequest, NextResponse } from 'next/server';
import { TwitterDbCache } from '@/lib/twitter-db-cache';
import { TwitterData } from '@/app/components/features/widgets/TwitterCard';

const BEARER_TOKEN = process.env.TWITTER_BEARER_TOKEN || 'AAAAAAAAAAAAAAAAAAAAAEY14QEAAAAAgRSvzkQdsFffGg3JxfFHgCFqKnc%3Dz1d9S20iXUXNLJI8aaUZJa0sMUpvji0MNIfmvPVRlYAmG4q4eN';

async function fetchTweetsFromApi(userId: string, maxResults: number): Promise<TwitterData | null> {
  const tweetParams = new URLSearchParams({
    'max_results': maxResults.toString(),
    'tweet.fields': 'created_at,public_metrics,author_id,attachments',
    'expansions': 'author_id,attachments.media_keys',
    'user.fields': 'name,username,profile_image_url',
    'media.fields': 'url,preview_image_url,type,width,height,alt_text',
  });

  const response = await fetch(
    `https://api.twitter.com/2/users/${userId}/tweets?${tweetParams}`,
    {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Twitter API Error:', {
      status: response.status,
      errorData,
    });
    return null;
  }

  return await response.json();
}

async function fetchUserFromApi(username: string): Promise<{ data: { id: string; name: string; username: string; profile_image_url: string; public_metrics: Record<string, unknown> } } | null> {
  const userParams = new URLSearchParams({
    'user.fields': 'id,name,username,profile_image_url,public_metrics',
  });

  const response = await fetch(
    `https://api.twitter.com/2/users/by/username/${username}?${userParams}`,
    {
      headers: {
        'Authorization': `Bearer ${BEARER_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );

  if (!response.ok) {
    const errorData = await response.text();
    console.error('Twitter User API Error:', {
      status: response.status,
      errorData,
    });
    return null;
  }

  return await response.json();
}

export async function GET() {
  // GET logic remains the same, but it's part of the POST flow now.
  // This endpoint can be simplified or deprecated if not used directly.
  return NextResponse.json({ message: "Please use POST to fetch Twitter data." });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json({ error: 'Username is required' }, { status: 400 });
    }

    // 1. 尝试从数据库缓存获取
    const cachedData = await TwitterDbCache.getCachedData(username);
    if (cachedData) {
      return NextResponse.json({ ...cachedData, meta: { cached: true } });
    }

    // 2. 缓存未命中，从 API 获取用户信息
    const userApiResult = await fetchUserFromApi(username);
    if (!userApiResult || !userApiResult.data) {
      // API 失败，再次尝试从缓存获取（可能有过期但可用的数据）
      const expiredCachedData = await TwitterDbCache.getCachedData(username, true); // 允许获取过期数据
      if (expiredCachedData) {
        return NextResponse.json({ ...expiredCachedData, meta: { cached: true, expired: true } });
      }
      return NextResponse.json({ error: 'User not found or API error' }, { status: 404 });
    }
    const userId = userApiResult.data.id;

    // 3. 使用用户 ID 获取推文
    const tweetsApiResult = await fetchTweetsFromApi(userId, 5);
    if (!tweetsApiResult) {
      // 推文 API 失败，再次尝试从缓存获取（可能有过期但可用的数据）
      const expiredCachedData = await TwitterDbCache.getCachedData(username, true); // 允许获取过期数据
      if (expiredCachedData) {
        return NextResponse.json({ ...expiredCachedData, meta: { cached: true, expired: true } });
      }
      return NextResponse.json({ error: 'Failed to fetch tweets' }, { status: 500 });
    }
    
    // 4. 将新数据存入数据库缓存
    await TwitterDbCache.setCachedData(username, tweetsApiResult);
    
    return NextResponse.json({ ...tweetsApiResult, meta: { cached: false } });

  } catch (error) {
    console.error('Twitter API Route Error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
