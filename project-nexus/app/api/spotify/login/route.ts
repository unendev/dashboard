import { NextRequest, NextResponse } from 'next/server';

/**
 * Spotify 登录路由
 * 注意：现在主要用于一次性获取 refresh token
 * 个人网站建议直接在环境变量中配置 SPOTIFY_REFRESH_TOKEN
 */
export async function GET(request: NextRequest) {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const redirectUri = process.env.SPOTIFY_REDIRECT_URI;

  if (!clientId || !redirectUri) {
    return new Response('Missing Spotify environment variables', { status: 500 });
  }

  // 检测是否为移动设备
  const userAgent = request.headers.get('user-agent') || '';
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  
  // 定义我们需要的权限范围
  const scope = [
    'user-read-private', // 读取用户基本信息
    'user-top-read', // 读取用户热门曲目和歌手
    'user-read-recently-played', // 读取用户最近播放的曲目
    'user-read-currently-playing', // 读取用户当前播放的曲目
  ].join(' ');

  // 为移动端添加额外的参数
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId!,
    scope: scope,
    redirect_uri: redirectUri,
    // 移动端优化：显示对话框模式而不是页面模式
    show_dialog: isMobile ? 'true' : 'false',
  });

  const authUrl = `https://accounts.spotify.com/authorize?${params.toString()}`;

  console.log(`Spotify auth initiated for ${isMobile ? 'mobile' : 'desktop'} device`);

  // 将用户重定向到构建好的 URL
  return NextResponse.redirect(authUrl);
}