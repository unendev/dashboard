import { NextRequest, NextResponse } from 'next/server'
import crypto from 'crypto'

// 阿里云 OSS 配置（从环境变量读取）
const OSS_CONFIG = {
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.ALIYUN_OSS_BUCKET || '',
  region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
  endpoint: process.env.ALIYUN_OSS_ENDPOINT || '',
}

export async function GET(request: NextRequest) {
  try {
    // 详细检查配置并提供具体错误信息
    const missingVars = []
    if (!OSS_CONFIG.accessKeyId) missingVars.push('ALIYUN_OSS_ACCESS_KEY_ID')
    if (!OSS_CONFIG.accessKeySecret) missingVars.push('ALIYUN_OSS_ACCESS_KEY_SECRET') 
    if (!OSS_CONFIG.bucket) missingVars.push('ALIYUN_OSS_BUCKET')
    
    if (missingVars.length > 0) {
      console.error('OSS 配置缺失环境变量:', missingVars)
      return NextResponse.json(
        { 
          error: 'OSS 配置未完成，请在 Vercel 中设置以下环境变量', 
          missingVariables: missingVars,
          help: 'https://vercel.com/docs/concepts/projects/environment-variables'
        },
        { status: 500 }
      )
    }

    // 从查询参数获取文件信息
    const { searchParams } = new URL(request.url)
    const filename = searchParams.get('filename') || 'image'
    const contentType = searchParams.get('contentType') || 'image/jpeg'
    const dir = searchParams.get('dir') || 'treasure-images'
    
    // 根据contentType确定文件扩展名
    let extension = 'jpg'
    if (contentType.includes('png')) extension = 'png'
    else if (contentType.includes('gif')) extension = 'gif'
    else if (contentType.includes('webp')) extension = 'webp'
    else if (contentType.includes('jpeg') || contentType.includes('jpg')) extension = 'jpg'
    
    // 如果filename有扩展名，优先使用
    if (filename.includes('.')) {
      const parts = filename.split('.')
      extension = parts[parts.length - 1].toLowerCase()
    }
    
    // 生成唯一文件名（包含扩展名）
    const timestamp = Date.now()
    const randomStr = crypto.randomBytes(8).toString('hex')
    const fileKey = `${dir}/${timestamp}-${randomStr}.${extension}`

    // 设置过期时间（1小时后）
    const expireTime = new Date(Date.now() + 3600 * 1000).toISOString()

    // 构建 Policy
    const policyString = JSON.stringify({
      expiration: expireTime,
      conditions: [
        ['content-length-range', 0, 10485760], // 最大 10MB
        { bucket: OSS_CONFIG.bucket },
        ['starts-with', '$key', `${dir}/`],
      ]
    })

    const policy = Buffer.from(policyString).toString('base64')

    // 计算签名
    const signature = crypto
      .createHmac('sha1', OSS_CONFIG.accessKeySecret)
      .update(policy)
      .digest('base64')

    // 构建完整的 OSS endpoint，确保有 https:// 协议头
    let ossEndpoint = OSS_CONFIG.endpoint || `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com`
    
    // 如果 endpoint 不包含协议头，自动添加 https://
    if (ossEndpoint && !ossEndpoint.startsWith('http://') && !ossEndpoint.startsWith('https://')) {
      ossEndpoint = `https://${ossEndpoint}`
    }
    
    // 返回签名数据
    return NextResponse.json({
      accessKeyId: OSS_CONFIG.accessKeyId,
      policy,
      signature,
      key: fileKey,
      endpoint: ossEndpoint,
      cdnUrl: process.env.ALIYUN_OSS_CDN_URL || ossEndpoint,
      bucket: OSS_CONFIG.bucket
    })
  } catch (error) {
    console.error('Error generating OSS signature:', error)
    return NextResponse.json(
      { 
        error: '生成上传签名失败', 
        details: error instanceof Error ? error.message : '未知错误',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}