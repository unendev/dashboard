import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, getUserId, isSuperAdmin } from '@/lib/auth-utils';

export async function GET(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    const authResult = await requireAuth(request);
    
    if (authResult.error) {
      return NextResponse.json(
        { 
          error: authResult.error,
          message: authResult.message,
          // 开发环境下提供更多调试信息
          debug: process.env.NODE_ENV === 'development' ? {
            availableAuthMethods: [
              'NextAuth.js Session',
              'Super Admin Key (dev only)',
              'API Key (legacy)'
            ],
            headers: Object.fromEntries(request.headers.entries()),
            searchParams: Object.fromEntries(request.nextUrl.searchParams.entries())
          } : undefined
        }, 
        { status: authResult.status }
      );
    }

    const user = authResult.user;
    const isSuper = await isSuperAdmin(request);

    // 确保 user 存在（requireAuth 已经检查过了）
    if (!user) {
      return NextResponse.json(
        { error: '用户信息不存在' }, 
        { status: 401 }
      );
    }

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        isSuperAdmin: isSuper,
        authMethod: user.authMethod
      },
      message: '认证成功',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('认证检查失败:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' }, 
      { status: 500 }
    );
  }
}

// POST /api/example-auth - 创建资源（需要认证）
export async function POST(request: NextRequest) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({});
  }
  try {
    // 使用便捷的getUserId函数
    const userId = await getUserId(request);
    
    const body = await request.json();
    
    return NextResponse.json({
      message: '资源创建成功',
      userId,
      data: body,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('创建资源失败:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : '创建失败' }, 
      { status: 401 }
    );
  }
}
