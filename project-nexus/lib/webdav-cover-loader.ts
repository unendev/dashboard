/**
 * WebDAV 封面加载器
 * 处理 WebDAV 认证和 CORS 问题
 */

import { getWebDAVConfig } from './webdav-config';

/**
 * Base64 编码（客户端兼容）
 */
function btoa(str: string): string {
  if (typeof window !== 'undefined' && window.btoa) {
    return window.btoa(str);
  }
  // Node.js 环境
  return Buffer.from(str).toString('base64');
}

/**
 * 生成 WebDAV 封面 URL（带 Basic Auth）
 */
export function generateCoverUrl(bookId: string): string {
  const config = getWebDAVConfig();
  const coverPath = config.ebookPath.replace('/file', '/cover').replace(/\/$/, '');
  const baseUrl = config.url.replace(/\/$/, '');
  const coverUrl = `${baseUrl}${coverPath}/${bookId}.jpg`;
  
  console.log('[CoverLoader] Generated URL for:', bookId, 'URL:', coverUrl);
  return coverUrl;
}

/**
 * 获取 WebDAV 封面作为 Data URL（用于 img src）
 * 这样可以避免 CORS 问题
 */
export async function getCoverAsDataUrl(bookId: string): Promise<string | null> {
  try {
    const config = getWebDAVConfig();
    const coverPath = config.ebookPath.replace('/file', '/cover').replace(/\/$/, '');
    const baseUrl = config.url.replace(/\/$/, '');
    const coverUrl = `${baseUrl}${coverPath}/${bookId}.jpg`;
    
    const auth = btoa(`${config.username}:${config.password}`);
    
    const response = await fetch(coverUrl, {
      headers: {
        'Authorization': `Basic ${auth}`,
      },
      mode: 'cors',
      credentials: 'omit',
    });
    
    if (!response.ok) {
      console.warn('[CoverLoader] Failed to fetch cover:', response.status, coverUrl);
      return null;
    }
    
    const blob = await response.blob();
    const dataUrl = URL.createObjectURL(blob);
    console.log('[CoverLoader] ✓ Cover loaded as data URL:', bookId);
    return dataUrl;
  } catch (error) {
    console.warn('[CoverLoader] Failed to load cover:', error);
    return null;
  }
}
