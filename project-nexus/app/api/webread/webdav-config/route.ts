import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export interface WebDAVConfig {
  url: string;
  username: string;
  password: string;
  ebookPath: string;
}

const CONFIG_KEY = 'webdav-config';

/**
 * GET /api/webread/webdav-config
 * 获取 WebDAV 配置
 */
export async function GET() {
  try {
    const config = await prisma.globalConfig.findUnique({
      where: { key: CONFIG_KEY }
    });
    
    if (!config) {
      return NextResponse.json({ 
        url: process.env.WEBDAV_URL || 'http://localhost:8080/webdav',
        username: process.env.WEBDAV_USERNAME || 'admin',
        password: process.env.WEBDAV_PASSWORD || 'admin',
        ebookPath: process.env.WEBDAV_EBOOK_PATH || '/ebooks'
      });
    }
    
    try {
      return NextResponse.json(JSON.parse(config.value));
    } catch {
      return NextResponse.json({ error: 'Invalid config format' }, { status: 500 });
    }
  } catch (error) {
    console.error('[WebDAV Config API] Failed to get config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/webread/webdav-config
 * 保存 WebDAV 配置
 * Body: WebDAVConfig
 */
export async function POST(request: Request) {
  try {
    const config: WebDAVConfig = await request.json();
    
    // 验证必需字段
    if (!config.url || !config.username || !config.password || !config.ebookPath) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    const result = await prisma.globalConfig.upsert({
      where: { key: CONFIG_KEY },
      update: { value: JSON.stringify(config) },
      create: { key: CONFIG_KEY, value: JSON.stringify(config) }
    });
    
    console.log('[WebDAV Config API] Configuration saved successfully');
    
    return NextResponse.json({ 
      success: true, 
      config: JSON.parse(result.value) 
    });
  } catch (error) {
    console.error('[WebDAV Config API] Failed to save config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
