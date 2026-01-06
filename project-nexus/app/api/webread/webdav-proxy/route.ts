/**
 * WebDAV 代理 API
 * 解决浏览器直接访问 WebDAV 服务器的 CORS 问题
 * 所有 WebDAV 操作通过服务端代理
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from 'webdav';

// 从环境变量或数据库获取 WebDAV 配置
function getServerWebDAVConfig() {
  return {
    url: process.env.WEBDAV_URL || 'http://localhost:8080/webdav',
    username: process.env.WEBDAV_USERNAME || 'admin',
    password: process.env.WEBDAV_PASSWORD || 'admin',
    ebookPath: process.env.WEBDAV_EBOOK_PATH || '/ebooks',
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, path, content } = body;
    
    const config = getServerWebDAVConfig();
    const client = createClient(config.url, {
      username: config.username,
      password: config.password,
    });

    const basePath = config.ebookPath.replace(/\/$/, '');
    const fullPath = `${basePath}/${path}`.replace(/\/+/g, '/');

    switch (action) {
      case 'stat': {
        try {
          const stat = await client.stat(fullPath);
          return NextResponse.json({ success: true, data: stat });
        } catch {
          return NextResponse.json({ success: false, error: 'not_found' });
        }
      }

      case 'mkdir': {
        try {
          await client.createDirectory(fullPath);
          return NextResponse.json({ success: true });
        } catch (e: any) {
          // 目录可能已存在
          if (e.status === 405 || e.message?.includes('405')) {
            return NextResponse.json({ success: true, existed: true });
          }
          return NextResponse.json({ success: false, error: e.message });
        }
      }

      case 'write': {
        try {
          await client.putFileContents(fullPath, content);
          return NextResponse.json({ success: true });
        } catch (e: any) {
          return NextResponse.json({ success: false, error: e.message });
        }
      }

      case 'read': {
        try {
          const data = await client.getFileContents(fullPath, { format: 'text' });
          return NextResponse.json({ success: true, data });
        } catch {
          return NextResponse.json({ success: false, error: 'not_found' });
        }
      }

      default:
        return NextResponse.json({ success: false, error: 'unknown_action' }, { status: 400 });
    }
  } catch (error: any) {
    console.error('[WebDAV Proxy] Error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
