import { NextRequest, NextResponse } from 'next/server';
import { getUserId } from '../../../../lib/auth-utils';
import { generateSignedUrl, extractOssKey } from '../../../../lib/oss-utils';
import { prisma } from '@/lib/prisma';
import { Prisma } from '@prisma/client';

// GET /api/treasures/[id] - 获取特定宝藏
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    const treasure = await prisma.treasure.findFirst({
      where: { id, userId },
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    if (!treasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    // 为每张图片生成签名 URL
    const treasureWithSignedUrls = {
      ...treasure,
      images: treasure.images.map(image => {
        // 提取 OSS key（去掉完整URL部分）
        const ossKey = extractOssKey(image.url)
        // 生成签名 URL（1小时有效期）
        const signedUrl = generateSignedUrl(ossKey, 3600)
        
        return {
          ...image,
          url: signedUrl
        }
      })
    };

    return NextResponse.json(treasureWithSignedUrls);
  } catch (error) {
    console.error('Error fetching treasure:', error);
    return NextResponse.json({ error: 'Failed to fetch treasure' }, { status: 500 });
  }
}

// PUT /api/treasures/[id] - 更新特定宝藏
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // 日志点 A: 记录接收到的完整请求体
    const body = await request.json();
    console.log('--- Treasure Update: [A] Received Body ---', JSON.stringify(body, null, 2));

    const { 
      title, 
      content, 
      type,
      tags, 
      theme,
      images 
    } = body;

    const userId = await getUserId(request);
    const { id } = await params;
    
    // 验证宝藏属于当前用户
    const existingTreasure = await prisma.treasure.findFirst({
      where: { id, userId }
    });

    if (!existingTreasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    const updateData: Prisma.TreasureUpdateInput = {
      title,
      content,
      type,
      tags,
      theme
    };

    // 处理图片更新
    if (images !== undefined) {
      // 删除所有旧图片
      await prisma.image.deleteMany({
        where: { treasureId: id }
      });
      
      // 添加新图片
      if (images.length > 0) {
        updateData.images = {
          create: images.map((img: { url: string; alt?: string; width?: number; height?: number; size?: number }) => ({
            url: img.url,
            alt: img.alt,
            width: img.width,
            height: img.height,
            size: img.size
          }))
        };
      }
    }
    
    // 日志点 B: 记录即将写入数据库的数据
    console.log('--- Treasure Update: [B] Data for Prisma ---', JSON.stringify(updateData, null, 2));

    const treasure = await prisma.treasure.update({
      where: { id },
      data: updateData,
      include: {
        images: {
          orderBy: { createdAt: 'asc' }
        }
      }
    });

    console.log(`✅ [UPDATE] 宝藏更新成功:`, { 
      id: treasure.id, 
      type: treasure.type, 
      imagesCount: treasure.images.length 
    })

    return NextResponse.json(treasure);
  } catch (error) {
    // 日志点 C: 优化错误日志
    console.error('❌ [CRITICAL] Treasure Update Failed - Detailed Error:', {
      message: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : 'No stack trace',
      name: error instanceof Error ? error.name : 'Unknown error type'
    });
    return NextResponse.json({ error: 'Failed to update treasure' }, { status: 500 });
  }
}

// DELETE /api/treasures/[id] - 删除特定宝藏
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = await getUserId(request);
    const { id } = await params;

    // 验证宝藏属于当前用户
    const existingTreasure = await prisma.treasure.findFirst({
      where: { id, userId }
    });

    if (!existingTreasure) {
      return NextResponse.json({ error: 'Treasure not found' }, { status: 404 });
    }

    await prisma.treasure.delete({
      where: { id }
    });

    return NextResponse.json({ message: 'Treasure deleted successfully' });
  } catch (error) {
    console.error('Error deleting treasure:', error);
    return NextResponse.json({ error: 'Failed to delete treasure' }, { status: 500 });
  }
}
