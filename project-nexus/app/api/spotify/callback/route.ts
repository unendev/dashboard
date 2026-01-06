import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify OAuth 回调处理
 * 注意：现在主要用于一次性获取 refresh token
 * 获取到的 refresh token 可以复制到环境变量 SPOTIFY_REFRESH_TOKEN 中
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // 检测是否为移动设备
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);

  const homeUrl = new URL('/', request.url);

  if (error) {
    // 如果用户在 Spotify 页面上拒绝了授权
    homeUrl.searchParams.set('error', 'spotify_access_denied');
    return NextResponse.redirect(homeUrl);
  }

  if (!code) {
    // 如果 URL 中没有 code 参数，这是一个异常情况
    homeUrl.searchParams.set('error', 'spotify_missing_code');
    return NextResponse.redirect(homeUrl);
  }

  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !clientSecret || !redirectUri) {
    return new Response('Missing Spotify environment variables', { status: 500 });
  }

  // Spotify API 要求将 client_id:client_secret 进行 Base64 编码后放在 Authorization 头中
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  try {
    const response = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${basicAuth}`,
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // 如果 Spotify 返回了错误
      console.error('Spotify Token Error:', data);
      homeUrl.searchParams.set('error', data.error_description || 'spotify_token_error');
      return NextResponse.redirect(homeUrl);
    }

    const { refresh_token } = data;

    // TODO: 任务 2.3 - 安全地存储 refresh_token
    // 这是一个非常重要的步骤，我们将在下一步实现它。
    // 暂时，我们先将 refresh_token 存储在 cookie 中以便于开发。
    // 注意：在生产环境中，cookie 可能不是最安全的选择。
    
    console.log('Received Refresh Token:', refresh_token);
    console.log('💡 提示：请将这个 refresh token 设置到 Vercel 环境变量 SPOTIFY_REFRESH_TOKEN 中');

    // 为移动端添加成功提示参数
    if (isMobile) {
      homeUrl.searchParams.set('spotify_success', 'true');
    }

    console.log(`Spotify auth completed for ${isMobile ? 'mobile' : 'desktop'} device`);

    // 重定向回首页，并设置一个 cookie
    const responseRedirect = NextResponse.redirect(homeUrl);
    responseRedirect.cookies.set('spotify_refresh_token', refresh_token, {
      httpOnly: true, // 防止客户端 JS 读取
      secure: process.env.NODE_ENV === 'production', // 仅在生产环境中使用 secure cookie
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 天
      sameSite: isMobile ? 'none' : 'lax', // 移动端需要更宽松的SameSite设置
    });

    return responseRedirect;

  } catch (e) {
    console.error('Fetch Token Error:', e);
    homeUrl.searchParams.set('error', 'internal_server_error');
    return NextResponse.redirect(homeUrl);
  }
}