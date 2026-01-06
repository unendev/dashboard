import crypto from 'crypto'

// OSS 配置
const OSS_CONFIG = {
  accessKeyId: process.env.ALIYUN_OSS_ACCESS_KEY_ID || '',
  accessKeySecret: process.env.ALIYUN_OSS_ACCESS_KEY_SECRET || '',
  bucket: process.env.ALIYUN_OSS_BUCKET || '',
  region: process.env.ALIYUN_OSS_REGION || 'oss-cn-hangzhou',
  endpoint: process.env.ALIYUN_OSS_ENDPOINT || '',
}

/**
 * 生成 OSS 签名 URL
 * @param objectKey - OSS 对象的 key，例如 "treasure-images/xxx.jpg"
 * @param expiresInSeconds - 过期时间（秒），默认 1 小时
 */
export function generateSignedUrl(objectKey: string, expiresInSeconds: number = 3600): string {
  // 构建完整的 OSS endpoint
  let ossEndpoint = OSS_CONFIG.endpoint || `https://${OSS_CONFIG.bucket}.${OSS_CONFIG.region}.aliyuncs.com`
  
  // 如果 endpoint 不包含协议头，自动添加 https://
  if (ossEndpoint && !ossEndpoint.startsWith('http://') && !ossEndpoint.startsWith('https://')) {
    ossEndpoint = `https://${ossEndpoint}`
  }

  // 计算过期时间戳
  const expires = Math.floor(Date.now() / 1000) + expiresInSeconds

  // 构建签名字符串
  const stringToSign = `GET\n\n\n${expires}\n/${OSS_CONFIG.bucket}/${objectKey}`

  // 计算签名
  const signature = crypto
    .createHmac('sha1', OSS_CONFIG.accessKeySecret)
    .update(stringToSign)
    .digest('base64')

  // 构建签名 URL
  const signedUrl = `${ossEndpoint}/${objectKey}?OSSAccessKeyId=${encodeURIComponent(OSS_CONFIG.accessKeyId)}&Expires=${expires}&Signature=${encodeURIComponent(signature)}`

  return signedUrl
}

/**
 * 从完整 URL 中提取 OSS key
 * @param url - 完整的 OSS URL 或相对路径
 */
export function extractOssKey(url: string): string {
  // 如果是相对路径（以 / 开头）
  if (url.startsWith('/')) {
    return url.substring(1) // 去掉开头的 /
  }
  
  // 如果是完整 URL
  if (url.includes('://')) {
    const urlObj = new URL(url)
    return urlObj.pathname.substring(1) // 去掉开头的 /
  }
  
  // 如果已经是 key
  return url
}

/**
 * 检查 URL 是否需要签名
 */
export function needsSignature(url: string): boolean {
  // 如果已经包含签名参数，不需要重新签名
  if (url.includes('Signature=')) {
    return false
  }
  
  // 如果是 OSS key 或相对路径，需要签名
  return true
}
