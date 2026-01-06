import { NextRequest, NextResponse } from 'next/server'

// 简单的内存速率限制器
class SimpleRateLimit {
  private requests: Map<string, number[]> = new Map()
  private readonly maxRequests: number = 10
  private readonly windowMs: number = 60 * 1000 // 1分钟

  isAllowed(ip: string): { allowed: boolean; remaining: number; resetTime: number } {
    const now = Date.now()
    const windowStart = now - this.windowMs
    
    // 获取或创建该IP的请求记录
    if (!this.requests.has(ip)) {
      this.requests.set(ip, [])
    }
    
    const ipRequests = this.requests.get(ip)!
    
    // 清理过期的请求记录
    const validRequests = ipRequests.filter(timestamp => timestamp > windowStart)
    this.requests.set(ip, validRequests)
    
    // 检查是否超过限制
    const allowed = validRequests.length < this.maxRequests
    
    if (allowed) {
      validRequests.push(now)
      this.requests.set(ip, validRequests)
    }
    
    return {
      allowed,
      remaining: Math.max(0, this.maxRequests - validRequests.length),
      resetTime: now + this.windowMs
    }
  }
}

const rateLimit = new SimpleRateLimit()

// 需要速率限制的API路径
const protectedPaths = [
  '/api/auth/callback/credentials',
  '/api/auth/register',
  '/api/auth/signin',
]

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // 处理 CORS
  const origin = request.headers.get('origin');
  const allowedOrigins = ['http://localhost:5173', 'http://localhost:3000'];
  
  if (origin && allowedOrigins.includes(origin)) {
    const response = pathname.includes('/api/') ? NextResponse.next() : undefined;
    if (response) {
      response.headers.set('Access-Control-Allow-Origin', origin);
      response.headers.set('Access-Control-Allow-Credentials', 'true');
      response.headers.set('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 204, headers: response.headers });
      }
    }
  }

  // 检查是否是需要保护的路径
  const isProtectedPath = protectedPaths.some(path => pathname.includes(path))
  
  if (isProtectedPath) {
    try {
      // 获取客户端IP地址
      const ip = request.headers.get('x-forwarded-for') ?? request.headers.get('x-real-ip') ?? '127.0.0.1'
      
      // 检查速率限制
      const { allowed, remaining, resetTime } = rateLimit.isAllowed(ip)
      
      if (!allowed) {
        console.log(`Rate limit exceeded for IP: ${ip}`)
        return new NextResponse(
          JSON.stringify({
            error: '请求过于频繁，请稍后再试',
            retryAfter: Math.round((resetTime - Date.now()) / 1000)
          }),
          {
            status: 429,
            headers: {
              'Content-Type': 'application/json',
              'X-RateLimit-Limit': '10',
              'X-RateLimit-Remaining': remaining.toString(),
              'X-RateLimit-Reset': new Date(resetTime).toISOString(),
              'Retry-After': Math.round((resetTime - Date.now()) / 1000).toString(),
            },
          }
        )
      }

      // 添加速率限制头信息
      const response = NextResponse.next()
      response.headers.set('X-RateLimit-Limit', '10')
      response.headers.set('X-RateLimit-Remaining', remaining.toString())
      response.headers.set('X-RateLimit-Reset', new Date(resetTime).toISOString())
      
      return response
    } catch (error) {
      // 如果速率限制出错，记录错误但允许请求通过
      console.error('Rate limiting error:', error)
      return NextResponse.next()
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/api/auth/:path*',
  ],
}
