import { NextRequest, NextResponse } from 'next/server'
import { generateSignedUrl, extractOssKey } from '@/lib/oss-utils'

/**
 * POST /api/upload/oss/sign-url
 * 为已上传的 OSS 文件生成签名访问 URL
 */
export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json()
    
    if (!url) {
      return NextResponse.json(
        { error: '缺少 url 参数' },
        { status: 400 }
      )
    }

    // 提取 OSS key
    const ossKey = extractOssKey(url)
    
    // 生成签名 URL（1小时有效期）
    const signedUrl = generateSignedUrl(ossKey, 3600)

    return NextResponse.json({ signedUrl })
  } catch (error) {
    console.error('Error generating signed URL:', error)
    return NextResponse.json(
      { 
        error: '生成签名 URL 失败',
        details: error instanceof Error ? error.message : '未知错误'
      },
      { status: 500 }
    )
  }
}

