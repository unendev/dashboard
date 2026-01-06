import { NextRequest, NextResponse } from 'next/server';

/**
 * 代理 WebDAV 封面请求
 * 处理认证和 CORS 问题
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get('bookId');
    
    if (!bookId) {
      return NextResponse.json({ error: 'Missing bookId' }, { status: 400 });
    }

    // 从环境变量读取 WebDAV 配置
    const url = process.env.WEBDAV_URL;
    const username = process.env.WEBDAV_USERNAME;
    const password = process.env.WEBDAV_PASSWORD;
    const path = process.env.WEBDAV_EBOOK_PATH;

    if (!url || !username || !password || !path) {
      console.error('[Cover API] Missing WebDAV config:', { url: !!url, username: !!username, password: !!password, path: !!path });
      return NextResponse.json({ error: 'WebDAV config not found' }, { status: 400 });
    }

    // 构建封面路径
    const coverPath = path.replace('/file', '/cover').replace(/\/$/, '');
    const baseUrl = url.replace(/\/$/, '');
    const coverUrl = `${baseUrl}${coverPath}/${bookId}.jpg`;

    console.log('[Cover API] Fetching cover for:', bookId);
    console.log('[Cover API] Cover URL:', coverUrl);

    // 使用 Basic Auth 获取封面
    const auth = Buffer.from(`${username}:${password}`).toString('base64');
    
    // 使用 AbortController 实现超时
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(coverUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      console.warn('[Cover API] Failed to fetch cover:', response.status, response.statusText);
      return NextResponse.json({ error: 'Cover not found' }, { status: 404 });
    }

    // 获取图片数据
    const buffer = await response.arrayBuffer();
    const contentType = response.headers.get('content-type') || 'image/jpeg';

    // 返回图片，带 CORS 头
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 缓存 24 小时
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('[Cover API] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
