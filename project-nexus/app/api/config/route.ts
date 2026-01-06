import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/config?key=categoryVersion
 * 获取全局配置
 */
export async function GET(request: Request) {
  if (process.env.NEXT_CONFIG_WIDGET === 'true') {
    return NextResponse.json({ value: '0' });
  }
  try {
    const { searchParams } = new URL(request.url);
    const key = searchParams.get('key');
    
    if (!key) {
      return NextResponse.json({ error: 'Missing key parameter' }, { status: 400 });
    }
    
    const config = await prisma.globalConfig.findUnique({
      where: { key }
    });
    
    if (!config) {
      // 如果配置不存在，返回默认值
      if (key === 'categoryVersion') {
        return NextResponse.json({ value: '0' });
      }
      return NextResponse.json({ error: 'Config not found' }, { status: 404 });
    }
    
    return NextResponse.json({ value: config.value });
  } catch (error) {
    console.error('Failed to get config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

/**
 * POST /api/config
 * 更新或创建全局配置
 * Body: { key: string, value: string }
 */
export async function POST(request: Request) {
  try {
    const { key, value } = await request.json();
    
    if (!key || value === undefined) {
      return NextResponse.json({ error: 'Missing key or value' }, { status: 400 });
    }
    
    const config = await prisma.globalConfig.upsert({
      where: { key },
      update: { value: String(value) },
      create: { key, value: String(value) }
    });
    
    return NextResponse.json({ success: true, value: config.value });
  } catch (error) {
    console.error('Failed to update config:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}



